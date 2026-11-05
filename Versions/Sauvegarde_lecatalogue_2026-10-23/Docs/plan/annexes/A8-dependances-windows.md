# A8 — Dépendances Windows et PC SOFT à remplacer

Inventaire des points où le site lecatalogue.ca (WebDev 18, WLangage) dépend de Windows (API Win32, registre,
lettres de lecteur, processus, DLL maison) ou de mécanismes propriétaires PC SOFT (chiffrement `Crypte`,
archives WDZ, `fCompacte`, courriel natif, HFSQL Classic, zones mémoire `Mem*`, threads WLangage), avec pour
chacun l'emplacement dans le dossier technique (`Docs/dossier-technique.txt`, repère « p.N » = page imprimée),
son rôle et une recommandation pour la cible Next.js / Node / PostgreSQL.

Conventions : « code projet » = Partie 1, code d'initialisation du projet (p.113-141) ; « PG » = Procédures
globales de lecatalogue (Partie 6, p.3819-4072). « XX » suffixé à un nom de méthode = méthode désactivée par le
développeur (convention du projet). « Mort » = aucun appelant trouvé dans tout le dossier (grep des noms de
méthodes/procédures, lignes commentées exclues).

Point de départ : la liste « Erreurs, warnings et informations » du projet (p.142-143) qui recense les
fonctions « interdites en Linux » signalées par le compilateur WebDev : `EmailLitTimeOut` (Oubli, Contact,
Commander, TestCourriel, EnvoiTirage, ReceptionException), `InfoBitmap` (PAGE_PROJET), `RéseauUtilisateur`
(CEmail.sNomFicPass), `RéseauNomRep` (CUTILS.isDriveReseau), `SysVersionNuméro` (CUTILS.ElimineCacheSysteme),
`fDisqueEnCours` (CUTILS.sGetDrive), `DDEErreur` (CUTILS.sGetDDEErreur), `RegistreLit/Ecrit/CréeClé`
(CUTILS.bEcritRegistre), `ThreadSuspend/ThreadReprend` (CParcoursTous.bPageSuivante). Cette liste est
incomplète : elle ne couvre pas `AppelDLL32`/`API` (109 appels), `LanceAppli`, `ChargeDLL`, `Crypte`, `zip*`…
qui sont tous détaillés ci-dessous.

---

## 1. Tableau récapitulatif

