# A3 — Commandes `Type=` des groupes VERSIONS / LICENCES / CATALOGUES / DÉSABONNEMENT

Inventaire des commandes appelées par les logiciels clients (e-Plans, Estimateur Général 12/14, module d'envoi)
sur la page d'accueil du site AWP : `/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue?Type=...`
(`.htaccess` réécrit en plus l'ancienne URL `WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` vers celle-ci).

Toutes les références « p.N » renvoient aux marqueurs `--- page N ---` de `Docs/dossier-technique.txt` ;
les numéros de lignes sont ceux de ce même fichier.

---

## 0. Mécanique commune

### 0.1 Lecture des paramètres HTTP (code projet, p.123-124, lignes 726-752)

Tous les paramètres sont lus par `PageParamètre("...")` dans le code d'initialisation du projet, avant le dispatch.

| Variable globale | Paramètre HTTP (nom exact dans le code) | Utilisé par |
|---|---|---|
| `AAType` | `Type` | dispatch `SELON Minuscule(AAType)` |
| `AAUserC` | `User` | presque toutes les commandes (chaîne chiffrée, voir 0.3 ; **en clair** pour `import`/`export`/`liste`, voir 0.3.3) |
| `AAUser` | `AAUser` | lu « pour RecInf » mais **jamais utilisé** par `recinf` (qui reçoit `AAUserC`) |
| `AAIdent` | `AAIdent` | `recinf` (nom unique du fichier résultat) ; ex-`verdisp` |
| `AAInfo` | `AAInfo` | lu, passé à `CreatInfoClient` comme `sInfoSrc` mais **non exploité** dans le corps |
| `AACatalogue` | `Cat` | `import`, `export`, `export14` |
| `AAEPlan` | `VersionEPlan` | `version`, `majversion` |
| `AAEstime12` | `VersionEstime` | `version`, `majversion` |
| `AAEstime14` | `VersionEstime14` | `version`, `majversion` |
| `AAModule12` | `VersionModule` | `version`, `majversion` |
| `AAModule14` | `VersionModule14` | `version`, `majversion` |
| `AAInfoV` | `info` | `version` (date AAAAMMJJ sur 8 caractères) |
| `AAParam` | `Param` | `delmono` (type « P »/« E »), `unsubscribe` (clé chiffrée) |
| `AAMail` | `email` | `unsubscribe` |
| `AADownLoad` | `AADownLoad` | si non vide → `PageAffiche(AADownLoad)` **avant** le dispatch (p.130) |
| `AALogin`, `AALoginHex`, `AAParamRBQ`, `AACpl`, `AAVisu`, `AANumRBQ`, `AAAnswer`, `AAProject` | idem | hors périmètre (SDP, RBQ) |

Un exemple d'URL complète figure en commentaire de test p.128 :
`Type=version&versioneplan=12.10Xvg&info=&User=<chaîne chiffrée>` — les noms de paramètres y sont en minuscules,
ce qui laisse penser que `PageParamètre` est insensible à la casse (**non vérifié** dans le code ; comportement
WebDev à confirmer). La valeur de `Type` est, elle, explicitement normalisée par `Minuscule()`.

Remarques :
- avant le dispatch, pour tout `Type` autre que `numsdp`, `wwwlog` et `rbx`, une ligne `<IP> AAType ><type><` est
  écrite dans `AATrace.log` et l'adresse IP est enregistrée dans la table `IPADDRESS` (`goIPAddress:bAddAddress`, p.129) ;
- un `Type` inconnu : trace `Commande inconnue` avec les 10 premiers paramètres, test `isIntrus(IP, Type)`
  (table `INTRUSION`, blocage si > 3 appels d'une IP déjà fichée, p.3933) → `PAGE_REFUS` + `FinProgramme()`, sinon
  `TermineProg` (p.140) ;
- `AUTRES CAS` avec `Type` vide = navigation normale du site (ouverture des fichiers HFSQL, `goConfig:SetProvenance(AALogin)`).

### 0.2 Réponse HTTP : la page `TermineProg` (p.684-687, gabarit `FR/TermineProg.htm`)

Toutes les commandes (sauf `unsubscribe` et `addrip`) se terminent par `FermeTout()` puis `PageAffiche(TermineProg)` et `RETOUR`.

- `TermineProg` est une page vide de 980×600 titrée « Fin programme ». Son code d'initialisation serveur fait
  `FermeTout()` puis `FinProgramme(Vrai)` ; son `onload` navigateur fait `NavigateurFerme()` (`top.close()` dans le JS généré).
- Le gabarit généré (`FR/TermineProg.htm`, UTF-8, `_bUTF8_` injecté) ne contient **aucune donnée métier** : un `<form name="TERMINEPROG">`
  avec deux champs cachés `WD_BUTTON_CLICK_` et `WD_ACTION_`, les scripts `res/WDUtil.js`, `res/WDStd.js`,
  `res/Procedures_globales_de_lecatalogue_Navigateur.js`, la feuille `ActivXP.css`.
- **Conséquence capitale : la réponse HTTP n'est jamais le canal de données.** Le résultat est toujours déposé dans
  un **fichier** du répertoire `goConfig:sGetRepExport()` (= `<fRepWeb()>\export\`, soit `LECATALOGUE_WEB\export\`,
  p.3132), que le logiciel client récupère ensuite. Le code serveur ne révèle **pas** comment le client récupère ce
  fichier (HTTP GET sur `/LECATALOGUE_WEB/export/<nom>` ? FTP ?) ; voir « Points non vérifiés ».
- `FermeTout()` (p.3909-3910) ferme les 24 objets HFSQL globaux (`goMulticat`, `goTrades`, `goCatalog`, `goClientCat`,
  `goClient`, `goAAClient`, `goCommon`, `goLogVersion`, `goVersion`, `goHistorique`, …).
- Il est **non vérifié** si le HTML de `TermineProg` est réellement envoyé au client après le `FinProgramme(Vrai)`
  exécuté dans son initialisation (comportement moteur AWP).

### 0.3 Le paramètre `User` (`AAUserC`) : chiffrement et contenu

#### 0.3.1 Déchiffrement : `sGlobDecryptePasse` (procédure globale, p.3813-3814, lignes 132270-132310)

- Chaîne déchiffrée par **`goDllUtils:nDecrypteChaine(contexte, clé, chaîne, résultat)`** → `AppelDLL32("DllUtils.dll","CR_nDecrypteChaine", …)`
  (CDllUtils p.3488 ; exports `CR_dwNewCryptage`, `CR_nCrypteChaine`, `CR_nDecrypteChaine`, `CR_DeleteCryptage`
  dans `~/Projects/WinDev/DllUtils/DllUtils.def` et `DllUtils.cpp` l.329-370 ; implémentation `CCryptage2.cpp`).
  Ce n'est **ni** `Décrypte()` PC SOFT, **ni** `goDllNotify:lnDecrypte` (celui-là sert aux fichiers, voir 0.4).
- La **clé** est une chaîne de 12 lettres minuscules reconstruite à l'exécution à partir de l'alphabet
  (`sToto[[6]]+sToto[[20]]+…`, p.3813 ; les lettres sont aussi en commentaire dans le code). Ne pas la recopier.
  La même clé est utilisée par `sGlobCryptePasse` (p.3812-3813) et par `CDllUtils::sDecryptePasse` (p.3493-3494, doublon).
- Post-traitement : le résultat déchiffré est **entrelacé** : les caractères de rang **pair** (2, 4, 6…) forment le texte
  utile, les caractères impairs sont des chiffres d'horodatage (`HeureSys()` répété puis inversé, voir `sGlobCryptePasse`)
  qui servent uniquement à rendre la chaîne chiffrée différente à chaque appel.
- Algorithme `CCryptage2` (sources C++, décrit sans constantes) : la chaîne est complétée à un multiple de 3 octets ;
  (1) permutation miroir des octets (`bEchange` : échange i ↔ n-1-i) ; (2) pour chaque octet, ajout modulo 256 de
  l'octet de clé courant (clé cyclique), d'un modulo dérivé de la somme des octets de la clé (`dwGetMod`) et de
  l'octet suivant (chaînage) ; (3) encodage 3 octets → 4 caractères sur 6 bits avec `| 0x40`, donc l'alphabet de sortie
  est `@`…`DEL` (0x40-0x7F), ce qui explique l'aspect des échantillons `User=` en commentaire p.125-129. Taille chiffrée = 4/3
  de la taille claire ; `nDecrypteChaine` renvoie `3*len/4`. Les tampons WLangage sont de 2048 octets (`szChaine`, `szResult`).
- Portable : l'algorithme est entièrement contenu dans `CCryptage2.cpp` (≈ 100 lignes), réécrivable en TypeScript ;
  la clé devra être transmise hors dépôt.

#### 0.3.2 Contenu déchiffré

Séparateur : **`"<TAB>"` littéral** (les 5 caractères `<`, `T`, `A`, `B`, `>`), **pas** la tabulation ni `SEP_INFO` (`"|"`,
qui sert aux salles de plans). Décomposition via `ExtraitChaîne(sTemp, n, "<TAB>")` :

| Rang | Contenu | Commandes qui le lisent |
|---|---|---|
| 1 | `sLogin` — login **AAClient** (ou `DEMO`) | toutes |
| 2 | `sPass` — mot de passe AAClient **en clair** | toutes (comparé à `AAClient.Mot_de_Passe`, 10 car.) |
| 3 | `sHeure` — horodatage côté client ; sert à nommer les fichiers (`<login>_<heure>.txt`, `www_<login>_<heure>.txt`) et « au cas où plusieurs login identiques » | `wwwlog`, `wwwcom`, `eplanmaj`, `estimmaj`, `recinf`, `delmono` |
| 4 | `sRepCommon` — répertoire COMMON (anciennes versions d'EG seulement, « compatibilité ») | `wwwlog` |
| 10 | `sNomMachine` | `delmono` |

Pour `wwwlog`, le gros des informations n'est **pas** dans `User` mais dans un **fichier déposé par le client** (voir §6).

#### 0.3.3 Exception : `import`, `export`, `export14`, `liste`

Ces quatre cas passent `AAUserC` **tel quel** à `goClient:isExistUser(AAUserC)` (table **Client**, abonnés catalogue) :
`User` y est donc le **login en clair**, non chiffré (confirmé par les jeux de test p.125 : `AAUserC="<login>"` avec
`AAType="export"`/`"import"`). Le mot de passe n'est **pas** vérifié pour ces commandes (il sert seulement de
composant de la clé de chiffrement du fichier exporté, §9). Seul `liste14` déchiffre et vérifie le mot de passe.

### 0.4 Fichiers résultat : `CFichier` et `CCryptFic`

- `CFichier` (p.3552-3556) : `fCrée`/`fOuvre`/`fEcritLigne`/`fLitLigne` WLangage. `bEcritLigne` = `fEcritLigne` → ligne +
  **CR LF**. Chaînes WLangage ANSI → fichiers **Windows-1252**, sans BOM (**non vérifié** : aucune option
  d'encodage n'est passée, c'est le défaut WebDev 18).
- `CCryptFic` (p.3117-3124) hérite de `CFichier` ; chiffré **seulement** si `bCreation(nom, Vrai, clé)`. Les fichiers
  `.res`/`.fin` de `recinf` sont créés avec `oFic:bCreation(nom)` → **non chiffrés** malgré la classe. Les CSV d'export de
  catalogue (§9) sont, eux, chiffrés : blocs de 129 octets puis +3 à chaque bloc jusqu'à 1026 (`BUF_DEB`/`BUF_MAX`),
  chiffrement par **`DllNotify.dll`** (`bAllocBuf`, `bCrypte`, `bDecrypte`, `bFreeBuf`, p.3372-3377), sortie 4/3 ;
  clé = `sCreatCle(clé)` : clé sans accents/espaces, inversée, chaque caractère → `Caract((Asc(c)+i) mod 26 + Asc("A"))`.
  Les sources de `DllNotify.dll` ne sont pas dans `~/Projects/WinDev/DllUtils` (**non vérifié** si `FNotify V9/` les contient).

### 0.5 Journaux (tous sous `c:\WebSite\Traces\` en production, `h:\Temp\Traces` en test ; code projet p.118-119)

| Fichier | Procédure | Rempli par |
|---|---|---|
| `AATrace.log` | `TraceLog` → `CBasicObjet::TraceLog(.,Vrai)` → `sTrace` (p.3245-3247) | partout |
| `AALogCatalog.log` | `LogCatalog` (p.3937) | import/export/liste/majversion |
| `AALogEstime.log` | `LogEstimation` (p.3939) | conference/commestim/contestim |
| `AALogRBQ.log` | `LogRBQ` / `CCommon::LogRBQ` | RBQ, CCommon |
| `AALogIntrus.log`, `AALogSDPVide.log` | `CBasicObjet::LogGeneric` | intrusions |
| `Compagnies\<Nom de la cie nettoyé>.log` (`DEMO.log` si vide) | `LogConnect(sCie, msg)` (p.3937-3938) | wwwlog, delmono, MiseAJourNumVersionFiche |
| `DEMO\Demo_<IP avec _>\Demo_<IP>.log` | `LogDemo` (p.3938) | wwwlog (version démo) |
| `LogIP\LogIP<AAAAMMJJ>.log` | `LogIP` | AADownload |

Format d'une ligne (`LogGeneric`, p.3241-3243) : `AAAA/MM/JJ HH:MM:SS <message>` ; les TAB sont remplacées par des espaces ;
verrou `.lock` ; rotation à 2 Mo (`.bk1`…`.bk9`).

### 0.6 Constantes utiles (code projet p.114-118)

`ERROR_NOERROR=0`, `ERROR_UNKNOWN=1000`, `ERROR_PASSWORD=1001`, `ERROR_LOGIN=1002`, `ERROR_REFERENCE=1003`,
`ERROR_NOTEXIST=1004`, `ERROR_EXPIRE=1005`, `ERROR_READ=1006`, `ERROR_GETDIR=1007`, `ERROR_OPENFILE=1008`,
`ERROR_AUTORISE=1009`, **`LOGIN_DEMO=5000`**. `PASS_CLIENT` (p.118) = mot de passe **HFSQL** du fichier `AACLIENT`
(passé à `HCréationSiInexistant(table, sPasse)` via `CEstimeHF::bSetAlias` → `CreationSiInexistant`, p.3159 et p.3203) —
à ne pas confondre avec les mots de passe clients. `SEP_INFO="|"`. `sMessAbonne = MessTraduit(11)` = « Abonnement expiré »
(messages multilangues du projet p.141-142 ; la version GB est vide).

---

## 1. `version` — mise à jour de la version installée chez le client (p.131)

```
CAS "version":   // commentaire : « Semble ne plus etre utilisé (Verifier e-Plans, Estimateur Général...) »
    SI AAEPlan<>""    ALORS TraiteVersionEplan   (AAEPlan,   AAInfoV, AAUserC)
    SI AAEstime12<>"" ALORS TraiteVersionEstime  (AAEstime12,AAInfoV, AAUserC)   // Ne fait rien
    SI AAModule12<>"" ALORS TraiteVersionModule  (AAModule12,AAInfoV, AAUserC)   // Ne fait rien
    SI AAEstime14<>"" ALORS TraiteVersionEstime14(AAEstime14,AAInfoV, AAUserC)
    SI AAModule14<>"" ALORS TraiteVersionModule14(AAModule14,AAInfoV, AAUserC)   // Ne fait rien
    FermeTout() ; PageAffiche(TermineProg)
```

| | |
|---|---|
| Paramètres | `Type=version` ; `User` (chiffré, login/pass/heure) ; au moins un de `VersionEPlan`, `VersionEstime14` (actifs), `VersionEstime`, `VersionModule`, `VersionModule14` (inertes) ; `info` optionnel = date AAAAMMJJ (8 premiers caractères ; si invalide → `DateSys()`). |
| Vérifications | `goAAClient:bSetAlias(…,PASS_CLIENT)` ; `sLogin<>""` et `isExistLogin(sLogin)` (recherche sur clé `AAClient.Login`, comparaison `~=` insensible à la casse, p.3405) ; `sGetMotDePasse()=sPass` (égalité **stricte** sensible à la casse). |
| Traitement | `TraiteVersionEplan` (p.4067-4068) : `SetVersionEPlan(sVersion)`, `SetDateVersionEPlan(sDate)`, `bModifie()` → rubriques `AAClient.Version_EPlans`, `DateVersionEPlans`. `TraiteVersionEstime14` (p.4069-4070) : `SetVersionEstime14`, `SetDateVersionEstime14` → `EstimeVersion14`, `EstimeDateVersion14`. `TraiteVersionEstime`, `TraiteVersionModule`, `TraiteVersionModule14` (p.4068-4071) : **corps vide** (`sVersion=sVersion`). |
| Réponse | **Aucune** : ni fichier, ni contenu. Seulement `TermineProg`. En cas d'erreur : lignes `AATrace.log` « `<version> TraiteVersionEPlan Login <login> mot de passe incorrect <pass>` » (le mot de passe reçu est tracé en clair) ou « … non trouvé ». |
| Dépendances Windows | `DllUtils.dll` (déchiffrement). |
| Emplacement | dispatch p.131 ; procédures lignes 143320-143465 (p.4067-4071). |

Note : cette commande fait double emploi avec `MiseAJourNumVersionFiche` appelée par `wwwlog` (§6), qui met à jour les mêmes rubriques à partir des versions `EP_`/`EG_`/`MO_` reçues.

## 2. `majversion` — publication des versions courantes (p.139-140)

| | |
|---|---|
| Paramètres | `Type=majversion` ; `VersionEPlan`, `VersionEstime`, `VersionModule`, `VersionEstime14`, `VersionModule14` (chacun optionnel). **Aucun `User`, aucune authentification.** |
| Vérifications | aucune (n'importe qui peut modifier la version publiée). |
| Traitement | `goVersion:bSetAlias` ; `goVersion:SetVersion(ind, valeur)` (CVersion p.3503) lit le **premier** enregistrement de `VERSION` (`bLitPremier(IDVersion)`) et écrit : 1 → `Version_EPlans` ; 3 → `ModuleVersion12` (sic : l'indice `IND_ESTIME12` écrit dans `ModuleVersion12`, et `sGetVersionEstime(Faux)` relit `ModuleVersion12` — les noms de rubriques de `VERSION` sont décalés par rapport à leur sens) ; 4 → `Version_Module12` ; 5 → `EstimeVersion14` ; 6 → `Version_Module14`. Indice 2 (`IND_GUIDE` → `EstimeVersion12`) non atteignable par cette commande. `LogCatalog("MajVersion … >valeur<")`. |
| Réponse | aucune (`TermineProg`). |
| Dépendances | aucune. |
| Emplacement | p.139-140 ; CVersion p.3502-3504 ; table `Version` (modele-donnees.md). |

## 3. `recinf` — informations client pour la boîte « À propos » de l'Estimateur Général (p.140)

`CreatInfoClient(goConfig:sGetRepExport(), AAUserC, AAIdent, AAInfo)` — p.3882-3887.
Commentaire du code : « Demandé par le à propos. Est devenu en partie semblable à wwwlog et wwwcom, mais conservé tel quel
pour des raisons de compatibilité » et « Seulement exploité par Estimateur Général ».

| | |
|---|---|
| Paramètres | `User` (chiffré : login, pass, heure) ; `AAIdent` (**obligatoire** en pratique : identifiant unique choisi par le client, ex. `<NOMMACHINE>_<HHMMSSCC>`, qui nomme le fichier résultat) ; `AAInfo` (lu, transmis, **jamais utilisé**). |
| Vérifications | `bSetAlias(AACLIENT, PASS_CLIENT)` (échec → « Error répertoire incorrect ») ; `isExistLogin` (échec → « Erreur login <login> pas trouvé ») ; `sGetMotDePasse()=sPass` (échec → « Mot de passe client incorrect »). |
| Nettoyage préalable | suppression de `export\ResInf_<AAIdent>.*`. |
| Tables lues | `AAClient`, `REPCOMMON` (via `goAAClient:m_pCommon`, clé `IDAAClient`), `INFO_ECOLE` si `isEcole()`. Aucune écriture. |
| Fichier résultat | `export\ResInf_<AAIdent>.res` puis `export\ResInf_<AAIdent>.fin` (contenu : `OK`), créés avec `CCryptFic` **sans chiffrement**. Le `.fin` est le sémaphore « résultat prêt » : il est écrit **dans tous les cas**, même en erreur. |
| Réponse HTTP | `TermineProg`. |
| Dépendances | DllUtils.dll ; `CZoneMem` (tri mémoire). |

Contenu de `ResInf_<ident>.res` **en erreur** : une seule ligne = le message d'erreur français ci-dessus.

Contenu **en succès** (ordre exact, une ligne `CLE=valeur` par ligne, booléens WLangage rendus `0`/`1`, dates `AAAAMMJJ`) :

```
NOMCIE=        CLECIE=        CONTACT=       MAIL1=  MAIL2=  MAIL3=
ABON=          DATFIN=  (DateSys() si DateFinAbonnement invalide)
LASTV=         NBRLIC=  (EGAchat+EGLocat)     NBRLICEP=  (somme des 6 compteurs e-Plans)
DETAILLIC=EGA n EGL n P1A n P1L n PMA n PML n POA n POL n
VEREG=  VEREP=  VERMO=  DATEG=  DATEP=  DATMO=   (versions 14 : isVersion14() renvoie toujours Vrai, p.3411)
TEL1=  TEL2=  FLIC=  AUTHEG=  AUTHRBQ=  (= NON RBQInterdit)  NVER=  (TypeVersion)
OPINV= OPECH= OPCMP= OPVEN= OPREP= AUTHCAT= OPPLAN= AUTHSDP= MAXSDP= (SDP_MAXSIZE +500 si <4000 sinon +1000)
LOCAT=  DATINST=  EUROPE=  AUTHEPL=  RESTEJ= (jours restants, min 0)  DATESYS= (AAAAMMJJ serveur)
COMMON<n>=<rep>|<entreprise>|<type version texte>|<options texte>|<nbrlic>|<locked>|<timestamp>
      (n = 1..k, un par REPCOMMON non « à nettoyer », dans l'ordre de lecture par IDAAClient ;
       type texte : « e-Plans [ Non enregistré] » si bit SRC_EP, sinon 0=Non Enregistrée 1=Bronze 2=Argent 3=Or 7=Invitation 10=Argent+ ;
       options texte : « Cmp Ech Inv Rep Sdp Vnt » selon bits 0x1..0x20)
COMMON<n>##=<rep>|<locked>|<typeversion>|<entreprise>|<ip>|<datefin>|<machine>|<nettoyer>|<enregmono>|<cadenas srv>|<timestamp>|<indicrep>|<options>
      (même compteur n, mais ces lignes sont émises APRÈS toutes les COMMONn=, triées via CZoneMem/MemTrie
       décroissant sur la clé « machine TAB REP_COMMON majuscule TAB indicrep TAB timestamp »)
ECOLE_NOM= ECOLE_RUE= ECOLE_VILLE= ECOLE_PROV= ECOLE_CP= ECOLE_PAYS= ECOLE_TEL= ECOLE_FAX= ECOLE_MOB= ECOLE_MAIL= ECOLE_WEB=
      (seulement si B_ECOLE, AjoutEcole1 p.3821)
```

## 4. `wwwlog` et 5. `wwwcom` — contrôle de licence au démarrage des logiciels (p.135)

`RecupWWWCommon(goConfig:sGetRepExport(), AAUserC, bDelRes)` — p.3991-4000 — avec `bDelRes=Faux` pour `wwwlog`
(« Appelé au démarrage des logiciels si demande autorisation ») et `bDelRes=Vrai` pour `wwwcom` (« N'EST PLUS APPELÉ. À revérifier
avant de supprimer » : récupère le COMMON mais **ne produit pas de fichier résultat**).

### 4.1 Entrées

| | |
|---|---|
| Paramètre `User` | chiffré : 1 login, 2 pass, 3 heure, 4 `sRepCommon` (anciennes versions seulement). `EOT` → vide. |
| **Fichier d'entrée déposé par le client** | `export\www_<login>_<heure>.txt`, **une seule ligne chiffrée** avec le même algorithme (`sGlobDecryptePasse`). Le client doit l'avoir déposé **avant** l'appel HTTP (mécanisme de dépôt non visible côté serveur, voir « non vérifié »). Si `sRepCommon` (rang 4 de `User`) est non vide (ancien EG), le fichier n'est **pas** lu. Si le fichier manque : trace « RecupWWWCommon Fichier … non trouvé » et traitement poursuivi avec des valeurs vides. Le fichier est **supprimé** après lecture (`fSupprime(sComplet)`). |
| Nettoyage préalable | `SupprimeOld(export\*.txt / *.res / *.fin)` (p.4053-4054) : supprime les fichiers d'un jour antérieur, ou du jour mais vieux de plus de 5 minutes. |

Contenu de la ligne déchiffrée du fichier `www_…txt` (séparateur `<TAB>` littéral, complétée de 17 séparateurs pour tolérer les versions courtes) :

| Rang | Champ | Notes |
|---|---|---|
| 1-3 | (login, pass, heure — non relus ici) | |
| 4 | `sRepCommon` | répertoire COMMON de l'installation ; `##` = « GetInfo » sans COMMON |
| 5 | `nNbrLic` | nombre de licences détecté localement |
| 6 | `sNomEntrep` | nom d'entreprise saisi dans le logiciel |
| 7 | `nTypeVersion` | 0 non enregistrée, 1 Bronze, 2 Argent, 3 Or, 7 Invitation, 10 Argent+ |
| 8 | `nOptions` | bits OPC_* (p.117) : 0x1 Cmp, 0x2 Ech, 0x4 Inv, 0x8 Rep, 0x10 Sdp, 0x20 Vnt, 0x100 e-Plans enregistré, 0x200 EP multi achat, 0x400 EP multi location |
| 9 | `sAddrIP` | IP locale ; tronquée au premier `##` |
| 10 | `sNomMachine` | |
| 11 | `sVersion1` | version du logiciel appelant, préfixée `EP_`, `EG_` ou `MO_` (ex. `EP_12.11Qe`) |
| 12 | `sVersion2` | seconde version (module d'envoi, envoyé par EG) |
| 13 | `sDateSysCli` | date système du poste |
| 14 | `sCatLogin` | login **catalogue** (table Client) pour `CreateCatTextFiles` |
| 15 | `sCatPassword` | mot de passe catalogue |
| 16-17 | `sReg1`, `sReg2` | infos registre ; `not exist` → `???` |
| 18 | `nResteJour` | défaut `CCommon::RESTE_NONDEF` (-99999999) |
| 19 | `nCadenas` | défaut `CADENAS_NONDEF` 0 (-1 ouvert, 1 fermé) |
| 20 | `sIndicRep` | identifiant du répertoire COMMON |
| 21 | `nMono` | bits `MONO_ACHAT` 0x1 / `MONO_LOCAT` 0x2 |

### 4.2 Vérifications et traitement (tables)

Ouverture de `VERSION`, `AACLIENT`(+`REPCOMMON`,`LISTFORM`), `CLIENTDEMO`, `HISTODEMO`, `LOGVERSION`, `INFO_ECOLE`,
`CLIENT`, `CLIENTCAT`, `HISTORIQUE`, `MULTICAT`.

1. Si `sCatLogin<>""` : `CreateCatTextFiles` (p.3881-3882) sur la table **Client** : `isExistUser`, `isExpire()`
   (`DateFinAbonnement < DateSys()` ; **effet de bord** : une date invalide est remplacée par `DateSys()` et écrite),
   `sGetPassword()=sPass` ; écrit une ligne `HISTORIQUE` (`NomTable="EXPORT"`, `TypeAction=HST_EXPORT`, `DescAction` = login,
   « Invalid password », « Subscription expired » ou « User <login> not found ») ; en erreur `fSupprime(import\<login>*.*)` ;
   produit `sTextInfo` (une ligne par catalogue : `#<MUCLEUNIK> - www <NomCatalog> - <DATEREV> - <NUMREV> - WWW <NOMCATMAJ>`,
   ou `#0 - Catalog Invalid password/Mot de passe incorrect -  -  -  ` etc.) et `sTextResult` (`<n> catalogue(s)` ou message EN/FR).
2. Login **AAClient** : `bOK = sLogin<>"DEMO" ET sLogin<>"" ET isExistLogin(sLogin)`.
3. **Client connu** (`bOK`) :
   - `m_pCommon:NettoyageCommon(nIdCli)` (p.3617-3618) : supprime les `REPCOMMON` doublons (même machine + même répertoire) non verrouillés, en gardant le plus récent ;
   - `bAutorise = isAbonnement() ET sGetDateFin()>DateSys() ET PAS isRBQInterdit()` ;
   - `bIPMulti = isIPMulti()` (lu, **non utilisé** ensuite) ;
   - si `sRepCommon<>""` et `<>"##"` : déduction du logiciel d'après le préfixe de `sVersion1` (`EP_`→`LOG_EPLANS`+`SRC_EP`, `EG_`→`LOG_ESTIME`+`SRC_EG`, `MO_`→`LOG_MODULE` ; sans préfixe : `eplandata` dans le chemin → e-Plans sinon EG) ; `nAjoutRepCommon` (CCommon p.3612-3613 : recherche d'un enregistrement identique sur rep+IP+machine+nbrlic+typeversion+options, sinon création ; mise à jour `TimeStamp`, `ResteJour`, `CadenasCli`, `IndicRep`, `EnregMono`) ; une ligne `LOGVERSION` par version non vide (IdClient, date, heure, DateCli, IP, machine, IdCommon, NumLogiciel) ;
   - si `sRepCommon="##"` : `LogConnect(cie, "Client <id> <nom> GetInfo")` ;
   - `MiseAJourNumVersionFiche` (p.3950-3952) pour `sVersion1` puis `sVersion2` : compare en majuscules la version reçue à la fiche ; si plus récente → `SetVersionEstime`/`SetVersionEPlanEx`/`SetVersionModule` + date du jour + `bModifie()` ; trace `LogConnect` « `<id%5d> EG Fiche <old> < Reçue <new> - <infos client>` » ;
   - **mot de passe** vérifié **en dernier** : `bOK = sGetMotDePasse()=sPass` ; échec → `sError=ERROR_PASSWORD` (1001) et `LogConnect` qui trace **les deux mots de passe en clair**.
4. **Client inconnu ou `DEMO`** : `nIdCli=0`, `bAutorise=Faux`, `LogConnect("DEMO", …)` et `LogDemo` dans `DEMO\Demo_<ip>\` ;
   `LOGVERSION` avec IdClient 0 ; si `sAddrIP<>""` : `CLIENTDEMO` (clé IP+SoftType ; création avec `DATEBUTOIR = aujourd'hui + 61 jours`),
   `IncConnect`, `SetResteJour`, puis `HISTODEMO` (machine, timestamp, `TIMESTAMPORDI = sDateSysCli+sHeure`, indic common, version, type, reste jours) ;
   `sError = ERROR_LOGIN` (1002) si login non vide ≠ DEMO, sinon `LOGIN_DEMO` (5000).
5. Fichier résultat : `export\<login>_<heure>.tmp` (supprimé s'il existe) → `bCreationResultat` (si `bDelRes=Faux`) → renommé en
   `export\<login>_<heure>.txt` (l'ancien `.txt` est supprimé avant). Pour `DEMO` le fichier s'appelle `DEMO_<heure>.txt`.

### 4.3 Réponse : contenu de `<login>_<heure>.txt` (`bCreationResultat`, p.3842-3847) — **non chiffré**, CR LF

Trois cas :

**(a) `nIdCli=0` et `sVersion1 >= "EP_12.11Qe"` (comparaison de chaînes)** :
```
##<sError>                 (##1002 ou ##5000)
DateSys=<AAAAMMJJHHMMSSCC>
Auth=<0|1 selon CLIENTDEMO.BLK_DEMO=0 pour l'IP de l'appelant HTTP, type SOFT_EPLANS>  ou  Auth=?
```
**(b) `nIdCli=0` et version plus ancienne** (compatibilité démo) :
```
<nombre aléatoire>     ← 17, 21 ou 23 (Hasard) si bAutorise (jamais le cas ici), sinon Hasard(24,100)
DateFin=<DateSys()-30 jours>        (seulement si bAutorise)
NbrLic=0
NbrLicEP=0
FinEG=<DateSys()-30>
FinEPlans=<DateSys()-30>
Abon=0
DateSys=<AAAAMMJJHHMMSSCC>
ForceLic=1
AuthEPlan=0
AuthEG=0
Location=1
```
**(c) client connu et `sError=""` (mot de passe correct)** :
```
<17|21|23 au hasard si bAutorise, sinon Hasard(24,100)>   ← code d'autorisation NON déterministe
DateFin=<DateFinAbonnement>
NbrLic=<nGetNbrLicEPlans si sVersion1 commence par EP_, sinon nGetNbrLicence>
NbrLicEP=<nGetNbrLicEPlans>
DetailLic=EGA n EGL n P1A n P1L n PMA n PML n POA n POL n
FinEG=   FinEPlans=   Abon=   NoRBQ=   ePlansV=   EstimeV=   ModuleV=
DateSys=<AAAAMMJJHHMMSSCC>
AuthSDP=  AuthEPlan=  PasExpire=(DateFin>DateSys)  CatAbon=  AuthEG=  SDPMaxSize=  Location=  DatInst=  Europe=  ForceLic=
CLECIE=  NVER=  OPINV=  OPECH=  OPCMP=  OPVEN=  OPREP=  OPPLAN=
ECOLE_*=…                      (si B_ECOLE)
VModule14=<1re ligne de <SECTION_PATH.CLE_VERSION>\ModuleVersion14.txt>
VEstime14=<1re ligne de EstimeVersion14.txt>
VEPlans=<1re ligne de ePlanVersion.txt>
Common=<rep>|<locked>|<typeversion>|<entreprise>|<ip>|<datefin>|<machine>|<nettoyer>|<enregmono>|<cadenas srv>|<timestamp>|<indicrep>|<options>
      (un par REPCOMMON non « nettoyer », tri CZoneMem décroissant sur « machine TAB REP majuscule TAB timestamp » ;
       si AAClient.IGNORECOMMON : <rep> est vidé et une seule ligne par adresse IP est conservée)
CatInfo=<chaque ligne de sTextInfo>        (si login catalogue fourni)
CatResult=<chaque ligne de sTextResult>
Chilkat=<valeur de [CHILKAT] CLE_CHILKAT du .ini>   (si non vide ; clé de licence tierce, ne pas recopier)
```
**(d) client connu mais mot de passe faux** : une seule ligne `##1001`.

Les fichiers de versions en ligne sont lus dans `INILit("SECTION_PATH","CLE_VERSION","c:\WebSite\estimation.qc.ca\Version\Last")`
(noms de section/clé littéraux, probablement un bogue : les constantes n'existent pas) ; en test `H:\Mes Projets\MiseAJour\Exe`.

**Points sensibles pour un contrat « identique à l'octet »** : la 1re ligne est **aléatoire** (3 valeurs « autorisé » 17/21/23 vs
24-100 « refusé » — le client ne doit tester que l'appartenance à {17,21,23}) ; `DateSys=` et `Auth=` varient ; l'ordre des
`Common=` dépend d'un tri mémoire décroissant ; les versions `VModule14=`/`VEstime14=`/`VEPlans=` viennent de fichiers texte externes
au site (répertoire `estimation.qc.ca\Version\Last`).

### 4.4 Divers

- Pour un login de développeur codé en dur (p.3993), `wwwlog` crée en plus `c:\WebSite\estimation.qc.ca\version\last\FTPRepClient.zip`
  (zipCrée PC SOFT) contenant `REPEXPORT=`/`REPSALLE=` : code de mise au point, à ne pas reproduire.
- `wwwcom` (`bDelRes=Vrai`) exécute toute la mise à jour des tables mais **ne crée aucun `.txt`** (seulement suppression de l'éventuel `.tmp`/`.txt` existant).
- Dépendances Windows : `DllUtils.dll`, chemins `c:\WebSite\…`, `zipCrée`, `fListeFichier`.

## 6. `eplanmaj` — contrôle d'autorisation e-Plans (p.134-135)

`ePlanControle(goConfig:sGetRepExport(), AAUserC)` — p.3906-3907.

| | |
|---|---|
| Paramètres | `User` chiffré (login, pass, heure). |
| Vérifications | `isExistLogin` ; `sGetMotDePasse()=sPass`. Aucune écriture en base. |
| Fichier résultat | `export\<login>_<heure>.txt` (**créé d'abord**, même en erreur ; `CFichier`, non chiffré). |
| Contenu | succès : une ligne `Auth <isAutoriseEPlan> <DateFin>DateSys> <isAbonnement>` (ex. `Auth 1 1 1`, booléens `0`/`1` séparés par un espace) ; mot de passe faux : `##1001` ; login inconnu : `##1002`. |
| `isAutoriseEPlan` (p.3402) | Vrai si `TypeVersion` ∈ {Or=1, Or essai=7, e-Plans=6} ; pour Argent+/Argent/Bronze/Invitation : `OptEPlans OU OptTPlans` ; sinon Faux. |
| Logs | `AATrace.log` : « eplanlog user … REP … », « <login> Autorise e-Plans … NomExp … ». |

## 7. `estimmaj` — contrôle d'autorisation Estimateur Général (p.135)

`EstimControle` — p.3908-3909. Identique à `eplanmaj` avec :
- contenu succès : `Auth <isAutoriseEstim> <DateFin>DateSys> <isAbonnement> <isVersion14>` (4 valeurs ; `isVersion14()` renvoie toujours `1`) ;
- `isAutoriseEstim` (p.3403) : Vrai pour Or, Or essai, Argent+, Argent, Bronze, Invitation ; Faux pour e-Plans, à déterminer, autres.

## 8. `delmono` — libération d'une licence monoposte (p.135)

`TraiteMono(AAUserC, AAParam)` — p.4065-4066.

| | |
|---|---|
| Paramètres | `User` chiffré : 1 login, 2 pass (**non vérifié !**), 3 heure, **10 nom de machine** ; `Param` = type : contient `P` → e-Plans, contient `E` → Estimateur (les deux possibles). |
| Vérifications | `sLogin<>"DEMO"` ; `isExistLogin`. **Le mot de passe n'est pas contrôlé.** |
| Traitement | parcours `REPCOMMON` par `IDAAClient` ; pour chaque enregistrement dont `NOMMACHINE ~= sNomMachine` et (`isMonoPosteA OU isMonoPosteL`, bits `ENREG_MONO`) : si bit `SRC_EP` (0x200000) dans `OPTIONESTIME` et `bEPlan` → suppression ; sinon si `bEstime` → suppression (`pCommon:bSupprime()`, qui trace aussi dans `AALogRBQ.log`). `LogConnect(cie, "Suppression <machine> Common mono <rep>")`. |
| Réponse | **aucun fichier**, `TermineProg` seulement. |
| Bogue latent | `sCie=goAAClient:sGetNom()` est évalué **avant** `bSetAlias`/`isExistLogin` → le nom de compagnie du log peut être vide ou celui d'un enregistrement précédent (`Compagnies\DEMO.log` si vide). |
| Note modèle | `REPCOMMON.ENREG_MONO` et `CADENAS_SRV` sont utilisés par le code mais absents de `modele-donnees.md` (seul `CADENAS_CLI` y figure) : l'export XML `lecatalogue.xdd` est probablement en retard sur l'analyse. |

## 9. `import` — réception d'un catalogue depuis l'Estimateur Général 14 (p.136-137)

| | |
|---|---|
| Paramètres | `User` = login **Client** en clair ; `Cat` = nom du catalogue ; si `Cat` contient `_14` → `bImportCatalogue14`, sinon **rien** (l'ancien `bCréeImport` version 12 est commenté : « Ne plus importer de catalogue version 12 »). |
| Vérifications | `goClient:isExistUser(AAUserC)` (recherche `LOGINMAJ` = majuscules sans accents, puis `~=`) ; `isExpire()`. **Pas de mot de passe.** Particularité : l'import 14 est exécuté **même si l'abonnement est expiré** (branche SINON identique, seule la ligne `HISTORIQUE` change). |
| Historique | `HISTORIQUE` : (`IdClient`, `"IMPORT"`, 0, `HST_IMPORT=7`, `Cat` ou « Abonnement expiré ») ; login inconnu : IdClient 0 + `fSupprime(import\<login>*.*)`. |
| Fichiers d'entrée (déposés au préalable par le client dans `goConfig:m_sRepImport` = `LECATALOGUE_WEB\import\`) | `<login> <Cat>.imp` (texte, 1re ligne = nom du catalogue en clair ; **supprimé** après lecture) et `<login> <Cat>.wdz` (**archive zip PC SOFT** contenant les fichiers HFSQL `.FIC/.NDX/.MMO` du catalogue : MULTICAT, ITEMCAT, LIENASMB, TRADES, TRADESTX, EQUIPELEM, EQUIPMEMB). |
| Traitement (`bImportCatalogue14`, p.3865-3869) | création `<login> <Cat>.err` (journal, voir ci-dessous) et `<login> <Cat>.deb` (témoin « en cours », supprimé à la fin) ; `zipOuvre` ; `goMulticat:nGetNumRev(base)` lit le `MULTICAT.FIC` **courant** (via `HDéclareExterne`) pour conserver `NUMREV`, nom, type, flags du catalogue par défaut ; **sauvegarde** : chaque fichier listé dans le zip et existant dans `bd\LECATALOGUE\` est déplacé vers `bd\LECATALOGUE\SaveCat<AAAAMMJJ> <HHMMSSCC>\` (rollback `RestaureBase` en cas d'échec) ; `fRepEnCours(import)` + `zipExtraitTout` ; puis `bImportSpecial` table par table (MULTICAT p.3353, ITEMCAT, LIENASMB, TRADES, TRADESTX, EQUIPELEM ; `CBasicHF::bImportSpecial` p.3154-3156 : renomme l'ancien `.fic`/`.ndx` en `.old`, recrée la table vide, copie les enregistrements avec `hFixeIdAuto`, et **force `MUCLEUNIK=1`** pour les items/assemblages du catalogue par défaut source) ; suppression des `.FIC` temporaires ; `MULTICAT` id 1 : `DATEREV=DateSys()`, `NUMREV=ancien+1`, nom/type/flags restaurés. Ensuite (code projet) `goMulticat:bSetAlias` + `FlagDefautCatalogue()` (p.3911-3912 : `TypeCatalog=DEFAUT_CAT` pour le catalogue nommé « Catalogue par défaut », `NUMREV=1` si 0). |
| Réponse | **aucun fichier résultat dédié** ; le client ne dispose que de `import\<login> <Cat>.err` (lignes « OK création … », « OK ouverture … », « Date de révision <AAAAMMJJ> Numéro de révision <n> », ou message d'erreur : `MessTraduit(1)` « Fichier ~ non trouvé. », (2) « Impossible d'ouvrir le fichier ~ », (6) « Impossible de créer le fichier ~ », « Erreur NumRev 0 », `zipMsgErreur`) et de la disparition du `.deb`. **Non vérifié** : comment le client lit ce `.err`. |
| Logs | `AALogCatalog.log` « Import <rep> AACatalogue … AAUserC … » ; `AATrace.log` « Import14 RepSave … », « Etape MULTICAT/ITEMCAT/… ». |
| Dépendances Windows | `zipOuvre/zipListeFichier/zipExtraitTout/zipFerme` (format WDZ PC SOFT, **non standard**), `fRepEnCours`, `fDéplaceFichier`, HFSQL Classic (`HDéclareExterne`), chemins `h:\Temp\Catalogue\` en test. **Cette commande remplace physiquement les fichiers de données du catalogue partagé** : elle n'a pas d'équivalent direct en PostgreSQL. |

Ancien `bCréeImport` (version 12, p.3852-3854, **mort**) : décompactait `<login> <Cat>.wdz` → `.csv` (`fDécompacte`), lisait le CSV
**chiffré** (`CCryptFic`, clé `minuscule(sansaccent(login+nomcatalogue+password))`) à 29 colonnes `;` (`bImport` p.3861-3862),
supprimait et recréait les items (`MySupprimeTout`, `goTrades:bSupprimeTout`), `NUMREV+1`, puis `PageAffiche(TermineProg)` depuis la procédure.

## 10. `export` / `export14` — envoi d'un catalogue vers l'Estimateur (p.137-138)

| | |
|---|---|
| Paramètres | `User` = login **Client** en clair ; `Cat` = `*` (tous) ou liste `#<MUCLEUNIK> #<MUCLEUNIK>…` ; `Type=export14` → format 14, `Type=export` → format 12. |
| Vérifications | `isExistUser` ; `isExpire()`. Pas de mot de passe (il est seulement lu de la fiche : `goClient:sGetPassword()` sert de composant de clé). |
| Nettoyage | si heure ≥ 20 h : `SupprimeAncienFichiers(export)` (p.4050-4051) supprime `*.txt`, `*.res`, `*.fin` d'une date antérieure ou d'une heure antérieure du jour. |
| Historique | `HISTORIQUE` (`"EXPORT"`, `HST_EXPORT=8`, `Cat` ou « Abonnement expiré ») ; login inconnu → IdClient 0 + `fSupprime(import\<login>*.*)` (répertoire **import**, sic). |
| Traitement (`bCréeExport` p.3851-3852) | pour chaque catalogue de `CLIENTCAT` du client retenu par `Cat` : si expiré → `export\<login>.exp` contenant « Abonnement expiré » ; sinon `goMulticat:bExport14` (p.3340-3341) ou `bExportation` (p.3341-3344). |
| Fichiers produits (format 14) | `export\<login> <nomcat>.csv` **chiffré CCryptFic** (clé `minuscule(sansaccent(login+NomCatalog+password))`), avec sections `###METIERS` (toutes les rubriques de TRADES, entête = `HListeRubrique` jointes par `;`), `###EQUIPES` (EQUIPELEM), `###ITEMCAT` (rubriques d'ITEMCAT sauf `Cat_DescMaj_*`, `Cat_CODEG`, `Cat_CODED`, `PROTECT` ; parcours section → sous-section → items via `CLE_CODED`), `###ASSEMB` (LIENASMB du catalogue) ; valeurs `SansEspace`, séparateur `;`, CR LF ; puis **compacté** en `<login> <nomcat>.wdz` (`fCompacte` PC SOFT), `.csv` supprimé ; enfin `export\<login> <nomcat>.exp` (non chiffré) : ligne 1 `www <NomCatalog>`, ligne 2 = taille du `.csv` **avant compactage** (`dwGetTaille` relit `fTaille` du `.csv` déjà supprimé : valeur probablement 0 ou -1 — **non vérifié**). Noms en minuscules sans accents (`sNomResult`). |
| Fichiers produits (format 12) | même `.csv` chiffré avec entête fixe de 24 colonnes (`Code;Description FR;Unité;Prix achat;Prix pose;Soustraitant;Temps;Unité de temps;DateRevision;Carton;Poids;Unité de poids;Volume;Unité de volume;Assemblage;Quantité;Équipement;Description EN;Description ES;Ratio;Escompte;Métier;DDN2007;MONbrUnit`) rempli par `CCatalog::bExportBloc`/`sLigneExport` (codes complétés à 3 décimales, `.000` pour les niveaux) ; plus `export\trades.csv` **non chiffré** → `trades.wdz` (entête `idTrade;Code;Taux;TCle;Date;User;DescFR;DescEN;DescES;Invariant`) ; `.exp` idem. |
| Réponse HTTP | `TermineProg`. |
| Dépendances | `DllNotify.dll` (chiffrement de fichier), `fCompacte` (WDZ), `HListeRubrique`. |

## 11. `liste` — liste des catalogues du client, version 12 (p.139)

| | |
|---|---|
| Paramètres | `User` = login Client **en clair**. |
| Vérifications | `isExistUser`, `isExpire`. Pas de mot de passe. |
| Historique | `HISTORIQUE` (`"LISTE"`, `HST_LISTE=14`, « » ou « Abonnement expiré »). |
| Fichiers (`bCreeListe` p.3847-3848) | `export\<login minuscule sans espaces>.lst` : une ligne par catalogue `#<MUCLEUNIK> - www <NomCatalog> - <DATEREV> - <NUMREV> - WWW <NOMCATMAJ>` ; si expiré `#0 - Abonnement expiré -  -  -  ` (commentaire : « le MessTraduit ne fontionne pas !! »). `export\<login>.fst` : `<n> catalogue(s)` ou « Abonnement expiré ». Login inconnu : `bCreeListe(export, "")` → fichiers **`.lst`/`.fst` sans nom** (`export\.lst`, `export\.fst`) et `lnIdClient` indéterminé. Non chiffrés. |
| Logs | `AALogCatalog.log` « Liste User exist/not exist ». |

## 12. `liste14` — liste des catalogues, version 14 avec mot de passe (p.138)

| | |
|---|---|
| Paramètres | `User` **chiffré** (login, pass, heure) — **seule** commande du groupe catalogue à être chiffrée. |
| Traitement (`bCreeListe14` p.3848-3851) | `CreateCatTextFiles(login, pass, …)` (voir §4.2 point 1 : vérifie `isExistUser`, `isExpire`, `sGetPassword()=pass`, écrit `HISTORIQUE` type EXPORT (sic), supprime `import\<login>*.*` en erreur) puis écrit `export\<login>.lst` (lignes de `sTextInfo`) et `export\<login>.fst` (lignes de `sTextResult` : `<n> catalogue(s)` / `Catalog Invalid password/Mot de passe incorrect` / `Catalog Subscription expired/Abonnement expiré` / `Catalog Login not found/Login non trouvé` — « toujours l'anglais puis le français séparés par / »). |
| Remarque | pas de ligne `HISTORIQUE` de type `HST_LISTE` ici, contrairement à `liste`. |

## 13. `unsubscribe` — désabonnement de l'infolettre (p.132 ; page p.2173-2177)

`PageAffiche(PAGE_UNSUBSCRIBE, AAParam, AAMail)` — **seule commande du périmètre qui renvoie une vraie page**.

| | |
|---|---|
| Paramètres | `Param` = `Crypte(courriel, <clé « Unsubscribe… »>, compresseChaîneCourte, encodePCS)` (fonction **PC SOFT** `Crypte`, clé littérale dans le code p.127 et p.2173 — ne pas recopier) ; `email` = courriel en clair. La page remplace `%2B`→`+` et `%2F`→`/` avant `Décrypte`. |
| Vérification | `Décrypte(Param) = email` sinon `Erreur("Clé incorrecte/Incorrect key")` et bouton grisé. |
| Page | `LIB_ENTETE1` (xxxx → courriel), `HTML1` FR/EN selon `Nation()=5`, bouton `BTN_UNSUBSCRIBE`. |
| Clic | `Desabonne(gsMail, 3)` : ouvre **un fichier HFSQL externe au site** `COURRIEL.FIC` dans `INILit("PREPARENVOI","REPBASE","c:\EnvoiBern")` (`HDéclareExterne`, `HChangeRep`, `CBasicHF("COURRIEL")`) ; normalise le courriel (`bTraiteCourriel` : minuscules, ≤ 100 car., suppression de guillemets, rustine `videotron.ca` sans `@`) ; ajoute (`COURRIEL_ADDR`, `COURRIEL_SOCIETE`=courriel, `COURRIEL_EXCLUS=Vrai`) ou marque `COURRIEL_EXCLUS=Vrai` ; recopie le `.FIC` dans `INILit("PREPARENVOI","REPSAVE","c:\WebSite\bd\EnvoiBern")` ; `Nation(3)` (anglais !) ; succès → `PageAffiche(PAGE_FINDESABON)`, échec → **rien** (reste sur la page ; `PAGE_ERRDESABON` n'est jamais affichée par ce code). |
| `PAGE_FINDESABON` / `PAGE_ERRDESABON` | pages statiques (code : `FinProgramme()` en synchronisation, p.2200 et p.2223). |
| Dépendances | chemins `c:\EnvoiBern`, `c:\WebSite\bd\EnvoiBern` ; base de l'outil d'envoi de courriels séparée du site ; `Crypte/Décrypte` PC SOFT (format `encodePCS`, à réimplémenter ou à remplacer par un jeton). |

## 14. `conference`, `commestim`, `contestim` — formulaires du site estimation.ca (p.131)

`TraiteConference(Minuscule(AAType))` — p.4061-4065. **Pas** d'authentification ; **pas** de `FermeTout()` avant `TermineProg`.

| | |
|---|---|
| Paramètres HTTP (`sAjoutParam(titre, mot1, mot2, …)` p.4003-4004 : lit `PageParamètre(mot1)` puis `PageParamètre(mot2)` si vide) | `conference` : `N`/`nom`, `P`/`prenom`, `C`/`courriel`, `S`/`societe`, `TL`/`telephone`, `RG`/`region`, `NB`/`nombre_participant`. `contestim` : `S`, `C`, `CM` (commentaire). `commestim` : `S`, `N`, `R` (adresse), `V` (ville/pays), `CP`, `TE` (type d'entreprise), `C`, `TL`, `FX`, `O1`…`O10` (cases à cocher), `RG`, `AU` (autres). Tous optionnels (ligne omise si vide). |
| Traitement | table `COURRIELS` : `RazEnreg`, `TimeStamp=DateSys+HeureSys`, `TYPE_COURRIEL` = `CCourriels::CAFE_CONFERENCE` / `CONTACT_ESTIME` / `COMMANDER`, société, courriel, nom, prénom, téléphone, `AUTRE_INFO` (champs joints par `|`), `bAjoute()`. |
| Courriel | sujet `INILit("CONFERENCE","Sujet"/"Sujet2"/"Sujet3")` (défauts « Inscription café conférence », « Nous Contacter », « Pour Commander ») ; destinataires `[CONFERENCE] Courriel1` (défaut info@estimation.ca) et `Courriel2` (optionnel) ; corps texte `Date AAAA/MM/JJ Heure HH:MM:SS` + lignes `Titre: valeur` ; envoi par `goAAEMail:bEnvoiMessage` (p.3453-3455) → **`goDllUtils:bSendMail`** (`DllUtils.dll`, SMTP `[SMTP]` du .ini ; la méthode réécrit à chaque appel le mot de passe SMTP chiffré dans le .ini à partir d'une constante en dur — ne pas recopier). |
| Logs | `AALogEstime.log` « Recu requete <type> Societe … courriel … », erreurs d'envoi. |
| Réponse | `TermineProg`. |

## 15. Cas commentés = **morts**

| Commande | État | Référence |
|---|---|---|
| `verdisp` | `CAS` commenté (p.140) ; appelait `CreatVersionDispo(export, AAIdent, Faux)` qui n'existe plus que sous la forme `CreatVersionDispoXX` entièrement commentée (p.3894-3895 : aurait écrit `Version_<user>.res` + `.fin`). | lignes 1409-1415, 135731 |
| `projexp` | `CAS` commenté (p.139) ; `ReceptionProjet(AAParam, AAProject)` existe encore (p.3971-3973 : déplace un zip de `export\` vers `Exceptions\`, extrait `Info.txt`, courriel) mais n'est plus appelée. | lignes 1365-1368, 139040 |
| `sdpflrep` | `CAS` commenté (p.134) ; cible `SDPChangeReponse` → `SDPChangeReponseXX` vidée. | lignes 1177-1182, 140699 |

Autres fossiles liés : `GetDateTimeXX` (p.3912-3913, ex-`getdt` : le `CAS "getdt"` existe encore mais ne fait que `TermineProg`),
`bImport14`, `bDispatch14xxx`, `bGlobEnvoiVerifxx`.

---

## 16. Modèle de licence

### 16.1 Deux populations de « clients »

| Table / classe | Rôle | Login / mot de passe |
|---|---|---|
| **AAClient** / `CAAClient` (p.3394-3449), fichier HFSQL protégé par `PASS_CLIENT` | **Clients des logiciels** (e-Plans, Estimateur Général, module d'envoi) : fiche, abonnement au centre de mise à jour, licences, options, versions installées, salle de plans. Préfixe `AA` = pages d'administration. | `Login` (20) unique, `Mot_de_Passe` (10) en clair. |
| **Client** / `CClient` (p.3017-3027) | **Abonnés au catalogue web** (navigation, import/export de catalogues). | `Login` (15) + `LoginMaj` ; `Password` (15), flag `FL_CRYPTE` (0x4) dans `Flags` indique un mot de passe chiffré (`isPassCrypte`/`SetPassCrypte`) — `sGetPassword()` renvoie la valeur brute. |

Un même utilisateur peut avoir les deux (dans `wwwlog`, rangs 14-15 du fichier = identifiants **catalogue** en plus du login AAClient).
`AAClient.OptCatalogue` (`isAbonnementCatalogue`) et `Client.Abonnement` sont indépendants.

### 16.2 Rubriques AAClient qui pilotent les contrôles

- `Abonnement`, `DateFinAbonnement` (→ `bAutorise`, `PasExpire`, `RESTEJ`), `DateFinEG`, `DateFinEPlans`, `DateDerniereVisite`, `Date` (installation).
- `TypeVersion` (`NVER`) : constantes `CAAClient` : 1 Or, 2 Argent+, 3 Argent, 4 Bronze, 5 Invitation, 6 e-Plans, 7 Or essai, 8 à déterminer
  (attention : les codes **envoyés par les logiciels** dans REPCOMMON.TypeVersion suivent une autre numérotation : 0 non enregistrée, 1 Bronze, 2 Argent, 3 Or, 7 Invitation, 10 Argent+, p.3886).
- Options booléennes `OptEcheancier`, `OptComparatif`, `OptVentilation`, `OptRepartition`, `OptInvitation`, `OptCatalogue`, `OptEPlans`, `OptTPlans` (`OP*=` des réponses).
  Constantes `OPT_*` du projet (p.117 : 0x1 Échéancier, 0x2 Invite, 0x4 Comparatif, 0x8 Ventilation, 0x10 Répartition, 0x20 e-Plans, 0x40 t-Plans) = représentation en bits côté logiciel ;
  `OPC_*` (p.117) = bits du mot `OPTIONESTIME` envoyé dans le COMMON (0x1 Cmp, 0x2 Ech, 0x4 Inv, 0x8 Rep, 0x10 Sdp, 0x20 Vnt, 0x100 e-Plans enregistré, 0x200 EP multiposte achat, 0x400 EP multiposte location) ; `CCommon` y ajoute `SRC_EG` 0x100000 / `SRC_EP` 0x200000.
- `Flags` : `FL_MANUELESTIM` 0x1, `FL_FACTURATION` 0x2, `FL_MANUELSDP` 0x4, **`FL_FORCELIC` 0x8** (`ForceLic=`), `FL_DELETE` 0x10.
- **Licences** (`GetLicences`, p.3398-3400, structure `stNBRLIC`) : si `B_MIGREVERSION` (`isMigreLicence`) → compteurs explicites `EGACHAT`, `EGLOCAT`, `EPLMONOACHAT`, `EPLMONOLOCAT`, `EPLMULTIACHAT`, `EPLMULTILOCAT` ; sinon calcul rétro-compatible depuis `NombreLicence`, `NBLICEPLANS`, `EPLANSMONOPOSTE`, `LOCATION1`, `OptEPlans`, `TypeVersion`. Les licences e-Plans « Or » (`POA`/`POL`) = licences EG d'une version Or. `NbrLic` = EGA+EGL ; `NbrLicEP` = P1A+P1L+PMA+PML+POA+POL. `m_bMonoPoste`, `m_bLocation` dérivés.
- `IGNORECOMMON` (`isIgnoreCommon`) : dans la réponse `wwwlog`, masque le chemin COMMON et dédoublonne par IP (cas des clients dont les postes partagent un COMMON réseau). `AUTHIPMULTI` (`isIPMulti`) : lu mais sans effet dans le code inventorié. `FILTREIP` : non utilisé ici.
- `SDP_AUTORISE`, `SDP_MAXSIZE` (+500/+1000 Mo ajoutés dynamiquement, p.3416), `SDP_MAXTIME`, `SDP_CURSIZE` ; `RBQInterdit` ; `B_ECOLE` (version école, bloc `ECOLE_*` depuis `INFO_ECOLE`) ; `WebMaster`, `NUMVENDEUR`, `MontantMAJ`, `MontantSDP`, `AJUSTEMENT`, `NBHFORM`.

### 16.3 REPCOMMON / `CCommon` (p.3607-3618) — un enregistrement par **installation** (répertoire COMMON × machine)

Le « COMMON » est le répertoire de données partagé d'une installation (ex. `…\ePlanData`). Chaque démarrage (`wwwlog`) remonte
rep + IP + machine + nbr de licences détectées + type de version + options ; `nAjoutRepCommon` réutilise l'enregistrement identique
ou en crée un ; `NettoyageCommon` supprime les doublons non `LOCKREP`. Rubriques : `REP_COMMON`, `NOMMACHINE`, `ADDR_IP`, `NBRLICENCE`,
`TypeVersion`, `OPTIONESTIME`, `NOM_ENTREP`, `LOCKREP` (verrou posé par l'administration), `REP_NETTOYER` (à ignorer dans les réponses),
`DateFinAbonnement`, `DateCreat`, `RESTEJOUR`, `CADENAS_CLI`/`CADENAS_SRV` (-1 ouvert / 1 fermé / 0 indéfini), `INDICREP`, `ENREG_MONO`
(0x1 achat, 0x2 location), `TimeStamp`. Les lignes `Common=`/`COMMONn##=` renvoyées aux logiciels leur permettent de compter les
postes actifs et de bloquer au-delà du nombre de licences (logique **côté client**, non visible ici). `delmono` supprime l'enregistrement
d'un poste monoposte lors d'une désinstallation/transfert.

### 16.4 Autres tables

- **LISTFORM** / `CListForm` (p.3633-3635) : liste de contacts (formation) par client (`IDAAClient`, `NoLigne`, `Contact`) ; aucune commande `Type=` ne l'utilise ; ouverte/fermée/supprimée en cascade avec `CAAClient`.
- **VERSION** / `CVersion` (p.3502-3504) : **un seul enregistrement** ; versions courantes publiées (`Version_EPlans`, `ModuleVersion12` [= EG 12, sic], `Version_Module12`, `EstimeVersion14`, `Version_Module14`) + libellés `DescVersion_*` affichés par AADownload. Alimentée par `majversion` et consultée par `bGetVersions`.
- **LOGVERSION** / `CLogVersion` (p.3707-3711) : journal des démarrages (`IDAAClient` 0 pour démo, date, heure, IP, machine, `NUMLOGICIEL` 1 EG / 2 e-Plans / 3 module, `DATESYSCLI`, `IDREPCOMMON`). `ReductionLogVersion` (p.4000) le découpe par mois.
- **CLIENTDEMO** / `CClientDemo` (p.3767-3769) et **HISTODEMO** / `CHistoDemo` (p.3795-3797) : suivi des **versions démo** identifiées par (`ADDR_IP`, `SOFTTYPE` 0 aucun / 1 e-Plans / 2 EG) : `NBRCONNECT`, `VERSION`, `DATEDEBUT`, `DATEBUTOIR` (+61 j), `DATELAST`, `RESTEJOUR` (envoyé par le logiciel), `BLK_DEMO` (blocage administratif → `Auth=0` dans la réponse), `FIN_DEMO`. Code `LOGIN_DEMO=5000` renvoyé en `##5000`. Le login `DEMO` est explicitement ignoré par `delmono`.
- **HISTORIQUE** / `CHistorique` (p.3144-3147) : trace des opérations catalogue (`HST_IMPORT` 7, `HST_EXPORT` 8, `HST_LISTE` 14…), `DescAction` 40 car. découpée en lignes `NoLigne`.
- **NOTE_CATCLIENT** / `CNoteCatClient` : ouverte par import/export/liste (`goNoteCatCli:bSetAlias`) mais **jamais lue ni écrite** dans ces commandes.
- **CLIENTCAT** (`IDClient`, `MUCLEUNIK`) : catalogues autorisés par abonné ; **MULTICAT** (`NUMREV`, `DATEREV`, `NOMCATMAJ`, `TypeCatalog` 1 = catalogue par défaut).

### 16.5 Prix : `stPRIXVERSION`, `stLISTEPRIX` et `[LISTEPRIX]` (code projet p.112, p.115-116)

`stPRIXVERSION` = 7 montants (Invitation, e-Plans mono, e-Plans multi, EG Bronze, Argent, Argent+, Or). `stLISTEPRIX` = 4 `stPRIXVERSION`
(première licence, MAJ annuelle, licence supplémentaire, MAJ annuelle supplémentaire) + module complémentaire (×4), `m_mEGEssai`,
`m_mMAJTrio`, `m_mCatalogue`, `m_sSDPTarifs` (`<Mo>/<prix>|…`), `m_mSDPMajoration`. Deux grilles globales : `gstPrixAchat` et
`gstPrixLocat` (sections `LISTEPRIX` et `PRIX_LOCATION` du .ini). Noms de clés (constantes p.116) : `LIC1_INVITE`, `LIC1_EPLAN1`,
`LIC1_EPLAMM`, `LIC1_BRONZE`, `LIC1_ARGENT`, `LIC1_ARGENTP`, `LIC1_OR`, `MAJLIC1_*` (mêmes suffixes), `LICS_*`, `MAJLICS_*`, `LIC1_COMPL`,
`MAJLIC1_COMPL`, `LICS_COMPL`, `MAJLICS_COMPL`, `EG_ESSAI`, `MAJ_TRIO`, `ABON_CATALOG`, `SDP_TARIFS`, `SDP_MAJORATION`, `INIT_PRIX`.
Aucune commande `Type=` du périmètre ne lit ces prix (ils servent aux pages d'administration/renouvellement). Le fichier
`Exe/lecatalogue.ini` n'a **pas pu être lu** (accès refusé par les permissions de l'outil) : la structure ci-dessus vient du code seul.

### 16.6 Pages de téléchargement des logiciels (« Centre de mise à jour »)

| Page | Rôle | Référence |
|---|---|---|
| **AADownload** (p.1411-1425) | Ouverte par `?AADownLoad=<login AAClient>` (constante `PATH_DOWNLOAD` du .ini, p.121). `LoginClient` : `isExistLogin`, met à jour `DateDerniereVisite`, met `Abonnement=Faux` si `DateFin<=DateSys()`, affiche contact, fiche, jours restants, dernière version téléchargée, nb licences ; `BTN_VALIDER` compare `Saisie1` au mot de passe de la fiche ; comptes spéciaux `ContactEstim`, `ContactEPlans`, `Consult` avec **mots de passe codés en dur** (p.1424-1425, ne pas recopier) donnant accès à `AATableClient` ; `B_OUBLI` envoie login **et mot de passe en clair** par courriel aux 3 adresses de la fiche ; `SEL_VERSIONEG` masqué (version 12 abandonnée : `bVersion14=Vrai` forcé). | |
| `BTN_ESTIME` → **AAEstime14** (ou AAEstime12) | enregistre `EstimeVersion14`/`EstimeDateVersion14` = version courante de `VERSION` + date du jour, puis `PageAffiche`. Page 229×105 dont `Bouton1` (auto-cliqué au `onload`) a pour **Url action `https://www.estimation.qc.ca/version/last/InstallEG14.exe`** (AAEstime12 : même exécutable en `http://`). Libellé = `DescVersion_Estime12 : ModuleVersion12` (sic, même sur la page 14). | p.2295-2296, p.1646-1647 |
| `BTN_MODULE` → **AAModule14** (ou AAModule12) | `ModuleVersion14`/`ModuleDateVersion14` (bogue : la valeur stockée est `sModule12`) ; **Url action `https://www.estimation.qc.ca/version/last/InstallSRV14.exe`** (AAModule12 : `http://…/InstallSRV14.exe`). | p.2297-2305, p.1648-1656 |
| `BTN_TRANSPLAN` → **AAConfEPlan** | `Version_EPlans`/`DateVersionEPlans` ; **Url action `https://www.estimation.qc.ca/version/last/ePlanInstall.exe`**. | p.1732-1733 |
| **AARenouvelle** (p.2457-2461) | Page d'administration : charge `bd\LECATALOGUE\Renouvellement.html` (ou un texte par défaut avec `@titre @nom @datefin`) dans `SAI_MESSAGE` ; l'envoi en lot aux clients est **entièrement commenté** (générait un lien `http://<ADDR_SITE><PATH_DOWNLOAD>=<Login>`). Destinataire par défaut `contact@estimation.ca`. |  |

Les installateurs sont donc hébergés **hors du site** (domaine estimation.qc.ca, répertoire `version\last`, le même que celui des fichiers
`*Version14.txt`/`ePlanVersion.txt` lus par `wwwlog`). Le centre de mise à jour ne fait que **journaliser** la version téléchargée dans la fiche.

---

## 17. Synthèse des dépendances Windows / non portables du périmètre

| Dépendance | Où |
|---|---|
| `DllUtils.dll` via `AppelDLL32` (`CR_*` chiffrement de `User` ; `nSMTPSendMail*` courriels) | toutes les commandes authentifiées ; conference |
| `DllNotify.dll` via `AppelDLL32` (`bAllocBuf`, `bCrypte`, `bDecrypte`, `bFreeBuf`) | export/export14 (CSV chiffré), ancien import 12 |
| `fCompacte`/`fDécompacte`, `zipCrée`/`zipOuvre`/`zipExtraitTout`/`zipListeFichier` (format **WDZ** PC SOFT) | export, import, wwwlog (zip de debug) |
| `Crypte`/`Décrypte` PC SOFT (`compresseChaîneCourte`, `encodePCS`) | unsubscribe |
| `HDéclareExterne`/`HChangeRep`/`HCréationSiInexistant(…, PASS_CLIENT)` HFSQL Classic ; remplacement physique de `.FIC/.NDX` | import, unsubscribe, bSetAlias |
| Chemins en dur : `c:\WebSite\Traces`, `c:\WebSite\estimation.qc.ca\Version\Last`, `c:\WebSite\estimation.qc.ca\version\last\FTPRepClient.zip`, `c:\EnvoiBern`, `c:\WebSite\bd\EnvoiBern`, `h:\Temp\…`, `H:\Mes Projets\…` (mode test), `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\ListeClient.txt` (RBQ) | code projet, wwwlog, unsubscribe, isAutoriseWWW |
| `INILit`/`INIEcrit` sur `lecatalogue.ini` (**écritures à chaque appel**, y compris du mot de passe SMTP) | code projet, conference, bCreationResultat, unsubscribe |
| `Hasard()` (réponse non déterministe) | wwwlog |
| Fonctions signalées « interdites en Linux » par le compilateur (p.142, lignes 1496-1524) : `EmailLitTimeOut`, `DDEErreur`, `fDisqueEnCours`, `InfoBitmap`, `RegistreCréeClé/Ecrit/Lit`, `RéseauNomRep`, `RéseauUtilisateur`, `SysVersionNuméro`, `ThreadReprend/Suspend` | hors périmètre direct (CUTILS, CEmail, CParcoursTous), mais `AppelDLL32` n'y est pas listé car toléré par le compilateur |

---

## Points non vérifiés / incertitudes

1. **Canal de récupération des fichiers résultat** (`export\…`) par les logiciels : le code serveur ne le montre pas. Hypothèse : HTTP GET sur
   `http://www.lecatalogue.ca/LECATALOGUE_WEB/export/<fichier>` (le répertoire est sous `fRepWeb()`), mais le commentaire `FTPRepClient.zip`
   et l'ancien commentaire `c:\Inetpub\ftproot\` (p.3132) évoquent un accès **FTP**. À confirmer dans les sources e-Plans/ESTIME 14
   (`~/Projects/WinDev/e-Plans`, `ESTIME 14`, hors périmètre de cette annexe).
2. **Dépôt des fichiers d'entrée** (`export\www_<login>_<heure>.txt` pour `wwwlog` ; `import\<login> <cat>.imp/.wdz` pour `import`) : mécanisme inconnu (FTP ? upload HTTP ?).
3. Sensibilité à la casse de `PageParamètre` (noms de paramètres en minuscules dans l'URL de test p.128).
4. Encodage réel des fichiers écrits par `fEcritLigne` (supposé Windows-1252, CR LF, sans BOM) et du HTML `TermineProg` (gabarit UTF-8).
5. Si le HTML de `TermineProg` est effectivement transmis après `FinProgramme(Vrai)`, et si les clients en lisent quoi que ce soit.
6. Valeur réelle de la 2e ligne du `.exp` (`dwGetTaille` après suppression du `.csv`).
7. Algorithme de `DllNotify.dll` (`bCrypte`/`bDecrypte`) : sources absentes de `DllUtils/` ; peut-être dans `~/Projects/WinDev/FNotify V9/` (non lu). Il semble produire aussi un encodage 4/3 ; identique ou non à `CCryptage2`, à vérifier.
8. Contenu de `Exe/lecatalogue.ini` : lecture refusée par les permissions ; les clés citées viennent des constantes du code.
9. Rubriques `REPCOMMON.ENREG_MONO`, `CADENAS_SRV`, `INDICREP`, `TimeStamp` : utilisées par le code mais absentes de `docs/modele-donnees.md` (export XML périmé ?).
10. Sémantique exacte des codes 17/21/23 (autorisé) et 24-100 (refusé) côté client, et de `Auth=?`.
11. `AAInfo` (`recinf`) et `AAUser` : paramètres lus mais inutilisés — à confirmer que les clients ne les envoient plus.
12. `CZoneMem::Tri(Faux)` = `MemTrie(zone, Faux)` : supposé tri **décroissant** sur la clé.
13. `wwwcom` : marqué « n'est plus appelé » ; aucune preuve dans le code que les clients actuels ne l'appellent pas.
14. Emplacement exact de `goConfig:m_sRepImport` en production (`<fRepWeb()>\import\`) et droits d'écriture des clients dessus.
