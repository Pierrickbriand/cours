# Accès protégé aux cours et aux simulateurs

Ce dépôt est servi par un petit programme Cloudflare (`src/worker.mjs`). Règle de base : tout est refusé, sauf la page d'accueil (`/`). Ce fichier n'est pas publié.

## Parcours d'un étudiant

1. L'étudiant saisit son identifiant et son code sur la page d'accueil.
2. L'Atelier du formateur vérifie le couple, contrôle que la licence est en cours, puis renvoie un jeton signé.
3. La page d'accueil envoie ce jeton en POST à `/auth` (champs `t` et `next`). Le programme pose un témoin sécurisé, puis redirige vers le cours.
4. Chaque page, image ou fichier d'un cours est contrôlé : jeton valide, non expiré, et cours compris dans le périmètre.

## Format du jeton

`v1.<charge>.<signature>`, en base64url **sans signe « = »**.

- charge : JSON `{"sub": "identifiant", "scope": ["slug-du-cours"], "iat": 1760000000, "exp": 1760028800}` ;
- `scope` : noms de dossiers des cours autorisés, ou `["*"]` pour tous ;
- `iat`, `exp` : secondes Unix. Durée maximale acceptée : 24 h. Recommandé : 8 h ;
- signature : HMAC-SHA256 de la chaîne `v1.<charge>`, avec la clé `TOKEN_SECRET`.

## Émission dans l'Atelier (Apps Script)

```js
function emettreJeton_(identifiant, cours, heures) {
  var secret = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
  var maintenant = Math.floor(Date.now() / 1000);
  var charge = JSON.stringify({ sub: identifiant, scope: cours, iat: maintenant, exp: maintenant + heures * 3600 });
  var b64 = function (octets) { return Utilities.base64EncodeWebSafe(octets).replace(/=+$/, ''); };
  var corps = b64(Utilities.newBlob(charge).getBytes());
  var signature = b64(Utilities.computeHmacSha256Signature('v1.' + corps, secret));
  return 'v1.' + corps + '.' + signature;
}
```

À vérifier dans l'Atelier avant mise en service. La clé ne doit jamais apparaître dans une page, un dépôt ou un journal.

## Mise en service

- Cloudflare, projet lié à ce dépôt, « Variables et secrets » : créer le secret `TOKEN_SECRET` (au moins 32 caractères aléatoires).
- Mettre la même valeur dans les propriétés du script de l'Atelier.
- Pour changer la clé : la modifier aux deux endroits. Tous les jetons en cours deviennent invalides.

## Tests

`node --test tests/worker.test.mjs` : sans jeton, jeton expiré, jeton falsifié, jeton d'un autre cours, astuces d'adresse, redirection ouverte, méthodes d'écriture.

## Limites connues

- une personne autorisée peut copier ce qu'elle voit ;
- une seule connexion active par identifiant n'est pas encore appliquée (elle demanderait une base de données Cloudflare) ;
- les appels de l'application vers l'Atelier doivent aussi vérifier le jeton côté Apps Script.