| # | Dépendance | Où (élément, p.) | Rôle | Vivant ? | Recommandation Node/TS |
|---|---|---|---|---|---|
| 1 | **DllUtils.dll** (C++ MFC maison) — envoi SMTP TLS, chiffrement CCryptage2 | CDllUtils p.3461-3500 ; instancié `goDllUtils` code projet p.123 | Tout le courriel sortant du site passe par `bSendMail` → `nSMTPSendMailEx` (via CEmail.bEnvoyerMail2 p.3744, CAAEmail.bEnvoiMessage p.3454, ProfilClient2 p.579, ParamSMTP p.1798) ; chiffrement des paramètres d'URL/INI par `CR_*` | **Oui** (cœur) | SMTP : **nodemailer**. Chiffrement : réimplémenter CCryptage2 en TS (travail séparé) ou abandonner le format après migration des données chiffrées (mot de passe SMTP dans l'INI, paramètres `Type=` des logiciels clients) |
| 2 | **libcrypto-41 / libssl-43 / libtls-15** (LibreSSL 2.5.5, 2017) | `Exe/`, liste des éléments p.108 ; copie en mode test p.122 | TLS pour CSmtp.cpp (STARTTLS/SSL) | Oui, via DllUtils | Disparaît avec nodemailer (TLS natif Node) |
| 3 | **DllNotify.dll** (C++ maison, projet « FNotify V9 ») | CDllNotify p.3370-3377 ; `goDllNotify` p.123 | Ici seulement : `bCrypte`/`bDecrypte`/`bAllocBuf`/`bFreeBuf` pour CCryptFic (fichiers texte chiffrés échangés avec les logiciels clients) ; notifications de répertoire **non utilisées** par le site | Oui (CCryptFic) | Réimplémenter l'algorithme `bCrypte/bDecrypte` en TS (**non détaillé ici**, source `~/Projects/WinDev/FNotify V9/DllNotify/CCryptage.cpp`) ou remplacer le format d'échange par HTTPS + JSON signé si les logiciels clients sont aussi mis à jour |
| 4 | **LibPNG.dll** (maison, GDI) | CLibPNG p.3004-3009 ; `goPNG` p.120 | Génère une image PNG **par ligne** du catalogue (texte tabulé rendu avec une police GDI « Arial 16 ») pour la page Catalogue et le parcours CParcoursTous | Oui (page Catalogue) | **Supprimer** : rendre les lignes en HTML/CSS. Si l'anti-copie par image est voulu : `sharp` + SVG texte, ou `@napi-rs/canvas` |
| 5 | **RecupEntrep.exe** (exe WinDev externe, lib Chilkat) lancé par `LanceAppli` | PG bRequeteRBQ p.3869-3872 ; `SauveChilKat` p.4004 ; `[CHILKAT]` INI p.115, p.135 | Requête RBQ (Régie du bâtiment) exécutée hors processus ; résultat déposé en fichiers `Entrep_<id>.fin` dans `export/` | Oui (commande `Type=rbq/rbx`) | Réécrire la requête RBQ en Node (`fetch` + parsing HTML/JSON du site de la RBQ) ou en worker/queue ; plus de processus externe ni de clé Chilkat |
| 6 | **Programme d'envoi externe** `gsNomProgEnvoi` (`LanceAppli`) | CEnvoiEMail.bDemarre p.3458 ; appelant AAConfigure p.1724 | Révision d'abonnement : génère un fichier `RevisionAbonne.txt` puis lance un exe tiers qui envoie les courriels | Oui (admin) mais `gsNomProgEnvoi` jamais initialisé dans le code lu (p.118-123) → probablement **cassé** | Remplacer par un job Node (BullMQ/cron) + nodemailer |
| 7 | **Win32 psapi/kernel32** : énumération et kill de processus | page ListProcess p.1853-1856 ; PG KillProcess p.3933-3934 ; PG nEnumProcess p.3962-3963 ; CDllUtils.nEnumProcess p.3488 | Liste/tue les processus `RecupEntrep.exe` orphelins sur le serveur ; page admin ListProcess (depuis TableClient p.1239) ; commandes `Type=rbq&…=listprocess/killrecup` p.136 ; `Type=testcharge` p.135 | Oui (outillage serveur) | **Supprimer** avec RecupEntrep.exe. Si un worker Node reste : `node:process`/`child_process` et supervision par PM2/systemd |
| 8 | **GlobalMemoryStatusEx** (kernel32) | PG bGetMemoryInfo p.3855-3856 ; appelé par RecupFichierTest p.3981-3983 | Diagnostic mémoire du serveur écrit dans un fichier `<param>.txt` + `.fin` (commande `Type=testcharge`) | Oui (debug) | `node:os` (`os.totalmem/freemem`) ou supprimer |
| 9 | **Registre Windows** `RegistreLit/Ecrit/CréeClé` | CUTILS.bEcritRegistre p.3075 | Écriture registre | **Mort** (aucun appelant) | Supprimer |
| 10 | **GDI/user32** (`CreateFontIndirect`, `DrawText`, `GetTextExtentPoint32`, `GetWindowRect`, `MoveWindow`, `LoadCursorFromFile`, `GetKeyState`, `BitBlt`…) | CWINAPI p.3126-3128 ; CUTILS GetRectText p.3082, GetWindowPos p.3083, SetWindowPos p.3096, nGetTailleChaine p.3092, bLoadCursor p.3076, DestroyCursor p.3078, isCtrlEnfonce p.3088, GetRectColonnes p.3081 (commenté) | Héritage WinDev (fenêtres) sans sens sur un site | **Mort** (CWINAPI n'est appelée que par ces méthodes mortes de CUTILS et par bGetMemoryInfo pour `lnGetLastError`) | Supprimer |
| 11 | **mpr.dll** `WNetAddConnection/CancelConnection/GetLastError` | CUTILS bAddConnect p.3072, bCancelConnect p.3073, WNetGetLastError p.3114 | Mappage de lecteurs réseau | **Mort** | Supprimer |
| 12 | **kernel32** `GlobalAlloc/Lock/Free`, `GetLogicalDrives` | CUTILS pMalloc p.3093, bFree p.3075, bGetFreeDrive p.3076 | Mémoire brute pour structures passées à la DLL (pMalloc/bFree utilisés par CDllUtils.bSendMail p.3480-3481) ; liste des lecteurs | pMalloc/bFree vivants via bSendMail ; bGetFreeDrive mort | Disparaît avec nodemailer |
| 13 | **Lettres de lecteur / chemins Windows en dur** (`c:\WebSite\…`, `d:\SalleDePlans`, `h:\…`) | voir §5 | Traces, salles de plans, listes IP, INI, PDF, catalogues de test | Oui (prod + poste de dev) | Centraliser dans la config (`.env`), chemins POSIX, `node:path` |
| 14 | `fRepExe`, `fRepWeb`, `ExeInfo`, `EnModeTest` | code projet p.118/123 ; CConfigCat ctor p.3132 ; CBasicObjet.MsgException p.3243 ; CUTILS.cGetRepSysxx p.3078 | Racine `Exe/` (DLL) et racine web (`LECATALOGUE_WEB/`) | Oui | Variables d'environnement ; `process.cwd()`/`import.meta.dirname` |
| 15 | `fDisqueEnCours`, `RéseauNomRep`, `SysVersionWindows` | CUTILS sGetDrive p.3097, isDriveReseau p.3088, ElimineCacheSysteme p.3080 | Utilitaires poste Windows | **Mort** | Supprimer |
| 16 | `RéseauUtilisateur` | CEmail.sNomFicPass p.3756 (+ sRecupPassFic p.3757) | Fichier `pop.prm` de mot de passe par utilisateur Windows (héritage logiciel desktop) | **Mort** | Supprimer |
| 17 | **DDE** `DDEErreur` | CUTILS.sGetDDEErreur p.3096-3097 | Messages d'erreur DDE | **Mort** | Supprimer |
| 18 | **Crypte/Décrypte PC SOFT** (`compresseChaîneCourte+encodePCS`, `crypteAnsi+encodePCS`, `crypteRapide+encodePCS`) | PAGE_NUMSDPX p.2035, PAGE_NUMSDP2 p.2142, PAGE_SDPDELETED p.2326, PAGE_UNSUBSCRIBE p.2173, PG ConstruitReqRBQ p.3878, PG EnvoiTirage p.3904 | Paramètres chiffrés dans les URL de courriel (invitations SDP, désabonnement), fichier de requête RBQ, mot de passe SMTP du tirage dans l'INI | Oui (liens dans des courriels déjà envoyés !) | Format propriétaire non documenté : **impossible à réimplémenter fidèlement**. Pour les liens : nouveau jeton signé (`crypto` HMAC/JWT) et page de compatibilité qui refuse poliment les anciens liens ; pour l'INI : re-saisir le secret |
| 19 | **CCryptage2 via DllUtils** (`sGlobCrypteChaine/sGlobCryptePasse/sGlobDecryptePasse`, `sDecrypteInfo`, `CDllUtils.sDecryptePasse`) | PG p.3811-3814, p.4008-4009 ; ParamSMTP p.1801-1802 ; CAAEmail p.3453-3454 ; CEmail p.3743 ; ~15 appelants (voir §3.2) | Mot de passe SMTP dans l'INI ; identifiants `login<TAB>pass<TAB>heure` transmis par les logiciels clients (Estimateur Général, e-Plans) dans les commandes `Type=` ; paramètres des salles de plans | **Oui** (protocole avec les logiciels clients) | Réimplémentation TS de CCryptage2 (travail séparé) **obligatoire** tant que les logiciels clients ne changent pas ; à terme HTTPS + jeton |
| 20 | **Archives WDZ** (`zipCrée/zipOuvre/zipAjouteFichier/zipExtraitFichier/zipExtraitTout`) | PG bCreationFichierStat p.3833, bCreationFichierStat2 p.3842, bImportCatalogue14 p.3867-3868, ReceptionException p.3968-3969, ReceptionProjet p.3972-3973, RecupInfoInterven p.3985, RecupReponseInvitation p.3987-3988, RecupWWWCommon p.3993 | Échange de fichiers avec les logiciels clients (import catalogue `.wdz`, intervenants `…Interv.wdz`, réponses `…Ret.wdz`, exceptions `.zip`, stats SDP, `FTPRepClient.zip`) | Oui | `.zip` : **yauzl/adm-zip/archiver**. `.wdz` : format PC SOFT **propriétaire** — à vérifier si c'est du ZIP renommé (header `PK`) ; sinon exiger `.zip` côté logiciels clients |
| 21 | **fCompacte/fDécompacte** PC SOFT | CUTILS bCompacte/bDecompacte p.3073-3074 ; CMultiCat bExport14 p.3341, bExportation p.3343 ; PG bCréeImport p.3853 | Compression propriétaire des exports catalogue (`.csv` → `.wdz`) et des imports | Oui | Format propriétaire : remplacer par gzip/zip (`node:zlib`) et mettre à jour le logiciel client |
| 22 | **Courriel natif PC SOFT** (`EmailOuvreSessionSMTP`, `EmailEnvoieMessage`, variable `Email.*`, `EmailLitTimeOut`) | Batch.EnvoiCourriel p.1022-1023 ; AATableClient (bouton liste des abonnés) p.1571-1572 ; CEmail.bEnvoyerMail p.3738-3742 ; `EmailLitTimeOut` × 6 (p.285, 651, 935, 3905, 3971, 4058) | Envoi sans TLS (port 25) — chemin ancien ; `EmailLitTimeOut` ne sert qu'à initialiser un délai | Batch : page jamais affichée (**mort**) ; AATableClient : vivant (admin) ; CEmail.bEnvoyerMail : **mort** (seul bEnvoyerMail2 est appelé) | nodemailer ; supprimer `EmailLitTimeOut` |
| 23 | **Threads WLangage** `ThreadSuspend/ThreadReprend("Thread1")` | CParcoursTous.bPageSuivante p.3033-3034 ; `ThreadExécute` commenté p.3039 | Reliquat : le parcours est appelé **synchrone** (p.3039) ; le thread n'existe pas | Oui mais inopérant | Supprimer ; pagination côté requête SQL |
| 24 | **Zones mémoire PC SOFT** `MemCrée/MemAjoute/MemPositionne…` | CZoneMem p.3567-3585 (≈25 instanciations), CParcoursTous p.3038, CCatalog p.3270/3288, CEstimeHF p.3150, CMultiCat p.3337, CDllNotify p.3375 | Listes triées en mémoire du processus AWP (résultats de recherche, cache de pages, listes IP…) | Oui | `Map`/tableaux TS ; cache partagé → Redis ou requêtes SQL |
| 25 | **HFSQL Classic spécifique** (`HChangeRep`, `HAlias/HChangeNom`, `HDéclareExterne`, `HCréeVue`, `HRéindexe`, `HBloque*`, `HErreurBlocage/HDejaBloque`, `HListeRubrique/HListeClé/HConstruitValClé`, `HCopieEnreg`, `HRAZ`, `HExtraitMémo`) | CBasicHF p.3177-3218, CEstimeHF p.3148-3176, CMultiCat p.3353-3359, ExcelClient p.1307-1309, GestBan2 p.1683, PAGE_UNSUBSCRIBE p.2176-2177, PG ConstruitReqRBQ p.3878 | Couche d'accès « fichier par répertoire » : alias par client, fichiers externes `.FIC` déposés par les logiciels, vues, verrouillage d'enregistrement, réindexation | Oui (cœur) | PostgreSQL : schémas/colonnes `id_client`, transactions et `SELECT … FOR UPDATE` ; import de `.FIC` externes à remplacer par un format d'échange (CSV/JSON) |
| 26 | **INILit/INIEcrit** sur `lecatalogue.ini` (réécriture à chaque démarrage) | code projet p.121 ; CConfigCat p.3133-3142 ; CAAEmail p.3453 ; ~30 appels | Configuration + grille de prix + secrets | Oui | `.env` + table `parametres` ; plus d'écriture au démarrage |
| 27 | **Timer()/FinTimer()** | Catalogue p.841-843, PAGE_PROJET p.1953-1954, AAFicheClient2 p.2834 | Code **navigateur** (reconnexion, recalcul) | Oui | `setInterval` côté client — pas une dépendance Windows |
| 28 | `LanceAppliAssociée(url)` | PAGE_PROJET p.1955, PAGE_NUMSDPX p.2038, PAGE_DECONNECT p.2048, PAGE_DEPASSE p.2059, PAGE_STATSDP p.2121 | Code **navigateur** : ouvre une URL/mailto | Oui | `window.open`/`<a href>` |
| 29 | `InfoBitmap` | PAGE_PROJET p.1949 | Lire largeur/hauteur du logo d'entreprise d'une salle de plans pour le redimensionner | Oui | `sharp`/`image-size` |
| 30 | `FichierAffiche` (téléchargement forcé) | Commander p.937 (PDF bon de commande statique `FichierXLS/*.pdf`), AATableClient.Statistiques1 p.1628 (CSV), PAGE_PROJET.DownLoadFile p.1961 (plans) | Streaming de fichier au navigateur | Oui | Route Next.js `Response` avec `Content-Disposition` |
| 31 | **Impression d'états / PDF** | `EtatEnteteXX` CConfigCat p.3132 (vide, désactivée) ; états `.wde` ActivXP_* (gabarit, non référencés dans le code) ; `sGenereNomPDF` PG p.3811 (RAD) ; aucun `iImprime*` dans le code | Aucune génération PDF dynamique : les PDF servis sont des fichiers statiques | Mort/absent | Rien à remplacer (si un PDF dynamique devient souhaité : pdfkit/puppeteer) |
| 32 | **OLE/Automation Excel** (CMSExcel.cpp dans DllUtils, `MS_dwExcel/MS_nExcelMethod`) | CDllUtils dwExcel p.3483, nExcelMethod p.3489, bInitExcelXX p.3475 ; page ExcelClient p.1292-1309 | Pilotage d'Excel.Application via COM (pour les logiciels desktop) ; la page ExcelClient n'utilise **pas** Excel (table RAD HFSQL classique, titre trompeur) | **Mort** côté site | Supprimer ; export tabulaire → CSV/`exceljs` |
| 33 | **HTTPRequête** vers un service externe d'IP | CUTILS.sGetIPAddress p.3099 | Récupérer l'IP publique | **Mort** (le site utilise `NavigateurAdresseIP` p.129) | Supprimer |
| 34 | Encodage **Windows-1252 / ISO-8859-1** | gabarits de courriels (`charset=iso-8859-1` Oubli p.285, ProfilClient2 p.578, ParamSMTP p.1798, Batch p.1022, AAConfigure p.1723, AADownload p.1413, AAFicheClient2 p.2854, CEnvoiEMail p.3458-3459, CConfigCat.bCreatIndexHTML p.3131) ; `[COURRIEL] CHARSET/ENCODING/CODHEX` CConfigCat p.3133-3140 ; `m_bCodHex` (accents en hexa) partout | Tous les textes, fichiers et courriels sont en ANSI | Oui | UTF-8 partout ; conversion des données existantes à l'import (`iconv-lite` pour les fichiers échangés avec les logiciels clients tant qu'ils restent ANSI) |

