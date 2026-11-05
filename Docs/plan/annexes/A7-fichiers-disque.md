# A7 — Fichiers lus ou écrits sur disque (inventaire)

Source : `Docs/dossier-technique.txt` (impression WebDev du 2026-10-01). Les repères « p.N » renvoient aux marqueurs
`--- page N ---` ; les plages « l.N » aux lignes du fichier texte. Les listages de dossiers sont des `ls` faits dans
`~/Projects/lecatalogue/` (noms et nombres seulement ; rien n'a été ouvert sous `LECATALOGUE_WEB/bd/`, dont le
listage détaillé est d'ailleurs bloqué par les permissions — voir § 10).

Lecture rapide : le site n'est pas qu'une application web. **Le dossier `LECATALOGUE_WEB/export/` sert de boîte aux
lettres entre le serveur et les logiciels Windows des clients (Estimateur Général, e-Plans)** : le logiciel appelle une
URL `?Type=xxx`, le serveur écrit un fichier réponse (`<login>_<heure>.txt`, `ResInf_*.res`, `.lst/.fst`, `.wdz`…), le
logiciel le relit en HTTP GET sur le dossier web, puis le serveur purge. S'y ajoutent trois grandes familles hors
dossier web : les **traces** (`c:\WebSite\Traces`), les **salles de plans** (`d:\SalleDePlans\dNNNNNN\<dossier>\`) et
la **base HFSQL** (`bd\LECATALOGUE\`, avec des mini-bases HFSQL par salle de plans).

---

## 1. Racines de répertoires : constantes, clés INI et valeurs en dur

| Symbole | Valeur (production) | Valeur en mode test (`EnModeTest()`) | Défini où | Rôle |
|---|---|---|---|---|
| `goConfig:m_sRepDisk` | `ComplèteRep(fRepWeb())` = dossier web `LECATALOGUE_WEB\` | idem | `CConfigCat::Constructeur` p.3132 (l.109059) | racine de tout le dossier web ; commentaires d'anciens chemins `c:\WebSite\lecatalogue\`, `c:\Inetpub\ftproot\`, `D:\inetpub\lecatalogue.ca\` |
| `goConfig:m_sRepBase` | `m_sRepDisk+"bd\LECATALOGUE\"` | idem (anciens `G:\EstimateurData\...` en commentaire) | p.3132 | base HFSQL principale ; passée à tous les `bSetAlias(Faux,goConfig:m_sRepBase)` |
| `goConfig:m_sRepWWW` | `m_sRepDisk+"www\"` | idem | p.3132 | mini-sites partenaires et bannières (`sGetBanniere` p.3138 l.109271) |
| `goConfig:m_sRepImport` | `m_sRepDisk+"import\"` | `h:\Temp\Catalogue\` (commande `import`, p.137) | p.3132 | dépôt des catalogues envoyés par le client |
| `goConfig:m_sRepExport` / `sGetRepExport()` | `m_sRepDisk+"export\"` | idem | p.3132, p.3141 | boîte aux lettres serveur→logiciel |
| `goConfig:m_sRepWeb` | `fRepWeb()` | idem | p.3132 | utilisé pour `FichierXLS\`, `RevisionAbonne.txt`, `Stats *.csv`, `IMAGES\ban_468` |
| `goConfig:m_sINIFile` | `m_sRepBase+"lecatalogue.ini"` | idem | p.3132 | INI « config » lu par CConfigCat (sections `COURRIEL`, `MIGRATION`, `REPERTOIRE`, `OPTION`) |
| `gsFicINI` (projet) | `m_sRepDisk+"lecatalogue.ini"` (= `LECATALOGUE_WEB\lecatalogue.ini`) | `H:\Mes Sites\lecatalogue\Exe\lecatalogue.ini` | code projet p.121 (l.616-620) | INI « site » (SMTP, CORRESP, ADDRSERVER, LISTEPRIX, PRIX_LOCATION, SDP, CHILKAT, PREPARENVOI) — **deux INI distincts**, voir § 4.2 |
| `sRepTrace` | `c:\WebSite\Traces` | `h:\Temp\Traces` | code projet p.118 (l.512-517) | racine de tous les logs (§ 4.1) |
| `gsRepConnect` | `sRepTrace\Compagnies\` (`REP_COMPAGNIES="Compagnies"` p.117) | | p.119 | un log par entreprise (`LogConnect`) |
| `gsRepDEMO` | `sRepTrace\DEMO\` | | p.119 | sous-dossier par IP démo |
| `gsRepLogIP` / `gsLogIP` | `sRepTrace\LogIP\LogIP<AAAAMMJJ>.log` | | p.119 | log journalier des IP |
| `sGetRepSalleClient()` | INI `[REPERTOIRE] REP_SALLECLIENT`, défaut `d:\SalleDePlans` | `h:\SalleDePlans\` (forcé dans `sGetRepSalle` p.4020) | `CConfigCat` p.3142 ; `sGetRepSalle` p.4019 | racine des salles de plans |
| `gsSDPRepAlternate` | **en dur** `"d:\SalleDePlans"` ; `gbSDPAlternate=Faux` | | code projet p.130 (l.983-987) | prévu pour une salle de plans sur un autre serveur (UNC avec IP réelle dans un commentaire, non recopiée). Les clés `SECTION_SDP="SDP"`, `CLE_REPSALLE="REP_SALLEDEF"`, `CLE_REPALTERN="REP_ALTERNATE"`, `CLE_ALTERNATE="ALTERNATE"` (p.115) sont déclarées mais **leur lecture INI est commentée** : code mort |
| `sGetRepReqRBQ()` | INI `[REPERTOIRE] REP_REQRBQ`, défaut `c:\WebSite\estimation.qc.ca\reqrbq` ; crée le dossier + un `index.html` de redirection (`bCreatIndexHTML` p.3131) | | p.3141 | réponses des requêtes RBQ (`rbq<numéro>.txt`) |
| `RecupEntrep\` | `m_sRepDisk+"RecupEntrep\"` (exe `RecupEntrep.exe` + base `COMPAGNIE.FIC`) | `H:\Mes Projets\RecupEntrep\BaseRBQ` | `bRequeteRBQ` p.3872, `ConstruitReqRBQ` p.3877 | outil externe RBQ |
| `Exceptions\` | `<parent de export>\Exceptions` = `LECATALOGUE_WEB\Exceptions\` | | `ReceptionException` p.3967 | zips d'exception reçus des logiciels |
| `sRepUser` (pages Catalogue/Catalogue2/Panier) | **en dur** `c:\WebSite\user\<login>\` | `h:\WebSite\user\<login>\` | Catalogue p.824 (l.25485-25493), Catalogue2 p.2425, Panier p.361 | PNG générés par `CParcoursTous` |
| `fRepEnCours()+"\"+login+".txt"` | répertoire courant du processus AWP | | Panier p.357 (l.8096) | fichier « panier » texte |
| `fRepExe()` | dossier `Exe\` (DLL, `Exception.txt`) | copie de DLL depuis `H:\Mes Projets\AvecEquipes\ESTIME 14\Exe\` (p.122-123) | code projet p.118-123 ; `CBasicObjet::MsgException` p.3243 | |
| `SauveCat<date> <heure>` | `m_sRepBase+"SaveCat"+DateSys()+" "+HeureSys()` | | `bImportCatalogue14` p.3866 | sauvegarde des anciens `.FIC` avant import |
| `LOGVERSION_<AAAAMM>` | `<parent de bd\LECATALOGUE>\LOGVERSION_AAAAMM\` | | `ReductionLogVersion` p.4001 | archivage mensuel du fichier LOGVERSION (appel commenté p.130) |
| `[PREPARENVOI] REPBASE / REPSAVE` | défauts `c:\EnvoiBern` et `c:\WebSite\bd\EnvoiBern` | | PAGE_UNSUBSCRIBE p.2176-2177 | base HFSQL externe `COURRIEL.FIC` (désabonnement) |
| `[OPTION] LIST_IP` | défaut `C:\WebSite\SauveListe\Liste IP Pirate.txt` ; **en dur** dans le bouton (`sGetListeIP` « plante ») | | AATableClient p.1572 (l.52730), p.1601 | liste d'IP à bloquer |
| `c:\temp\InfoLettre.htm` | en dur | | `sGetPageTirage` p.4018 | gabarit HTML du concours (2020-2021) |
| `c:\TraceDBG.txt` | en dur | | `CUTILS::TraceFic` p.3113 | trace de debug (appelé nulle part ailleurs, à vérifier) |
| `c:\WebSite\estimation.qc.ca\version\last\FTPRepClient.zip` | en dur, créé seulement pour le login du développeur | | `RecupWWWCommon` p.3993 | outil de debug : zip contenant `REPEXPORT=`/`REPSALLE=` |
| `ListeClient.txt` | **en dur** `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\ListeClient.txt` | `H:\Mes Sites\lecatalogue\ListeClient.txt` | `isAutoriseWWW` p.3928 | liste `clé;nom entreprise` (ancienne autorisation RBQ) |
| `Renouvellement.html` | `m_sRepBase+"Renouvellement.html"` | | AARenouvelle p.2457 (l.84396) | gabarit courriel, repli sur texte en dur |
| `RevisionAbonne.txt` | `fRepWeb()+"RevisionAbonne.txt"` | | ParamSMTP p.1724 (l.58312) | fichier de commande pour un exécutable externe (`gsNomProgEnvoi`, **jamais affecté**) |
| `H:\Temp\Catalogue` (`sRepDst`) | mode test seulement | | code projet p.118, p.125-126 | jeux d'essai import |

Nota : `fRepWeb()` et `fRepExe()` sont les deux fonctions WebDev qui ancrent tous les chemins relatifs ; les chemins
absolus (`c:\WebSite\...`, `d:\SalleDePlans`, `c:\temp`, `h:\...`) sont des lettres de lecteur Windows à remplacer par
de la configuration (variables d'environnement) dans la cible Node.

---

## 2. Ce qu'on voit sur disque (copie locale du site)

| Dossier | Contenu observé (noms/nombres seulement) |
|---|---|
| `LECATALOGUE_WEB/` (531 entrées) | 419 `.gif`, 37 `.png`, 32 `.jpg`, 3 `.bmp` (images générées WebDev `_<hash>_FR.GIF`), 8 `.js`, 6 `.css`, 2 `.class`, `_sitemap.xml`, `web.config` (mappage IIS → `wd180awp.exe`), `lecatalogue.ini`, **9 fichiers `Stat.csv` / `Stats 2024MMJJ.csv`** (statistiques admin, § 4.12) |
| `LECATALOGUE_WEB/import/` | vide (0) — normal : les `.imp/.wdz` sont supprimés après import |
| `LECATALOGUE_WEB/export/` (17) | `Entrep_<machine>_<n>.res/.fin` (5), `<ident>.zip/.res` de statistiques SDP (5), `Stat*.csv` (7, résidus de tests) |
| `LECATALOGUE_WEB/RecupEntrep/` (246) | base HFSQL RBQ (`DICOREF_N.fic/.NDX`, `DICOLIEN_N.fic/.NDX` ×37 chacun, `COMPAGNIE.FIC`…), 25 DLL PC SOFT (`WDN*.DLL`), 1 `.exe` (`RecupEntrep.exe`), `.ini`, `.log`, `.lock`, `.xls` ×3, fichiers datés « 2020 01 … 2023 12 » |
| `LECATALOGUE_WEB/FichierXLS/` (8) | `CataACQLAVALLAURENTIDES.pdf`, `CataACQMETRO.pdf`, `CataAPECQ.pdf`, `CataCEGQ.pdf`, `CataCONSTRUCTIONCA.pdf`, `CataCONSTRUNET.pdf`, `CataPGIP.pdf`, `CataSERV.pdf` (bons de commande, § 4.11) |
| `LECATALOGUE_WEB/bd/` (4 entrées) ; `bd/LECATALOGUE/` (131 entrées) | **données clients — non listées**. 131 ≈ 42 fichiers × (.FIC + .NDX + quelques .MMO) + INI/TXT/CSV divers |
| `LECATALOGUE_WEB/Exceptions/` | existe, vide (0) |
| `LECATALOGUE_WEB/user/` (3) | sous-dossiers par login (PNG générés) — noms non reproduits |
| `LECATALOGUE_WEB/bannieres/` (28) | 12 `.swf`, 8 `.gif`, 6 `.jpg`, 1 `.png` |
| `LECATALOGUE_WEB/www/` (29) | `.html/.htm`, `images/`, `imageref/`, `rbq/`, `stats/`, `temp/`, `pgip/`… ; `www/` racine du projet contient les mini-sites `acqmetro/ apecq/ cegq/ construnet/ constructionca/ acqlavallaurentides/ acqmonteregie/ demo/` |
| `LECATALOGUE_WEB/IMAGES/` | **absent** (le code `GestBan2` écrit dans `fRepWeb()+"\IMAGES\ban_468"`, p.1682) |
| `Exe/` (97) | 71 `.awl` (pages compilées), 6 `.dll`, `lecatalogue.wdl`, `lecatalogue.ini` (+ `- old.ini`), `lecatalogue.REP`, `DllUtils.pdb`, 2 `.waudit`, `images/` (12), **et des résidus HFSQL hors base** : `AAClient.TXT`, `Annonce.FIC/.MMO`, `Banniere.FIC`, `Banniere2.FIC/.ndx`, `Envoi.MMO`, `INFO_ECOLE.fic`, `PROVENANCE.fic`, `Version.FIC`, `20150325000736Interv.txt` |
| racine du projet | `ListeClient.txt` (+ copies/bak), `HstDuree.log`, `Taches/Tache.FIC/.MMO/.NDX` (tâches planifiées de l'IDE WebDev, pas du site), `Demo/` (swf), `SauveBan/` (10 bannières), `Historique/` (vide) |

---

## 3. Fonctions WLangage d'accès disque utilisées (occurrences dans tout le dossier, code commenté inclus)

| Fonction | Occ. | Notes de migration |
|---|---|---|
| `INILit` / `INIEcrit` | 180 / 159 | Le code **réécrit systématiquement chaque clé lue** (« pour avoir le fichier INI + valeur par défaut »). En Node : fichier de config lu une fois, jamais réécrit. |
| `fFichierExiste` | 63 | |
| `fSupprime` | 56 | souvent avec joker (`login*.*`, `*.png`) |
| `fOuvre` / `fFerme` / `fCrée` | 27 / 25 / 7 | la plupart via `CFichier` (§ 4.0) |
| `fEcritLigne` / `fLitLigne` / `fEcrit` / `fLit` | 24 / 10 / 8 / 2 | texte ANSI (Windows-1252) terminé CRLF ; `fLitLigne` lit jusqu'à CR/LF |
| `fTaille`, `fDate`, `fHeure` | 18 / 15 / 5 | purge par date de fichier ; `fDate` renvoie `AAAAMMJJ`, `fHeure` `HHMMSS` |
| `fRenomme` / `fDéplaceFichier` / `fCopieFichier` | 18 / 7 / 10 | renommage `.tmp→.txt` comme « commit » atomique |
| `fListeFichier` / `fListeRépertoire` | 13 / 4 | avec callbacks (`SupprimeFicSalle`, `SupprimeRepSalle`, `FoncSupprime`) |
| `fRepCrée` / `fRepSupprime` / `fRépertoireExiste` | 11 / 5 / nb. | `CUTILS::bRepCree` = création récursive |
| `fRepWeb` / `fRepExe` / `fRepEnCours` / `fDisqueEnCours` | 10 / 10 / 4 / 6 | `fRepEnCours(x)` **change le répertoire courant du processus** (PAGE_PROJET p.1949, `bImportCatalogue14` p.3868) : dangereux en multi-requêtes |
| `fCompacte` / `fDécompacte` (via `CUTILS::bCompacte/bDecompacte` p.3073-3074) | 2 / 1 | **format de compression propriétaire PC SOFT**, un seul fichier, pas une archive zip |
| `zipCrée` / `zipOuvre` / `zipAjouteFichier` / `zipExtraitFichier` / `zipExtraitTout` / `zipListeFichier` / `zipChercheFichier` / `zipFerme` | 4 / 6 / 8 / 8 / 1 / 1 / 3 / 9 | archives `.zip` (créées par le serveur) et `.wdz` (reçues des logiciels). En WebDev le format suit l'extension (à vérifier) : `.wdz` = **archive WDZ propriétaire** |
| `FichierAffiche` | 5 | téléchargement HTTP (PDF bon de commande, plans, CSV stats) |
| `UploadCopieFichier` | 1 | upload de bannière (GestBan2) |
| `fExtraitChemin`, `fFichierTemp`, `fRépertoireTemp` | 1 | `sGenereNomPDF` p.3810 (RAD, non appelé) |
| `HDéclareExterne` / `HChangeRep` / `HCréationSiInexistant` / `HAlias` / `HRéindexe` | — | HFSQL « fichiers » déplacés par répertoire (§ 4.15) |
| `LanceAppli` | 2 | `RecupEntrep.exe` (RBQ, p.3872) et `gsNomProgEnvoi` (ParamSMTP, p.3458) |
| `fBloque` / `fDébloque`, `foBloqueEcriture+foBloqueLecture` | — | verrous par fichier `.lock` (logs, `oper.lock`) |

Toutes les lectures/écritures passent par **des chaînes ANSI** (`chaîne ASCIIZ`, `fLitLigne` sans option UTF-8) : les
fichiers texte sont en Windows-1252 avec fins de ligne CRLF. Les noms de fichiers dérivés de noms de catalogues/clients
sont normalisés par `CUTILS::sSansAccent` + `Minuscule` (ex. p.3341 l.116180), mais les **noms de plans dans les salles
gardent leurs accents** (dictionnaire trié « sans accent + avec accent », `RecupDico` p.3975).

### 4.0 Classes utilitaires d'accès fichier

| Classe | p. | Rôle |
|---|---|---|
| `CFichier` (l.123302) | p.3552-3556 | wrapper `fCrée/fOuvre/fEcrit/fEcritLigne/fLitLigne/fLit/fFerme/fTaille`, `bFerme(Vrai)` supprime le fichier, `bBloque/bDebloque` chronométrés |
| `CCryptFic` hérite de `CFichier` (l.108650) | p.3117-3123 | fichier texte **chiffré par blocs** via `CDllNotify::lnCrypte/lnDecrypte` (DllNotify.dll) ; blocs de 129 à 1026 octets (pas de 3) encodés sur 4/3 ; clé = `minuscule(sansaccent(login+nom catalogue+mot de passe))` (`sCreatCle` p.3123, `bGetCle` lit le `.imp` pour reconstituer la clé). Utilisé pour les exports catalogue (`.csv` avant compactage), `ResInf_*.res`, l'ancien import (`bImport`), et `sRecupPassFic` (`<user>pop.prm`, p.3756, côté client) |
| `CUTILS` (l.106882) | p.3073-3113 | `bCompacte/bDecompacte` (fCompacte), `bCreatRep`, `bRepCree` (récursif), `bSupprimeFic`, `isFicExiste/isRepExiste` (`fRep`), `TraceFic` (`c:\TraceDBG.txt`), `sGetDrive` (`fDisqueEnCours`) |
| `CBasicObjet` (l.112431) | p.3239-3247 | `bCopieFichier` (copie bloc par bloc ou `fCopieFichier`), `LogGeneric` et `sTrace` (logs avec verrou `.lock` et **rotation à 2 Mo en `.bk1`…`.bk9`**), `MsgException` → `Exe\Exception.txt` |
| `CBasicHF` (l.110593) | p.3181-3215 | `AssignRep` (`HChangeRep` + réindexation si erreur 131113), `CreationSiInexistant` (`HCréationSiInexistant`, avec mot de passe HF optionnel), `bSupprimeFic(rep,table)` supprime `.fic/.ndx/.mmo` |
| `CLibPNG` (l.105101) | p.3004-3009 | `AppelDLL32("LibPNG","bCreatLig")` écrit un PNG ligne de texte (police MS Sans Serif/Arial) |
| `CZoneMem` | p.3567 | zones **mémoire** (`MemCrée`), pas disque |

---

## 4. Familles de fichiers

Légende « Lecteur » : *Serveur* = le site ; *EG* = Estimateur Général ; *EP* = e-Plans (logiciels Windows du client qui
récupèrent le fichier par HTTP GET sur `http://www.lecatalogue.ca/lecatalogue_web/export/...` — déduit du protocole et
des liens écrits dans les courriels d'exception p.3970 ; **non vérifié côté logiciel client**).

### 4.1 Traces et logs (`c:\WebSite\Traces\`)

| Fichier | Écrit par | Format / rotation | Contenu |
|---|---|---|---|
| `AATrace.log` | `TraceLog()` partout → `CBasicObjet::sTrace` (p.3246) | `AAAA/MM/JJ HH:MM:SS message`, TAB→espaces, verrou `AATrace.lock`, **rotation à 2 000 000 octets en `.bk1..bk9`** | trace générale (chaque requête logue `IP AAType >x<`, p.129) |
| `AALogRBQ.log` | `LogRBQ` → `CCommon::LogRBQ` (p.3611) | idem (`LogGeneric`) | requêtes RBQ |
| `AALogCatalog.log` | `LogCatalog` p.3937 | idem | import/export/liste catalogues |
| `AALogEstime.log` | `LogEstimation` p.3939 | idem | |
| `AALogFiche.log` | `gsLogFiche` (p.119) | idem | fiches clients (appelant à vérifier) |
| `AALogIntrus.log` | `LogGeneric(gsLogIntrus,…)` p.140 | idem | blocage d'IP (`isIntrus`) |
| `AALogSDPVide.log` | `LogSDPVide` p.3942 | idem | salles de plans vides |
| `LogIP\LogIP<AAAAMMJJ>.log` | `LogIP` p.3941 (AADownload p.1411, PAGE_PROJET p.1946) | un fichier par jour | IP des visiteurs |
| `Compagnies\<nom entreprise nettoyé>.log` (ou `DEMO.log`) | `LogConnect` p.3938 (caractères `<>:"|?*./\` → `_`) | | connexions des logiciels par entreprise |
| `DEMO\Demo_<ip avec _>\Demo_<ip>.log` | `RecupWWWCommon` p.3997 (`LogDemo`) | un dossier par IP | versions démo ; **relu** par PAGE_HISTODEMO p.2947 (`fListeRépertoire` + `fListeFichier *.log` + parsing des lignes) |
| `<salle>\Dossier.log` | `LogDossier` p.3939 | `LogGeneric` dans le répertoire de la salle de plans | journal par salle (conservé à la suppression, `isGarderFic` p.3932) |
| `Exe\Exception.txt` | `CBasicObjet::MsgException` p.3243 | ajout | exceptions |
| `c:\TraceDBG.txt` | `CUTILS::TraceFic` p.3113 | ajout | debug (probablement mort) |

Durée de vie : aucune purge des `.log` ; seule la rotation 2 Mo × 9 borne la taille. `LogGeneric` ne supprime le `.lock`
qu'en fin d'écriture (p.3242) ; `sTrace` ne le supprime pas (p.3247) : résidus `.lock` possibles.

### 4.2 Fichiers INI (deux fichiers, lus ET réécrits à chaque requête)

| Fichier | Sections / clés (noms seulement) | Qui |
|---|---|---|
| `LECATALOGUE_WEB\lecatalogue.ini` (`gsFicINI`, p.121) — en test `Exe\lecatalogue.ini` | `[CORRESP] Courriel, CourrielExcept, CourrielDstExcept` ; `[ADDRSERVER] IPADDRESS, PATH_DOWNLOAD` ; `[SMTP] SERVER, PORT, SECUR, LOGIN, PASSWORD(crypté)` (constantes `CLE_*`) ; `[LISTEPRIX]`/`[PRIX_LOCATION]` (`GlobInitPrixAchat/Locat`, `INIT_PRIX`) ; `[SDP] SDP_TARIFS, SDP_MAJORATION` ; `[CHILKAT]` (`SauveChilKat` p.4004 : écrit une clé reçue en paramètre d'URL — à abandonner) ; `[PREPARENVOI] REPBASE, REPSAVE` | code projet, `ReceptionException`, PAGE_UNSUBSCRIBE |
| `bd\LECATALOGUE\lecatalogue.ini` (`goConfig:m_sINIFile`) | `[COURRIEL] CODHEX, CHARSET, ENCODING, MAILER` ; `[MIGRATION] RBQ` (drapeau une-fois) ; `[REPERTOIRE] REP_REQRBQ, REP_SALLECLIENT` ; `[OPTION] LIST_IP` | `CConfigCat` p.3133-3142 |

Les deux INI sont **écrits** à chaque exécution du code projet (`INIEcrit` après chaque `INILit`) : contention
possible entre processus AWP ; et le mot de passe SMTP y est stocké (chiffré par `sGlobCryptePasse`, ne pas recopier).

### 4.3 Export de catalogues vers l'Estimateur Général (`export\`)

Déclencheur : URL `?Type=export|export14&AAUserC=<login>&AACatalogue=*|#n #m` (code projet p.137-138 → `bCréeExport`
p.3851). `liste`/`liste14` → `bCreeListe` p.3847 / `bCreeListe14` p.3848.

| Fichier | Écrit par | Format | Lu par / durée de vie |
|---|---|---|---|
| `export\<login> <nom catalogue>.csv` (temporaire) | `CMultiCat::bExportation` p.3341 (v12) / `bExport14` p.3340 | CSV `;` **chiffré `CCryptFic`** (clé login+catalogue+mot de passe) ; v12 = en-tête 24 colonnes + `bExportBloc` récursif (p.3270) ; v14 = sections `###METIERS`, `###EQUIPES`, `###ITEMCAT`, `###ASSEMB` (`bExportFic`, dump des rubriques) | supprimé après compactage |
| `export\<login> <catalogue>.wdz` | `CUTILS::bCompacte` (= `fCompacte`) | **compression propriétaire PC SOFT d'un fichier chiffré** | EG, via HTTP ; purgé par `SupprimeAncienFichiers` ? **non** (seuls `*.txt/*.res/*.fin`) → à vérifier : pas de purge des `.wdz` |
| `export\trades.csv` → `trades.wdz` | `bExportation` p.3343 (v12 seulement) | CSV non chiffré des métiers (`idTrade;Code;Taux;…`), compacté | idem |
| `export\<login> <nomresult>.exp` ou `<login>.exp` | `bCréeExport` p.3852 | 2 lignes : `www <nom>` et taille ; ou message « Abonnement expiré » | EG (témoin de fin) |
| `export\<login>.lst` / `.fst` | `bCreeListe(14)` | liste `#<MUCLEUNIK> - www <nom> - <daterev> - <numrev> - WWW <NOMMAJ>` ; `.fst` = `n catalogue(s)` ou message d'erreur bilingue | EG |

### 4.4 Import de catalogues depuis l'Estimateur Général (`import\`)

Déclencheur : URL `?Type=import&AAUserC=<login>&AACatalogue=<nom>_14` (p.137 → `bImportCatalogue14` p.3865 ; la v12
`bCréeImport`/`bImport` p.3852-3862 est **désactivée**). Les fichiers sont **déposés dans `import\` par le logiciel
client** (mécanisme d'upload non visible ici : FTP ? HTTP ? — non vérifié).

| Fichier | Écrit par | Lu par | Notes |
|---|---|---|---|
| `import\<login> <catalogue>_14.imp` | EG | serveur (`oFicImp:bLitLigne` = nom du catalogue en clair), puis **supprimé** (`bFerme(Vrai)`) | témoin + clé |
| `import\<login> <catalogue>_14.wdz` | EG | serveur : `zipOuvre` + `zipListeFichier` + `zipExtraitTout` **après `fRepEnCours(import\)`** | **archive WDZ contenant des fichiers HFSQL `.FIC/.NDX/.MMO`** (MULTICAT, ITEMCAT, LIENASMB, TRADES, TRADESTX, EQUIPELEM, EQUIPMEMB) ; la v12 utilisait au contraire `fDécompacte` d'un CSV chiffré |
| `import\<login> <catalogue>_14.err` | serveur (`oFicErr`) | EG (journal d'import, « Aucune erreur »…) | reste sur disque ; purge : `fSupprime(m_sRepImport+login+"*.*")` seulement si login inconnu/erreur (p.137, p.3882) |
| `import\<login> <catalogue>_14.deb` | serveur | EG (témoin « import en cours ») | supprimé à la fin (`bFerme(Vrai)`) |
| `bd\LECATALOGUE\SaveCat<AAAAMMJJ> <HHMMSS>\*.FIC` | serveur (`fDéplaceFichier` des anciens fichiers de la base) | `RestaureBase` p.4003 en cas d'échec | **jamais purgé** : un dossier par import |
| `bd\LECATALOGUE\<table>.FIC` | `bImportSpecial` (CMultiCat p.3353, CEstimeHF p.3154) : `HDéclareExterne` sur le `.FIC` extrait, recopie enregistrement par enregistrement vers la base (`hFixeIdAuto`) ; `CBasicHF::bSupprimeFic` efface EQUIPMEMB/MULTICAT temporaires | | remplace **tout** le catalogue (`MySupprimeTout`, `goTrades:bSupprimeTout`) |
| `import\<login>\<catalogue>.err` (chemin relatif !) | `ErreurImport` p.3907 | | ancien code, répertoire courant indéterminé |

### 4.5 Boîte aux lettres `export\` : requêtes des logiciels et fichiers réponse

Protocole : le logiciel appelle `?Type=<cmd>&AAUserC=<chaîne chiffrée>` (`sGlobDecryptePasse` → `login<TAB>mot de
passe<TAB>heure<TAB>…`) ; le serveur écrit **`export\<login>_<heure>.txt`** (via `.tmp` puis `fRenomme`), parfois
`.res`/`.fin`, et le logiciel le relit. L'« heure » dans le nom sert d'identifiant unique de requête.

| Commande (code projet p.131-140) | Procédure | Fichier(s) écrit(s) dans `export\` | Fichier(s) lu(s) | Contenu |
|---|---|---|---|---|
| `wwwlog` (démarrage des logiciels) | `RecupWWWCommon` p.3991 | `<login>_<heure>.tmp` → `.txt` (`bCreationResultat` p.3842 : autorisation, licences, COMMON, versions) | **`www_<login>_<heure>.txt`** déposé par le logiciel (1 ligne chiffrée : common, licences, IP, machine, versions, dates, login/mot de passe catalogue…), **supprimé après lecture** | + purge `SupprimeOld(*.txt/*.res/*.fin)` p.4054 (fichiers d'avant aujourd'hui ou > 5 min) |
| `wwwcom` (plus appelé) | idem `bDelRes=Vrai` | aucun | idem | |
| `recinf` (À propos) | `CreatInfoClient` p.3882 | `ResInf_<ident>.res` (**chiffré CCryptFic**, clés `NOMCIE=…COMMONn=…`, `ECOLE_*` via `AjoutEcole1` p.3821) puis `ResInf_<ident>.fin` (`OK`) ; nettoie d'abord `ResInf_<ident>.*` | | EG seulement |
| `eplanmaj` / `estimmaj` | `ePlanControle` p.3906 / `EstimControle` p.3908 | `<login>_<heure>.txt` : `Auth x y z [v14]` ou `##ERROR_*` | | |
| `sdplog` / `sdpmaj` | `RecupDirectorySDP` p.3975 | `<login>_<heure>.txt` : répertoire `dNNNNNN`, `ref,deleted,lastmodif`, `maxsize,maxtime`, tailles, autorisé, puis bloc `bGlobGetInfo` (Entreprise/Projet/Fichiers/Tailles/Answer/Captcha/InfoFic) | | crée le répertoire de la salle (`CUTILS::bCreatRep`) |
| `sdpcli` / `sdpacli` / `sdpscli` | `CreationListeClient` p.3887 | `<login>[_<userwindows>]_<heure>.tmp` → `.txt` : une ligne TAB par salle (numéro, référence, deleted, taille, dates, langue, description `DescProj.txt`, compteurs réponses) | `<salle>\DescProj.txt` | |
| `sdplist` | `CreationListeSDP` p.3891 | `export\<AAUserC>` (nom de fichier passé en paramètre !) : `##n` code ou bloc info | | |
| `sdpdel` | `DeleteSDP` p.3895 → `SupprimeUneSalle` | `<login>_<heure>.txt` : `delsdp OK` / `##erreur` | | |
| `sdpstat` | `bCreatFicStat` p.3828 → `bCreationFichierStat(2)` p.3829/3833 | `export\<AAAAMMJJHHMMSS…>.txt` (stats `op|timestamp|ip|…`) [+ `…Dico.txt` dictionnaire des plans] → **zippés** dans `<info>.zip` (`zipCrée`/`zipAjouteFichier`, `.txt` supprimés) + `<info>.res` (`Vrai`/`Faux`) | `<salle>\SDPSTAT.FIC`, `SDPFIC`, `INTERVEN`, cache `CACHEDICO/CACHEOPER` | refusé si date ≠ aujourd'hui |
| `sdpintv` | `RecupInfoInterven` p.3983 | — | **`<racine SDP>\ImportInterven\<timestamp>Interv.wdz`** (déposé par EG) → `zipExtraitFichier` → `<timestamp>Interv.txt` lu par `CInterven::bAlimBase` p.3593 puis **supprimé** ; `.wdz` supprimé | nettoyage des vieux `.wdz` **désactivé** (`SI Faux`) |
| `bid` | `RecupReponseInvitation` p.3986 | `export\<timestamp>Ret.res` (`CInterven::bGetReponse` p.3595 : `clé TAB réponse TAB timestamp`) + `<timestamp>Ret.fin` | `ImportInterven\<timestamp>Ret.wdz` → `.txt`, supprimés | |
| `sdpdownload` | `SDPDownload` p.4013 | — (stats seulement) | | e-Plans signale un téléchargement |
| `rbq`/`rbx` | `bRequeteRBQ` p.3869 | `Entrep_<ident>.fin` (`INTERDIT` / `LIMITE=n`) ; sinon **`LanceAppli(RecupEntrep\RecupEntrep.exe /… /REP="export\")`** qui produit `Entrep_<ident>.res/.fin` (observés sur disque) ; `SupprimeOld(Entrep_*.*)` | `isAutoriseWWW` lit `bd\LECATALOGUE\ListeClient.txt` | |
| `rbqcie` | `RecupRequeteCie` p.3988 | — (**corps entièrement commenté**) | `www_<login>_<heure>.txt` (commenté) | code mort |
| `reqrbq` | `ConstruitReqRBQ` p.3877 | `<REP_REQRBQ>\rbq<numéro>.txt` : URL RBQ **chiffrée `Crypte(…,crypteRapide+encodePCS)`** | `RecupEntrep\COMPAGNIE.FIC` via `HDéclareExterne` | |
| `delmono` | `TraiteMono` p.4065 | — | | |
| `testcharge` | `RecupFichierTest` p.3981 | `<param>.txt` (liste des processus Windows + mémoire) + `.fin` | | outil de diagnostic serveur |
| `newexcept` | `ReceptionException` → § 4.7 | | | |
| `liste`/`liste14`/`export*`/`import` | § 4.3-4.4 | | | |
| `chilkat` | `SauveChilKat` p.4004 | écrit dans l'INI | | à supprimer |
| `version`, `majversion` | `TraiteVersion*`, `goVersion:SetVersion` | — (HFSQL) | | |

Purge de `export\` : `SupprimeAncienFichiers` p.4050 (`*.txt`, `*.res`, `*.fin` plus vieux que l'heure courante -1 h,
appelée sur `export*`/`liste14` **seulement après 20 h**, et à chaque `newexcept`) ; `SupprimeOld` p.4054 (hier ou
> 5 min) à chaque `wwwlog` et `rbq`. Les `.zip` de stats, `.lst/.fst`, `.exp`, `.wdz` ne sont **jamais** purgés.

### 4.6 Salles de plans (`d:\SalleDePlans\`)

Arborescence (`sConstruitRepSDP2` p.4007 : `d`+clé AAClient sur 6 chiffres ; `sGetRepSalle` p.4019) :
`<REP_SALLECLIENT>\dNNNNNN\<numéro de dossier>\<sous-répertoires de plans>\<fichiers>`. L'ancien nommage
`dNNNNNN_<3 lettres du nom>` (`sConstruitRepOld` p.4006) est **renommé à la volée** (`fRenomme` de répertoire,
`sConstruitRepSDP` p.4007). Dossiers frères : `dNNNNNN\ImportInterven\` (§ 4.5) ; `oper.lock` à la racine de la base.

| Fichier | Écrit par | Lu par | Notes |
|---|---|---|---|
| `<salle>\<sous-rép>\<plan>.pdf/.jpg/.tif/.doc…` | **déposés par l'Estimateur Général** (hors site : transfert FTP/HTTP non visible ici) | PAGE_PROJET `DownLoadFile` p.1960-1961 : `FichierAffiche(sFic, mime, nom)` + stat `OP_DOWNLOADFIC` ; e-Plans directement (`sdpdownload`) | types MIME mappés : jpg/jpeg/pdf/gif/png/tif/tiff/txt/doc/docx, sinon `application/unknown` |
| `<salle>\DescProj.txt` | `bSauveInfoSalle` p.3876 (`oFic:bEcrit(sDescription)`, « car c'est un mémo texte et HF les perd ») | `CreationListeClient`, `isExistSalle` p.3931 | description du projet |
| `<salle>\Dossier.log` | `LogDossier` | admin | conservé |
| `<salle>\SDPDESC.FIC/.NDX/.MMO` | `goSDPDesc:bSetAlias(Faux,sRepDossier)` + `bSetDesc` (p.3530) | `bGlobGetInfo`, `bGlobRemplitEntete` | **mini-base HFSQL par salle** : mot de passe chiffré + requête chiffrée (`SDP_REQ` mémo) |
| `<salle>\SDPSTAT.FIC/.NDX`, `SDPFIC.FIC/.NDX/.MMO` | `goSDPStat:bAjoutStat`, `goSDPFic:bAjoutFichier` | `bCreationFichierStat*`, `RecupDico` | statistiques par salle ; `DispatchSDPStat` p.3897 a migré l'ancien `bd\LECATALOGUE\SDPStat.FIC` global vers les salles puis renommé en `.Fic.Old` |
| `<salle>\INTERVEN.FIC/.NDX` | `CInterven::bAlimBase` | `CreationListeClient`, PAGE_PROJET | intervenants/sous-traitants invités |
| `<REP_SALLECLIENT>\dNNNNNN\<logo>` | EG | PAGE_PROJET p.1949 (`InfoBitmap` après `fRepEnCours`) | logo de l'entreprise (chemin dans la requête, `Logo=`) |
| `<racine SDP>\<fichier param>` (`AAParam` de `creatsdp`) | EG | `bConstructionPage` p.3823 : lit la 1re ligne (requête chiffrée) puis **supprime le fichier** « sert de marqueur à l'EG pour savoir si la requête est finie » | |
| `bd\LECATALOGUE\oper.lock` | `bBloqueOper` p.3822 (`SupprimeAncienneSalle`) | | verrou inter-processus |
| `*.sdp` dans `dNNNNNN\` | — | `SuppressionFicSDP` p.4049 **désactivée** (`SI Faux`) | format inconnu, probablement ancien |

Cycle de vie : `SDP_MAXSIZE=500` Mo par client (p.115, l.367 ; `AAClient.SDP_MAXSIZE`, commentaire « +500 Mo si
< 4 Go, 1 Go si ≥ 4 Go »), `SDP_MAXTIME=60` jours ; `SommeSalles`/`dwGetSizeSalle8` p.3899-4020 recalculent la taille
par `fListeFichier(*,frRécursif)+fTaille` (hors `sdpdesc.*`). Expiration : `SupprimeAncienneSalle` p.4051 (**après
20 h seulement**, à chaque `creatsdp`, `sdplog/sdpmaj`, `sdplist`, `sdpacli`) marque `SDP_DELETED` quand
`SDP_DATELIMITE < aujourd'hui`, puis **7 jours plus tard** (`isTimeToDelFic` p.3518) `SupprimeFichierSDP` p.4053
efface tous les fichiers **sauf** `SDPSTAT/SDPFIC/SDPDESC/INTERVEN .FIC/.NDX/.MMO`, `Dossier.log`, `DescProj.txt`
(`isGarderFic` p.3932) et les sous-répertoires (`fRepSupprime`) ; le répertoire de la salle lui-même n'est pas
supprimé (« reste bloqué pour raison inconnue »). PAGE_PROJET supprime aussi les fichiers non référencés dans la
requête (`FoncSupprime` p.1963-1964, après 2 jours).

### 4.7 Exceptions reçues des logiciels (`LECATALOGUE_WEB\Exceptions\`)

`?Type=newexcept&AAParam=<E|P…>.zip&AAProject=<E|P>_<numprojet>_….zip` → `ReceptionException` p.3966-3971 :
`fDéplaceFichier(export\<fic> → Exceptions\<fic>)`, `zipOuvre` + `zipChercheFichier("Exception.txt"|"ComputerInfo.txt")`
+ `zipExtraitFichier` → lecture puis suppression du `.txt` extrait, courriel aux adresses `[CORRESP] CourrielDstExcept`
avec **lien HTTP public** `www.lecatalogue.ca/lecatalogue_web/Exceptions/<fic>` et pièce jointe. `Defauts.zip` détecté
dans le zip projet. Jamais purgé. `ReceptionProjet` p.3971 (`projexp`) est désactivé. Le dépôt dans `export\` par
le logiciel n'est pas visible ici.

### 4.8 RBQ (`RecupEntrep\`, `reqrbq\`)

`RecupEntrep.exe` (WinDev, 25 DLL PC SOFT à côté) lancé par `LanceAppli` depuis le processus web ; sa base
`COMPAGNIE.FIC` (+ `DICOREF_N`, `DICOLIEN_N` ×37 : dictionnaires versionnés) est lue directement par le site via
`HDéclareExterne` (p.3878). Résultats `Entrep_<ident>.res/.fin` dans `export\` (lus par EG). `rbq<numéro>.txt`
(chiffré) écrit dans `REP_REQRBQ` avec un `index.html` JavaScript de redirection (p.3131). Fichiers `.xls` ×3 et
« 2020 01 … 2023 12 » dans `RecupEntrep\` : produits par l'exe, rôle non vérifié.

### 4.9 PNG générés pour l'affichage du catalogue (`c:\WebSite\user\<login>\`)

`CParcoursTous::ZoneAjoute` p.3048 : `goPNG:bCreatPNG(ligne, <rep user>\<n><timestamp>.png, couleurs)` (LibPNG.dll)
pour chaque ligne de catalogue affichée ; `ZoneReset` p.3049 `fSupprime(<rep user>\*.png)`. Pages Catalogue p.824,
Catalogue2 p.2425, Panier p.361 (`SetRep2(m_sRepWeb, sRepUser)`), Assemblage (`goPNG:bSetTabulation`, p.~720). Le
dossier `LECATALOGUE_WEB/user/` existe (3 sous-dossiers) : mapping URL/disque à vérifier. **À remplacer par du HTML/CSS**.

### 4.10 Panier et export CSV du panier

- `fRepEnCours()\<login>.txt` : Panier p.357 (`fOuvre` création si inexistant, `fLitLigne` ; lignes `code;description;unité;…` et séparateurs `##catalogue`), `AjoutPanier()`/`FichierToMemoire` p.3910 (commentés). Le **répertoire courant du processus AWP** sert de stockage utilisateur : fragile.
- Catalogue p.835 (l.25843-25865) et Catalogue2 p.2427 (l.83550-83572) : `fEcritLigne(nIdFic, "code;description;unité;prix pose;…;daterevis")` — export CSV du panier (destination `nIdFic` à vérifier, code en partie commenté).

### 4.11 PDF bons de commande (`FichierXLS\`)

`CConfigCat::sGetBonCommandePDF` p.3138 : `m_sRepWeb\FichierXLS\Cata<PROVENANCE>.pdf` (en test
`h:\wdprojet\lecatalogue\lecatalogue_web\FichierXLS\`) ; `FichierAffiche(pdf,"application/unknown",nom)` dans
Commander p.937 (lien 11, + historique `BONCOMMPDF`). 8 PDF statiques, un par partenaire. Aucune génération PDF
côté serveur (`sGenereNomPDF` p.3810 est du RAD inutilisé ; `iImprime` absent).

### 4.12 Fichiers d'administration et divers

| Fichier | Où | Format | Notes |
|---|---|---|---|
| `fRepWeb()\Stats <AAAAMMJJ>.csv` | AATableClient `Statistiques1` p.1601-1628 | CSV `;` montants `%,2f` | puis `FichierAffiche` (téléchargement) ; **jamais supprimés** (9 présents à la racine web, accessibles publiquement) |
| `bd\LECATALOGUE\SauveHisto<date><heure>.csv` | LogList `DelHisto` p.953 | CSV | sauvegarde avant purge de l'historique |
| `<rep AAClient>\ListeEnvoi.csv` (= `bd\LECATALOGUE\`) | `CouponTirage` p.3879 | TAB | concours 2020-2021 (dates en dur) : code mort |
| `c:\temp\InfoLettre.htm` | `sGetPageTirage` p.4018 | HTML lu ligne par ligne (`Caract(10)`), URLs cdn réécrites | idem |
| `bd\LECATALOGUE\Renouvellement.html` | AARenouvelle p.2457 | HTML avec `@titre @nom @datefin` | gabarit optionnel |
| `fRepWeb()\RevisionAbonne.txt` | ParamSMTP p.1724 → `CEnvoiEMail::bCreationMessage` p.3457 | lignes `Type=`, `Sujet=`, `Param,n=`, `Mess=[[html]]` | puis `LanceAppli(gsNomProgEnvoi "fichier")` — **`gsNomProgEnvoi` n'est jamais affecté** : fonction morte |
| `C:\WebSite\SauveListe\Liste IP Pirate.txt` | AATableClient `BTN_RECH` p.1572 (lecture) | lignes `ip-ip`/CIDR (parsing `-`) | source externe inconnue |
| `bd\LECATALOGUE\ListeClient.txt` | `isAutoriseWWW` p.3928 (lecture) | `clé;nom entreprise` | maintenu à la main ? (copies à la racine du projet) |
| `Exe\Exception.txt` | § 4.1 | | |
| `d:\...\FTPRepClient.zip` | `RecupWWWCommon` p.3993 | zip d'un `.txt` | debug développeur |

### 4.13 Bannières (upload)

GestBan2 p.1682 : `UploadCopieFichier("ban", fRepWeb()+"\IMAGES\ban_468", nom)` puis enregistrement `Banniere2`
(nom de fichier en base, 50 car.). Le dossier `IMAGES\` n'existe pas dans la copie locale ; les bannières actuelles
sont dans `LECATALOGUE_WEB\bannieres\` (28) et `www\`. `GestBan2` fait aussi `HRéindexe(Banniere2,hNdxCompactage)` p.1683.

### 4.14 Désabonnement (base HFSQL externe)

PAGE_UNSUBSCRIBE `Desabonne` p.2176-2177 : `HDéclareExterne(<REPBASE>\COURRIEL.FIC,"COURRIEL")`, `HChangeRep`, puis
`fCopieFichier(COURRIEL.FIC → <REPSAVE>)` (sauvegarde du `.FIC` seul, sans `.NDX`). Base d'un autre logiciel
(« EnvoiBern ») — hors périmètre, à clarifier.

### 4.15 Base HFSQL Classic (`bd\LECATALOGUE\`) : opérations « fichier » sur la base

- Ouverture : `CBasicHF::AssignRep` → `HChangeRep(table, rep)` puis `HCréationSiInexistant(table[,mot de passe])`
  (p.3181, p.3203). Le fichier **AAClient est protégé par mot de passe HFSQL** (`PASS_CLIENT`, code projet p.118 ;
  `goAAClient:bSetAlias(Faux,rep,PASS_CLIENT)`) — à prévoir pour toute lecture directe des `.FIC`.
- Réindexation automatique sur erreur 131113 (index corrompu) ; `HRéindexe` dans GestBan2.
- Fichiers HFSQL **hors `bd\LECATALOGUE`** : par salle de plans (SDPDESC, SDPSTAT, SDPFIC, INTERVEN), `LOGVERSION_AAAAMM\`,
  `RecupEntrep\COMPAGNIE.FIC`, `EnvoiBern\COURRIEL.FIC`, résidus dans `Exe\`. Alias HFSQL (`HAlias`, `OLD_<table>`).
- Renommages `.fic→.fic.old`, `.ndx→.ndx.old`, `.mmo.Old` : `CEstimeHF::bImportSpecial` p.3155, `DispatchSDPStat` p.3899.
- Aucune sauvegarde planifiée visible (`HSauvegarde`/`HRestaure` : 0 occurrence). Les `.waudit` dans `Exe\` sont des audits de l'IDE.

### 4.16 Fichiers en mode test (poste du développeur)

Copie des DLL (`DllUtils.dll`, `libcrypto-41.dll`, `libssl-43.dll`, `libtls-15.dll`) depuis
`H:\Mes Projets\AvecEquipes\ESTIME 14\Exe\` vers `Exe\` si plus récentes (code projet p.122-123) ; jeux d'import
`H:\Temp\Catalogue\…` (p.125-126, commentés). À ignorer dans la migration.

---

## 5. Traitements planifiés et purges (il n'y a aucune tâche planifiée : tout est déclenché par une requête HTTP)

| Traitement | Déclencheur | Condition horaire | Portée |
|---|---|---|---|
| `SupprimeAncienFichiers(export)` p.4050 | `export`, `export14`, `liste14`, `newexcept` | `HeureSys() >= 20h` (sauf `newexcept` : toujours) | `*.txt/*.res/*.fin` de `export\` plus vieux d'1 h |
| `SupprimeOld(masque)` p.4054 | `wwwlog` (`*.txt`, `*.res`, `*.fin`), `rbq` (`Entrep_*.*`) | toujours | fichiers d'hier ou > 5 min |
| `SupprimeAncienneSalle` p.4051 | `creatsdp`, `sdplog`, `sdpmaj`, `sdplist`, `sdpacli` | `HeureSys() > 20h`, verrou `oper.lock` | salles expirées → deleted ; fichiers effacés 7 jours après |
| `FoncSupprime` (PAGE_PROJET p.1963) | ouverture d'une salle | si dernière modif > 2 jours | fichiers non référencés |
| Rotation des logs | chaque écriture | taille > 2 Mo | `.bk1..bk9` |
| `ZoneReset` (`*.png`) | navigation catalogue | | PNG de l'utilisateur |
| `CreatInfoClient` | `recinf` | | `ResInf_<ident>.*` précédents |
| `NettoyageCommon`, `ReductionLogVersion` (appel commenté) | `wwwlog` | | HFSQL |

Le dépendance « après 20 h » suppose un serveur à l'heure du Québec et des appels de logiciels le soir ; sinon rien
n'est purgé (le dossier `export\` local contient des résidus de 2023-2024).

---

## 6. Synthèse pour la cible Node/PostgreSQL

| Famille | Recommandation |
|---|---|
| Boîte aux lettres `export\`/`import\` (fichiers texte relus en HTTP GET) | remplacer par des réponses HTTP directes (JSON) **tant que les logiciels clients peuvent être mis à jour** ; sinon conserver un répertoire servi statiquement avec les mêmes noms + purge cron. Les formats `.wdz` (fCompacte / archive WDZ) et `CCryptFic` sont **propriétaires PC SOFT** : à ré-implémenter ou à abandonner avec une nouvelle version des logiciels (lié à A8). |
| Salles de plans | stockage objet ou disque dédié ; métadonnées (SDPDESC/SDPSTAT/SDPFIC/INTERVEN par salle) → tables PostgreSQL ; `DescProj.txt` → colonne ; téléchargement via route signée. Dépôt des plans par EG à documenter (hors dossier). |
| Logs | logger structuré (pino) + rotation ; les logs métier relus par l'application (DEMO, Dossier.log) → tables. |
| INI | config d'environnement, lecture seule ; mot de passe SMTP dans un secret. |
| PNG de lignes de catalogue | HTML/CSS. |
| PDF partenaires, bannières, mini-sites `www/` | assets statiques (`public/`) ; upload de bannière → stockage + validation. |
| `RecupEntrep.exe`, `wdmodfic`, `gsNomProgEnvoi`, `SauveChilKat`, concours, `TraceFic`, `FTPRepClient.zip`, `ListeClient.txt`, `Liste IP Pirate.txt` | code mort ou outil de poste : à supprimer ou remplacer par des tables. |

---

## Points non vérifiés / incertitudes

1. **Comment les logiciels clients déposent leurs fichiers** (`import\*.imp/.wdz`, `export\www_*.txt`,
   `ImportInterven\*.wdz`, zips d'exception, plans dans `d:\SalleDePlans`) : aucun code d'upload côté serveur
   (`UploadCopieFichier` ne sert qu'aux bannières). Hypothèse : FTP ou partage ; à confirmer avec le code de
   l'Estimateur Général / e-Plans. De même, la relecture des réponses par HTTP GET sur `lecatalogue_web/export/`
   est déduite des liens écrits dans les courriels d'exception, pas vue dans un client.
2. Format exact des archives `.wdz` : je suppose WDZ propriétaire (extension) et `.zip` standard pour celles créées
   par `zipCrée(...,"x.zip")`. WebDev 18 choisit le format d'après l'extension à confirmer dans la doc PC SOFT.
   Les `.wdz` d'**export** ne sont pas des archives mais des `fCompacte` d'un seul fichier chiffré.
3. Lecture des INI (`Exe/lecatalogue.ini`, `LECATALOGUE_WEB/lecatalogue.ini`) **refusée par les permissions** de la
   session : les noms de sections/clés ci-dessus viennent du code, pas des fichiers ; d'autres clés peuvent exister.
4. Le listage de `LECATALOGUE_WEB/bd/` et `bannieres/` a été partiellement refusé ; seuls les comptes (4 et 131
   entrées) sont sûrs.
5. `gsLogFiche` (`AALogFiche.log`) : déclaré et initialisé, appelant non retrouvé par grep (`LogFiche` absent).
6. `CUTILS::TraceFic` (`c:\TraceDBG.txt`) et `sGenereNomPDF` : aucun appelant trouvé ; probablement morts.
7. `SDPDownload` : les variables `sRepCie/sRepSalle` sont calculées avant lecture de `nIdClient` (bug apparent,
   corrigé plus bas dans la procédure) — comportement réel non testé.
8. Dossier `LECATALOGUE_WEB/user/` : correspond-il à `c:\WebSite\user\` en production (le code écrit un chemin
   absolu hors dossier web, mais les PNG doivent être servis en HTTP) ? Mapping IIS non vérifié.
9. `HstDuree.log`, `Taches/`, `.waudit`, résidus `.FIC` dans `Exe/` : attribués à l'IDE/au déploiement WebDev, non
   référencés par le code.
10. Fichiers `.xls` et dossiers datés dans `RecupEntrep/` : produits par `RecupEntrep.exe` (sources non lues ici).
11. Taille maximale des fichiers : aucune limite codée sauf `SDP_MAXSIZE` (500 Mo/client) et la rotation des logs ;
    les `CCryptFic` ont une limite de ligne (buffer 2048/16384 octets, p.3120-3122).
12. Le code commenté (nombreux `SI Faux ALORS`, `//`) a été compté dans les occurrences du § 3 ; les tableaux ne
    retiennent que le code actif, signalé « commenté/désactivé » sinon.
