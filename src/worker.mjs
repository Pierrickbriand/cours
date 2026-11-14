// Contrôle d'accès par jeton signé pour les cours et les simulateurs.
// Règle de base : tout est refusé, sauf la page d'accueil publique.
// Le jeton est émis par l'Atelier du formateur (voir ACCES.md) et signé avec TOKEN_SECRET.

const COOKIE = "__Host-session";
const MAX_LIFETIME = 24 * 3600; // un jeton plus long que 24 h est refusé, même signé
const CLOCK_SKEW = 60;
const PUBLIC_PATHS = new Set(["/", "/index.html"]);
const SLUG = /^[a-z0-9-]{1,80}$/i;
const encoder = new TextEncoder();

function b64urlToBytes(value) {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error("base64url invalide");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || token.length > 2048 || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const signed = encoder.encode(parts[0] + "." + parts[1]);
    const valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]), signed);
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    if (!payload || typeof payload !== "object") return null;
    const { sub, scope, iat, exp } = payload;
    if (typeof sub !== "string" || sub.length === 0 || sub.length > 100) return null;
    if (!Array.isArray(scope) || scope.length === 0 || scope.length > 100) return null;
    if (!scope.every((s) => s === "*" || (typeof s === "string" && SLUG.test(s)))) return null;
    if (!Number.isInteger(iat) || !Number.isInteger(exp)) return null;
    if (exp <= now || iat > now + CLOCK_SKEW || exp - iat > MAX_LIFETIME) return null;
    return { sub, scope: scope.map((s) => s.toLowerCase()), exp };
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const item of header.split(";")) {
    const index = item.indexOf("=");
    if (index > 0 && item.slice(0, index).trim() === name) return item.slice(index + 1).trim();
  }
  return null;
}

function cleanPath(url) {
  const raw = url.pathname;
  if (raw.includes("\\") || raw.includes("//") || /%(2f|5c|00|2e)/i.test(raw)) return null;
  let decoded;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  if (decoded.includes("\0")) return null;
  const segments = decoded.split("/");
  if (segments.includes("..") || segments.includes(".")) return null;
  return decoded;
}

function denied(request, status, text) {
  const wantsPage = (request.headers.get("Accept") || "").includes("text/html");
  if (wantsPage && request.method === "GET" && status === 401) {
    return new Response(null, { status: 302, headers: { Location: "/?acces=requis", "Cache-Control": "no-store" } });
  }
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function protect(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function safeNext(next, session) {
  if (typeof next === "string" && /^\/[a-z0-9-]{1,80}\/?$/i.test(next)) {
    const slug = next.split("/")[1].toLowerCase();
    if (session.scope.includes("*") || session.scope.includes(slug)) return next;
  }
  return "/";
}

async function handleLogin(request, env) {
  if (request.method !== "POST") return denied(request, 405, "Méthode non autorisée");
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > 4096) return denied(request, 413, "Requête trop grande");
  let form;
  try { form = await request.formData(); } catch { return denied(request, 400, "Requête invalide"); }
  const session = await verifyToken(String(form.get("t") || ""), env.TOKEN_SECRET);
  if (!session) return denied(request, 403, "Accès refusé");
  const maxAge = session.exp - Math.floor(Date.now() / 1000);
  return new Response(null, {
    status: 303,
    headers: {
      Location: safeNext(form.get("next"), session),
      "Set-Cookie": `${COOKIE}=${form.get("t")}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
      "Cache-Control": "no-store",
    },
  });
}

function handleLogout(request) {
  if (request.method !== "POST") return denied(request, 405, "Méthode non autorisée");
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/",
      "Set-Cookie": `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = cleanPath(url);
    if (path === null) return denied(request, 400, "Adresse invalide");

    if (path === "/auth") return handleLogin(request, env);
    if (path === "/deconnexion") return handleLogout(request);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return denied(request, 405, "Méthode non autorisée");
    }

    if (PUBLIC_PATHS.has(path)) return env.ASSETS.fetch(request);

    const slug = path.split("/")[1] || "";
    if (!SLUG.test(slug)) return denied(request, 404, "Introuvable");

    const session = await verifyToken(readCookie(request, COOKIE), env.TOKEN_SECRET);
    if (!session) return denied(request, 401, "Connexion requise");
    if (!session.scope.includes("*") && !session.scope.includes(slug.toLowerCase())) {
      return denied(request, 403, "Accès non autorisé à ce contenu");
    }

    const clean = new URL(path, url.origin);
    clean.search = url.search;
    return protect(await env.ASSETS.fetch(new Request(clean, request)));
  },
};

export { verifyToken, cleanPath };
