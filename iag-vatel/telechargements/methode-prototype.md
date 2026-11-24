# Méthode du prototype – cours IAG, Vatel M4ALT

Fichier de départ du projet Assistant Claude. Claude le relit à chaque conversation.

## La page d’abord, les données ensuite

1. Le cahier de cadrage : écrit par le groupe, sans Claude, puis relu par Claude (séance 2).
2. La page : un seul fichier index.html, écrit par Claude, qui s’ouvre dans le navigateur (séances 2 et 3).
3. La brique d’IA : simulée dans la page, avec des données fictives (séance 3).
4. La feuille Google Sheets : un onglet par liste de la page, « id » en première colonne (séance 3).
5. Le serveur Apps Script : fourni par le formateur. Le groupe ne le modifie pas (séance 3).
6. Le branchement : la page est placée dans le projet Apps Script, dans un fichier « index ». L’adresse qui finit par /exec affiche l’application (séance 3).

## Les règles de construction

- Une seule fonction à la fois. Trois fonctions au plus.
- Chaque réponse donne le fichier index.html complet, jamais un extrait à recoller.
- Un seul fichier : le HTML, le style et le programme ensemble. Aucune bibliothèque, aucune image ni police venues d’internet.
- Les données de la page sont dans des listes, une par fiche du cahier de cadrage. Chaque fiche a un champ « id » unique.
- Les noms de fiches et de champs sont ceux du cahier de cadrage, sans accent ni espace.
- Le texte saisi est échappé avant d’être affiché.
- Après chaque réponse, le groupe ouvre la page et l’essaie. Un problème par message : ce que nous avons fait, ce que nous attendions, ce que nous avons obtenu.
- Claude ne change jamais ce que le groupe n’a pas demandé.

## Le branchement sur la feuille

- La page n’écrit pas seule dans la feuille : elle appelle le serveur avec l’objet « pont », fourni dans la fiche VA3.
- Le serveur offre : pont.lireTout(), pont.enregistrer(onglet, fiche), pont.supprimer(onglet, id), pont.toutEnvoyer(données).
- Dans la page branchée : aucun fetch, aucune adresse /exec, aucun stockage dans le navigateur.
- Après chaque changement, le groupe publie une nouvelle version : « Déployer », « Gérer les déploiements », le crayon, « Nouvelle version ».

## La brique d’IA

Le prototype ne contient pas de vrai modèle d’IA. Il simule la brique d’IA avec les données fictives de la page : une prévision par tendance, un score à partir de règles, ou une réponse type préparée avec Claude. La page affiche la mention « simulation ». Le groupe nomme le vrai service d’IA qui la remplacerait.

## Les règles des données

- Données toujours fictives et plausibles, marquées « FICTIF » : aucun nom réel de client ou de salarié.
- Aucun export du logiciel de l’entreprise d’accueil. Retirer le nom ne suffit pas : la date et le numéro de chambre désignent un client.
- Aucune clé, aucun mot de passe ni aucune adresse de publication dans le code ou dans le dossier.
- Un seul compte Google personnel par groupe : le propriétaire.

## Ce que le groupe attend de Claude

- Poser au plus trois questions avant une longue réponse.
- Signaler toute hypothèse et tout chiffre à vérifier.
- Terminer chaque réponse technique par ce qu’il faut essayer, et comment.
