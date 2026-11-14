import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import worker from "../src/worker.mjs";

const SECRET = "secret-de-test-uniquement-0123456789abcdef";
const ORIGIN = "https://pierrickbriand.fr";
const now = () => Math.floor(Date.now() / 1000);

const b64url = (input) => Buffer.from(input).toString("base64url");

function mint(payload, secret = SECRET) {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update("v1." + body).digest("base64url");
  return `v1.${body}.${sig}`;
}

const valid = (scope, extra = {}) => ({ sub: "etudiant-1", scope, iat: now(), exp: now() + 3600, ...extra });

// Faux hébergeur de fichiers : renvoie un texte secret pour tout fichier demandé.
const env = {
  TOKEN_SECRET: SECRET,
  ASSETS: { fetch: async (req) => new Response("CONTENU-SECRET " + new URL(req.url).pathname, { status: 200 }) },
};

const get = (path, token) =>
  worker.fetch(
    new Request(ORIGIN + path, { headers: token ? { Cookie: `__Host-session=${token}` } : {} }),
    env
  );

const leaked = async (res) => res.status === 200 && (await res.text()).includes("CONTENU-SECRET");

test("la page d'accueil publique reste accessible sans jeton", async () => {
  const res = await get("/");
  assert.equal(res.status, 200);
});

test("1. sans jeton : refusé", async () => {
  for (const p of ["/cours-test/", "/cours-test/index.html", "/iag-vatel/telechargements/fiche.pdf"]) {
    const res = await get(p);
    assert.equal(await leaked(res), false, p);
    assert.equal(res.status, 401, p);
  }
});

test("2. jeton expiré : refusé", async () => {
  const token = mint({ sub: "x", scope: ["cours-test"], iat: now() - 7200, exp: now() - 3600 });
  const res = await get("/cours-test/", token);
  assert.equal(await leaked(res), false);
  assert.equal(res.status, 401);
});

test("3. jeton falsifié : refusé", async () => {
  // signature produite avec une autre clé
  assert.equal((await get("/cours-test/", mint(valid(["cours-test"]), "autre-cle"))).status, 401);
  // charge modifiée après signature (élargissement du périmètre)
  const [v, , sig] = mint(valid(["cours-test"])).split(".");
  const forged = `${v}.${b64url(JSON.stringify(valid(["*"])))}.${sig}`;
  const res = await get("/iag-vatel/", forged);
  assert.equal(await leaked(res), false);
  assert.equal(res.status, 401);
  // formes de jeton absurdes
  for (const t of ["", "v1..", "v1.a.b", "none", "v2.a.b", "a.b.c.d", "v1." + "A".repeat(5000)]) {
    assert.equal(await leaked(await get("/cours-test/", t)), false, t.slice(0, 20));
  }
});

test("4. jeton d'un autre cours : refusé", async () => {
  const token = mint(valid(["cours-test"]));
  for (const p of ["/iag-vatel/", "/iag-vatel/index.html", "/marketing-strategique-iso-nantes/"]) {
    const res = await get(p, token);
    assert.equal(await leaked(res), false, p);
    assert.equal(res.status, 403, p);
  }
});

test("jeton valide : accès uniquement au cours autorisé", async () => {
  const token = mint(valid(["cours-test"]));
  assert.equal(await leaked(await get("/cours-test/", token)), true);
  assert.equal(await leaked(await get("/cours-test/index.html", token)), true);
  const res = await get("/cours-test/", token);
  assert.equal(res.headers.get("Cache-Control"), "private, no-store");
  assert.match(res.headers.get("X-Robots-Tag"), /noindex/);
});

test("jeton générique * : accès à tous les cours", async () => {
  assert.equal(await leaked(await get("/iag-vatel/", mint(valid(["*"])))), true);
});

test("jeton valide mais durée supérieure à 24 h : refusé", async () => {
  const token = mint({ sub: "x", scope: ["cours-test"], iat: now(), exp: now() + 48 * 3600 });
  assert.equal(await leaked(await get("/cours-test/", token)), false);
});