---

## 2. DLL maison : fonctions exportées et appelants

### 2.1 DllUtils.dll (`~/Projects/WinDev/DllUtils/`, C++ MFC, VS, dépendances `netapi32 psapi libcrypto-41 libssl-43 libtls-15`)

Note en tête de CDllUtils (p.3468) : « la structure est partagée par e-Plans, l'Estimateur Général et le module
d'envoi — tout changement oblige à mettre à jour ces 3 logiciels en même temps ». La DLL est donc d'abord une
bibliothèque **desktop** ; le site n'en utilise qu'une petite partie. Source des exports : `DllUtils.def`
(52 entrées), implémentations dans `DllUtils.cpp`, `CSmtp.cpp` (classe CSmtp open source de CodeProject + TLS
OpenSSL/LibreSSL), `COAuth2.cpp` (dépend de **EASendMail** COM, `C:\Program Files (x86)\EASendMail\…`),
`CMSExcel.cpp` (COM Excel), `CCryptage2.cpp`, `CRegistry.cpp`, `CListIndex.cpp`, `CMonitor.cpp`, `Selecteur.cpp`,
`InhibePrtScr.cpp`, `ListHandle.cpp`, `Version.cpp`, `CPeerName.cpp`, `Trace.cpp`.

| Export (.def) | Fichier C++ | Enveloppe WLangage (CDllUtils, p.) | Appelée par le site ? | Recommandation |
|---|---|---|---|---|
| `nSMTPSendMailEx` (`nSMTPSendMail` commenté) | CSmtp.cpp `nSendCourriel` | `bSendMail` p.3479-3481 | **Oui** : CEmail.bEnvoyerMail2 p.3744 (→ Oubli p.285, Contact p.651-652, Commander p.935-936, ReceptionException p.3971, EnvoiTirage p.3905-3906, TestCourriel p.4058) ; CAAEmail.bEnvoiMessage p.3454 ; ProfilClient2 p.579 ; ParamSMTP p.1798 | nodemailer (SMTP smtp2go, port 587 STARTTLS d'après les valeurs par défaut p.121 — noms de clés `[SMTP] SERVER/PORT/SECUR/LOGIN/PASSWORD/EXPEDITEUR`) |
| `nSMTPGetLastError` | CSmtp.cpp | `bSendMail` p.3481, `sGetMailError` p.3496 (table de ~60 codes d'erreur CSMTP p.3470-3471) | Oui | Erreurs nodemailer |
| `bSMTP_InitOAuth2`, `nSMTP_DoAuthAndSendMail`, `SMTP_FinOAuth2` | COAuth2.cpp (EASendMail, Office 365 XOAUTH2) | `bSendMail` p.3481, branche `stParam:m_bOAuth2`/`stPARAMSMTP2` p.3469 | Code présent mais la branche OAuth2 n'est prise que si le paramètre le demande ; le site configure TLS/login simple (p.121) → **non utilisé en pratique** (à confirmer) | Si Office 365 OAuth2 est voulu : nodemailer supporte XOAUTH2 nativement |
| `CR_dwNewCryptage`, `CR_nCrypteChaine`, `CR_nDecrypteChaine`, `CR_DeleteCryptage` | CCryptage2.cpp (classe `CCryptage2`, méthodes `nCrypteChaine`/`nDecrypteChaine`, base64 interne) | `dwNewCryptage` p.3484, `nCrypteChaine` p.3487, `nDecrypteChaine` p.3488, `DeleteCryptage` p.3483, `sDecryptePasse` p.3493 | **Oui** — voir §3.2 | Réimplémentation TS (autre travail) |
| `Cryptage` (XOR simple avec clé tournante, DllUtils.cpp l.239) | DllUtils.cpp | aucune | Non | Ignorer |
| `nEnumProcess` | ListHandle.cpp | `nEnumProcess` p.3488-3489 (méthode) | La **méthode** n'est pas appelée ; la **procédure globale** homonyme p.3962 réimplémente l'énumération via psapi | Supprimer |
| `bGetMemSize` | DllUtils.cpp | `bGetMemSize` p.3473 | Non (le site utilise `GlobalMemoryStatusEx` directement p.3856) | Supprimer |
| `bGetSystemVersion`, `bGetSystemVersion2` | Version.cpp | `bGetSystemVersion` p.3475 | Non | Supprimer |
| `SetDllTracePath` | Trace.cpp | `SetTracePath` p.3494 | Non | — |
| `NumVersChaineF` | DllUtils.cpp | `sNumVersChaineF` p.3498 | Non | `Intl.NumberFormat` |
| `nListDrives`, `bEnumShare`, `bNetShareGetInfoA`, `bMoveFileUnicode`, `bAccess`, `bStat`, `bGetIpAddress` | DllUtils.cpp, CPeerName.cpp | `nListDrives` p.3490, `bEnumShare` p.3473, `bNetShareGetInfo` p.3477 (commenté), `bMoveFileUnicode` p.3476 | Non | Supprimer (`node:fs` couvre access/stat/rename) |
| `bGetMonitorInfo`, `nGetListMon`, `nGetListMon2`, `bReplaceFen`, `hGetWindowFromPoint`, `bSelecteur`, `StartHookKey`, `StopHookKey` | CMonitor.cpp, Selecteur.cpp, InhibePrtScr.cpp (hook clavier anti-PrintScreen) | `bGetMonitorInfo` p.3474, `sGetListMon/2` p.3495-3496, `bReplaceFenXX` p.3478, `sSelecteurXX` p.3500, `lnInhibePrtSrc` p.3485, `RestorePrtSrc` p.3493, `CentrageDefautXX` p.3482, `GetRectMon` p.3484, `MaximiseFen` p.3485 | Non (fenêtres desktop) | Supprimer |
| `LI_*` (12 exports, listes indexées en mémoire) | CListIndex.cpp | aucune enveloppe dans CDllUtils | Non | — |
| `dwRegAlloc`, `bRegFree`, `bRegFirst`, `bRegNext`, `RegEnumTout` | CRegistry.cpp | aucune | Non | — |
| `dwFileCRC` | CRC32.cpp | aucune (le site a sa propre classe CRC32 en WLangage p.3511) | Non | `zlib.crc32` (Node ≥ 22) |
| `MS_dwExcel`, `MS_nExcelMethod` | CMSExcel.cpp (COM `Excel.Application`) | `dwExcel` p.3483, `nExcelMethod` p.3489, constantes `EXCEL_*` p.3471 | Non | Supprimer |

Méthodes de CDllUtils effectivement appelées depuis l'extérieur de la classe : `bSendMail`, `sGetMailError`,
`dwNewCryptage`, `nCrypteChaine`, `nDecrypteChaine`, `DeleteCryptage`, `sDecryptePasse` (via CEmail p.3739,
mort), `m_sTrace`, `m_nLastError`. Tout le reste de la classe est **code mort** pour le site.

Détails utiles de `bSendMail` (p.3479-3481) : construit une structure `stSMTP` en mémoire brute (`CUTILS::pMalloc`,
pointeurs `entier système`, chaînes ASCIIZ), destinataires et CC séparés par `|`, pièces jointes `m_sListAttach`
+ `m_sContentType` (types MIME dans CEmail.sGetContentType p.3748-3753), charset/encoding depuis l'INI
(`ISO-8859-1`, `8bit`), option `m_bCodHex` (encodage hexadécimal des accents dans les en-têtes), `m_nNbrEssai`
(ré-essais), `m_bVerbose` (trace SMTP recopiée dans `AATrace.log` via `CUTILS::TraceLog(goDllUtils:m_sTrace)`).
Équivalent nodemailer : `to`/`cc` tableaux, `attachments[{path, contentType}]`, `encoding`, `logger/debug`.

### 2.2 DllNotify.dll (`~/Projects/WinDev/FNotify V9/DllNotify/`, 49 exports)

| Export utilisé par le site | Enveloppe (CDllNotify, p.) | Appelant | Remarque |
|---|---|---|---|
| `bAllocBuf`, `bFreeBuf` | `bCryptAlloc` p.3373, `bCryptFree` p.3373 | CCryptFic.bCryptInit/bCryptFlush p.3119-3120 | Buffers de 129 à 1026 octets (multiples de 3 → base64 par blocs) |
| `bCrypte`, `bDecrypte` | `lnCrypte` p.3376, `lnDecrypte` p.3377 ; appel direct dans CCryptFic.bBufDecrypte p.3118 | CCryptFic.bEcritLigne p.3120, bLitLigne p.3122 | Clé dérivée par `CCryptFic::sCreatCle` p.3123 (WLangage : chaîne sans accents inversée, décalage alphabétique) à partir de `login + nom catalogue + mot de passe` |
| `dwNotificationChangement`, `bFinNotification`, `pszGetErrMess`, `RegisterWindowMessage` (user32) | `bAddNotification` p.3370-3372, `bFinNotify` p.3374, `cGetError` p.3375 | **Aucun** appelant hors classe | Mort (surveillance de répertoires desktop) |
| `InitCriticalSection`, `DelCriticalSection`, `CriticalSection` | p.3375-3376, corps **commentés** | CParcoursTous (appels commentés p.3036, p.3047) | Mort |

Les autres exports (`*Interv*`, `*GestFen*`, `HTTP*`, `FTP*`, `GetDescMultilangue`…) n'ont aucune enveloppe
WLangage dans le site.

Appelants de **CCryptFic** (seule raison de garder DllNotify) : CMultiCat.bExport14 p.3340-3341 et
bExportation p.3342-3343 (export chiffré d'un catalogue en `.csv` puis `fCompacte` → `.wdz`, pour téléchargement
par l'Estimateur Général), PG bImport p.3861 (lecture d'un import chiffré), PG CreatInfoClient p.3883
(fichier d'information client `ResInf_<id>` lu par le logiciel), CEmail.sRecupPassFic p.3757 (mort).

### 2.3 LibPNG.dll (pas de source dans `~/Projects/WinDev`, DLL de 2014)

Export `bCreatLig(&stDESCLIG)` (p.3007) : dessine une ligne de texte tabulée (jusqu'à 20 colonnes, cadrage
G/D/C, police `LOGFONT` GDI, couleurs texte/fond) dans un PNG de 1100×14 px par défaut. Appelants :
page Catalogue (affichage d'un assemblage, p.722-723, un PNG par ligne nommé
`<repUser>/<n><timestamp>.png` dans `c:\WebSite\user\<login>\`, p.824) et CParcoursTous.ZoneAjoute p.3048
(résultats de recherche, idem). Fond alterné `#CCFFFF`/`#A3D8FF`. Recommandation : rendu HTML, suppression de la
DLL et du répertoire `user\<login>` (voir A7 pour la purge de ces PNG).

---

## 3. Chiffrement et formats propriétaires PC SOFT

### 3.1 `Crypte()`/`Décrypte()` WLangage (format PC SOFT, non documenté)

| Emplacement | Paramètres | Donnée | Impact migration |
|---|---|---|---|
| PAGE_NUMSDPX p.2035, PAGE_NUMSDP2 p.2142, PAGE_SDPDELETED p.2326 | `Décrypte(sCompl, <clé « Invite… »>, compresseChaîneCourte, encodePCS)` | Paramètre `sCompl` des URL d'invitation SDP envoyées par courriel aux sous-traitants : `réponse|cléDef|cléDoss|…` | Liens déjà dans des boîtes courriel ; les anciens liens ne pourront pas être déchiffrés par Node |
| PAGE_UNSUBSCRIBE p.2173 (clé « Unsubscribe… ») | `Décrypte(gsParam, …, compresseChaîneCourte, encodePCS)`, après remplacement `%2B`/`%2F` | Lien de désabonnement : la valeur déchiffrée doit égaler le courriel passé en clair | Idem ; prévoir une page « lien expiré » |
| PG ConstruitReqRBQ p.3878 | `Crypte(sRes, <clé>, crypteRapide+encodePCS)` écrit dans un fichier via CFichier | Requête RBQ transmise à RecupEntrep.exe | Disparaît avec RecupEntrep |
| PG EnvoiTirage p.3904 ; code projet p.121 (commenté) | `Crypte/Décrypte(…, <clé>, crypteAnsi, encodePCS)` | Mot de passe SMTP `[TIRAGE] Pass` dans l'INI | Re-saisir le secret dans `.env` |

Le mot de passe `Client.Password` (15 caractères) n'est **pas** chiffré par ces fonctions : `CClient.isPassCrypte`
/`SetPassCrypte` (p.3020, p.3023) ne font que lire/poser le bit `FL_CRYPTE` dans `Client.Flags` ; `SetPassword`
stocke la chaîne telle quelle (voir A5). Côté admin, `CAAClient.sGetMotDePasse` est comparé en clair dans
CreatInfoClient p.3884 ; l'ouverture du fichier `AAClient` passe un mot de passe HFSQL (`PASS_CLIENT`, constante
code projet p.118) à `bSetAlias` — c'est un **mot de passe de fichier HFSQL** (`HPasse`), à abandonner avec
PostgreSQL.

### 3.2 CCryptage2 (DllUtils) — appelants seulement

Enveloppes WLangage : `sGlobCrypteChaine` p.3811-3812, `sGlobCryptePasse` p.3812-3813, `sGlobDecryptePasse`
p.3813-3814 (clé de 12 lettres construite par indices dans l'alphabet — ne pas recopier ; la chaîne en clair est
**entrelacée** avec des chiffres de `HeureSys()` avant chiffrement, et désentrelacée au déchiffrement), `sDecrypteInfo`
p.4008-4009 (déchiffre + vérifie un CRC32 WLangage), `TestSalle` p.4060-4061 (jeu de test, chiffre une requête
avec CRC), `CDllUtils.sDecryptePasse` p.3493 (mort), ParamSMTP `sCryptePasse`/`sDecryptePasse` p.1801-1802.

Appelants de `sGlobDecryptePasse` (identifiants des logiciels clients dans les commandes `Type=`) :
bCreeListe14 p.3849, CreatInfoClient p.3883, CreationListeClient p.3888, DeleteSDP p.3896, ePlanControle p.3906,
EstimControle p.3908, RecupDirectorySDP p.3976, RecupRequeteCie p.3989, RecupWWWCommon p.3992, SDPDownload
p.4014, TraiteMono p.4065, TraiteVersionEplan p.4068, TraiteVersionEstime14 p.4069, CAAEmail.bEnvoiMessage
p.3454, CEmail.bEnvoyerMail2 p.3743 (mot de passe SMTP). Appelants de `sGlobCrypteChaine` : AAFicheClient2
p.2865 (AlimTabCommon). Appelants de `sDecrypteInfo` : PAGE_SDPDELETED p.2334, PAGE_STATSDP p.2122,
bConstructionPage p.3824, bCreatFicStat p.3829, bGlobGetInfo p.3858, bGlobRemplitEntete p.3860,
CreationListeClient p.3890.

Point d'attention : CAAEmail.bEnvoiMessage (p.3453-3454) **réécrit le mot de passe SMTP dans l'INI à chaque
appel** à partir d'une constante en clair dans le code (ne pas recopier) ; ParamSMTP (p.1794-1802) permet de le
modifier. À remplacer par un secret d'environnement.

### 3.3 CRC32 (classe WLangage p.3511-3512)

Implémentation standard (polynôme 0xEDB88320) ; utilisée par CSDPInfo.sSDPGener p.3527 (génération d'un
identifiant de salle), sDecrypteInfo p.4009 et TestSalle p.4060. Équivalent exact en Node : `zlib.crc32` ou
paquet `crc-32`.

### 3.4 Archives WDZ / ZIP

Fichiers créés : `bCreationFichierStat/2` (p.3833, p.3842 : `sFicZip`, export des stats SDP + dico),
RecupWWWCommon (p.3993 : `FTPRepClient.zip` dans `c:\WebSite\estimation.qc.ca\version\last\` → `.txt` zippé).
Fichiers ouverts : `<catalogue>.wdz` (bImportCatalogue14 p.3867, `zipExtraitTout`), `<timestamp>Interv.wdz`
et `<timestamp>Ret.wdz` (p.3985, p.3987, un seul fichier extrait), archives d'exception/projet contenant
`Defauts.zip` et `Info.txt` (p.3968-3973, `zipChercheFichier` + `zipExtraitFichier`). WebDev 18 choisit le format
d'après l'extension (`.wdz` = format PC SOFT, `.zip` = ZIP standard) ; la vérification concrète (en-tête `PK` ou
non) des `.wdz` reçus reste à faire (voir A7).

---

## 4. Processus, threads, mémoire

- **ListProcess** (page admin, affichée depuis TableClient p.1239 à côté de ParamSMTP) : `ListeProcessus`
  p.1853-1854 et `nSupprimeProcessus` p.1855-1856 énumèrent les processus (`psapi EnumProcesses`,
  `EnumProcessModules`, `GetModuleBaseNameA`, `OpenProcess`, `TerminateProcess`, `API("KERNEL32",
  "GetCurrentProcessId")`), cherchent `RecupEntrep` et le tuent. Doublon de PG `KillProcess` p.3933-3934
  (commandes `Type=rbq…listprocess`/`killrecup` p.136) et de PG `nEnumProcess` p.3962-3963 (commande
  `Type=testcharge` → RecupFichierTest p.3981-3983). Toute cette famille disparaît avec RecupEntrep.exe.
- **Multitâche()** (20 appels : CBasicHF lectures p.3185-3192, CCatalog p.3251/3293, EnvoiTirage p.3906 pour
  limiter à ~75 courriels/heure, bCreationFichierStat p.3831) : cède le CPU dans des boucles longues ; en Node,
  boucles `async` + `setTimeout`/file d'attente.
- **CParcoursTous** (p.3029-3050) : recherche plein texte sur le catalogue paginée en zone mémoire
  `ThreadZone` ; thread réel commenté, `ThreadSuspend/Reprend("Thread1")` restent (p.3033-3034) et sont
  inopérants. Remplacer par une requête SQL paginée (`ILIKE`/`tsvector`).
- **Zones mémoire** (`MemCrée`…) : propres au processus `WD180Awp.exe` ; en AWP chaque requête rejoue le code
  projet, donc elles servent de cache intra-requête ou de liste de travail. Pas de persistance à reproduire.

---

## 5. Chemins Windows en dur (hors commentaires)

| Chemin | Où | Usage | Note |
|---|---|---|---|
| `c:\WebSite\Traces` (prod) / `h:\Temp\Traces` (test) | code projet p.118 | `AATrace.log`, `AALogRBQ.log` (voir A7) | config |
| `H:\Temp\Catalogue`, `h:\Temp\Catalogue\` | code projet p.118, p.137 | Copie de catalogues de test | poste de dev |
| `H:\Mes Sites\lecatalogue\Exe\lecatalogue.ini` | code projet p.121 | INI en mode test | poste de dev |
| `H:\Mes Projets\AvecEquipes\ESTIME 14\Exe\{DllUtils.dll, libcrypto-41, libssl-43, libtls-15}.dll` | code projet p.122 | En mode test, copie les DLL fraîches depuis le projet Estimateur Général vers `Exe/` | poste de dev |
| `d:\SalleDePlans` | code projet p.130 (`gsSDPRepAlternate`, `gbSDPAlternate=Faux`) ; CConfigCat.sGetRepSalleClient p.3142 (défaut INI `REP_SALLECLIENT`) | Racine alternative des salles de plans | config ; voir A7 |
| `h:\SalleDePlans\<repCie>` | PG sGetRepSalle p.4020 | Mode test | poste de dev |
| `c:\WebSite\user\<login>\` / `h:\WebSite\user\…` | Catalogue p.824, Catalogue2 p.2425 | PNG générés par LibPNG | à supprimer avec LibPNG |
| `C:\WebSite\SauveListe\Liste IP Pirate.txt` | AATableClient p.1572, p.1601 (défaut INI `[OPTION] LIST_IP`) | Liste d'IP bloquées (lecture par bouton admin) | migrer en table |
| `h:\Mes Sites` | AATableClient.ListeClients p.1589 | Mode test | poste de dev |
| `c:\EnvoiBern`, `c:\WebSite\bd\EnvoiBern` | PAGE_UNSUBSCRIBE p.2176-2177 (défauts INI `[PREPARENVOI] REPBASE/REPSAVE`) | Fichier HFSQL externe `COURRIEL` (`HDéclareExterne`) d'une liste d'envoi tierce, mis à jour lors d'un désabonnement | à clarifier (campagne externe) |
| `c:\TraceDBG.txt` | CUTILS.TraceFic p.3113 | Trace de debug | mort |
| `h:\wdprojet\lecatalogue\lecatalogue_web\FichierXLS\` | CConfigCat.sGetBonCommandePDF p.3138 (test) ; prod = `fRepWeb()+"FichierXLS\"` | PDF bon de commande (`CataCEGQ.pdf` etc., p.3135) | servir statiquement |
| `c:\WebSite\estimation.qc.ca\reqrbq` | CConfigCat.sGetRepReqRBQ p.3141 (défaut INI `REP_REQRBQ`) | Requêtes RBQ | disparaît |
| `c:\WebSite\estimation.qc.ca\Version\Last`, `H:\Mes Projets\MiseAJour\Exe` | PG bCreationResultat p.3845 (défaut INI `[SECTION_PATH] CLE_VERSION`) | Dossier des dernières versions des logiciels (numéros de version renvoyés aux clients) | config |
| `c:\WebSite\estimation.qc.ca\version\last\FTPRepClient.zip` | PG RecupWWWCommon p.3993 | Archive renvoyée aux logiciels | config |
| `H:\Mes Projets\RecupEntrep\BaseRBQ` | PG ConstruitReqRBQ p.3877 | Mode test | poste de dev |
| `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\ListeClient.txt`, `H:\Mes Sites\lecatalogue\ListeClient.txt` | PG isAutoriseWWW p.3928 | Liste blanche de clients pour la commande `rbq` ancienne version | migrer en table |
| `c:\temp\InfoLettre.htm` | PG sGetPageTirage p.4018 | Gabarit HTML de l'infolettre du tirage | config/gabarit |
| `H:\Mes Sites\lecatalogue\Demo\logojonathan.jpg` | PG TestSalle p.4060 | Jeu de test | poste de dev |
| `fRepWeb()+"\IMAGES\ban_468"` | GestBan2 p.1682 | Upload des bannières | stockage objet ou `public/` |

Aucun chemin UNC (`\\serveur\…`) actif dans le code (seuls les chemins « Fichier physique » de l'impression du
dossier, qui pointent vers le partage réseau du poste de dev, et une ligne commentée p.130 apparaissent). Les `.htaccess` ne réécrivent que l'URL
`WW70AWP` → `WD180AWP`.

---

## 6. HFSQL Classic : fonctions spécifiques à transposer

| Fonction | Où | Rôle | Transposition PostgreSQL |
|---|---|---|---|
| `HChangeRep` | CBasicHF.AssignRep p.3181 ; PAGE_UNSUBSCRIBE p.2176 | Un même fichier logique ouvert dans un répertoire différent selon le contexte (`bd\LECATALOGUE\`, répertoire client, import) | Une base unique ; colonne discriminante ou schéma par source |
| `HAlias` + `HChangeNom` + `HAnnuleAlias` | CEstimeHF.bSetAlias p.3159 (`sConstruitAlias`) | Plusieurs instances d'un même fichier ouvertes simultanément (ex. catalogue courant vs catalogue importé) | Deux connexions/requêtes ; pas d'équivalent nécessaire |
| `HDéclareExterne` / `HAnnuleDéclaration` | CEstimeHF.bImportSpecial p.3155-3156, CMultiCat.bImportSpecial p.3353-3354, nGetNumRev p.3359, PAGE_UNSUBSCRIBE p.2176-2177, ConstruitReqRBQ p.3878 | Ouvrir un `.FIC` **hors analyse** déposé par un logiciel client (catalogue à importer, fichier `COURRIEL` d'une autre application, base RBQ) | Les logiciels clients devront exporter en CSV/JSON ; importation côté serveur |
| `HCréeVue`/`HDétruitVue`/`HLitPremierVue` | CBasicHF.dwCreeVue p.3205, bSupprimeCle p.3199, nDupEnreg p.3209 | Vue triée/filtrée en mémoire | `SELECT … ORDER BY` |
| `HRéindexe` | CBasicHF.nReindexe p.3210 (auto-réparation sur erreur 131113 dans AssignRep p.3181), GestBan2 p.1683 (`hNdxCompactage`) | Réparation des index | `REINDEX`/`VACUUM` d'exploitation, non applicatif |
| `HBloqueFichier`, `HLit(..., hBlocageLectureEcriture)`, `HErreurBlocage`, `HDejaBloque`, `HDébloqueNumEnr`, `HLitBloque` | CBasicHF p.3184-3207 (boucle de 10 relectures si bloqué p.3191), ExcelClient RADBloque/RADDebloque p.1307-1308 | Verrouillage optimiste/pessimiste d'enregistrement par numéro | Transactions courtes, `SELECT … FOR UPDATE`/version |
| `HListeRubrique`, `HListeClé`, `HConstruitValClé`, `HListeLiaison`, `HEtat`, `HFichierExiste` | CBasicHF p.3202/3212-3214, CCatalog p.3252/3286, CEstimeHF p.3155-3166, CMultiCat p.3348-3359, CParcoursTous p.3036/3040, CTReserve p.3013, ExcelClient p.1307-1309 | Méta-données dynamiques (import générique colonne↔rubrique, clés composées construites en chaîne) | Mapping explicite en TS ; clés composées = colonnes multiples |
| `HRAZ`, `HCopieEnreg`, `HCréation`, `HCréationSiInexistant`, `HExtraitMémo`, `HNbEnr`, `HSauvePosition/HRetourPosition` | CBasicHF p.3202-3212, CEstimeHF p.3155, CUTILS.bBinaireSauve p.3072 (mort) | Gestion d'enregistrement courant / buffer | Objets TS ; mémos binaires → `bytea`/stockage fichier |
| Mot de passe de fichier (`bSetAlias(..., PASS_CLIENT)`) | AAClient : code projet p.118, CreatInfoClient p.3884, ReceptionException p.3970 … | Chiffrement HFSQL du fichier `AAClient.FIC` | Droits PostgreSQL ; attention à l'export des données (voir A5) |
| `HSurErreur` | code projet p.141 | Gestionnaire d'erreur HFSQL global | try/catch + logger |

---

## 7. Code mort probable (à ne pas migrer)

- **CUTILS** (p.3066-3116) : tout le volet Win32 — `bAddConnect`, `bCancelConnect`, `WNetGetLastError`, `bEcritRegistre`,
  `bGetFreeDrive`, `bLoadCursor`, `DestroyCursor`, `GetRectText`, `GetRectColonnes`, `GetWindowPos`, `SetWindowPos`,
  `nGetTailleChaine`, `isCtrlEnfonce`, `sGetDrive`, `isDriveReseau`, `ElimineCacheSysteme`, `sGetDDEErreur`,
  `cGetRepSysxx`, `sGetIPAddress` (HTTPRequête), `TraceFic`, `bBinaireSauve`, `hDecorTable`, `GraphCreePolice`,
  `sGetMessAPIErr`, `dwContrastColor`, `bMoveDir`, et les utilitaires de champs fenêtre (`isBouton`, `isListe`,
  `sDispEtat`, `sGetEtat`, `MyInfoObjet3`…). Seules restent utilisées hors classe : chaînes (`sSansAccent`,
  `sRemplacerParam`, `sTransformeNom`, `sMajuscule`, `sReelVersChaine`…), fichiers (`bSupprimeFic`, `bRepCree`,
  `bCreatRep`, `isFicExiste`, `isRepExiste`, `sAjouteSlash`, `sRemoveLastSubRep`, `sLastSubRep`, `cGetNomSeul`),
  traces (`TraceLog`, `sTrace`, `xTrace`), `bCompacte/bDecompacte`, `MyInfoObjet2` (taille d'enregistrement HFSQL
  p.3205), `pMalloc/bFree` (via bSendMail), `isAddrIPValide`, `sGetInvariant`, `TransfertChaineZ`.
- **CWINAPI** (p.3126-3128) : entièrement mort avec les méthodes CUTILS ci-dessus (sauf `lnGetLastError` dans
  bGetMemoryInfo p.3856, lui-même outil de debug).
- **CDllUtils** : toutes les méthodes sauf `bSendMail`, `sGetMailError`, `dwNewCryptage`, `nCrypteChaine`,
  `nDecrypteChaine`, `DeleteCryptage`, `bChargeDll/bDechargeDll` (constructeur/destructeur p.3472, p.3482-3483).
- **CDllNotify** : `bAddNotification`, `bFinNotify`, `bGetInfoNotification`, `Parsing`, sections critiques.
- **CEmail** : `bEnvoyerMail` (courriel natif PC SOFT avec profil MAPI/SMTP p.3738-3742), `sNomFicPass`,
  `sRecupPassFic`, `SetProfil`, `SetParamPOP3`. Vivants : `bEnvoyerMail2`, `bAjoutDestinataire/CC/FichierAttache`,
  `SetParamSMTP`, `SetExpediteur`, `ResetMail`, `SetTimeOut` (→ `EmailChangeTimeOut`, à supprimer), `sGetContentType`.
- **CAAEmail** (p.3453-3455) : **vivante** (objet global `goAAEMail` p.123 ; appelée par AADownload p.1413,
  AAConfigure p.1723, AAFicheClient2 p.2854, PG ReceptionProjet p.3974, PG TraiteConference p.4064 — envoi des
  codes d'accès et avis aux clients, 3 courriels possibles par fiche). Elle passe par `goDllUtils:bSendMail` ;
  à remplacer par nodemailer comme CEmail.bEnvoyerMail2. Son constructeur contient un serveur SMTP de test et un
  secret en dur (ne pas recopier) et `bEnvoiMessage` réécrit le mot de passe SMTP dans l'INI à chaque appel.
- **Page Batch** (p.955-1023) : jamais affichée (`PageAffiche(Batch)` absent) ; envoi natif sans TLS.
- **Page ExcelClient** (p.1292-1309) : table RAD « Client » avec verrouillage HFSQL ; accessible depuis TableClient
  p.1238 (« Exporter vers excel ») mais n'exporte rien vers Excel.
- **CEnvoiEMail.bDemarre** : `gsNomProgEnvoi` déclaré p.118 sans affectation trouvée → `LanceAppli("" …)`.
- **Procédures `XX`** : `bReplaceFenXX`, `CentrageDefautXX`, `sSelecteurXX`, `bInitExcelXX`, `EtatEnteteXX`,
  `cGetRepSysxx`, `TerminerSessionXX`, `StatistiquesXXX` (p.4021-4051, module statistiques désactivé ; voir A6),
  `mGlobRenouvellement2XX`, etc.
- Appels Win32 **commentés** (ne pas confondre avec du vivant) : `GetCurrentProcessId` p.130, `GetWindowRect`/
  `GetParent`/`ScreenToClient` p.3081, `GetModuleHandleA`/`GetProcAddress` p.3963, `bAllocBuf` long p.3373,
  `StartHookKey` p.3485, `bNetShareGetInfoA` p.3477, `nSMTPSendMail` p.3481, `ThreadExécute/Arrete/Attend`
  p.3033/3039, `SémaphoreCrée`/`SectionCritiqueDebut` p.3038/3047, `LanceAppliDistante` p.1571/3904,
  `ExeListeProcessus` p.3983, `HExécuteRequêteSQL` (18 occurrences, toutes commentées), `Sablier`, `SysMétrique`.

---

## 8. Recommandations de remplacement, par module Node/TS

| Besoin | Module | Commentaire |
|---|---|---|
| SMTP (smtp2go, STARTTLS 587), pièces jointes, CC, charset | **nodemailer** | Remplace DllUtils `nSMTPSendMailEx`, LibreSSL, `Email*` natifs, `EmailLitTimeOut`, `m_bCodHex` (nodemailer encode les en-têtes en RFC 2047) |
| Jetons des liens de courriel (invitations SDP, désabonnement) | `node:crypto` (HMAC-SHA256) ou `jose` (JWT) | Remplace `Crypte(compresseChaîneCourte+encodePCS)` ; prévoir la page de compatibilité pour les anciens liens |
| Déchiffrement des identifiants envoyés par les logiciels clients (`sGlobDecryptePasse`) | Port TS de CCryptage2 (**autre travail**) | Nécessaire tant que l'Estimateur Général / e-Plans n'ont pas changé de protocole ; isoler dans un module `legacy-crypto` jetable |
| Fichiers chiffrés CCryptFic (exports catalogue, `ResInf_*`) | Port TS de `bCrypte/bDecrypte` de DllNotify (**non détaillé ici**) ou HTTPS + JSON | Même logique de transition |
| CRC32 | `node:zlib` `crc32` ou `crc-32` | Identique bit à bit (polynôme réfléchi standard) |
| ZIP | `yauzl`/`adm-zip` (lecture), `archiver` (écriture) | `.wdz` : vérifier le format réel des fichiers reçus |
| `fCompacte/fDécompacte` | `node:zlib` (gzip) | Changement de format côté logiciels clients |
| Images (dimensions logo, génération de lignes) | `sharp`, `image-size` | LibPNG supprimée au profit de HTML |
| Processus/mémoire serveur | `node:os`, PM2/systemd | ListProcess, KillProcess, bGetMemoryInfo supprimés |
| Requête RBQ | `fetch` + `cheerio`/API, worker BullMQ | Remplace RecupEntrep.exe + Chilkat |
| Tâches différées (tirage, révision d'abonnement, purges) | cron (`node-cron`) ou BullMQ | Remplace `Multitâche`, `LanceAppli` d'un exe d'envoi (voir A6) |
| Config/INI | `.env` + table de paramètres | Remplace INILit/INIEcrit et les chemins en dur |
| Encodage | UTF-8 natif ; `iconv-lite` pour lire/écrire les fichiers ANSI échangés avec les logiciels | Remplace Windows-1252 |
| PDF | rien (fichiers statiques) ; pdfkit/puppeteer si besoin nouveau | Aucun état WebDev imprimé |

---

## Points non vérifiés / incertitudes

1. **Formats `.wdz`** : je n'ai pas inspecté d'archive réelle (interdit : données clients sous `LECATALOGUE_WEB/`) ;
   l'hypothèse « WDZ = format propriétaire, ZIP = standard » vient du nom des constantes WebDev et des extensions
   dans le code, pas d'un test.
2. **Branche OAuth2** de `bSendMail` (p.3481) : je déduis qu'elle n'est pas empruntée parce que le code projet
   (p.121) ne configure que `SSL/TLS/NO` ; la valeur réelle des clés `[SMTP]` dans `Exe/lecatalogue.ini` n'a pas
   été lue (lecture du fichier refusée par la politique de permissions).
3. **`gsNomProgEnvoi`** : aucune affectation trouvée dans le dossier technique (grep) ; peut être renseigné ailleurs
   (élément non imprimé, ou code compressé) — à confirmer dans WebDev avant de déclarer CEnvoiEMail cassé.
4. **Réécriture de l'INI par CAAEmail.bEnvoiMessage** (p.3453) : le comportement observé dans le code (écriture
   du secret chiffré à chaque envoi) n'a pas été vérifié sur le fichier INI réel (lecture refusée).
5. **Enclosure des pages** : l'outil de contexte attribue chaque ligne à l'en-tête « Procédure/Méthode » précédent ;
   les numéros de page (`p.N`) sont fiables (marqueurs `--- page N ---`), les noms de procédure englobante le sont
   un peu moins pour le code de champs (ex. LanceAppliAssociée dans PAGE_PROJET est du code navigateur de boutons,
   p.1955).
6. **LibPNG.dll** : pas de source trouvée sous `~/Projects/WinDev` ; description déduite de la structure `stDESCLIG`
   et du nom de l'export `bCreatLig`.
7. **DllNotify `bCrypte/bDecrypte`** : seules la signature WLangage et la dérivation de clé (`sCreatCle`) ont été
   lues ; `CCryptage.cpp` de FNotify V9 n'a pas été analysé (hors périmètre : algorithme).
8. **Compatibilité `Crypte()` PC SOFT** : l'affirmation « impossible à réimplémenter fidèlement » repose sur
   l'absence de spécification publique du format `encodePCS`/`compresseChaîneCourte` ; un déchiffrement par
   l'ancien moteur WebDev (service de transition) resterait possible si des liens anciens doivent continuer de
   fonctionner.
9. **`Type=testcharge`, `listprocess`, `killrecup`** : ces commandes sont supposées appelées par un opérateur ou par
   RecupEntrep lui-même ; aucun appelant externe n'est vérifiable depuis le code du site.
10. Le compte des appels (ex. « 109 AppelDLL32 ») inclut les lignes commentées ; les tableaux ci-dessus ne
    retiennent que les appels actifs.
