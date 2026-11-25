# Page « Connexion » : le compte par e-mail est proposé en premier, et le code de classe d'un cours à compte conduit sur « Mon compte ».
# Lancer depuis la racine du dépôt : python3 -I tests/connexion_test.py  (Playwright installé). L'Atelier est simulé (aucun réseau).
import asyncio, json, os, sys
from playwright.async_api import async_playwright
RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def lire(n, mode='r'):
    with open(os.path.join(RACINE, n), mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f: return f.read()
BASE = 'https://site.test'
fails = []
def ok(c, m):
    print(('  ok   ' if c else '  ÉCHEC ') + m)
    if not c: fails.append(m)
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp'}
async def page(b, reponse, largeur=1280, hauteur=900):
    ctx = await b.new_context(viewport={'width': largeur, 'height': hauteur}); pg = await ctx.new_page(); appels = []
    async def reseau(r):
        u = r.request.url
        if u.startswith('https://script.google.com/'):
            appels.append(json.loads(r.request.post_data or '{}'))
            return await r.fulfill(status=200, content_type='application/json', body=json.dumps(reponse))
        if not u.startswith(BASE): return await r.abort()
        ch = u[len(BASE):].split('?')[0].lstrip('/') or 'index.html'
        if ch in ('connexion', 'compte'): ch += '.html'
        try: return await r.fulfill(status=200, content_type=TYPES.get(os.path.splitext(ch)[1], 'application/octet-stream'), body=lire(ch, 'rb'))
        except Exception: return await r.fulfill(status=404, body='')
    await pg.route(lambda u: True, reseau)
    return ctx, pg, appels
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        print('[page de connexion]')
        ctx, pg, appels = await page(b, {'ok': False, 'err': 'compte requis'})
        await pg.goto(BASE + '/connexion'); await pg.wait_for_timeout(600)
        t = await pg.inner_text('main')
        ok('Créer ou ouvrir mon compte' in t and t.index('Créer ou ouvrir mon compte') < t.index('Avec un code'), 'le compte par e-mail vient en premier')
        ok('Ouvrir Mon compte' not in t and 'Votre formateur vous a parlé' not in t, 'ancienne phrase retirée')
        ok(await pg.get_attribute('#bloc-premiere a.bouton', 'href') == '/compte', 'le bouton mène à /compte')
        ok(await pg.evaluate("()=>document.documentElement.scrollWidth<=innerWidth"), 'aucun débordement à 1 280 px')
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1] + '-1280.png', full_page=True)
        print('[code de classe d’un cours à compte : conduit sur « Mon compte »]')
        await pg.fill('#email', 'Lea.Martin@exemple.fr'); await pg.fill('#code', 'bgestq'); await pg.click('#ok')
        await pg.wait_for_url(BASE + '/compte'); await pg.wait_for_timeout(500)
        ok(appels and appels[0].get('action') == 'connexion' and appels[0].get('code') == 'BGESTQ', 'le code est vérifié auprès de l’Atelier')
        ok(await pg.input_value('#email') == 'lea.martin@exemple.fr', 'adresse déjà remplie')
        ok(await pg.input_value('#classe') == 'BGESTQ', 'code de classe gardé pour l’étape suivante')
        ok('compte par e-mail' in await pg.inner_text('#etat'), 'une phrase dit quoi faire : ' + await pg.inner_text('#etat'))
        ok(not await pg.is_hidden('#e-adresse'), 'étape « adresse e-mail » affichée')
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1] + '-compte.png', full_page=True)
        await ctx.close()
        print('[téléphone, 390 px]')
        ctx, pg, appels = await page(b, {'ok': False, 'err': 'code inconnu'}, 390, 780)
        await pg.goto(BASE + '/connexion'); await pg.wait_for_timeout(600)
        ok(await pg.evaluate("()=>document.documentElement.scrollWidth<=innerWidth"), 'aucun débordement à 390 px')
        await pg.fill('#code', 'ZZZZZZ'); await pg.click('#ok'); await pg.wait_for_timeout(500)
        ok('pas reconnu' in await pg.inner_text('#etat') and pg.url == BASE + '/connexion', 'code faux : message, on reste sur la page')
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1] + '-390.png', full_page=True)
        await ctx.close()
        print('[étudiant déjà connecté par code : seule la liste « Mes cours » s’affiche]')
        ctx, pg, appels = await page(b, {})
        await ctx.add_init_script("sessionStorage.setItem('cours-autorises',JSON.stringify([{slug:'cours-test',titre:'Cours test'},{slug:'iag-vatel',titre:'IAG'}]))")
        await pg.goto(BASE + '/connexion'); await pg.wait_for_timeout(600)
        ok(await pg.is_hidden('#bloc-premiere') and await pg.is_hidden('#bloc-connexion') and not await pg.is_hidden('#mes'), 'les deux blocs de connexion sont masqués')
        await pg.click('#autre-code')
        ok(not await pg.is_hidden('#bloc-premiere') and not await pg.is_hidden('#bloc-connexion'), '« Saisir un autre code » les rouvre')
        await ctx.close(); await b.close()
    print('\nÉCHECS : %d' % len(fails) if fails else '\nTout est vert.')
    raise SystemExit(1 if fails else 0)
asyncio.run(main())