test("jeton émis dans le futur : refusé", async () => {
  const token = mint({ sub: "x", scope: ["cours-test"], iat: now() + 3600, exp: now() + 7200 });
  assert.equal(await leaked(await get("/cours-test/", token)), false);
});

test("astuces d'adresse : aucune ne contourne le périmètre", async () => {
  const token = mint(valid(["cours-test"]));
  const tricks = [
    "/cours-test/../iag-vatel/index.html",
    "/cours-test/%2e%2e/iag-vatel/index.html",
    "/cours-test/%2E%2E/iag-vatel/",
    "/cours-test%2f..%2fiag-vatel/",
    "//iag-vatel/index.html",
    "/cours-test//../iag-vatel/",
    "/cours-test\\..\\iag-vatel/",
    "/IAG-VATEL/",
    "/iag-vatel%00/",
    "/iag-vatel/%2e/",
    "/iag-vatel./",
    "/LICENSE",
    "/README.md",
    "/src/worker.mjs",
    "/wrangler.jsonc",
    "/.git/config",
  ];
  for (const p of tricks) {
    const res = await get(p, token);
    if (res.status !== 200) continue;
    // Si la réponse est servie, le fichier servi doit rester dans le cours autorisé.
    const served = (await res.text()).replace("CONTENU-SECRET ", "");
    assert.ok(served.startsWith("/cours-test/"), `${p} a servi ${served}`);
  }
});

test("jeton absent : les fichiers racine et le code ne sortent pas", async () => {
  for (const p of ["/LICENSE", "/README.md", "/src/worker.mjs", "/wrangler.jsonc", "/.git/config", "/auth"]) {
    assert.equal(await leaked(await get(p)), false, p);
  }
});

test("connexion : jeton valide pose un témoin sécurisé", async () => {
  const token = mint(valid(["cours-test"]));
  const body = new URLSearchParams({ t: token, next: "/cours-test/" });
  const res = await worker.fetch(new Request(ORIGIN + "/auth", { method: "POST", body }), env);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("Location"), "/cours-test/");
  const cookie = res.headers.get("Set-Cookie");
  for (const part of ["__Host-session=", "Secure", "HttpOnly", "SameSite=Lax", "Path=/"]) {
    assert.ok(cookie.includes(part), part);
  }
});

test("connexion : jeton invalide ou falsifié = aucun témoin", async () => {
  for (const t of ["", "v1.a.b", mint(valid(["x"]), "autre-cle")]) {
    const res = await worker.fetch(
      new Request(ORIGIN + "/auth", { method: "POST", body: new URLSearchParams({ t }) }),
      env
    );
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("Set-Cookie"), null);
  }
});

test("connexion : redirection ouverte et autre cours neutralisées", async () => {
  const token = mint(valid(["cours-test"]));
  for (const next of ["//evil.example", "https://evil.example", "/iag-vatel/", "/\\evil.example", "javascript:alert(1)"]) {
    const res = await worker.fetch(
      new Request(ORIGIN + "/auth", { method: "POST", body: new URLSearchParams({ t: token, next }) }),
      env
    );
    assert.equal(res.headers.get("Location"), "/", next);
  }
});

test("connexion : seule la méthode POST est acceptée", async () => {
  const token = mint(valid(["cours-test"]));
  const res = await worker.fetch(new Request(ORIGIN + "/auth?t=" + token), env);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("Set-Cookie"), null);
});

test("méthodes d'écriture refusées sur les contenus", async () => {
  const token = mint(valid(["cours-test"]));
  for (const method of ["PUT", "DELETE", "PATCH", "POST"]) {
    const res = await worker.fetch(
      new Request(ORIGIN + "/cours-test/", { method, headers: { Cookie: `__Host-session=${token}` } }),
      env
    );
    assert.equal(res.status, 405, method);
  }
});

test("secret manquant : tout est refusé", async () => {
  const token = mint(valid(["cours-test"]));
  const res = await worker.fetch(
    new Request(ORIGIN + "/cours-test/", { headers: { Cookie: `__Host-session=${token}` } }),
    { ...env, TOKEN_SECRET: undefined }
  );
  assert.equal(await leaked(res), false);
});
