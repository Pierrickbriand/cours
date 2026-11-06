# Méthode du prototype – cours IAG, Vatel M5ALT

Fichier de départ du projet Assistant Claude. Claude le relit à chaque conversation.

## Les quatre briques

1. Google Sheets : les données (une feuille par type de donnée, plus Paramètres et Journal).
2. Apps Script : la logique (calculs, règles, prévision simple).
3. Une page web Apps Script : les écrans, ouverts par le lien de test.
4. Claude : il écrit le code ; le groupe teste et décide.

## La conversation type

Une conversation par fonction, dans le projet Claude du groupe, nommée « 01 · Base et version 0 », « 02 · Brique d’IA », et ainsi de suite.

1. Le groupe décrit la fonction en une consigne.
2. Claude donne chaque fichier de code en entier (Code.gs, Index.html), jamais un extrait.
3. Un membre colle le code dans Apps Script et enregistre.
4. Le groupe teste avec le lien de test.
5. En cas d’erreur, le groupe copie le message exact dans la conversation.

## La brique d’IA

Le prototype ne contient pas de vrai modèle d’IA. Il simule la brique d’IA avec les données du Google Sheets : une prévision par tendance, un score à partir de règles, ou une réponse type préparée avec Claude. Le groupe nomme le vrai service d’IA qui la remplacerait.

## Les règles des données

- Données toujours fictives et plausibles : aucun nom réel de client ou de salarié.
- Aucun export du logiciel de l’entreprise d’accueil.
- Aucune clé ni aucun mot de passe dans le code.
- Le prototype n’est pas publié : seul le lien de test sert, pour la démonstration.

## Ce que le groupe attend de Claude

- Poser au plus trois questions avant une longue réponse.
- Signaler toute hypothèse et tout chiffre à vérifier.
- Terminer chaque réponse technique par ce qu’il faut tester, et comment.
