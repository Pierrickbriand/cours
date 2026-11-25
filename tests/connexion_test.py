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
        ok(await pg.is_visible('#mail-compte') and not await pg.is_visible('#code'), 'un seul champ à l’écran : l’adresse e-mail')
        ok(await pg.evaluate("()=>document.documentElement.scrollWidth<=innerWidth"), 'aucun débordement à 1 280 px')
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1] + '-1280.png', full_page=True)
        await pg.fill('#mail-compte', 'pas une adresse'); await pg.click('#f-compte button')
        ok('pas valide' in await pg.inner_text('#etat-compte') and pg.url == BASE + '/connexion', 'adresse fausse : message, on reste sur la page')
        print('[adresse e-mail : le code part tout de suite]')
        ctx2, pg2, appels2 = await page(b, {'ok': True})
        await pg2.goto(BASE + '/connexion'); await pg2.fill('#mail-compte', 'Lea.Martin@exemple.fr'); await pg2.click('#f-compte button')
        await pg2.wait_for_url(BASE + '/compte'); await pg2.wait_for_timeout(800)
        ok(len(appels2) == 1 and appels2[0].get('action') == 'compte_demander' and appels2[0].get('email') == 'lea.martin@exemple.fr', 'un seul appel : demande du code pour lea.martin@exemple.fr')
        ok(not await pg2.is_hidden('#e-code') and 'lea.martin@exemple.fr' in await pg2.inner_text('#etat'), 'écran « code reçu par e-mail » affiché, sans seconde saisie')
        if len(sys.argv) > 1: await pg2.screenshot(path=sys.argv[1] + '-code.png', full_page=True)
        await pg2.reload(); await pg2.wait_for_timeout(600)
        ok(len(appels2) == 1, 'recharger la page ne renvoie pas un second code')
        await ctx2.close()
        ok(await pg.evaluate("()=>!document.getElementById('code')&&!document.getElementById('bloc-connexion')&&document.querySelectorAll('main input').length===1"), 'plus de formulaire à code : un seul champ dans la page')
        await ctx.close()
        print('[téléphone, 390 px]')
        ctx, pg, appels = await page(b, {'ok': True}, 390, 780)
        await pg.goto(BASE + '/connexion'); await pg.wait_for_timeout(600)
        ok(await pg.evaluate("()=>document.documentElement.scrollWidth<=innerWidth"), 'aucun débordement à 390 px')
        if len(sys.argv) > 1: await pg.screenshot(path=sys.argv[1] + '-390.png', full_page=True)
        await ctx.close()
        print('[accès expiré : message, adresse déjà remplie, nouveau code même si une session traîne]')
        ctx, pg, appels = await page(b, {'ok': True})
        await ctx.add_init_script("localStorage.setItem('compte-session',JSON.stringify({prenom:'Léa',nom:'MARTIN',e:'lea@exemple.fr',cours:[{slug:'iag-vatel',titre:'IAG'}],t:Date.now()-3600000}))")
        await pg.goto(BASE + '/connexion?acces=requis'); await pg.wait_for_timeout(600)
        ok(pg.url.endswith('/connexion?acces=requis') and 'expiré' in await pg.inner_text('#etat-compte'), 'on reste sur la page, message : ' + await pg.inner_text('#etat-compte'))
        ok(await pg.input_value('#mail-compte') == 'lea@exemple.fr', 'adresse déjà remplie')
        await pg.click('#f-compte button'); await pg.wait_for_url(BASE + '/compte'); await pg.wait_for_timeout(800)
        ok(len(appels) >= 1 and appels[0].get('action') == 'compte_demander' and not await pg.is_hidden('#e-code'), 'un nouveau code est demandé, écran du code affiché')
        await ctx.close()
        print('[compte déjà ouvert sur l’appareil : directement « Mon compte »]')
        ctx, pg, appels = await page(b, {'ok': True, 'cours': []})
        await ctx.add_init_script("localStorage.setItem('compte-session',JSON.stringify({prenom:'Léa',nom:'MARTIN',e:'lea@exemple.fr',l:'x',cours:[{slug:'iag-vatel',titre:'IAG'}],t:Date.now()-3600000}))")
        await pg.goto(BASE + '/connexion'); await pg.wait_for_url(BASE + '/compte'); await pg.wait_for_timeout(600)
        ok(not await pg.is_hidden('#e-compte') and 'Léa' in await pg.inner_text('#intro'), 'page « Mon compte » affichée : ' + await pg.inner_text('#intro'))
        await ctx.close(); await b.close()
    print('\nÉCHECS : %d' % len(fails) if fails else '\nTout est vert.')
    raise SystemExit(1 if fails else 0)
asyncio.run(main())
