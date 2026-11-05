# Consignes communes aux agents d'inventaire (migration lecatalogue.ca)

Contexte : lecatalogue.ca est un site WebDev 18 (pages AWP, HFSQL Classic, WLangage en français) que l'on va
réécrire en Next.js (App Router, TSX) + Node + PostgreSQL. On est à l'étape INVENTAIRE : aucun code à écrire,
aucun fichier du projet à modifier sauf le fichier d'annexe qui t'est assigné.

## Sources (toutes en lecture seule)
- ~/Projects/lecatalogue/Docs/dossier-technique.txt : dossier technique imprimé depuis WebDev, ~145 000 lignes, UTF-8.
  Contient le code WLangage de TOUT (projet, pages, classes, procédures globales, analyse, requêtes).
  Marqueurs « --- page N --- » = numéro de page imprimée. Repères :
    - Partie 1 Projet : lignes 1-1668 (le code d'initialisation du projet, avec le SELON Minuscule(AAType) qui
      dispatche les commandes Type=, est aux lignes ~690-1480).
    - Partie 2 Analyse (fichiers HFSQL, rubriques, clés) : lignes 1669-3398.
    - Partie 3 Pages (propriétés des champs + code) : lignes 3399-104636. Chaque page a des sections
      « Informations générales », « Informations sur les champs », « Code », « Code des champs », « Procédures ».
    - Partie 4 Requêtes : juste avant la partie 5.
    - Partie 5 Classes : lignes 104637-131930.
    - Partie 6 Procédures globales serveur : lignes 131931-143465 (« Procedures globales de lecatalogue » à partir de 132446).
    - Partie 7 Procédures navigateur : lignes 143466-fin.
  Cherche avec grep -n (ex. `grep -n "Procédure globale NomProc" Docs/dossier-technique.txt`,
  `grep -n "PROCEDURE NomProc"`), puis lis la plage avec sed -n 'a,bp'. Ne lis jamais le fichier en entier.
- ~/Projects/lecatalogue/.claude/CLAUDE.md et ~/Projects/lecatalogue/.claude/docs/*.md : carte du projet, pages, classes,
  modèle de données (42 fichiers HFSQL).
- ~/Projects/lecatalogue/Exe/lecatalogue.ini et LECATALOGUE_WEB/lecatalogue.ini : config (tu peux lire les NOMS de clés
  et la structure, JAMAIS recopier une valeur de mot de passe ou de clé).
- ~/Projects/lecatalogue/.htaccess, LECATALOGUE_WEB/ (CSS/JS/images, dossiers import/export/RecupEntrep/FichierXLS), FR/ et UK/
  (gabarits HTML générés par langue).
- ~/Projects/WinDev/DllUtils/*.cpp,*.h : sources C++ de la DLL DllUtils (CCryptage2 = chiffrement des paramètres).
- Le site public https://lecatalogue.ca (pages publiques seulement, aucune connexion, aucun compte).

## Interdits absolus
- Ne lis PAS les données clients : rien sous LECATALOGUE_WEB/bd/ (fichiers .FIC/.NDX/.MMO) ni les .log, ni Sauvegarde*/.
- Ne recopie JAMAIS dans ton annexe un mot de passe, une clé de chiffrement (même la constante PASS_CLIENT du code,
  la clé "Unsubscribe…", les clés dans CCryptage2.cpp), un login client, un courriel personnel ou une adresse IP réelle
  trouvés dans le code ou les commentaires. Désigne-les par leur emplacement (« constante PASS_CLIENT, code projet p.118 »).
  Les logins de test commentés dans le code (ex. « philippe ») sont aussi à omettre.
- Ne modifie aucun fichier autre que ton annexe. N'écris pas de code applicatif.

## Forme de l'annexe
- Markdown, en français (québécois), concis mais complet. Tableaux quand c'est tabulaire.
- Pour chaque élément inventorié, donne son emplacement dans le dossier technique (« --- page N --- » ou plage de lignes)
  pour qu'un lecteur puisse vérifier.
- Termine par une section « ## Points non vérifiés / incertitudes » : tout ce que tu as déduit sans l'avoir vu dans le code.
  Mieux vaut dire « non vérifié » que supposer.
- Termine ta réponse (pas le fichier) par : chemin du fichier, 5 lignes de résumé, questions ouvertes.
