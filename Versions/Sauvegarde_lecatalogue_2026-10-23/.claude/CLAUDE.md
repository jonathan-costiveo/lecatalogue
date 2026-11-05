# lecatalogue.ca — projet WebDev 18 (PC SOFT)

Site dynamique **AWP** (pages WebDev « semi-dynamiques ») servi par le moteur WebDev 18
(`/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue`, voir `.htaccess`). Langage : **WLangage** (en français).
Base de données : **HFSQL Classic** (fichiers `.FIC/.NDX/.MMO`). Site bilingue FR/UK.
Domaine métier : catalogue d'items de construction/estimation (catalogues, sections, assemblages, unités,
métiers/taux), gestion des clients et licences des logiciels d'estimation (Estimateur Général, e-plans,
modules), SDP (salle de plans), RBQ (Régie du bâtiment du Québec), bannières partenaires, envoi de courriels.

Pas de dépôt git. Le chemin d'origine sous Windows est `H:\Mes Sites\lecatalogue\` (et `E:\Wdprojet\lecatalogue\` dans les anciens fichiers).

## Point capital : les sources ne sont pas lisibles ni éditables ici

Les éléments WebDev 18 sont des **binaires compressés PC SOFT** (en-tête `PCS`). Je ne peux **ni lire le code
WLangage ni modifier** `.wwh`, `.wdc`, `.wdg`, `.WWP`, `.wdd`, `.WDR`, `.wwt`, `.wws`. Les modifier
corromprait le projet. Toute modification se fait dans l'éditeur WebDev par l'utilisateur.

Mon rôle concret :
- écrire du **WLangage** (procédures, méthodes de classe, code de champ) que l'utilisateur colle dans WebDev ;
- expliquer et déboguer à partir de ce que l'utilisateur colle (code, messages d'erreur, traces) ;
- travailler sur ce qui est en texte : HTML/JS/CSS générés, `.ini`, `.htaccess`, CSV, scripts d'outillage ;
- s'appuyer sur les index de `.claude/docs/` pour situer pages, classes et tables.

Le code WLangage est lisible (en lecture seule) dans `Docs/dossier-technique.txt` : le dossier technique
imprimé depuis WebDev (2026-10-01) qui contient le code de toutes les pages, classes et procédures, l'analyse et les requêtes.
Le chercher là d'abord (`grep -n "Procédure globale X\|Méthode X"`). S'il manque, ou s'il faut la version actuelle
d'un élément modifié depuis, demander le code à l'utilisateur plutôt que de deviner.

## Dossier technique (`Docs/`)

- `Docs/lecatalogue.rtf` (≈1 Go, Windows-1252) : impression « Dossier technique » de WebDev au format RTF.
  Chaque mot y est un cadre positionné et il contient des images WMF. Ne pas le lire directement.
- `Docs/dossier-technique.txt` (UTF-8, ≈145 000 lignes) : texte extrait par
  `python3 .claude/scripts/rtf_dossier.py Docs/lecatalogue.rtf Docs/dossier-technique.txt` (≈2 s).
  Le code garde son indentation. Les marqueurs `--- page N ---` reprennent la numérotation imprimée (table des matières en Partie 8).
  Les instructions que l'impression a coupées en bout de ligne sont recollées (≈260 cas) ; les `...` sont
  des continuations écrites par le développeur. Une coupure qui tombe sur un saut de page n'est pas recollée.
- Parties : 1 Projet · 2 Analyse · 3 Pages (propriétés des champs et code) · 4 Requêtes · 5 Classes ·
  6 Procédures globales serveur · 7 Procédures navigateur · 8 Table des matières.
- Après une réimpression du dossier depuis WebDev, relancer le script.

## Index générés (à consulter d'abord)

