# A9 — Protocole des logiciels clients (Estimateur Général 14 et e-Plans) vers lecatalogue.ca

Inventaire, **du côté des logiciels Windows installés chez les clients**, de tout ce qui dialogue avec le serveur
lecatalogue.ca (et les hôtes historiques `www.estimation.qc.ca`, `www.estimation.ca`). Ces logiciels ne seront
pas mis à jour : le serveur Linux/Node de remplacement doit honorer **à l'octet près** ce qui est décrit ici.

Les sections 1 à 7 répondent au mandat initial ; la section 8 (lecture des fichiers réponse et dépôts) a été
ajoutée à la demande du coordonnateur ; la section 9 liste les contrats à honorer ; la section 10 les
incertitudes et les passages illisibles.

## 0. Sources, abréviations et méthode

| Abréviation | Fichier (lecture seule) |
|---|---|
| **EG-lot1** | `~/Projects/WinDev/ESTIME 14/Dossier/estime-classes-code-lot1.txt` (classes, 325 204 lignes) |
| **EG-lot2** | `…/estime-classes-code-lot2.txt` (doublon partiel de lot1 : mêmes classes, autres numéros de ligne ; non cité) |
| **EG-A** / **EG-B** | `…/estime-fenetre-interne-A.txt` / `-B.txt` (fenêtres) |
| **EG-PG** | `…/estime-procedures-globales.txt` |
| **EG-PJ** | `…/estime-projet-parametres-globaux.txt` (code d'initialisation du projet) |
| **EP** | `~/Projects/WinDev/e-Plans/ePlan/Dossier/e-Plans.TXT` (718 740 lignes ; Partie 3 fenêtres l. 36 231-564 406, Partie 4 classes l. 564 407-708 242, Partie 5 procédures globales l. 708 243-717 922) |
| **DN** | `~/Projects/WinDev/FNotify V9/` : sources C++ de **DllNotify.dll** (`CHTTP.cpp`, `CFTP.cpp`, `CSFTP.cpp`, `CCryptage.cpp`, `DllNotify/DllNotify.cpp`, `DllNotify/DllNotify.def`) |
| **DU** | `~/Projects/WinDev/DllUtils/` : sources C++ de **DllUtils.dll** (`CCryptage2.cpp/.h`, `DllUtils.def`) |
| **DT** | `~/Projects/lecatalogue/Docs/dossier-technique.txt` (côté serveur, recoupements seulement) |

Les numéros de ligne cités sont ceux des fichiers texte originaux (ISO-8859-1, CRLF) ; les copies UTF-8
utilisées pour la lecture ont le même nombre de lignes (vérifié). Les classes communes `.wdc` de
`~/Projects/WinDev/ClassesCommunes/` (CIdentWeb, chttp, ccomm, CDllNotify…) sont des **binaires PC SOFT
compressés** : leur code n'a été lu que via les dossiers techniques imprimés, où ils sont inclus.

**Avertissement sur l'impression** : les deux dossiers ont été imprimés avec des colonnes qui se chevauchent ;
beaucoup de lignes sont entrelacées (ex. `sRepSitetalogue`, `bResoIde=tgoIdentWeboConnect(…)`). Chaque fait
ci-dessous a été recoupé sur au moins deux occurrences (ESTIME + e-Plans, ou WLangage + C++) quand c'était
possible ; ce qui n'a pu l'être est marqué « non vérifié » et repris en section 10.

**Confidentialité** : aucun identifiant, mot de passe, clé, courriel personnel ni adresse IP réelle n'est recopié.
Les emplacements où le dossier en contient **en clair** sont listés en 10.4 pour nettoyage.

---

## 1. Architecture de communication côté client

```
Fenêtres / procédures (WLangage)                ─┐
  └─ CIdentWeb (EG) / CProtectPlan (EP)          │ logique métier (licences, SDP, RBQ…)
      ├─ CHTTP  ──┐                              │
      ├─ CFTP   ──┼─ héritent de CComm ──────────┼─► AppelDLL32 vers DllNotify.dll (C++ WinInet / Chilkat)
      └─ csftp  ──┘                              │
  └─ CCrypte / CIdentWeb::sCrypte ───────────────┼─► DllUtils.dll (CCryptage2) et fonctions WinDev Crypte/Décrypte
  └─ CCryptFic ──────────────────────────────────┼─► DllNotify.dll bCrypte/bDecrypte (chiffrement par blocs)
  └─ HTTPRequête (natif WinDev)  ────────────────┘   téléchargements (/version/last/…)
```

- `CComm` (EG-lot1 288 609-289 825) : classe de base ; constantes `TYPE_FTP`, `TYPE_SFTP=2`, `TYPE_HTTP=3`,
  `TYPE_HTTPS=4`, `STYPE_FTP="FTP"`, `STYPE_SFTP="SFTP"` ; membre global `m_nSecur` (décalage de port, voir 3.2).
- `CHTTP` (EG-lot1 52 500-52 687) et `csftp` (EG-lot1 28 300-28 950), `CFTP` (EG-lot1 273 434-274 015) :
  enveloppes des fonctions exportées par DllNotify (`DN/DllNotify/DllNotify.def` : `bHTTPConnect`, `bHTTPPost`,
  `bFTPConnect`, `bFTPGetFile`, `bFTPPutFile`, `bFTPFirstFile`, `bSFTPConnect`, `bSFTPGetFile`, … `bTestCleChilkat`).
- `CDllNotify` (EG-lot1 22 673-23 390) : chargement de `DllNotify.dll` / `DllNotify64.dll` (l. 23 071-23 073),
  fonctions `bCrypte`/`bDecrypte`/`bAllocBuf`, clé Chilkat lue dans `DllNotify.ini` section `[CHILKAT]`, clé
  `CLE_CHILKAT` (l. 22 688-22 689, 23 003-23 023, 23 326-23 336).
- Paramétrage (fichiers `.ini`) : ESTIME `param14.ini` (`CConfigCommun::INI_PARAM`, EG-lot1 135 861) ;
  e-Plans `e-Plans.ini` (EP 567 707). Clés réseau :

| Logiciel | Section / clé | Rôle | Défaut dans le code |
|---|---|---|---|
| EG | `[CATALOG] ADDRFTP` (`CLE_ADDRFTP`) | hôte HTTP+FTP/SFTP | `www.lecatalogue.ca` ; `www.estimation.ca` est réécrit en `www.lecatalogue.ca` (EG-lot1 140 695-140 729) |
| EG | `[CATALOG] URLCAT` (`CLE_URLCAT`) | chemin AWP | `WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` (EG-lot1 141 442-141 444) |
| EG | `[CATALOG] SITEWEB` | lien « visiter le catalogue » | `<hôte>/WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` (ancienne URL, EG-lot1 140 480-140 499) |
| EG | `[SDP] URLSDP`, `[SDP] REPSDP` (compat. `[OPTION] URLSDP`) | hôte et chemin des **liens** salle de plans mis dans courriels/PDF | `www.estimation.qc.ca` ; les préfixes `http://`/`https://` sont retirés et réécrits dans l'INI (EG-lot1 141 467-141 489) |
| EG | `[WEB] WebVersions` (`CLE_WEBVERSIONS`) | hôte des mises à jour | `www.estimation.qc.ca` (EG-lot1 141 525-141 531) |
| EG | `[SDP] INF1`, `INF2`, `INF3` | identifiants FTP export, FTP SDP, SFTP (chiffrés, `login||pass`) | valeurs chiffrées en dur dans le code (EG-lot1 191 377-191 388) — **ne pas recopier** |
| EG | `[OPTION] FTPSECUR` | décalage de port FTP/SFTP | absent → `10200` (EG-lot1 139 458-139 467) |
| EG | `[OPTION] TYPE_TRANS` (par utilisateur, `CUsers`) | `FTP` ou `SFTP` | `SFTP` (EG-lot1 14 732-14 746 ; 169 565-169 568) |
| EG | `[HTTP] SECUR` | https pour les liens navigateur | ignoré : `isSecurHTTP()` renvoie toujours Vrai « tout le temps https » (EG-lot1 139 160-139 162) |
| EG | `[FTP] ADDR` | « adresse annexe » FTP des salles de plans (`sGetAnnexAddr`) | même hôte ; lu puis réécrit (EG-lot1 195 467-195 470) |
| EP | `[WEB] AddrInfo` (`CLE_ADDRSDP`) | hôte | `www.lecatalogue.ca` (EP 571 152-571 178) |
| EP | `[WEB] AWPInfo` (`CLE_URLSDP`) | chemin AWP | `WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` (EP 570 497-570 510) |
| EP | `[WEB] WebVersions` | mises à jour | `www.estimation.qc.ca` (EP 572 577-572 583 ; en mode test remplacé par `mytest2.estimation.qc.ca`) |
| EP | `[Parametres] INF1/INF2/INF3` | identifiants FTP/SFTP | défauts chiffrés en dur (EP 567 871-567 888) — **ne pas recopier** |
| EP | `[OPTION] FTPSECUR`, `[HTTP] SECUR` (défaut `1`, EP 568 893-568 895), `[DOWNLOAD] TeamViewer` (`www.estimation.qc.ca/teamviewer/TeamViewer_Setup_fr.exe`, EP 572 366-572 370), `[UPDATE] URLUpdate` (EP 564 892-564 893, usage non lu) | | |

Les objets globaux reçoivent ces valeurs au démarrage : EG `goIdentWeb:SetAddrCatFTP(goConfig:sGetLeCatalogue())`,
`SetURLCatFTP(goConfig:sGetURLCatFTP())` (EG-B 111 071-111 072) ; EP `goProtect:SetParamConnect(sGetLeCatalogue(),
sGetAWPLeCatalogue(), sGetWebVersions(gbServeurTest))` (EP 3 813, 637 493-637 495).

Un mode « serveur de test » (`gbServeurTest`) remplace l'hôte par une constante `ADDR_IP` (adresse IP littérale,
EG-lot1 140 719-140 724, 141 482-141 488 — non recopiée) ; les commentaires mentionnent `mytest2.lecatalogue.ca`
et `mytest2.estimation.qc.ca` comme serveurs de test.

---

## 2. Appels HTTP

### 2.1 Mécanique commune `CHTTP:bConnect` / `bPost` (toutes les commandes `Type=`)

Côté WLangage (EG-lot1 52 563-52 595, 288 821-288 883) :

- `CHTTP` est construit avec `m_nType = TYPE_HTTPS` et le commentaire « Maintenant toujours HTTPS » (l. 52 631),
  **mais** la connexion passe par `bHTTPConnect(ctx, adresse, user, pass)` sans port (l. 52 633, 288 872).