- [docs/modele-donnees.md](docs/modele-donnees.md) — les 42 fichiers HFSQL, rubriques, types, clés (depuis `lecatalogue.xdd`, l'analyse exportée en XML).
- [docs/classes.md](docs/classes.md) — classes `.wdc` et noms de leurs méthodes (certaines sont entièrement compressées).
- [docs/pages.md](docs/pages.md) — pages `.wwh` avec date de modification et champs (depuis les gabarits `FR/*.htm`).

Régénérer après une modification dans WebDev : `python3 .claude/scripts/gen_index.py`.
L'analyse XML (`lecatalogue.xdd`) n'est à jour que si elle a été réexportée depuis WebDev.

## Carte du dossier

| Élément | Rôle |
|---|---|
| `lecatalogue.WWP` | Projet WebDev |
| `lecatalogue.wdd`, `lecatalogue.wd7/` | Analyse (binaire) ; `lecatalogue.xdd` = export XML lisible |
| `*.wwh` | Pages (77). `AA*` = administration clients/licences ; `PAGE_*` = pages récentes (SDP, désabonnement, notes, RBQ…) |
| `*.wdc` | Classes. Couche d'accès HFSQL commune : `CBasicHF` (bLitRecherche, bAjoute, bModifie…), `CBasicObjet` ; une classe par fichier de données (`CClient`, `CCatalog`, `CMulticat`, `CTrades`…) |
| `Procedures globales de lecatalogue.wdg` | Procédures globales serveur (≈1,2 Mo) |
| `Procédures globales de lecatalogue_Navigateur.wwn` | Procédures navigateur → `LECATALOGUE_WEB/lecatalogue.js` |
| `*.WDR` | Requêtes |
| `ActivXP.WWS`, `*.wwt`, `*.wpc`, `*.css` | Gabarit/ambiance ActivXP et styles |
| `FR/`, `UK/` | Gabarits HTML générés par langue (balises `[%CHAMP..PROP%]`) — **générés, ne pas éditer** |
| `Exe/` | Dossier d'exécution : `.awl` (pages compilées), `lecatalogue.wdl`, DLL, `lecatalogue.ini` |
| `LECATALOGUE_WEB/` | Dossier web déployé : CSS/JS/images, `bd/LECATALOGUE/` (**données clients HFSQL**), `RecupEntrep/`, `import/`, `export/`, `FichierXLS/` |
| `www/` | Mini-sites des partenaires (acqmetro, apecq, cegq, construnet…) |
| `Sauvegarde/`, `Sauvegarde_Version12/`, `*.old`, `*.bak`, `lecatalogue.wd7.old/`, `*_WBINST*.WWF` | Sauvegardes et anciennes versions : ignorer sauf demande |
| `DllNotify.dll`, `LibPNG.dll`, `Exe/DllUtils.Dll` | DLL externes appelées via `CDllNotify`, `clibpng`, `CDllUtils` |

Les fichiers suffixés `2`, `3`… (`AAFicheClient2`, `ProfilClient2`, `Accueil2`) sont généralement les
versions actives qui remplacent l'original. Vérifier la date dans `docs/pages.md` avant de supposer.

## Configuration et sécurité

- `Exe/lecatalogue.ini` et `LECATALOGUE_WEB/lecatalogue.ini` : courriels, serveur SMTP (smtp2go),
  **mot de passe SMTP en clair**, et grille de prix des licences (`[LISTEPRIX]`). Ne jamais recopier
  le mot de passe dans une réponse, un fichier ou une commande.
- `LECATALOGUE_WEB/bd/` contient les données réelles des clients (noms, courriels, logins). Ne pas
  lire, exporter ni modifier sans demande explicite.
- La rubrique `Client.Password` est un texte de 15 caractères ; `CClient` a `isPassCrypte`/`SetPassCrypte` :
  vérifier si le mot de passe est chiffré avant d'écrire du code qui le manipule.

## Conventions WLangage du projet

- Code, identifiants et commentaires en **français**.
- Notation hongroise sur les méthodes et variables : `b` booléen, `s` chaîne, `n`/`ln` entier,
  `d` réel, `c` caractère, `dw` entier sans signe, `is…` pour les tests, `Set…`/`sGet…` pour les accesseurs.
- Accès aux données via les classes métier qui héritent de `CBasicHF` plutôt que des `HLit*` directs
  dans les pages. Suivre ce modèle pour le nouveau code.
- Champs de page : `BTN_`, `SAI_`, `SEL_`, `INT_`, `TAB_`, `IMG_`, `ZONEREPETEE…`.
- Écrire pour **WebDev 18** (2013) : éviter les fonctions ou la syntaxe arrivées dans des versions
  ultérieures (ex. la syntaxe préfixée `sChaine.Remplace(...)`). En cas de doute sur la disponibilité
  d'une fonction en version 18, le signaler.
- Encodage : les fichiers texte historiques sont en **ISO-8859-1** (Windows-1252) avec fins de ligne CRLF ;
  conserver cet encodage en les éditant. Les gabarits `FR/` récents sont en UTF-8.

## Langue

Répondre en français (québécois), comme l'utilisateur.