- `bPost(pURL, pListParam, bSilence=Vrai, nMaxEssais=4, dwTimeOut=15000)` : `szURL` ASCIIZ **300**,
  `szParam` ASCIIZ **1024** (donc corps ≤ 1023 octets), `nMaxEssais` **forcé à 1** (l. 52 589), appel
  `bHTTPPost(ctx, url, param, taille, 1, timeout)`. Commentaire : « Par défaut dans Windows il y a 30000 » ms.
- `pURL` est la valeur `URLCAT`/`AWPInfo` **sans `/` initial** (`WD180AWP/WD180Awp.exe/CONNECT/lecatalogue`).

Côté C++ (DN `CHTTP.cpp` 203-300, `DllNotify.cpp` 971-1000) :

- `bHTTPConnect` ignore le port (paramètre commenté) → `CHTTP::bConnect(addr, user, pass, nPort=INTERNET_DEFAULT_HTTP_PORT)`
  → `InternetOpen("DllNotify", INTERNET_OPEN_TYPE_DIRECT)` puis `InternetConnect(…, 80, …, INTERNET_SERVICE_HTTP, 0, 0)`.
- `bPost` : `HttpOpenRequest(hConnect, "POST", url, HTTP_VERSION, NULL, NULL, INTERNET_FLAG_DONT_CACHE|INTERNET_FLAG_NO_COOKIES)`
  — **pas de `INTERNET_FLAG_SECURE`** ; `HttpSendRequest(hRequest, NULL, 0, corps, taille)` — **aucun en-tête
  ajouté** (donc pas de `Content-Type`, hors ce que WinInet met d'office) ; en cas d'échec de `HttpSendRequest`,
  nouvel essai après `Sleep(500)` tant que `nCpt < nMaxEssais-1` ; **le code de statut HTTP n'est jamais lu et le
  corps de la réponse n'est jamais lu** ; retour Vrai dès que la requête a été envoyée et une réponse reçue.
  Délai : `INTERNET_OPTION_RECEIVE_TIMEOUT` positionné si `dwTimeOut ≠ 0` ; l'erreur WinInet 12002 est traduite
  « TimeOut » (`CHTTP.cpp` 316 ; testée par `Position(sMess,"TimeOut")`, EG-A 161 449).

**Conséquences** : toutes les commandes `Type=` partent en **HTTP/1.1 clair sur le port 80**, méthode **POST**,
agent utilisateur `DllNotify`, corps `Type=xxx&user=…` **sans encodage URL**, vers
`http://www.lecatalogue.ca/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue`. La réponse (page vide `TermineProg`)
est ignorée ; **n'importe quel statut** convient tant que la connexion aboutit. Le `https` annoncé par
`isSecurHTTP()` ne sert qu'aux liens ouverts dans le navigateur (2.3). Non vérifié : comportement de WinInet si
le serveur répond 301/302 vers `https://` (WinInet refuse par défaut une redirection changeant de schéma :
erreurs 12039/12040 ; voir 10.1).

### 2.2 Tableau des commandes `Type=` émises

Légende : « U » = `User=`/`user=` chiffré par `CCrypte::sCrypteChaine` (section 5) ; « FTP » = le logiciel va
ensuite chercher un fichier par FTP/SFTP dans le répertoire export (section 3) ; « nav. » = URL ouverte dans
le navigateur par `LanceAppliAssociée`/`ShellExecute` (GET par le navigateur du poste, pas par la DLL).

| `Type=` | Logiciel, appelant | Corps POST exact (ou URL) | Délai/essais | Ce que fait ensuite le logiciel |
|---|---|---|---|---|
| `wwwlog` | EG `CIdentWeb::nAutoriseSuite` (EG-lot1 192 644-192 818) ; EP `CProtectPlan::nAutoriseGlobal` (EP 633 877-634 077) | `Type=wwwlog&user=<U:login⇥pass⇥heure>` (EG l. 192 776 illisible, EP 634 034 lisible) | EG défaut 15 s ; EP `Vrai,2,10000` | **Avant** le POST : dépôt FTP/SFTP de `www_<login>_<heure>.txt` (EP : `www_demo_<heure>.txt` si login vide) dans le répertoire export. **Après** : attente de `<login>_<heure>.txt` (EP : `demo_<userWindows>_<heure>.txt`) — EG `bAttente(…,5000)`, EP `3000` — puis `bGetFile`, `bDelFile`, lecture (8.a), sauvegarde WDZ. Si `##1001`/`##1002` (mot de passe/login) : redemande et boucle avec une **nouvelle heure** (EG 192 781-192 790 ; EP 634 049-634 058, max 2 tours) |
| `wwwcom` | EG `nAutoriseSuite` (EG-lot1 192 799-192 813) | `Type=wwwcom&user=<U>` « Envoi du common seulement (et de la version) » | 15 s | aucun fichier attendu |
| `recinf` | EG fenêtre enregistrement (EG-A 180 993, 451 117) ; EP (EP 219 490, 384 394) | `Type=recinf&AAIdent=<machine>_<heure>&User=<U>` | 15 s | connexion FTP/SFTP export ; boucle `bGetFirstFile("\" ou ".", "ResInf_<ident>.fin")` → `bDelFile(.fin)` → `bGetFile(ResInf_<ident>.res)` → `bDelFile(.res)` → lecture (8.b). EG : boucle pilotée par un **timer de fenêtre** (`FinTimer`, EG-A 180 847) ; EP : jusqu'à 200 itérations de listage (EP 629 607-629 616) |
| `delmono` | EG (EG-A 451 009) ; EP `AnnulationVersion` (EP 219 350) | `Type=delmono&AAIdent=<machine>_<heure>&Param=<P|E|…>&User=<U>` | 15 s | rien d'attendu ; suppression locale de répertoires `update14`/`update` |
| `estimmaj` | EG `isGlobAutoriseUpdate` (EG-PG 7 882-7 906) | `Type=estimmaj&user=<U>` (U = `sGlobLoginUpdate`, EG-PG 12 251-12 253) | 15 s | `nGlobAttenteResultat` : attente `<login>_<heure>.txt` (5 000) dans export → fichier dans le **répertoire Exe** du poste → ligne 1 `##code` ou `Auth=a b c` (8.a) ; redemande login si 1001/1002 avec nouvelle heure |
| `eplanmaj` | EP (équivalent, non lu en détail ; DT l. 1 174) | `Type=eplanmaj&user=<U>` | | `nLitInfoLogon(…, nTypeAttente=1)` lit `Auth=…` (EP 636 566-636 583) |
| `export14` | EG fenêtre TRANSCAT, `Clic sur IMPORT` (EG-A 94 190-94 283) | `Type=export14&Cat=#<clé>#<clé>…&User=<login catalogue EN CLAIR>` (`gsCatLogin`, l. 94 194) | **`SetTimeOut(1 800 000)`** = 30 min (l. 94 192) | sondage **FTP seulement** (`gpFTP` est un `CFTP`, l. 94 051) : `bGetFirstFile(".", "<login> *.wdz")` et `"<login> *.exp"` (l. 94 505-94 539) ; puis `bGetFile` de `<login> <nomcat>.exp` et `.wdz`, `bDelFile` de chacun (l. 94 224-94 262) ; import (8.d) |
| `liste14` | EG, `Connexion` (EG-A 95 231-95 297) | `Type=liste14&User=<U:login⇥pass⇥heure>` (U = **login/mot de passe catalogue**, pas SDP) | 15 s | `Timer("ScanDirList", 40)` → FTP `bGetFirstFile(".", "<login>.fst")` → `bGetFile` + `bDelFile` ; puis `<login>.lst` (8.c) |
| `import` | EG (EG-A 437 203-437 260) | `Type=import&Cat=<nom catalogue>&User=<login FTP en clair>` | 15 s | **avant** : `bDelFile` `<fic>.imp` et `<fic>.err`, `bPutFile` `<fic>.wdz` puis `<fic>.imp` (connexion FTP avec identifiants **en dur** l. 437 214-437 218) ; **après** : `bGetFile` `<fic>.err` (lignes = messages d'erreur ; vide = « Transfert OK ») |
| `sdplog` / `sdpmaj` | EG `bRecupInfoSDP` (EG-A 161 400-161 460) | `Type=sdplog&user=<U>` / `Type=sdpmaj&user=<U>` ; U = `sGetCrypteLogin(login, heure, dossier)` = `login⇥pass⇥heure⇥dossier` (EG-PG 11 323-11 334) | 15 s | `nAttenteResultat(pCom, …, 1)` : attente `<login>_<heure>.txt` (**2 500**) dans export (8.f) |
| `sdpdel` | EG (EG-A 177 151 ; EG-B 90 970) | `Type=sdpdel&user=<U>&param=<référence>` | 15 s | `nAttenteResultat(…, 2)` sur `<login>_<heure>.txt` |
| `sdpacli` / `sdpscli` | EG liste des salles (EG-B 89 809, 90 745) | `Type=sdpacli&user=<U>` / `Type=sdpscli&user=<U>` ; U = `login⇥pass⇥heure⇥⇥userWindows` (EG-PG 11 330-11 332, lecture incertaine) | `SetTimeOut(120 000)`, `Vrai,1` | `nAttenteResultat(…, 1)` / `(…, 3)` ; `sdpscli` lancé dans un thread après `sdpacli` |
| `sdpstat` | EG `ThreadLanceRequete` (EG-B 91 091-91 096) | `Type=sdpstat&param=<req>` ; req = `Crypte_DllUtils(CRC32(%010d) + DateSys + Heure(6) + référence [+ "#"])` avec clé littérale (EG-B 89 331 — non recopiée), puis remplacement de `?`→`<xx>` et `&`→`<yy>` (l. 89 343, lecture incertaine) | `SetTimeOut(gnMaxJaugeRequete*10)` ≈ 5 min, 1 essai | `nAttenteStat` : attente `<generic>.res` (**10 000**) → ligne 1 = nombre (0 = « pas de réponse ») → `nAttenteZip` : `<generic>.zip` (5 000) → 2 fichiers extraits : `<generic>.txt` (stats) et `<generic>.dic` (8.f) |
| `sdpintv` | EG fin de liste SDP (EG-A 159 814-159 843) | `Type=sdpintv&project=<dossier>-<login>-<timestamp>` ou `Type=sdpintv&param=<référence>-<timestamp>` | 15 s | **avant** : `bEnvoiUnFichier` du `.wdz` dans le sous-répertoire `ImportInterven` (`m_sRepServerExp = sGetRepServerExport()`, l. 159 816-159 817) ; rien d'attendu après |
| `bid` | EG `ThreadRecupReponse` (EG-A 177 417-177 462) | `Type=bid&param=<référence>-<timestamp>` | 15 s | **avant** : `bEnvoiUnFichier` du `.wdz` (réponses des sous-traitants) dans `ImportInterven` ; **après** : `nAttenteInterv` : `bGetFile` `<nom>.fin` puis `<nom>.res` (170 253-170 297) → `nTraitementReponse` |
| `newexcept` | EG (EG-B 105 958-106 019, 234 006-234 027) ; EP (EP 116 858-116 889, 320 733-320 779, 449 033-449 049) | `Type=newexcept&param=<log.zip>[&project=<projet.zip>]` ; noms : `E<ip3>_<AAAAMMJJhhmmss>.zip` (EG log), `P<ip3>_<ts>.zip` (EP log), `F<ip3>_<dossier>_<ts>.zip` (projet) où `<ip3>` = octets de l'IP locale sur 3 chiffres (EG-B 233 999-234 006) | EG 15 s ; EP `Faux,4,60000` | **avant** : `bPutFile` des zips dans export ; rien d'attendu |
| `projexp` | EP (EP 250 302-250 333) | `Type=projexp&param=<zip>` | 15 s | **avant** : `bPutFile` du zip projet dans export |
| `chilkat` | EP (EP 78 329-78 357) | `Type=chilkat&param=<clé Chilkat obscurcie : chaque octet → 2 caractères (quartets + aléa), l. 78 337-78 344>` | `Vrai,1,10000` | rien |
| `testcharge` | EP test de charge (EP 343 294-343 305) | `Type=testcharge&Param=Test_<heure>` | `Vrai,2,10000` | attend un fichier par FTP (test seulement) |
| `conference` | EP, bouton de test `BTN_CTRLALTH` (EP 315 862-315 889) | `type=conference&nom=…&prenom=…&courriel=…&societe=…&telephone=…&region=…&nombre_participant=…` | 15 s | test seulement |
| `sdplist` | EP `bConnectSDP` (EP 231 377-231 385) | `type=sdplist&user=<sRemoteFic>&param=<référence>` — **ici `user=` n'est PAS chiffré** : c'est le nom du fichier résultat `<2 lettres aléatoires><AAAAMMJJ><hhmmss…>.txt` (EP 230 049) | 15 s | `bAttenteListeFichier` : `bAttente(sRemoteFic, …, 5000)` dans export, `bGetFile`, `bDelFile` (8.f) |
| `sdpdownload` | EP `TransfertFTP` (EP 236 330-236 337) | `Type=sdpdownload&param=<U:"K=<idCli>⇥R=<ref>⇥N=<projet>⇥A=<ip>⇥I=<idClient>⇥T=<taille>⇥F=<fichier>⇥P=<1|0>">` (en-tête l. 234 489) | 15 s | **notification** seulement ; les plans eux-mêmes sont récupérés par `bGetFile` dans le répertoire des salles de plans (REP_SDP) |
| `rbx` (lecture : `…x&ParamRBQ=`, probablement `rbx`, peut-être `rbq`) | EG `CBaseRB::bLanceRequete` (EG-lot1 303 936-303 946) | `Type=rb?&ParamRBQ=<commande avec ";" et ","; les "&" remplacés par " ">` ; commande construite EG-A 240 231-240 232 : `verifnum2;id=<machine>_<heure>;num=;cp=;nom=…;tel=…;ville=…;ct=2;nomentrep=…;nbrrecup=…;addrip=…;versiones=<type> <version>` | 15 s | **avant** : connexion HTTP + FTP/SFTP (`CBaseRB::bConnecte`, 303 830-303 853) et suppression d'un éventuel `Entrep_<ident>.res/.fin` résiduel ; **après** : `nAttenteFinFTP` puis `bRecupInterv` (8.e) |
| `creatsdp` | EG `bAffichePageSDP2` (EG-A 157 502-157 553) | **nav.** `https://<hôte>/<URLCAT>?Type=creatsdp&AALoginHex=<mot de passe de requête en hexadécimal>&Param=p<dossier><heure>.sdp&repcie=<repcie>` | — | **avant** : dépôt du fichier `.sdp` (1 ligne) dans le répertoire des salles de plans ; ouverture par `ShellExecute` (commentaire l. 157 547 : `LanceApplicationAssocie` « ne fonctionne pas avec HTTPS ») |
| `numsdp` | EG (EG-A 155 073 ; EG-B 87 874-87 877) | **nav.** `<hôte>/WD180AWP/WD180AWP.EXE/CONNECT/lecatalogue?type=numsdp&param=<ref>&visu=1#CELL_BANDEAU` ou `sGetReqSDP` = `<URLSDP>/<REPSDP>?param=<ref>` (EG-lot1 141 359-141 363), préfixé `https://` par `sTraiteLienHTTP` | — | liens aussi insérés dans courriels/PDF d'invitation avec `&cpl=`/`&ans=` (8.g) |
| `reqrbq`, `rbqcie` | EG | **code commenté** (EG-lot1 119 183-119 233) ; `BTN_RBQ1` ouvre maintenant le site de la RBQ (EG-A 240 276) | | |
| `version`, `majversion` | aucun appel trouvé dans les deux dossiers (le serveur note « Semble ne plus être utilisé », DT l. 1 015) | | | |

Remarques transversales :

- Casse : les corps mélangent `Type=`/`type=` et `User=`/`user=` ; le serveur normalise `Minuscule(AAType)` et
  `PageParamètre` est insensible à la casse des noms (voir A2/A3).
- Caractères bruts dans le corps : `#` (`Cat=#12#34`), `-`, `|`, et pour `user=` tous les caractères `0x40-0x7F`
  (section 5), y compris `\ ] ^ _ { | } ~` et **DEL (0x7F)**. Aucun appel à une fonction d'encodage URL dans les
  deux projets (grep `URLEncode|EncodeURL|HTTPEncode` : aucun résultat).
- Ordre des opérations : pour `wwwlog`, `import`, `sdpintv`, `bid`, `newexcept`, `projexp`, `creatsdp`, le
  **fichier est déposé par FTP/SFTP avant** le POST ; pour les autres le POST précède le sondage.

### 2.3 Appels `HTTPRequête` (natif WinDev) et liens navigateur

| Usage | URL | Suivi | Référence |
|---|---|---|---|
| `RecupRepFTP` (répertoires serveur) | `<WebVersions>/version/last/FTPRepClient.zip` — pas de schéma → `http://` | corps écrit dans `<Exe>\FTPRepClient.zip`, ouvert avec `zipOuvre`, 1er fichier extrait, lignes `REPEXPORT=` et `REPSALLE=` (EG) / `REPSALLE=` seulement (EP, `REPEXPORT` commenté) | EG-PG 10 756-10 805 ; EP 715 272-715 325 |
| Mise à jour, infos | EG : `"https://" + <WebVersions> + "/version/last/updateinfo.zip"` (EG-A 77 687) ; EP : `<WebVersions>/version/last/updateinfo.zip` **sans schéma** (EP 87 014) | voir section 4 | |
| Mise à jour, installeur | EG : `<WebVersions>/version/last/InstallEG14.exe` sans schéma (EG-A 77 280) | `HTTPJauge("ProgressionReception")`, résultat écrit tel quel dans `InstallEG14.exe` (EG-A 77 316-77 331) ; si `fTaille < 30 000 000` → fermeture après timer (l. 77 339) | |
| e-Plans `bRecupVersionWeb` | `goProtect:m_sWebVersions + "<chaîne illisible>" + sNomFic` (EP 710 228) ; probablement `/version/last/` + nom de fichier version | 1 ligne lue (EP 710 253-710 255) | |
| Liens navigateur | `CHTMLVersPDF::sTraiteLienHTTP(sLien, bSecur)` : si le lien commence par `www`, préfixe `https://` (EG) ; convertit `http://`↔`https://` (EG-lot1 211 273-211 300) | | |
| Divers externes | site RBQ (`https://www.pes.rbq.gouv.qc.ca/…`, EG-A 240 276, EG-lot1 119 650) ; détection IP publique via un site tiers (EG-lot1 160 856) ; `CWebParcours::sGetPage` avec `HTTPTimeOut(7000)`, `HTTP.IgnoreErreur = HTTPIgnoreCertificatExpiré`, 5 essais (EG-lot1 176 096-176 160) — cible non identifiée | | |

---

## 3. Récupération et dépôt de fichiers (FTP / SFTP)

### 3.1 Protocoles et choix

- **FTP** (`CFTP` → WinInet, DN `CFTP.cpp` 265-283, 351, 378) : `InternetOpen("DllNotify")`,
  `InternetConnect(hôte, port, user, pass, INTERNET_SERVICE_FTP, INTERNET_FLAG_PASSIVE)` → **mode passif**,
  transferts `FTP_TRANSFER_TYPE_BINARY`, listage par `FtpFindFirstFileA(motif)` (l. 436) — le commentaire l. 358
  avertit que le listage « ne fonctionne pas si le fichier contient des espaces » alors que `export14` liste
  `"<login> *.wdz"` (voir 10.1). Les accents des noms sont transcodés (`FTPToAccent`/`AccentToFTP`, DN def @65-66 ;
  `bAccent=Vrai` en FTP, EG-A 159 444-159 447), table non lue.
- **SFTP** (`csftp` → Chilkat `CkSFtp`, DN `CSFTP.cpp` 217-260) : `put_ConnectTimeoutMs(5000)`,
  `put_IdleTimeoutMs(10000)`, `Connect(hôte, port)`, `AuthenticatePw(user, pass)`, `InitializeSftp()` ;
  listage `put_ReadDirMustMatch(motif)` (l. 567-571) ; `put_Utf8` commutable (`bSFTPSetUTF8`, EG-lot1 28 709-28 713 ;
  mis à Faux dans les tests EP 289 935). Déverrouillage Chilkat par la clé de `DllNotify.ini` (ou une clé de
  secours codée en dur, `CSFTP.cpp` 89 — non recopiée). **Aucune vérification de clé d'hôte vue** (non vérifié).
- **Choix** : `pGetProtocole(xFTP, xSFTP)` (EG-lot1 194 376-194 385 ; EP 714 857-714 873) lit `[OPTION] TYPE_TRANS`
  de l'utilisateur ; défaut **SFTP** dans ESTIME (`CConfig::sGetTypeTrans`, EG-lot1 14 734), **FTP** dans e-Plans
  (`sDef="FTP"`, EP 572 510). `bGenericConnect` (EG-lot1 189 406-189 433 ; EP 630 577-630 594) **bascule en FTP**
  si la connexion SFTP échoue, et envoie un courriel d'avertissement (`EnvoiCourrielWarning`). Le protocole qui a
  fonctionné est mémorisé par utilisateur (`bSetTypeTrans`, EG-lot1 192 551).
- **HTTP via CComm** : `isHTTP()` existe (`TYPE_HTTP/HTTPS`) ; `CHTTP` n'implémente pas `bGetFile` (STOP, EG-lot1 289 043-289 046).

### 3.2 Hôte et ports

- Hôte : toujours `sGetServerAddr()` = `ADDRFTP` (`www.lecatalogue.ca`) pour le FTP **et** le SFTP **et** le HTTP
  (EG-lot1 195 914-195 921 ; EP `m_sLeCatalogue`). Même hôte pour les salles de plans (`sGetAnnexAddr`, 195 467-195 470).
- Ports : `CComm::SetPort` ajoute `m_nSecur` à 21 ou 22 (EG-lot1 289 679-289 684) ; `isFTP()` ⇔ port = 21 ou
  21+`m_nSecur` ; `isSFTP()` ⇔ 22 ou 22+`m_nSecur` (289 457-289 496). `m_nSecur = goConfig:nGetFTPSecur()` au
  démarrage (EG-PJ 18 995-18 996 ; EP 710 000-710 001) ; `nGetFTPSecur` renvoie **10200 si la clé `FTPSECUR` est
  absente** (et l'écrit dans l'INI), sinon 0 ou 10200 (EG-lot1 139 458-139 467). La fenêtre d'options
  `FEN_ALTERNATE` offre le choix `SEL_FTP=1 → 0` / `2 → 10200` (EG-B 79 792-79 799, 79 887-79 895).
  **Donc par défaut : FTP sur le port 10221 et SFTP sur le port 10222 ; en option 21/22.**
- `CFTP` est construit avec `nPort=21` (273 761), `csftp` avec `nPort=22` (28 717-28 723) ; la valeur réelle est
  `nGetPort()` = port + décalage (en mode test, `nGetPort` retranche 10200 si > 10200, 289 546-289 551).

### 3.3 Identifiants et répertoire de départ (`GetInfoConnect`, `bConnectEx`)

`CIdentWeb::GetInfoConnect(nAction, bFTP, sLogin, sPass, sRemoteDir)` (EG-lot1 191 371-191 406) ; e-Plans
`CConfig::GetInfoConnect` (EP 567 871-567 894) :

| Protocole | `nAction` | Clé INI lue (`login||pass`, chiffrés) | `sRemoteDir` |
|---|---|---|---|
| FTP | `REP_EXPORT` (1) | `INF1` (`CLE_LOGFTPEXP`) | `"/"` : le **compte FTP export est enraciné dans le répertoire export** |
| FTP | `REP_SDP` (2) | `INF2` (`CLE_LOGFTPSDP`) | `"/"` : compte FTP enraciné dans la racine des salles de plans (EP 234 495 : « Le login est sur la racine des salles de plans ») |
| SFTP | `REP_EXPORT` | `INF3` (`CLE_LOGSFTP`, « SFTP tous répertoires ») | `sGetRepServerExport()` : défaut `C:\WebSite\lecatalogue\LECATALOGUE_WEB\export` (EG-lot1 190 305 ; EP 567 711), remplacé par la ligne `REPEXPORT=` de `FTPRepClient.zip` (EG seulement) |
| SFTP | `REP_SDP` | `INF3` | `sGetRepServerSDP()` : défaut `d:\SalleDePlans` (« Maintenant c'est d:\SalleDePlans », EG-lot1 190 306-190 307 ; EP 567 712), remplacé par `REPSALLE=` ; en mode test `C:\WebSite\SalleDePlans` (195 876-195 878). EP 234 496 : « le login [SFTP] est sur c:\ » |

`CComm::bConnectEx(sAddr, sLogin, sPass, sDefCurDir)` (EG-lot1 288 911-288 930) : déchiffre login et mot de
passe avec `Décrypte(…, <clé littérale>, crypteSécurisé, encodePCS)` (clés à l. 288 926-288 927, non recopiées),
appelle `bConnect(sAddr, login, pass, nGetPort())` puis `bSetCurrentDirectory(sDefCurDir, Faux)`.
`bSetCurrentDirectory` (`CFTP`, 273 736-273 757 ; `csftp` 28 669, non lu) remplace `/` par `\`, si le chemin
commence par `\` fait d'abord `SetCurDir("\")` puis **descend composante par composante** (`bFTPSetCurDir` sur chaque
sous-répertoire). Un chemin Linux annoncé `/srv/export` devient donc `\srv\export` → racine, `srv`, `export` :
compatible **à condition que la DLL accepte `"\"` comme racine** (non vérifié pour Chilkat).

Les répertoires des salles de plans sont créés à la volée : `bEnvoiUnFichier` (EG-A 159 424-159 621) fait
`bSetCurrentDirectory("\")`, puis pour chaque niveau `isExistDir`/`bCreateDir` (SFTP : chemin absolu
`sGetRepServerSDP()\<rep1>\…` ; FTP : relatif `/<rep>`), contrôle `nExistFile8` (0 absent, 1 même taille, 2 taille
différente → suppression et renvoi), `bPutFile`, puis re-contrôle de la taille après transfert (159 593-159 603).
Pour `ImportInterven` (sdpintv/bid) : `m_sRep[1]="ImportInterven"` sous `sGetRepServerExport()` (159 816-159 817)
— à 177 435 la lecture est ambiguë entre `sGetRepServerSDP()` et le 3e champ de `sGetInfoSDP` (voir 10.1).

### 3.4 Cycle de sondage (`CComm::bAttente`, `bBoucleAttente`)

EG-lot1 288 695-288 809 (commun EG/EP) : `nSleep=200` ms, `nMaxJauge = nTempsAttente/200`, boucle
`bBoucleAttente(0, 2*nMaxJauge, …)` ⇒ **durée maximale ≈ 2 × nTempsAttente** (5 000 → ~10 s ; 2 500 → ~5 s ;
3 000 → ~6 s ; 10 000 → ~20 s ; `bAttenteFTP` défaut 4 000 → ~8 s). À chaque tour : `isExistFile(nom, …, nSize)` ;
le fichier est accepté seulement si **sa taille est identique au tour précédent et non nulle** ; une taille 0
pendant 3 tours termine la boucle (« Il faut voir sur le serveur pourquoi si rien trouvé, le fichier est vide »,
l. 288 790-288 795). `csftp::bAttenteSFTPxx` (28 343-28 397) ajoute une reconnexion et un second passage.
Le listage `bGetFirstFile(rep, motif)` renvoie des entrées au format fixe « `date heure taille nom` »
(`SplitFileName`, 289 790-289 808 ; `CDllNotify::Parsing` 23 254-23 256), formaté par la DLL.

Après récupération, **le logiciel supprime toujours le fichier distant** (`bDelFile`) : `.fin` puis `.res`, ou le
`.txt`. En cas de timeout il tente aussi un `bDelFile` « au cas où » (EG-lot1 192 559, 192 564 ; 288 721-288 734).

### 3.5 Fichiers déposés par les logiciels (synthèse)

| Fichier déposé | Répertoire distant | Contenu / format | Référence |
|---|---|---|---|
| `www_<login>_<heure>.txt` (EP : `www_demo_<heure>.txt`) | export | **1 ligne** : `CCrypte::sCrypteChaine(chaîne de 21 champs séparés par TAB)` (texte ASCII 0x40-0x7F, voir 5) ; champs : login, pass, heure, nb licences, chemin UNC du COMMON, nom entreprise, type version, options, IP, machine, `EG_<version>`, `MO_<version module>`, DateSys, login catalogue, mot de passe catalogue, 2 valeurs de registre `MaxCmds`/`MaxMpxCt`, reste de jours, cadenas, (indic. répertoire), mono | EG-lot1 196 165-196 185 ; EP 638 815-638 853 (« Doit être la même que dans l'Estimateur Général ») |
| `<fic>.imp` + `<fic>.wdz` (import catalogue) | export (compte FTP dédié) | `.imp` : 2 lignes en clair (nom du catalogue, taille) ; `.wdz` : archive du CSV (production non lue, voir 10.1) | EG-A 437 203-437 237 |
| `E<ip3>_<ts>.zip`, `P<ip3>_<ts>.zip`, `F<ip3>_<dossier>_<ts>.zip` | export | archives créées par `zipCrée`/`zipAjouteFichier` WinDev (logs, dossier) | EG-B 105 963-105 988 ; EP 320 702-320 746 |
| `<nom>.wdz` (listes d'intervenants pour `sdpintv`/`bid`) | `ImportInterven` (sous export) | `zipCrée(sArch, "<nom>.wdz")` contenant un `.txt` TAB : `clé⇥réponse⇥timestamp` (bid, EG-A 177 413-177 424) | |
| `p<dossier><heure>.sdp` | salle de plans (`<racine SDP>\<repcie>\<salle>`) | 1 ligne : paramètre de requête (clé littérale l. 157 507) | EG-A 157 528-157 532 |
| plans (PDF, images…) | `<racine SDP>\<repcie>\<salle>\…` | binaire, dépôt par `bPutFile` avec contrôle de taille | EG-A 159 424-159 621 |
| pictogrammes (`EnvoiPicto`, e-Plans) | `Pictogrammes/FR`, `/EN` | fichiers image | EP 53 161-53 183 |

---

## 4. Mise à jour des logiciels

| Élément | ESTIME 14 | e-Plans | Format |
|---|---|---|---|
| Hôte | `[WEB] WebVersions` défaut `www.estimation.qc.ca` (EG-lot1 141 526) ; `isSecurHTTP` vérifie seulement qu'une valeur commençant par `http` est `https` (196 029-196 034) | idem (EP 572 580) | |
| `FTPRepClient.zip` | `http://<hôte>/version/last/FTPRepClient.zip` → `<Exe>\FTPRepClient.zip` → `zipOuvre` + `zipExtraitFichier(1)` → `.txt` lu ligne à ligne : `REPEXPORT=<chemin>` → `SetRepServerExport`, `REPSALLE=<chemin>` → `SetRepServerSDP` (EG-PG 10 757-10 799) | idem mais **seule `REPSALLE=` est appliquée** (ligne `REPEXPORT` commentée, EP 715 299-715 300) ; exécuté une fois (`gbRecupRepFTP`) | archive contenant **un** fichier texte ; les chemins sont Windows aujourd'hui |
| `updateinfo.zip` | `https://<hôte>/version/last/updateinfo.zip` (EG-A 77 687) ; copie précédente renommée `.bak`, restaurée si échec | `http://…/version/last/updateinfo.zip` (EP 87 012-87 014) | archive **protégée par mot de passe** (`zipMotDePasse`, EG-A 77 741 — valeur non recopiée) contenant `update_info.fic` (fichier **HFSQL**) lu par `HDéclareExterne` : rubriques `INFO_VERSION`, `INFO_LOGICIEL`, `INFO_LISTE_FR/EN/ES`, `INFO_DATE`, `INFO_HEURE` (EG-A 77 754-77 764) |
| Installeur | `http://<hôte>/version/last/InstallEG14.exe` (EG-A 77 279-77 280), écrit dans `<Exe>\InstallEG14.exe` | `ePlanInstall.exe` (lien dans les pages serveur, DT l. 58 466) | binaire |
| Version courante (texte) | `bGetVersionWebXX`/`bRecupFichierVersionXX` **commentées** (EG-lot1 189 489-189 523, 189 666-189 704 : `/version/Last/<Estime14.txt>`) ; le serveur lit `ModuleVersion14.txt` dans son propre dossier `Version\Last` (DT l. 133 568-133 574) | `bRecupVersionWeb(sVersion, sNomFic)` active : `HTTPRequête(m_sWebVersions + "<illisible>" + sNomFic)`, 1 ligne lue (EP 710 225-710 263) | fichier texte d'une ligne |
| Autorisation de mise à jour | `Type=estimmaj` (2.2) puis `isAutoriseUpdate()` = `AuthEstim ET PasExpire ET Abonnement` (EG-PG 10 367-10 374) | `Type=eplanmaj` → `nLitInfoLogon(…,1)` (EP 636 566-636 583) | |
| Commandes `version` / `majversion` | non appelées | non appelées | |
| TeamViewer | — | `[DOWNLOAD] TeamViewer` = `www.estimation.qc.ca/teamviewer/TeamViewer_Setup_fr.exe` (EP 572 369) | |

---

## 5. Chiffrement côté client

### 5.1 `User=` : `CCrypte::sCrypteChaine` + DllUtils `CCryptage2`

`CCrypte::sCrypteChaine(pDllUtils, psChaine, bSpecial=Faux)` (EG-lot1 214 801-214 845) :

1. Clé : 12 lettres minuscules assemblées par indices dans l'alphabet (l. 214 822-214 823 ; décryptage
   214 867-214 869) — **ne pas recopier** ; `bSpecial` applique en plus `sTransformeCle` (214 917-214 928 :
   chaîne sans accents/espaces, inversée, chaque caractère → `Caract((Asc+i) mod 26 + 'A')`).
2. **Entrelacement avec l'heure** : `sTime = HeureSys()` (format `HHMMSSCC`) répété jusqu'à la longueur `n` de la
   chaîne, puis tronqué à droite ; la ligne à chiffrer vaut, pour `i = 1..n`, `sTime[n-i+1] + sChaine[i]` → longueur
   **2n** (214 831-214 838). Au déchiffrement on garde les caractères de rang impair (214 881-214 885).
3. `pDllUtils:nCrypteChaine(ctx, clé, ligne, résultat)` → `CR_nCrypteChaine` (DU `DllUtils.def` @36 ;
   EG-lot1 307 493-307 503, tampons ASCIIZ **2048**).

`CCryptage2::bCryptage` (DU `CCryptage2.cpp` 154-203) : longueur arrondie au multiple de 3 (zéros) ;
permutation « table d'échange » (octet i ↔ octet L-1-i pour i < L/2, `pGenereTableEchange` l. 8-25) ;
`dwMod = hash % (L_clé % hash)` avec `hash = Σ octets de la clé` (l. 31-44) ; chaînage additif de la fin vers le
début lors du déchiffrement / `p[i] = p[i] + clé[k] + dwMod + p[i+1]` (mod 256) au chiffrement, `k` cyclique sur
la clé ; puis encodage **3 octets → 4 caractères** de 6 bits avec `| 0x40` : sortie dans l'intervalle
**0x40-0x7F** (`@`, `A-Z`, `[ \ ] ^ _` `` ` ``, `a-z`, `{ | } ~`, **DEL**). Pas de base64 standard.
Taille : chaîne source ≤ ~767 caractères (2n+marge ≤ 2047) ; `User=` ≤ ~1 000 caractères ; corps POST ≤ 1 023.

Chaînes chiffrées ainsi :

| Contexte | Chaîne en clair (séparateur TAB) | Référence |
|---|---|---|
| `wwwlog`, `wwwcom`, `recinf`, `delmono` | `login⇥pass⇥heure` | EP 638 854 (lisible) ; EG-lot1 196 187 (illisible, même sens) ; EG-A 95 280 (liste14) |
| `estimmaj` | `login⇥pass⇥heure` (`sGlobLoginUpdate`) | EG-PG 12 251-12 253 |
| SDP (`sdplog`, `sdpmaj`, `sdpdel`) | `login⇥pass⇥heure⇥dossier` | EG-PG 11 323-11 334 |
| `sdpacli`/`sdpscli` | `login⇥pass⇥heure⇥⇥userWindows` (lecture incertaine) | EG-PG 11 330-11 332 |
| `sdpdownload` | en-tête `K=…⇥R=…⇥N=…⇥A=…⇥I=…⇥T=…⇥F=…⇥P=…` | EP 234 489, 236 331-236 333 |
| Contenu de `www_<login>_<heure>.txt` | 21 champs (3.5) | EG-lot1 196 167-196 182 |
| Mots de passe stockés dans les paramètres locaux (`bSetSDPPassword`, `bSetCATPassword`) | mot de passe seul | EG-lot1 196 099 ; EG-A 95 291 |

L'**heure** (`HeureSys()`, 8 chiffres) est le sel : elle apparaît en clair comme 3e champ, dans le nom du fichier
déposé (`www_<login>_<heure>.txt`) et dans le nom du fichier attendu (`<login>_<heure>.txt`). La boucle
`TANTQUE HeureSys()=sHeure` (EG-lot1 192 696-192 698) garantit une heure différente à chaque tentative.

### 5.2 Autres chiffrements

- `CIdentWeb::sCrypte`/`sDecrypte` (EG-lot1 194 575-194 621) et `CProtectPlan::sCrypte` : `Crypte(…, clé,
  crypteSécurisé, encodePCS)` WinDev avec clé littérale par défaut (l. 194 575, non recopiée), les caractères ≤ 32
  étant écrits `<nn>` ; usage local (registre, témoins). `Crypte(…, compresseChaîneCourte, encodePCS)` pour le
  paramètre `cpl=` des liens (8.g).
- `CCryptFic` (EG-lot1 271 759-272 327) : fichier texte chiffré par **blocs** via DllNotify `bCrypte` ; longueur de
  bloc `m_nLngMax` initiale **129**, +3 à chaque ligne/bloc jusqu'à **1026** (`BUF_MAX`) (271 910, 272 013,
  272 158) ; chaque bloc de n octets devient 4n/3 caractères (même encodage 6 bits `|0x40`) ; clé dérivée par
  `sCreatCle` (272 257-272 278 : sans accents/espaces, inversée, `(Asc+i) mod 26 + 'A'`). Algorithme C++ : DN
  `CCryptage.cpp` 143-200 (identique à `CCryptage2`). Utilisé pour le CSV des catalogues (8.d) et le témoin
  `imtweg.dll`/`imtwnq.dll` local (190 129-190 276).
- `CBaseRB::sGetCrypteCodePostal` etc. : usage RBQ interne, non lu.
- Identifiants FTP/SFTP : `Décrypte(…, crypteSécurisé, encodePCS)` avec clés littérales (3.3).
- Clé Chilkat (`Type=chilkat`) : obscurcissement par quartets + aléa (EP 78 337-78 344), réversible côté serveur.

---

## 6. Hypothèses que les logiciels font sur le serveur

| Sujet | Hypothèse implicite | Preuve |
|---|---|---|
| Schéma/port HTTP | **HTTP clair, port 80**, POST, sans redirection vers https ; statut ignoré ; corps ignoré | DN `CHTTP.cpp` 216, 269-300 ; `DllNotify.cpp` 971 |
| Chemin | `WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` sans `/` initial ; anciennes versions : `WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` (lien « site web », EG-lot1 140 482) | |
| Délais | réponse HTTP dans le délai de réception : 15 s par défaut, 10 s (EP wwwlog), 60 s (EP newexcept), 120 s (sdpacli), 300 s (sdpstat), **1 800 s (export14)** ; 1 seul essai HTTP (EG), 2 (EP wwwlog/testcharge), 4 (EP newexcept) | 2.1, 2.2 |
| Fichiers résultat | déposés dans **le même répertoire** que celui où le logiciel dépose ses fichiers (racine du compte FTP export, ou `REPEXPORT`/défaut en SFTP) ; disponibles **dans les ~5 à 20 s** suivant le POST (3.4) ; **taille stable et non nulle** lors de deux listages consécutifs à 200 ms ; supprimables par le client | 3.4 |
| Nommage | `.fin` créé **après** le `.res` (le client supprime le `.fin` puis lit le `.res` ; le serveur crée bien `.res` puis `.fin`, DT l. 134 729-134 740, 135 271-135 277) ; comparaison de noms en WLangage `~=` (insensible à la casse, EG-lot1 189 260) mais motifs de listage FTP/SFTP transmis tels quels (casse à respecter : `ResInf_`, `Entrep_`, `.fin`, `.res`, `.fst`, `.lst`, `.exp`, `.wdz`) ; e-Plans remplace `.WDZ` → `.wdz` « au cas où » (EP 208 758) | |
| Noms de fichiers avec espace | `"<login> <nom catalogue>.exp/.wdz"` (export14) et motif `"<login> *.wdz"` | EG-A 94 224, 94 505 |
| Encodage | fichiers lus/écrits en **ANSI Windows-1252** (tampons ASCIIZ, `ExtraitChaîne`), lignes terminées **CRLF** à l'écriture (`CCryptFic::bEcritLigne` ajoute `RC`, 271 986) ; lecture par `CFichier::bLitLigne` (fLitLigne WinDev, accepte CRLF ; LF seul non vérifié) ; SFTP : `put_Utf8` selon réglage | |
| Chemins | chemins Windows (`C:\…`, `d:\…`) acceptés par le serveur SFTP comme répertoire courant ; `/`→`\` et descente composante par composante (3.3) | EG-lot1 273 736-273 757 |
| Taille | aucune limite explicite ; `SDPMaxSize`/`MAXSDP` fournis par le serveur ; contrôle de taille après `bPutFile` (`nExistFile8`) | EG-A 159 593 |
| Date système | e-Plans force le mode consultation si `DateSys=` du serveur > date locale + 2 jours (EP 636 526-636 531) ; EG compare `DATESYS` | |
| Horloge/heure | `HeureSys()` 8 chiffres partagés entre nom de fichier et sel : le serveur doit **recopier exactement** l'heure reçue dans le nom du fichier réponse `<login>_<heure>.txt` | EG-lot1 192 481 ; EP 633 766 |

---

## 7. Différences ESTIME 14 / e-Plans et traces d'anciennes versions

- **Protocole de transfert par défaut** : SFTP (EG) vs FTP (EP) ; tous deux basculent en FTP si SFTP échoue.
- **`FTPRepClient.zip`** : EG applique `REPEXPORT=` et `REPSALLE=` ; EP n'applique que `REPSALLE=`.
- **Nommage wwwlog** : EP gère un login vide (`www_demo_<heure>.txt` / `demo_<userWindows>_<heure>.txt`,
  constante `LOGIN_DEMO=5000`, EP 3 149, 633 785-633 789, 633 934-633 937) ; EG exige un login (fenêtre
  `FEN_IDENTCLI`, EG-lot1 196 095).
- **Validité du cache WDZ hors ligne** : 15 jours (EG, « Anciennement 90 jours », 192 961) vs 365 jours (EP 634 428).
- **Lecture du fichier wwwlog** : EG attend le témoin numérique en 1re ligne ; EP accepte aussi `##5000` puis une
  ligne `DateSys=` puis `Auth=` (8.a).
- **Délais HTTP** : EG laisse le défaut 15 s sauf cas listés ; EP passe explicitement `Vrai,2,10000` (wwwlog) et
  `Faux,4,60000` (newexcept).
- **`sdplist`/`sdpdownload`** n'existent que dans e-Plans ; `export14`, `liste14`, `import`, `bid`, `sdpintv`,
  `sdpstat`, `sdpacli/sdpscli`, `sdpdel`, `sdplog/sdpmaj`, `estimmaj`, RBQ n'existent que dans l'EG.
- **Clé Chilkat** : fournie par le serveur dans la réponse wwwlog (`CHILKAT=`) et sauvée dans `DllNotify.ini`
  (EP 636 624-636 625 ; EG 189 833) ; téléversée par e-Plans (`Type=chilkat`).
- **Traces d'anciennes versions** : URL `WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` (WebDev 7) conservée pour
  « compatibilité anciens INI » (EG-lot1 140 482) ; `www.estimation.ca` migré automatiquement vers
  `www.lecatalogue.ca` (140 699 ; EP 571 154-571 156) ; `[OPTION] URLSDP` → `[SDP] URLSDP` (141 468-141 470) ;
  `param12.ini` copié en `param14.ini` (EG-PG 10 718-10 743) ; constantes `NUM_MODULE12`, `AAEstime12`
  (EG-A 77 192) ; `CPlanProtocole` « utilisées par l'Estimateur Général version 12 et 14 » (EG-lot1 290 787) ;
  types de version `gold`/`silver`/`silver+`/`bronze`/`demo` envoyés dans `versiones=` (`sGetTypeversion`,
  EG-lot1 141 426-141 431) ; codes `VERSWEB_*` (135 926-135 931) ; ancien envoi de projet par FTP avec
  identifiants en dur, commenté (EP 708 700-708 769) ; ancien `HTTPRequête("www.estimation.qc.ca/test2?Type=wwwlog…")`
  (EP 634 017-634 021, désactivé) ; ancienne requête RBQ `www.estimation.qc.ca/reqrbq/rbq<num>.txt` déchiffrée
  par `Décrypte(…, crypteRapide+encodePCS)` (EG-A 240 304-240 320, commenté — clé à purger).
- `estimation.qc.ca` reste l'hôte des mises à jour et des liens d'invitation (`URLSDP`) ; `lecatalogue.ca` celui
  des commandes et du FTP/SFTP.

---

## 8. Lecture des fichiers réponse par les logiciels (formats à reproduire)

Tous les fichiers ci-dessous sont lus par `CFichier::bLitLigne` (texte ANSI, lignes CRLF) après `bGetFile`
dans un répertoire temporaire local, puis supprimés localement et sur le serveur. Sauf mention contraire,
**aucun fichier reçu n'est chiffré**.

### 8.a `export\<login>_<heure>.txt` (réponse à `wwwlog`, `estimmaj`, `eplanmaj`)

Lecture EG `CIdentWeb::nLitInfoLogon` (EG-lot1 194 054-194 340) + `bRecupMotCle` (189 759-189 844) +
`TraiteLigne` (196 384-196 492) ; EP `nLitInfoLogon` (636 478-636 739) + `bTraiteLigne` (631 524-631 692).

1. **Ligne 1** :
   - `##<code>` : erreur. Codes serveur (`CIdentCommun`, EG-lot1 115 691-115 702, impression partiellement
     illisible) : 1000 inconnu, **1001 mot de passe**, **1002 login** (déduit), 1003 référence, 1004 SDP inexistante,
     1005 SDP supprimée, 1006/1007 GETDIR, 1008 OPENFILE, 1009 RESPONSE/STAT, 1010 TIMEOUT (déduit), 1011 FICSTAT,
     1012 REPTEMP, 1013 READ (déduit), 1014 WDZEXPIRE ; EP : `##5000` = `LOGIN_DEMO` (EP 636 523).
     Sur 1001/1002 le client efface « pas redemander » et refait un `wwwlog` avec une nouvelle heure.
   - sinon un **entier « témoin »** : `m_bAutoriseMAJ = (témoin = 17 OU 21 OU 23)` « un de ces 3 nombres premiers,
     tous les autres c'est faux » (EG 194 112-194 114 ; EP 636 586-636 598). Le serveur écrit un code 17/21/23
     (autorisé) ou autre (24-100 selon le coordonnateur ; non vérifié côté client, qui ne distingue pas les autres).
   - cas `nTypeAttente=1` (`estimmaj`/`eplanmaj`) : ligne `Auth=<AuthEstim> <PasExpire> <Abonnement>` séparée par
     **espaces** (EG-PG 10 367-10 369 ; EP 636 567-636 569).
   - EP seulement, après `##5000` : ligne `DateSys=<AAAAMMJJ…>` (636 526-636 531) puis `Auth=?|1|0` (636 539-636 557).
2. **Lignes suivantes** `MOT=valeur` (mot comparé en **majuscules**, `ExtraitChaîne(…,1,"=")`) ; mots reconnus :
   `DATEFIN`/`DATFIN`, `NBRLIC`, `NBRLICEP`, `CATABON`/`AUTHCAT`, `CLECIE`, `FINEG`, `FINEPLANS`, `LOCATION`/`LOCAT`,
   `AUTHSDP`, `AUTHEG`, `AUTHEPL`/`AUTHEPLAN`, `OPINV`, `OPECH`, `OPCMP`, `OPVEN`, `OPREP`, `OPPLAN`, `ABON`, `EPLANSV`,
   `ESTIMEV` (≥ "14" ⇒ version 14), `DATESYS`, `DATINST`/`DATINS`/`DATEINST`, `PASEXPIRE`, `SDPMAXSIZE`/`MAXSDP`,
   `VMODULE14`, `VESTIME14`, `VEPLANS`, `VEREG`, `VERMO`, `VEREP`, `CATINFO` (cumulé avec RC), `CATRESULT`,
   `FORCELIC`/`FLIC`, `TYPEEG`, `NVER`, `NORBQ`, `DETAILLIC` (`SetDetailLicEx(sLigne)`), `CHILKAT`, `MAJWARN`
   (`version#message`), `RESTEJ`, `EUROPE`, `NOMCIE`, `CONTACT`, `MAIL1..3`, `TEL1/2`, `LASTV`, `DATEG`, `DATEP`,
   `ECOLE_RUE/VILLE/PROV/PAYS/TEL/MOB/MAIL/WEB` (189 720-189 743). `REPEXPORT=` et `REPSDPCLI=` sont **commentés**
   (189 835-189 836, 196 448) — ils ne sont pas lus ici.
   Lignes `COMMON=` : valeur `rep|locked|typeVersion|entreprise|ip|dateFin|machine|nettoyer|mono|cadenas|timestamp|indicRep`
   séparée par `|` (194 137-194 158 ; 196 299-196 312 ; EP 631 652-631 679) ; variantes `COMMON<n>=` et mots finissant
   par `##` traités par `TraiteCommon`. Ordre des champs **à reproduire exactement** (les 12 positions).
3. Après lecture : le fichier est rechiffré ligne à ligne (`CCrypte::sCrypteChaine`) dans `<prefixe>_<heure>.bin`
   puis zippé dans `<prefixe>_<heure>.wdz` (`bSauveEtCrypte`, 189 866-189 918) ; les `.txt` de plus de 3 jours et
   les anciens `.wdz/.bin` sont supprimés ; en cas d'échec réseau ultérieur, le `.wdz` le plus récent (≤ 15 j / 365 j)
   est rejoué (`nDecrypteEtCharge`, 192 957-193 038 ; EP 634 424-634 504).

### 8.b `ResInf_<ident>.res` / `.fin` (réponse à `recinf`)

`bAttenteResultatRecInf` (EG-lot1 189 230-189 303 ; EP 629 575-629 667) et `bAttenteResultat` (EG-A 180 802-180 909) :
le `.fin` (vide, marqueur) est détecté par listage puis **supprimé** ; le `.res` est téléchargé, supprimé, puis lu :
si les 6 premiers caractères d'une ligne sont `erreur` (insensible à la casse) → message d'erreur affiché ; sinon
`TraiteLigne` avec les mêmes mots-clés que 8.a (`NOMCIE`, `CLECIE`, `CONTACT`, `MAIL1..3`, `ABON`, `DATFIN`,
`LASTV`, `TYPEEG`, `NBRLIC`, `NBRLICEP`, `VEREG`, `VERMO`, `DATEG`, `DATEP`, `TEL1/2`, `NVER`, `OP*`, `AUTHCAT`,
`AUTHSDP`, `MAXSDP`, `RESTEJ`, `AUTHEPL`, `DATESYS`, `DATINST`, `LOCAT`, `FLIC`, `DETAILLIC`, `EUROPE`, `COMMON…`,
`ECOLE_*`). Texte en clair, pas de CCryptFic ni DllNotify (le serveur écrit avec `oFic:bEcritLigne`, DT 135 277-135 300).

### 8.c `<login>.fst` / `<login>.lst` (réponse à `liste14`)

`ScanDirList` (EG-A 95 559-95 681), FTP : `.fst` ligne 1 = **nombre de catalogues** ; si 0, la **même ligne**
contient `<message EN>/<message FR>` séparés par `/` (95 627-95 629). Puis `.lst` : une ligne par catalogue,
champs séparés par `cSep` (valeur non lue dans la déclaration, probablement TAB) : 1 = clé (`Milieu(…,2)` →
préfixe d'un caractère, ex. `#`), 2 = nom, 3 = date de révision, 4 = numéro de révision, 5 = nom de fichier
(95 648-95 673). Texte en clair.

### 8.d `<login> <nomcat>.exp` / `.wdz` (réponse à `export14`)

`bTraiteImport` (EG-A 94 855-94 923) : `.exp` texte, **ligne 1 = nom du catalogue** (seule ligne lue) ; `.wdz` →
`CUtils::bDecompacte` = **`fDécompacte` WinDev** (EG-lot1 156 846-156 868 : donc format **fCompacte**, pas ZIP)
→ `.csv` ; `bImport14` (EG-A 94 363-94 418) ouvre le CSV avec **`CCryptFic::bOuvreEx(…, foLectureEcriture, Vrai, sCle)`**
où `sCle = Minuscule(SansAccent(SansEspace(login) + SansEspace(nomCatalogue sans "www ") + SansEspace(motDePasse)))`
(94 367-94 368) ⇒ le CSV est **chiffré par blocs DllNotify (129→1026, pas de 3)**, séparateur `;` (94 388),
niveau de ligne par `stParam:m_nIndNiveau` (`CAT_ITEM`/`CAT_SOUSSECTION`/`CAT_SECTION`, 94 945-94 969).
Les fichiers distants sont supprimés après lecture ; en local le `.exp` est gardé en cas d'erreur.
Un fichier `trades` dans le listage est traité à part (94 519, illisible).

### 8.e `Entrep_<ident>.res` / `.fin` (réponse RBQ)

`CBaseRB` (EG-lot1 303 745-304 330), `nAttenteFinFTP` (EG-PG 9 362-9 438), `bRecupInterv` (EG-A 241 415-241 484),
`bRecupIntervFTP` (EG-B 42 434-42 475). `ident = <machine>_<heure>` (`CBasicBase::SetIdent`, 58 625-58 626).
Préfixes : `Entrep_` (intervenant), `Region_`, `Liste_`, `Categ_` ; extensions `.res` et `.fin` (303 750-303 754).

- `.fin` : attendu (`bAttenteFTP`, 2 000/8 000/12 000 ms selon le type, 9 385-9 388), téléchargé **et lu** :
  sa première ligne contient `<texte>: <N>` → `N = ExtraitChaîne(ligne, 2, ":")` = nombre de résultats ; si la ligne
  contient `LIMITE` → message de limite ; `0` → « aucun résultat » (9 421-9 437).
- `.res` : texte **en clair** (aucun déchiffrement : `RemplitZoneEntrep` lit par `bLitLigne`, 304 118-304 141),
  une ligne par entreprise ; si N = 1 la première ligne commençant par `##…` (`##NOTFOUND` probable, 241 456
  illisible) signale « non trouvé ». Structure d'une ligne : **12 zones séparées par `|`** (`SEP_ZONE`), champs
  d'une zone séparés par `SEP_CHAMP` (valeur illisible l. 303 748, probablement `;` ; les TAB d'une zone sont
  convertis en `;`, 304 016-304 018) :
  1 = entreprise (champs : 1 nom, 2 numéro RBQ, 3 adresse, 4 ville, 5 code postal, 7 id région, 8 téléphone,
  9 courriel, 11 échéance (MMJJ complété par l'année courante/suivante, 304 226-304 231), 12 date MAJ, 13 contrôle,
  14 pays) ; 2 = nombre de divisions ; 3 = divisions ; 4 = nombre de responsables ; 5 = nombre de champs par
  responsable ; 6 = responsables (prénom, nom, adresse, ville, prov, …, tél, qualif, …, pays) ; 7 = `S;<n>` ;
  8 = catégories spécialisées ; 9 = `G;<n>` ; 10 = catégories générales ; 11 = `X;<n>` ; 12 = informations
  complémentaires (303 755-303 801, 303 979-304 069).

### 8.f Fichiers SDP, bid, sdpstat, sdplist

- `<login>_<heure>.txt` (`sdplog`/`sdpmaj`/`sdpdel`/`sdpacli`/`sdpscli`, EG-A 170 341-170 551 et `nGlobAttenteResultat`) :
  ligne 1 `##<code>` (`isErrorSalle` = `Gauche(ligne,2)="##"`, 167 718-167 720) → 1001 mot de passe, 1002 login,
  1003 référence, 1005 expirée (`SDPSupprimeInfo`), 1004 inexistante ; sinon, **type 1** : ligne 1 = répertoire
  compagnie (`psRemoteRep`), ligne 2 = `GetMaxima` : `<taille max Mo>,<délai jours>` (165 892-165 900), ligne 3 =
  somme des tailles des salles, ligne 4 = taille de la salle courante, ligne 5 = autorisation `1`/`0`, puis
  (si `bTableSDP`) `ExtraitListeFic` : bloc `Entreprise:` avec champs `Name/Addr/City/Prov/Tel/Fax/Mail` au format
  `clé=valeur` séparés par TAB, puis bloc `Fichiers:` (165 428-165 449, lecture partielle) ; **type 2** : ligne 1 =
  `<référence>,<expiré 0/1>,<dernière modif>` (170 470-170 474), puis maxima, somme, taille, autorisation.
  e-Plans `sdplist` (EP 231 277-231 300) : ligne 1 `##1..7` (1 salle non trouvée, 2 référence, 3 mot de passe,
  4 propriétaire, 5 description, 6 supprimée, 7 expirée) sinon liste ; le résultat est découpé sur `Fichiers:` (EP 230 068).
- `bid` : `nAttenteInterv` (EG-A 170 228-170 307) attend **le `.fin` du nom du `.wdz` déposé** (`<nom>.fin`),
  le télécharge, le supprime, puis `<nom>.res` ; traitement par `nTraitementReponse` (non lu). Le nom
  `<timestamp>Ret.res` mentionné par le coordonnateur n'a pas été vu côté client (non vérifié).
- `sdpstat` : `<generic>.res` (ligne 1 = nombre ; 0 = pas de réponse) puis `<generic>.zip` ouvert par `zipOuvre`
  et **2 fichiers extraits dans l'ordre** : `<generic>.txt` (statistiques) et `<generic>.dic` (dictionnaire des noms
  de plans) (EG-B 90 320-90 367) ; format interne consommé par `bAlimStatistics2` (non lu). `generic` =
  `AAAAMMJJhhmmss + référence` (ex. de test l. 91 022).

### 8.g Liens `numsdp` avec `cpl=` / `ans=` (invitations)

Générés par l'EG (impression/courriel d'invitation, `CPrintInvitation` et `CHTMLVersPDF`) :
`sLien = m_sURLSDP + "/" + m_sREPSDP + "?param=" + référence` (EG-lot1 244 219, 246 038) puis `sLien += "&cpl=" +
sInfoEntrep` (244 220 ; EG-A 170 860, 171 303) où `sInfoEntrep = Crypte(login + "-|-" + dossier + "-|-" + réponse +
"-|-" + cléDef + "-|-" + cléDossier + "-|-" + langue, <clé littérale>, compresseChaîneCourte, encodePCS)`
(`sGetEntrepEx`, 245 229-245 238 ; séparateur « le même sur le serveur ») ; les boutons OUI/NON/PEUT-ÊTRE ajoutent
`&ans=` + `sGetSDPEntrep(stInfCli, 1|2|3)` (243 643-243 679, 245 189-245 190, 246 034-246 056). Insérés dans le PDF
(`TextLinkMM`, `SetWebLink2`) et dans le HTML du courriel (gabarit `##SDP_REF##`, `##SDP_CPL##`, 246 085, 246 194).
Hôte : `URLSDP` (`www.estimation.qc.ca`) + `REPSDP` — **pas** l'URL AWP ; `https://` si `m_bSecurHTTP`.
La clé de `Crypte(compresseChaîneCourte)` est à l. 245 237/245 357 (non recopiée) ; le serveur doit la partager.

### 8.h Dépôts : résumé des formats à savoir lire côté serveur

| Dépôt | Format |
|---|---|
| `www_<login>_<heure>.txt` | 1 ligne ASCII (0x40-0x7F) = `CCrypte::sCrypteChaine` (5.1) de 21 champs TAB |
| `.imp` | 2 lignes texte clair ; `.wdz` d'import : production non lue (voir 10.1) |
| `.wdz` d'`ImportInterven` (sdpintv/bid) | archive `zipCrée` WinDev (extension `.wdz` ⇒ format WDZ PC SOFT, non ZIP — à vérifier) contenant un `.txt` TAB |
| `E…/P…/F….zip` (newexcept, projexp) | archives `zipCrée` avec extension `.zip` |
| `.sdp` | 1 ligne texte |
| plans | binaires bruts, arborescence `<repcie>\<salle>\…` |

---

## 9. Contrats que le serveur Linux de remplacement doit honorer

1. **HTTP** : accepter `POST http://www.lecatalogue.ca/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` (et le GET du
   même chemin pour les liens navigateur, ainsi que `WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE`), corps
   `application/x-www-form-urlencoded`-like **sans encodage** (parser tolérant : `=` et `&` seulement, valeurs brutes
   avec `\ ] ^ _ { | } ~ DEL #`), noms de paramètres **insensibles à la casse**, agent `DllNotify`. **Pas de
   redirection 301/302 vers https** sur ce chemin, réponse rapide (le client ignore le corps et le statut).
   Les traitements longs (export14) peuvent dépasser 15 s : répondre vite ou traiter en arrière-plan (le client
   accorde 30 min pour export14, 15 s pour la plupart des autres).
2. **FTP** passif sur **10221** (défaut des postes) et 21, binaire, listage `LIST`/`NLST` compatible WinInet
   (`FtpFindFirstFile` avec motif, noms avec espaces), trois comptes : export (racine = répertoire export), SDP
   (racine = racine des salles de plans), plus l'ancien compte d'import codé en dur (EG-A 437 214-437 218) si
   l'import catalogue doit survivre. Transcodage d'accents côté DLL (table non lue).
3. **SFTP** (Chilkat) sur **10222** et 22, authentification par mot de passe, un compte « tous répertoires » ;
   le client fait `cd` vers le répertoire annoncé (`REPEXPORT`/`REPSALLE` de `FTPRepClient.zip`, sinon
   `C:\WebSite\lecatalogue\LECATALOGUE_WEB\export` / `d:\SalleDePlans`) en descendant composante par composante
   après `/`→`\` : soit émuler ces chemins Windows, soit publier des chemins `/…` dans `FTPRepClient.zip`
   (compatibles si la DLL accepte `\` comme racine — à tester). Attention : e-Plans n'applique pas `REPEXPORT=`.
4. **Fichiers réponse** : mêmes noms (`<login>_<heure>.txt`, `ResInf_<ident>.res` puis `.fin`, `Entrep_<ident>.res`
   puis `.fin`, `<login>.fst`/`.lst`, `<login> <nomcat>.exp`/`.wdz`, `<generic>.res`/`.zip`, `<nom>.fin`/`.res`),
   écrits **atomiquement** (rename) pour satisfaire le test de taille stable à 200 ms, disponibles en < 5 s de
   préférence, supprimables par le client, texte **Windows-1252 CRLF**, mots-clés et ordre des champs de 8.a-8.f.
5. **Formats propriétaires PC SOFT à réimplémenter** : (i) `CCryptage2` (déchiffrer `user=` et le contenu de
   `www_…txt`, chiffrer `cpl` ? non : `cpl` utilise `Crypte` WinDev) ; (ii) `Crypte/Décrypte` WinDev
   `crypteSécurisé+encodePCS` et `compresseChaîneCourte+encodePCS` (liens `cpl=`, mots de passe FTP de l'INI si on
   régénère des INI) ; (iii) **fCompacte/fDécompacte** (le `.wdz` d'export14 est un fichier `fCompacte`) ;
   (iv) chiffrement par blocs DllNotify `bCrypte` (CSV des catalogues, clé dérivée login+catalogue+mot de passe) ;
   (v) archive **WDZ** PC SOFT si les `.wdz` déposés par `zipCrée` ne sont pas des ZIP (à vérifier) ; (vi) `update_info.fic`
   HFSQL dans `updateinfo.zip` protégé par mot de passe ; (vii) `FTPRepClient.zip` (ZIP ordinaire ? `zipOuvre` lit
   les deux formats).
6. **Mises à jour** : servir `http(s)://www.estimation.qc.ca/version/last/{FTPRepClient.zip, updateinfo.zip,
   InstallEG14.exe, ePlanInstall.exe, <fichier version>}` ; l'EG demande `updateinfo.zip` en **https** et
   `InstallEG14.exe` en http.
7. **Clés partagées** : clé `CCrypte` (alphabet), clé `Crypte` des liens `cpl`, clés de déchiffrement des
   identifiants INI, clé `sdpstat`, clé `.sdp` (`creatsdp`), clé Chilkat — toutes désignées par emplacement
   (section 10.4), à extraire dans un coffre côté serveur.
8. **Réponses `Type=` secondaires** à conserver : `sdpintv`, `bid`, `newexcept`, `projexp`, `chilkat`, `delmono`,
   `wwwcom` n'attendent rien ; `creatsdp`/`numsdp` sont des pages navigateur (HTML réel attendu).

---

## 10. Points non vérifiés / incertitudes

### 10.1 Déductions non confirmées dans le code

- Le `https` « toujours » annoncé par `CHTTP` (`m_nType=TYPE_HTTPS`, « Maintenant toujours HTTPS ») n'est **pas**
  réalisé par les sources C++ de `FNotify V9` (port 80, pas de `INTERNET_FLAG_SECURE`). Il est possible que la
  DLL déployée (`Exe\DllNotify.dll`) diffère de ces sources : **à confirmer par capture réseau** sur un poste
  client (port 80 vs 443) avant de couper le HTTP.
- Comportement de WinInet sur une redirection `http→https` d'un POST (erreur 12039 attendue) : non testé.
- `HttpOpenRequest` avec un chemin sans `/` initial : WinInet le préfixe normalement ; non testé.
- `nMaxEssais` forcé à 1 dans `CHTTP::bPost` WLangage (EG-lot1 52 589) : la version e-Plans de la classe (binaire)
  n'a pas été lue ; les appels `bPost(…,Vrai,2,10000)` suggèrent qu'elle respecte `nMaxEssais`.
- Valeur exacte de `Type=` dans `CBaseRB::bLanceRequete` (`rbx` vs `rbq`) : ligne 303 942 illisible ; le serveur
  accepte les deux (A4).
- `cSep` du `.lst` (liste14), `SEP_CHAMP` de `CBaseRB`, chaîne de chemin dans `bRecupVersionWeb` (EP 710 228),
  `sGetLogin(7)/(8)/(11)` (variantes du même login ?) : illisibles.
- Répertoire d'`ImportInterven` pour `bid` : `sGetRepServerExport()` (159 817) vs `sGetRepServerSDP()` (177 435,
  entrelacé) ; les deux fonctions passent par la connexion `REP_EXPORT` pour lire `.fin/.res` (170 253).
- Format des `.wdz` produits par `zipCrée(sArch, "x.wdz")` (WDZ PC SOFT ou ZIP) et du `.wdz` d'import catalogue
  (production non lue, EG-A avant 437 203) ; format de `FTPRepClient.zip` (`zipOuvre` accepte WDZ et ZIP).
- `nTraitementReponse` (bid), `bAlimStatistics2` (sdpstat), `ExtraitListeFic` complet (SDP), `csftp::bSetCurrentDirectory`,
  `CHTTP::bGetRequest`/`bURLDownloadToFile` (DN exports non vus dans `.def` : `bHTTPGetRequest`… masqués) : non lus.
- Vérification de clé d'hôte SFTP par Chilkat et table de transcodage des accents FTP : non vues.
- Casse des motifs de listage côté Chilkat (`ReadDirMustMatch`) et WinInet : supposée sensible.
- Le `.fin` RBQ est lu (ligne `…: N`) alors que les `.fin` de `recinf`/`bid` semblent être de simples marqueurs :
  contenu des `.fin` serveur à recouper avec A2/A4.
- Le témoin 1re ligne de wwwlog : seuls 17/21/23 sont significatifs côté client ; les codes 24-100 cités par le
  coordonnateur ne sont pas distingués par le client.
- `Type=version`/`majversion` : aucun appel trouvé, mais le texte entrelacé peut masquer une occurrence.
- `CWebParcours::sGetPage` (HTTPS, certificat expiré ignoré) : cible inconnue, peut viser lecatalogue.ca.
- `bAttente` : `isExistFile` passe par un listage avec motif = nom exact ; comportement si plusieurs fichiers
  correspondent non examiné.

### 10.2 Passages illisibles du dossier (colonnes mélangées) ayant gêné l'analyse

- EG-lot1 192 776 (corps exact du POST `wwwlog`), 196 187 (chaîne `User=` EG), 303 942 (`Type=rb?`),
  303 748 (`SEP_ZONE`/`SEP_CHAMP`), 115 694-115 702 (codes `ERROR_*` partiellement fusionnés), 189 342-189 364
  (`bGenereLoginWDZ`), 191 383 (`REP_EXPORT` dans `GetInfoConnect`), 288 846 (ajout de `m_nSecur` dans `bConnect`),
  289 796-289 807 (`SplitFileName`).
- EG-A 94 234/94 261 (`bGetFile`+`bDelFile` des `.exp/.wdz`), 95 588 (motif `.fst`), 159 835-159 838 (corps
  `sdpintv`), 161 456 (`nAttenteResultat`), 170 440-170 494 (format SDP type 1/2), 177 435 (`ImportInterven`),
  240 231-240 232 (commande RBQ), 241 456 (`##NOTFOUND`), 437 214-437 218 (identifiants FTP en tableaux de caractères).
- EG-B 89 343 (remplacements `?`/`&` de `sdpstat`), 105 964-105 969 (noms `E…/F….zip`), 106 006 (trace).
- EG-PG 10 760 (URL `FTPRepClient.zip`), 10 792 (`REPSALLE=`), 11 330-11 332 (variante `userWindows`).
- EP 634 018-634 021 (ancien `HTTPRequête` wwwlog), 638 817-638 851 (chaîne de 21 champs), 230 049 (nom du fichier
  `sdplist`), 231 279 (`bGetFile`+`bDelFile`), 236 331 (en-tête `sdpdownload`), 710 228 (URL version), 714 860.

### 10.3 Non consulté

- Code binaire des classes communes (`CIdentWeb.wdc`, `chttp.wdc`, `ccomm.wdc`, `CDllNotify.wdc`, `CCryptFic.wdc`,
  `CPlanProtocole.wdc`), les fenêtres `ident_ftp`, `MISE_A_JOUR`, `FEN_CTRL` exclues du dossier (voir
  `ESTIME 14/Dossier/CLAUDE.md`), les `.ini` réels des postes.
- `CPlanProtocole` (EG-lot1 290 775-291 831) concerne le dialogue local EG↔e-Plans (messages Windows), pas le serveur.

### 10.4 Secrets présents en clair dans les dossiers (à purger, non recopiés ici)

EG-lot1 : 191 377-191 378, 191 388 (identifiants FTP/SFTP chiffrés par défaut), **191 393-191 405** (identifiants
et mots de passe FTP/SFTP **en clair** en commentaire), 273 819 et 28 760-28 761 (`GetDefInfoLogin`), 13 823-13 831
(`sGetInfoSDP`, mot de passe SDP en morceaux), 194 575/194 601 (clé `sCrypte`), 214 822-214 823 et 214 867-214 869
(clé `CCrypte`), 288 926-288 927 (clés `Décrypte` des identifiants), 245 237/245 357 (clé `cpl`), 140 720-140 724 et
141 482-141 488 (adresses IP de serveurs), 11 327 (login/mot de passe de test, EG-PG), 157 507 (clé `.sdp`),
EG-B 89 331 (clé `sdpstat`), 51 250-51 268, EG-A 77 359, 77 741 (mot de passe `updateinfo.zip`), 240 313 (clé RBQ
historique), 437 214-437 218 (identifiants FTP import), EG-A 155 084-155 085 (chemins registre, non sensibles).
EP : 567 876-567 894 (identifiants chiffrés + **en clair** en commentaire), 78 325, 86 621, 290 231-290 238,
666 782-666 783, 708 738, 234 449-234 452 (identifiants en tableaux de caractères), 638 736 (mot de passe démo),
564 883 (courriel personnel), 343 261 (IP). DN `CSFTP.cpp` 89 (code de déverrouillage Chilkat).
DT (serveur) l. 826-850 : exemples de requêtes RBQ avec IP et noms réels.
