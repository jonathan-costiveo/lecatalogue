# A2 — Commandes `Type=` du groupe Salle de plans (SDP) et divers

Inventaire des commandes HTTP appelées par les logiciels clients Windows (**Estimateur Général** « EG » et
**e-Plans**) sur l'URL d'accueil du site WebDev :

```
http(s)://www.lecatalogue.ca/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue?Type=<commande>&<params…>
```

(`.htaccess` ne fait qu'une réécriture `WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` → `WD180AWP/WD180Awp.exe/CONNECT/lecatalogue`, pour les vieilles versions des logiciels.)

Source : `Docs/dossier-technique.txt` (DT). Les repères « p. N » renvoient aux marqueurs `--- page N ---` du DT, les « l. N » aux lignes du fichier texte.

---

## 1. Mécanique commune (code d'initialisation du projet, DT p. 118-141, l. 470-1452)

### 1.1 Lecture des paramètres HTTP (p. 123-124, l. 726-752)

Tous les paramètres sont lus par `PageParamètre("nom")` **au démarrage du projet**, avant tout dispatch. La casse du *nom* du paramètre : `PageParamètre` de WebDev est insensible à la casse (le code de test écrit indifféremment `AADownload` / `AADownLoad` ; **non vérifié** dans la doc PC SOFT, mais les logiciels clients envoient `user=`, `type=` en minuscules selon les commentaires l. 788, 1004). La *valeur* de `Type` est passée en `Minuscule()` avant le `SELON`.

| Variable | `PageParamètre(...)` | Utilisée par |
|---|---|---|
| `AADownLoad` | `AADownLoad` | affichage direct d'une page (§3.23) |
| `AALogin` | `AALogin` | creatsdp (mot de passe de la requête), `goConfig:SetProvenance` |
| `AALoginHex` | `AALoginHex` | creatsdp (AALogin encodé hexa) |
| `AAType` | `Type` | dispatch |
| `AAUserC` | `User` | sdplog, sdpmaj, sdpcli/acli/scli, sdpdel, sdplist (nom de fichier), + commandes hors SDP |
| `AAParam` | `Param` | sdpstat, sdpdownload, sdplist, sdpdel, sdpintv, bid, answer, numsdp, creatsdp, chilkat, testcharge, newexcept, unsubscribe |
| `AAProject` | `project` | sdpintv, newexcept |
| `AACpl` | `cpl` | numsdp (identification du sous-traitant, chiffré PC SOFT) |
| `AAVisu` | `visu` | numsdp (`Val(AAVisu)<>0` = visualisation) |
| `AAAnswer` | `ans` | numsdp (réponse du sous-traitant, chiffré PC SOFT) |
| `AARepCie` | `repcie` | creatsdp (lu dans le `CAS "creatsdp"`, l. 1121) |
| `AACatalogue`, `AAUser`, `AAIdent`, `AAInfo`, `AAParamRBQ`, `AAEstime12/14`, `AAModule12/14`, `AAEPlan`, `AAMail`, `AANumRBQ`, `AAInfoV` | `Cat`, `AAUser`, `AAIdent`, `AAInfo`, `ParamRBQ`, `VersionEstime`, `VersionEstime14`, `VersionModule`, `VersionModule14`, `VersionEPlan`, `email`, `Numrbq`, `info` | commandes hors périmètre de cette annexe (catalogue, RBQ, versions, désabonnement) |

Remarque : les l. 795-800 et 820-832 écrasent `AAUserC` et `AAParamRBQ` avec des valeurs de test (lignes non commentées), mais elles sont à l'intérieur du bloc `SI EnModeTest() ALORS … FIN` (l. 755-923) : sans effet en production.

### 1.2 Pré-traitement commun à tout appel (p. 118-130)

1. Création des répertoires de traces `c:\WebSite\Traces` (`h:\Temp\Traces` en mode test) ; `CBasicObjet::bSetActiveLog(Vrai, …\AATrace.log)`. Logs : `AATrace.log`, `AALogIntrus.log` (`gsLogIntrus`), `AALogSDPVide.log` (`gsLogSDPVide`), `LogIP\LogIP<AAAAMMJJ>.log`, etc. (l. 519-531). Rotation à 2 Mo en `.bk1…bk9` avec fichier `.lock` (CBasicObjet::sTrace p. 3245-3247). Format de ligne : `AAAA/MM/JJ HH:MM:SS <message>` (TAB convertis en espaces).
2. `goConfig` (`CConfigCat`, p. 3130-3132) : `m_sRepDisk = fRepWeb()` (= dossier web du site, donc `LECATALOGUE_WEB\`), `m_sRepBase = …\bd\LECATALOGUE\`, `m_sRepImport = …\import\`, `m_sRepExport = …\export\`, `m_sINIFile = …\bd\LECATALOGUE\lecatalogue.ini`.
3. `gsFicINI = m_sRepDisk + "lecatalogue.ini"` (= `LECATALOGUE_WEB\lecatalogue.ini` ; en mode test `H:\Mes Sites\lecatalogue\Exe\lecatalogue.ini`). **Il y a donc deux INI** : `gsFicINI` (SMTP, CORRESP, ADDRSERVER, LISTEPRIX, CHILKAT, TIRAGE…) et `goConfig:m_sINIFile` (section `REPERTOIRE` : `REP_SALLECLIENT`, `REP_REQRBQ`). À chaque requête le projet **réécrit** plusieurs clés dans `gsFicINI` (`INIEcrit`, l. 620-662) : effet de bord d'écriture disque systématique.
4. Chargement des DLL : `goDllUtils est un objet CDllUtils(fRepExe(),Faux)`, `goDllNotify est un objet CDllNotify(fRepExe())` (l. 693-694) → `Exe\DllUtils.Dll`, `Exe\DllNotify.dll` (+ `libcrypto-41`, `libssl-43`, `libtls-15` pour SMTP).
5. Ouverture de `goGroupeUnite`, `goProvenance`, `goIPAddress`, `goSdpIntrus`, `goIntrusion` sur `m_sRepBase`. Si la provenance `PROV_NOUS` n'existe pas → `PageAffiche(TermineProg)` et retour (l. 701-708).
6. `gsAddrIp = NavigateurAdresseIP(Vrai)` (adresse IP du navigateur/du logiciel).
7. **Cas `numsdp` traité avant le SELON** (l. 955-976) :
   - `AAParam=""` → `LogSDPVide(...)` ; si `isIntrus(ip,"")` → `goIPAddress:bAddAddress(ip,Vrai)` (marquer exclure) ; dans tous les cas `FermeTout()`, `PageAffiche(PAGE_REFUS)`, `FinProgramme()`.
   - sinon si `isIntrus(ip,AAParam)` → `LogGeneric(gsLogIntrus,"Blocage adresse IP …")`, `bAddAddress(ip,Vrai)`, `PAGE_REFUS`, `FinProgramme()`.
   - sinon `goIPAddress:bAddAddress(ip,Faux)`.
8. Tout autre `Type` : `TraceLog(ip+" AAType >"+AAType+"<")` (sauf `wwwlog`, `rbx`) et `goIPAddress:bAddAddress(ip,Faux)` → **écriture dans IPADDRESS à chaque appel**.
9. `gbSDPAlternate=Faux` ; `gsSDPRepAlternate="d:\SalleDePlans"` (l. 983-987) : mécanisme « salle sur un autre serveur » **désactivé** (variables non utilisées ailleurs ; **non vérifié** exhaustivement).
10. `SI AADownLoad<>"" ALORS PageAffiche(AADownLoad)` (l. 988-990) — voir §3.23.
11. `SELON Minuscule(AAType)` (l. 1004-1452).

### 1.3 Contrôle d'intrusion

- `isIntrus(sAddrIP, sNumSalle)` (p. 3933, l. 137392) : **ne crée pas** l'adresse ; si l'IP existe déjà dans `INTRUSION`, incrémente `NBRCONNECT`, met `TimeStamp`, ajoute `(idIntrusion, numSalle)` dans `SDP_INTRUS` (`CSdpIntrus::bAddNumSalle`, ignoré si numSalle vide) et renvoie vrai si `NBRCONNECT>3`.
- Les nouvelles IP ne sont **créées** que par `PAGE_NUMSDP2.BTN_ENTER` quand la référence saisie n'existe pas (p. 2146) : création de l'enregistrement INTRUSION, `IncConnect`, `LogGeneric(gsLogIntrus, num+TAB+ip)`, et si `NBRCONNECT>1` → `TermineProg` (fermeture immédiate).
- `IPADDRESS` (`CIPAddress`, p. 3791) : `bAddAddress(ip, bExclure)` crée ou met à jour (`EXCLURE`, `TimeStamp`). Le flag `EXCLURE` **n'est lu nulle part** dans le code SDP consulté (**non vérifié** ailleurs : grep `isExclure` à faire si besoin).

### 1.4 Déchiffrements rencontrés

| Mécanisme | Où | Comment |
|---|---|---|
| **A. `sGlobDecryptePasse(psPass)`** (p. 3813-3814, l. 132283) | `User=` de sdplog/sdpmaj/sdpcli/sdpacli/sdpscli/sdpdel, `Param=` de sdpdownload, mot de passe de la requête SDP (`sDecrypteInfo(...,Vrai)`), passes stockées (`SDPDESC.SDP_PASS`) | Clé fixe de 12 lettres construite caractère par caractère dans le code (ne pas recopier). `goDllUtils:dwNewCryptage()` → `AppelDLL32(DllUtils,"CR_dwNewCryptage")`, puis `nDecrypteChaine(ctx, cle, chaine, result)` → `AppelDLL32(DllUtils,"CR_nDecrypteChaine")` (buffers ASCIIZ 200/2048), puis **on ne garde qu'un caractère sur deux** (positions paires) du résultat. Algorithme C++ `CCryptage2::bDecryptage` (`~/Projects/WinDev/DllUtils/CCryptage2.cpp` l. 204-250) : dé-encodage 4→3 octets de type base64 « maison » (6 bits par caractère, sans table ASCII standard : les octets d'entrée sont pris tels quels), puis soustraction en chaîne arrière `b[i] = b[i] - cle[k] - mod - b[i+1]` avec `dwGetMod(cle)` (hash de la clé) et `bEchange(cle,…)` (permutation finale). À réimplémenter en Node à partir du `.cpp` (sans les constantes de clé dans l'annexe). |
| **B. `sDecrypteInfo(sPassword, sParamCrypte, bPassCrypt)`** (p. 4008-4009, l. 140650) | requête de création/consultation de salle (`creatsdp`, SDPDESC.SDP_REQ), `sdpstat` (`bPassCrypt=Faux`, clé fixe de 7 car. construite par concaténation dans `bCreatFicStat` p. 3829) | Si `bPassCrypt` : la clé est d'abord déchiffrée par A. Remplace `<xx>`→`?` et `<yy>`→`&` (échappement URL côté client), découpe en blocs de `(SIZE_REQ+2)/3*4 = 684` caractères (`SIZE_REQ=512`, p. 115), déchiffre chaque bloc par `CR_nDecrypteChaine` avec la clé, concatène. Les **10 premiers caractères** du clair sont un CRC32 décimal du reste (`CRC32::dwCRCChaine`, polynôme 0xEDB88320, init 0xFFFFFFFF, inversé final — CRC32 standard) ; si différent → chaîne vide. |
| **C. `Décrypte(sCompl,"<clé littérale>",compresseChaîneCourte,encodePCS)`** (PC SOFT) | `cpl=` et `ans=` de numsdp (PAGE_NUMSDP2/PAGE_NUMSDPX/PAGE_SDPDELETED p. 2142, 2035, 2326) ; `Param=` de unsubscribe (clé différente, l. 787) | Fonction WLangage propriétaire (`Crypte/Décrypte` mode « compresseChaîneCourte » + encodage PCS). Clé littérale dans le code des trois pages. **Non reproductible sans réimplémenter l'algo PC SOFT** (non documenté publiquement) : point bloquant à traiter (changer le format côté EG, ou capturer des couples clair/chiffré). |
| **D. hexa** | `AALoginHex` | `Caract(HexaVersEntier(Milieu(s,i,2)))` par paire (l. 1113-1116). |
| **E. nibbles** | `chilkat` | `Caract((Asc(c1) & 0x0F)*16 + (Asc(c2) & 0x0F))` par paire (p. 4004). |

### 1.5 Canal de réponse vers le logiciel client

Deux canaux coexistent :

1. **La page `TermineProg`** (p. 685-687, l. 20166-20245) : affichée après presque toutes les commandes. Code serveur d'initialisation : `FermeTout()` puis `FinProgramme(Vrai)`. HTML généré (`FR/TermineProg.htm`) : page ActivXP vide, `charset=UTF-8`, `onload` → `top.close()`. **Le corps HTTP ne porte aucune donnée métier.** Le client ne peut en tirer que le code HTTP 200 et éventuellement les en-têtes (date) — **non vérifié** côté EG/e-Plans.
2. **Un fichier déposé dans `goConfig:sGetRepExport()`** = `LECATALOGUE_WEB\export\`, que le client récupère ensuite en HTTP statique. URL déduite (**non vérifié**, par analogie avec le lien construit pour les exceptions : `www.lecatalogue.ca/lecatalogue_web/Exceptions/<fichier>`, p. 3970) : `http://www.lecatalogue.ca/LECATALOGUE_WEB/export/<nom de fichier>`. Le nom du fichier est reconstitué par le client (login + heure, ou nom passé dans `User=`/`Param=`), ce qui lui permet d'attendre l'apparition du fichier (polling). Certaines commandes écrivent un **témoin** `.fin`/`.res` pour signaler la fin.

**Format des fichiers de réponse** (classe `CFichier`, p. 3552-3556) : `bCreation` → `fCrée(sFic)` (fichier écrasé, **sans BOM**), `bEcritLigne` → `fEcritLigne` qui ajoute **CR+LF** après chaque ligne ; `bEcrit` écrit brut. Chaînes WLangage « ANSI » (Windows-1252) : le dossier technique documente partout les paramètres comme « chaîne ANSI ». Conversions implicites : booléen → `"1"`/`"0"`, entiers (y compris 8 octets) → décimal sans séparateur, dates `AAAAMMJJ`, timestamps `AAAAMMJJHHMMSSCC` (17 car. : `DateSys()+HeureSys()`). Une valeur multi-lignes passée à `bEcritLigne` produit plusieurs lignes physiques (les `RC` internes sont CR+LF).

**Convention d'erreur** : première ligne `##<code>` avec `ERROR_*` (p. 115) : 0 NOERROR, 1000 UNKNOWN, **1001 PASSWORD**, **1002 LOGIN**, **1003 REFERENCE**, **1004 NOTEXIST**, 1005 EXPIRE (non émis), 1006 READ, 1007 GETDIR, 1008 OPENFILE (côté EG), 1009 AUTORISE. `sdplist` utilise ses **propres** codes `##1`…`##7` (§3.5).

**Nettoyage** : `SupprimeAncienFichiers(export)` (p. 4050) supprime `*.txt`, `*.res`, `*.fin` dont la date est antérieure à aujourd'hui ou dont l'heure (HH) est inférieure à l'heure courante — appelé par `newexcept`, et par `export/export14` après 20 h. Les `.zip`/`.dic`/`.tmp`/`.csv` de `export` ne sont **jamais** nettoyés par cette routine.

### 1.6 Répertoires des salles de plans

- Racine : `goConfig:sGetRepSalleClient()` = `INILit("REPERTOIRE","REP_SALLECLIENT","d:\SalleDePlans", m_sINIFile)` (p. 3142). En mode test : `h:\SalleDePlans\`. La constante `CLE_REPSALLE="REP_SALLEDEF"` (p. 115) **n'est jamais lue** (grep : seule la définition existe).
- Répertoire client : `sConstruitRepSDP2(nCle)` = `"d"+%06d` de `AAClient.IDAAClient` (ex. `d000137`). Ancien nom `d%06d_<3 lettres du nom>` (`sConstruitRepOld`) renommé à la volée par `sConstruitRepSDP` (p. 4006-4007) — accès disque à chaque appel.
- Répertoire dossier (= salle) : `sGetRepSalle(repCie, dossier)` = `<racine>\d000137\<DOSSIER_NOM>\` (p. 4019-4020). Contenu : sous-répertoires de plans envoyés par EG, `DescProj.txt`, et les **fichiers HFSQL locaux à la salle** `SDPDESC.FIC/NDX/MMO`, `SDPSTAT.FIC/NDX`, `SDPFIC.FIC/NDX/MMO`, `INTERVEN.FIC/NDX`, `CACHEOPER.*`, `CACHEDICO.*`, plus `Dossier.log` (`LogDossier`). Ces fichiers sont ouverts par `CEstimeHF::bSetAlias(Faux, sRepDossier)` → `AssignRep` + `HCréationSiInexistant` (p. 3158-3159, 3203) : **toute ouverture crée les fichiers s'ils manquent.**
- Dans `d000137\` : les fichiers de requête `*.sdp` déposés par EG (une ligne chiffrée), et le logo (`Logo=` dans `sEntreprise`, lu via `fRepEnCours` dans PAGE_PROJET).
- `<racine>\ImportInterven\` (commun à tous les clients) : archives `<timestamp>Interv.wdz` et `<timestamp>Ret.wdz` déposées par EG.
- Taille : `dwGetSizeSalle8` (p. 3900) parcourt récursivement la salle en excluant `sdpdesc.*`.

Comment les plans, les `.sdp`, les `.wdz` et les zips d'exception arrivent physiquement sur le serveur (FTP ? upload HTTP ?) **n'apparaît nulle part dans le code du site** : **non vérifié** — à demander (probablement FTP depuis EG/e-Plans).

---

## 2. Tables HFSQL concernées (DT Partie 2, p. 178-179 et p. 220-222 ; `.claude/docs/modele-donnees.md`)

| Fichier | Emplacement | Rubriques clés |
|---|---|---|
| `SDPINFO` | central `bd\LECATALOGUE` | IDSDPINFO, IDClient, DOSSIER_NOM (12), NUM_SALLE (10, unique = référence), TIMESTAMP_CREAT/MODIF (17), SDP_DELETED, DATE_DELETE, SDP_DELFIC, SDP_LANGUE, SDP_SIZE (8 o.), SDP_NBRFIC, SDP_DATELIMITE ; clés CLE_CLIDOSS (IDClient+DOSSIER_NOM, unique), ClE_DELTIME, ClE_DELFIC |
| `AAClient` | central | Login (20), Mot_de_Passe (10, **en clair**, comparé par `=`), Nom, Abonnement, DateFinAbonnement, SDP_AUTORISE, SDP_MAXSIZE, SDP_MAXTIME, SDP_CURSIZE (8 o.), Telephone/Courriel1-3… |
| `INTRUSION`, `SDP_INTRUS`, `IPADDRESS` | central | voir §1.3 |
| `SDPDESC` | **par salle** | IDSDPINFO (unique), SDP_PASS (30, mot de passe chiffré par A), SDP_REQ (mémo texte : requête chiffrée) |
| `SDPSTAT` | **par salle** | IDSDPSTAT, IDAAClient, IDSDPINFO, SDPTYPEOP (CSDPStat::OP_*), SDPTimeStamp, SDPADDRIP(_S), SDPSIZEFIC, SDPCLEDOSS, SDPLANGC, FL_DICO, FL_OPER |
| `SDPFIC` | **par salle** | IDSDPSTAT, SDPNOMFIC (mémo), SDPSIZEFIC, SDPDATE/HEURE, Flags |
| `INTERVEN` | **par salle** | ITCLEUNIK (clé EG), IT_NOMCIE, IT_RESPONSABLE, IT_CODEPOSTAL, IT_COURRIEL, IT_TELBUR, IT_LANGC, IT_REPONSE (0/1/2/3), IT_TIMESTAMP, FLAGS (FL_EG=1) |
| `CACHEOPER`, `CACHEDICO` | **par salle** (créés par sdpstat) | cache de statistiques (p. 3833-3842) |
| `SDPStat.FIC` / `SDPFic.FIC` centraux | legacy | migrés vers les salles par `DispatchSDPStat` (p. 3897-3899), renommés `.Fic.Old` |

Codes `CSDPStat::OP_*` (p. 3536) : 1 DOWNLOADFIC, 2 DELSDP, 3 CONNECT, 4 LISTESDP, 5 CREATSDP, 6 DIRSDP, 7 DELAUTO, 8 DIRSDPX, 9 PAGEPROJET, 10 NUMSDP, 11 REPONSE, 12 VISU, 13 ADDMODFICx, 14 MODIFSDP, 15 DELFILE, 16 NEWFILE, 17 MODFILE, 18 MOVFILE, 19 OPENEPLANS, 20 DOWNEPLANS, 100 DOWNLOADZIP, 101 UPLOAD. Indicateurs de fichiers `FILE_NEW="1"`, `FILE_MODIF="2"`, `FILE_DEL="3"`, `FILE_MOVE="4"`.

---

## 3. Fiches par commande

Sauf mention contraire : réponse HTTP = page `TermineProg` ; `FermeTout()` avant.

### 3.1 `creatsdp` — création / mise à jour / visualisation d'une salle (p. 133-134, l. 1104-1139 ; `bConstructionPage` p. 3823-3825 ; `bSauveInfoSalle` p. 3873-3877)

| Paramètre | Oblig. | Chiffrement | Rôle |
|---|---|---|---|
| `AALogin` ou `AALoginHex` | oui | hexa (D) pour `AALoginHex` ; la valeur est elle-même la **clé chiffrée (A)** de la requête | mot de passe de déchiffrement de la requête |
| `Param` | oui | — | nom du fichier `.sdp` (ex. `p2011311391195.sdp`) déposé par EG dans `<racine>\<repcie>\` |
| `repcie` | oui | — | `dXXXXXX` du client |

Traitement :
1. Si `AALoginHex<>""` → décodage hexa dans `AALogin` (trace si les deux sont présents).
2. `goSDPInfo`/`goAAClient` ouverts (`PASS_CLIENT` = mot de passe HFSQL du fichier AAClient, constante p. 118) ; `SupprimeAncienneSalle()` (chronométrée).
3. `bConstructionPage(bFic=Vrai, "", AALogin, AAParam, AARepCie, "", bSauve=Vrai, 0, 0, bVisu=Vrai, nReponse=0, bAffOuiNon, 2)` :
   - lit la 1re ligne de `<racine>\<repcie>\<Param>` (sinon `RENVOYER Faux`) ;
   - `sDecrypteInfo(AALogin, ligne, Vrai)` → clair `sParam` ; vide si CRC faux → aucune page n'est affichée, retour **Vrai** (!) ; le `.sdp` est tout de même supprimé à la fin, et comme le `CAS "creatsdp"` fait `RETOUR` sans `PageAffiche`, WebDev enchaîne vraisemblablement sur la « Première page dynamique » du projet (`Accueil`, DT l. 10) — **non vérifié** ;
   - `RecupInfoParam` (p. 3986) : `sParam` = `entreprise | projet | listeFichiers | reponse(0/1) | captcha(0/1) | infoFic` séparés par `|` ;
     - `sEntreprise` : paires `Clé=valeur` séparées par TAB (`Name`, `Addr`, `City`, `Prov`, `CP`, `Mail`, `Web`, `Tel`, `Fax`, `User`, `Logo`, `Id`, `Entrep`, `Common`, `NbrLic`, `TypVer`, `Options`, `AddrIP`, `NomOrdi`, `LicA`, `LicL`… lues par `sGetInfo`, PAGE_PROJET p. 1947-1948) ;
     - `sProjet` (TAB, `GetInfoProjet` p. 3918 + PAGE_PROJET p. 1946-1947) : 1 description (`<RC>`→RC, `<!>`→`|`), 2 n° dossier, 3 repCie (`d000137[_xxx]` → IdClient = chiffres après le `d`), 4 langue (3=EN, 5=FR), 5 date limite `AAAAMMJJ`, 6 fermeture générale, 7 propriétaire, 8 architecte, 9-10 ingénieurs, 11 fermeture spéciale, 12-15 téléphones, 16 flag ing.3, 17-18 ing.3, 19 flag arch.2, 20-21 arch.2, 22-33 libellés FR/EN ;
     - `sListeFichier` : lignes RC, chaque ligne TAB : `1 TAB répertoire` ou `2 TAB nomFichier TAB taille TAB date TAB heure` ;
     - `sInfoFic` : lignes RC `indic TAB fichier [TAB destination]` (indic 1/2/3/4) ;
   - crée le répertoire de la salle si absent ; `LogDossier` ; `SuppressionFicSDP` (**désactivée** : `SI Faux`) ;
   - si `dateLimite <= DateSys()` → `PageAffiche(PAGE_DEPASSE)` et retour Faux (le `.sdp` est supprimé) ;
   - sinon `bSauveInfoSalle` : crée `SDPINFO` (référence `CSDPInfo::sSDPGener` p. 3527 : 4 lettres aléatoires + 6 hexa du CRC32 de `idClient_dossier` ; jusqu'à 100 essais d'unicité) ou met à jour (`SetDeleted(Faux)`, `SetDateLimite`) ; stat `OP_CREATSDP` ou `OP_MODIFSDP` selon `isExistSalle` ; une stat `OP_NEWFILE/DELFILE/MOVFILE/MODFILE` + `SDPFIC` par ligne de `sInfoFic` (taille lue sur disque) ; écrit `DescProj.txt` (`bEcrit`, sans CRLF final) ; `SDPDESC.bSetDesc(idInfo, passChiffré, requêteChiffrée)` ; `SetModifTS` ;
   - `SupprimeRepVide` (sous-répertoires vides) ; `fSupprime(.sdp)` **= marqueur de fin pour EG** ;
   - `PageAffiche(PAGE_PROJET, modifTS, sEntreprise, sProjet+5 TAB, sListeFichier, nLangue, sReference, nCleDoss=0, bVisu, nReponse, bCaptcha, TAB)`.
4. Si `bConstructionPage` renvoie Faux → `TermineProg` ; sinon **la réponse HTTP est la page PAGE_PROJET** (ou PAGE_DEPASSE), que EG affiche dans un navigateur (« Visualisation salle de plan »).

Tables : SDPINFO (R/W), AAClient (R), SDPDESC/SDPSTAT/SDPFIC de la salle (W). Fichiers : lecture/suppression du `.sdp`, `DescProj.txt`, `Dossier.log`. Courriel : aucun. Windows : chemins de salle, `fRepEnCours` (PAGE_PROJET).

### 3.2 `sdplog` et `sdpmaj` — structure de la salle (p. 134, l. 1146-1157 ; `RecupDirectorySDP` p. 3976-3981)

| Paramètre | Chiffrement | Contenu déchiffré |
|---|---|---|
| `User` | A | `login TAB motDePasse TAB heure TAB nomDossier` (`heure` sert à rendre le nom du fichier réponse unique) |

`sdplog` = `bMAJ=Faux` (lecture), `sdpmaj` = `bMAJ=Vrai` (création de l'enregistrement SDPINFO si absent).

Traitement : ouvre SDPINFO/AAClient ; `SupprimeAncienneSalle()` ; `isExistLogin` (recherche sur `AAClient.Login`, comparaison `~=` insensible à la casse) ; `sConstruitRepSDP` (peut renommer le répertoire client) ; si `sdplog` → `SommeSalles` (p. 4020 : recalcule `SDP_SIZE` de chaque salle non supprimée du client — parcours disque si 0 — et `AAClient.SDP_CURSIZE`, `bModifie`) ; si `SDP_MAXSIZE=0` → 500, si `SDP_MAXTIME=0` → 60 et `bModifie` ; `bAutorise = SDP_AUTORISE ET Abonnement ET DateFinAbonnement>=DateSys()` ; mot de passe comparé **en clair** (`=` sensible à la casse) → `ERROR_PASSWORD` ; crée le répertoire de la salle (`CUTILS::bCreatRep`, sinon **retour sans fichier réponse**) ; ouvre SDPSTAT dans la salle.
Si login OK : si SDPINFO n'existe pas pour (client, dossier) : `sdpmaj` → création (référence générée, **DateLimite = demain**, stat `OP_DIRSDP`) ; `sdplog` → `ERROR_NOTEXIST`, stat `OP_DIRSDPX`. Si existe : `SetDeleted(Faux)` (**ressuscite une salle supprimée sans `bModifie` explicite** — l'écriture dépend de `bModifie` ultérieur ; non vérifié), stat `OP_DIRSDP`.

Fichier réponse : `export\<login>_<heure>.txt` (supprimé puis recréé). Succès :
```
<repSDP>                              ex. d000137
<reference>,<deleted 0/1>,<TIMESTAMP_MODIF>
<SDP_MAXSIZE>,<SDP_MAXTIME>
<SDP_CURSIZE>                         somme des salles (octets)
<SDP_SIZE>                            salle courante (octets)
<bAutorise 0/1>
[si bAutorise et SDPDESC existe : bloc bGlobGetInfo]
```
Bloc `bGlobGetInfo` (p. 3858-3859), multi-lignes :
```
Entreprise:
<sEntreprise (TAB)>                    « Logo=xxx » vidé si le fichier logo n'existe pas
Projet:
<sProjet (TAB)>
Fichiers:
<lignes de sListeFichier filtrées : type 1 toujours, type 2 seulement si le fichier existe sur disque>
Tailles:
<SDP_SIZE>
<SDP_CURSIZE>
Answer:
<0/1>
Captcha:
<0/1>
InfoFic:
<sInfoFic>
```
Erreur :
```
##<1001|1002|1004>
<SDP_MAXSIZE>,<SDP_MAXTIME>
<SDP_CURSIZE>
0
<bAutorise 0/1>
```
Si `bAutorise` et SDPDESC vide : `bDelDescVide=Faux` → trace seulement. Journal `Dossier.log` abondant.

### 3.3 `sdpdownload` — statistique de téléchargement depuis e-Plans (p. 134, l. 1152-1156 ; `SDPDownload` p. 4014-4015)

`Param` chiffré A → chaîne TAB `K=idClient TAB R=référence TAB N=dossier TAB A=adresseIP TAB I=idIntervenant TAB T=taille TAB F=nomFichier TAB P=1|0` (lue par `sGetInfo2`). Si `K<=0` → trace seulement. Sinon ouvre AAClient, SDPINFO, SDPSTAT+SDPFIC dans `<racine>\d%06d(K)\N\` (**sans** `sConstruitRepSDP`, donc pas de renommage) ; `LogDossier` ; si `P` → stat `OP_OPENEPLANS` ; stat `OP_DOWNEPLANS` (IP = `A` fournie par le client, taille `T`) + `SDPFIC(F,T)`. **Aucun fichier réponse.** Le téléchargement réel du plan par e-Plans se fait ailleurs (**non vérifié** : probablement HTTP statique ou FTP).

### 3.4 `sdpmaj` — voir 3.2.

### 3.5 `sdplist` — contenu d'une salle (p. 132, l. 1052-1057 ; `CreationListeSDP` p. 3892-3893)

| Paramètre | Chiffrement | Rôle |
|---|---|---|
| `User` | **aucun** | nom du fichier réponse à créer (unique, choisi par le client) |
| `Param` | aucun | référence (NUM_SALLE) |

`SupprimeAncienneSalle()` ; `isExistUnik(ref)`. Fichier réponse `export\<User>` (**nom tel quel, sans extension ajoutée**), une seule `bEcritLigne(sInfo)` :
- `##2` référence inconnue ; `##6` salle supprimée ; `##7` expirée (`SDP_DATELIMITE <= DateSys()`) ; `##1` client (IDClient) introuvable ; `##4` échec `goSDPDesc:bSetAlias` sur le répertoire de la salle ; `##5` pas de SDPDESC pour cette salle ; `##3` échec de déchiffrement (`bGlobGetInfo`) ;
- sinon le bloc `bGlobGetInfo` de §3.2 (`Entreprise:` … `InfoFic:`).
Note : `goSDPDesc:bSetAlias` crée SDPDESC si absent (effet de bord). Pas de contrôle de login : **la référence suffit** pour obtenir la description complète.

### 3.6 `sdpcli` / 3.7 `sdpacli` / 3.8 `sdpscli` — liste des salles d'un client (p. 132, l. 1058-1075 ; `CreationListeClient` p. 3888-3891)

`User` chiffré A → `login TAB pass TAB heure TAB (dossier) TAB userWindows`. `nType` : 0 toutes (sdpcli, « plus utilisé ? »), 1 actives (non supprimées), 2 supprimées depuis moins de 365 jours.

Fichier : `export\<login>_<userWindows>_<heure>.tmp` (ou `<login>_<heure>.tmp` si pas de userWindows, compatibilité), **renommé en `.txt` à la fin** (le `.tmp` sert de verrou). Contenu :
```
##1002                                        login inconnu   (ou)
##1001                                        mot de passe    (ou)
Autorise <0/1>
<dossier>TAB<ref>TAB<deleted>TAB<SDP_SIZE>TAB<dateLimite>TAB<creatTS>TAB<modifTS>TAB<langue>TAB<desc>TAB<nUndef>TAB<nOui>TAB<nNon>TAB<nPeutEtre>TAB<fermGener>TAB<fermSpecial>
… une ligne par salle dont le répertoire existe
```
`desc` = `DescProj.txt` avec les sauts de ligne remplacés par le texte `<RC>` ; compteurs de réponses lus dans `INTERVEN` de la salle (réponses non-EG avec timestamp) ; `fermGener`/`fermSpecial` = champs 6 et 11 de `sProjet` après déchiffrement de SDPDESC. Si `nType=2`, pas de description ni de compteurs.
**Anomalies observées** : les compteurs `nNbrOui/Non/PeutEtre/Undef` ne sont **jamais remis à zéro** entre les salles (cumul) ; `sFermGener/sFermSpecial` conservent la valeur de la salle précédente si le déchiffrement échoue. Si une salle supprimée a `SDP_SIZE<>0` elle est corrigée à 0. Après `sdpacli` : `SupprimeAncienneSalle()`. `QUAND EXCEPTION` global avec trace. Login vide → retour sans fichier.

### 3.9 `sdpdel` — suppression d'une salle (p. 134, l. 1140-1145 ; `DeleteSDP` p. 3896-3897)

`User` chiffré A → `login TAB pass TAB heure TAB dossier` ; `Param` = référence. Vérifs : login (1002), mot de passe (1001), si SDPINFO(client,dossier) existe et référence différente → 1003. Si tout est bon : `goSDPDesc:FermeFic()`, `SupprimeUneSalle(idCli, nom, dossier, idInfo, bAuto=Faux, bForce=Vrai)` (p. 4056-4057) : stat `OP_DELSDP` (si le répertoire existe), `SetDeleted(Vrai)` (DATE_DELETE = aujourd'hui), `SDP_SIZE=0`, `bModifie`, puis suppression **forcée** des fichiers de la salle (`SupprimeFichierSDP` : tous sauf `SDPSTAT.*`, `SDPFIC.*`, `SDPDESC.*`, `INTERVEN.*`, `dossier.log`, `DescProj.txt` — `isGarderFic` p. 3932 — et sous-répertoires `fRepSupprime`), `SDP_DELFIC=Vrai`. Le répertoire de la salle lui-même n'est pas supprimé.
Fichier `export\<login>_<heure>.txt` : `delsdp OK` ou `##<code>`. **Si SDPINFO n'existe pas pour (client,dossier), la réponse est quand même `delsdp OK`** (aucun `ERROR_NOTEXIST`).

### 3.10 `sdpstat` — export des statistiques d'une salle (p. 131, l. 1032-1037 ; `bCreatFicStat` p. 3829 ; `bCreationFichierStat` p. 3830-3833 ; `bCreationFichierStat2` p. 3833-3842)

`Param` chiffré B avec clé fixe (`bPassCrypt=Faux`) → `sInfo = AAAAMMJJ HHMMSS <référence>[#]` (date 8 + heure 6 + référence à partir de la position 15 ; `#` final = demander le dictionnaire des plans → version 2). Si `date <> DateSys()` → refus (`RENVOYER Faux`, **sans fichier `.res`**).
Sorties dans `export\` : `<sInfo>.txt` (+ `<sInfo>.dic` en v2), compressés dans `<sInfo>.zip` (`zipCrée`/`zipAjouteFichier(zipAucun)` : archive **sans compression**), `.txt`/`.dic` supprimés ensuite, puis **témoin `<sInfo>.res`** contenant `1` ou `0`.
Format `.txt` : en-tête `bGlobRemplitEntete` (p. 3859-3861) :
```
dossier: <dossier>
Desc: <description avec <RC> et <!>>
Ref: <référence>
DateLimite: <AAAAMMJJ>
```
puis v1 : une ligne par SDPSTAT (tri CLE_SDPTRI) `typeOp|timestamp|adresseIP` + suffixes selon le type (`|cleDoss|nomFic|taille` pour 1 ; `|cleDoss|cleDef|langC` pour 10 ; `|cleDoss|reponse` pour 9/19/11) ; types 4, 6, 8, 13 omis.
v2 (dico) : reconstruit `CACHEOPER`/`CACHEDICO` dans la salle (purge, `bCreateDicoFic2`, remise à zéro des flags FL_OPER/FL_DICO de tous les SDPSTAT), puis `NbrLig: <n>` et une ligne par CACHEOPER (tri CLE_TRIOPER = nom majuscule, ITCleUnik, type, ident) : `typeOp|ts|ip|itCleUnik|ident|nomCie` (1, 19, 20), `|itCleUnik|cleDef|langC|nomCie` (10), `|itCleUnik|reponse|nomCie` (11), `|0|ident|` (15-18) ; `.dic` : `NbrLig: <n>` puis `ident|nbrUse|nomPlan|size8`. Nettoie aussi les `OP_DELAUTO` antérieurs au 2015-03-18. `Multitâche()` périodique. Lourd en E/S HFSQL.

### 3.11 `sdpintv` — import de la liste des intervenants (p. 133, l. 1092-1097 ; `RecupInfoInterven` p. 3984-3986)

`Param` = `<référence>-<timestamp>` (non chiffré) ; `project` = non utilisé (seulement testé non vide si `Param` vide). Cherche `isExistUnik(ref)` → client → `<racine>\ImportInterven\<timestamp>Interv.wdz` ; `zipOuvre`/`zipExtraitFichier(1)` dans `ImportInterven` → `goInterven:bAlimBase(<salle>, <timestamp>Interv.txt)` (p. 3593-3595) : lignes TAB `ITCleUnik, nomCie, courriel, tel, langC, codePostal, nomResp, reponse, timestampReponse` → INTERVEN de la salle (création ou mise à jour ; la réponse n'est écrasée que si le timestamp EG est plus récent, flag FL_EG) ; `.txt` et `.wdz` supprimés. **Aucun fichier réponse.** Bloc de nettoyage des vieux `.wdz` désactivé (`SI Faux`).

### 3.12 `bid` — synchronisation des réponses aux invitations (p. 133, l. 1098-1103 ; `RecupReponseInvitation` p. 3987-3988 ; `CInterven::bGetReponse` p. 3595-3596)

`Param` = `<référence>-<timestamp>`. Lit `<racine>\ImportInterven\<timestamp>Ret.wdz` → extrait → `<timestamp>Ret.txt` (lignes TAB `ITCleUnik, reponse(1/2/3), timestamp`) → met à jour INTERVEN (si plus récent, FL_EG) → écrit **`export\<timestamp>Ret.res`** : une ligne TAB `cleInterv TAB reponse TAB timestampReponse` par intervenant ayant répondu **via le web** (réponse<>0 et PAS FL_EG), puis une ligne de 4 espaces (« pour que le fichier ne soit pas vide ») ; puis témoin **`.fin`** contenant `1`/`0`. Emplacement du `.fin` : `sNomFic` est modifié dans `bGetReponse` (paramètre passé par référence en WLangage) → `export\<timestamp>Ret.fin` (**non vérifié** : si passage par valeur, ce serait `ImportInterven\<timestamp>Ret.fin`). Le `.wdz` est supprimé.

### 3.13 `answer` (p. 132, l. 1076-1080 ; `ReponseIntervenant` p. 4002)

`ReponseIntervenant(AAParam)` = **un `TraceLog` seulement**. Aucun traitement. (La réponse réelle d'un sous-traitant passe par `numsdp&ans=`.)

### 3.14 `numsdp` — ouverture d'une salle par un humain (p. 132-133, l. 1081-1091 ; prétraitement §1.2 point 7)

| Paramètre | Chiffrement | Rôle |
|---|---|---|
| `Param` | — | référence de la salle (10 car.) |
| `ans` | C | si présent : `reponse|cleDef|cleDoss|langC|affOuiNon` → `PAGE_NUMSDP2(Param, ans, Faux, bReponsePDF=Vrai)` (réponse depuis le PDF/courriel d'invitation) |
| `cpl` | C | sinon : `cleDef|cleDoss|langC|affOuiNon` → `PAGE_NUMSDP2(Param, cpl, Val(visu)<>0, Faux)` |
| `visu` | — | `<>0` = visualisation par le créateur (stat `OP_VISU` au lieu de `OP_NUMSDP`) |

Réponse = **HTML** de `PAGE_NUMSDP2` dont l'initialisation déclenche `BTN_ENTER` (p. 2143-2146) : si la référence existe et la salle n'est pas supprimée → stats `OP_NUMSDP`/`OP_VISU` (avec `cleDoss`, `cleDef`, `langC`) → `bConstructionPage(Faux, ref, SDP_PASS, SDP_REQ, "", modifTS, Faux, langue, cleDoss, visu, reponse, affOuiNon, 1)` → **PAGE_PROJET** (ou PAGE_DEPASSE si date limite dépassée) ; salle supprimée → **PAGE_SDPDELETED** ; référence inconnue → compteur INTRUSION (§1.3), **TermineProg** si >1 ; client introuvable → TermineProg. `index.html` des mini-sites redirige `?param=<ref>` vers `type=numsdp&param=…` (`bCreatIndexHTML` p. 3131). Aussi appelé depuis `www.salledeplans.ca` (lien).

### 3.15 `envoitirage` (p. 131, l. 1022-1026 ; `EnvoiTirage` p. 3901-3906)

Sans paramètre. Campagne « 20 ans » (2020-2021) : lit tous les AAClient abonnés non école/non webmaster (exclusion de logins de test par `isClientAutorise`), calcule des coupons à partir de `mMontantRenouvellement` et de dates fixes 2020-10-18…2021-03-18, écrit `<rep AAClient>\ListeEnvoi.csv` (`NomCie;Courriel;NbCoupon;NbTotal`), lit le gabarit **`c:\temp\InfoLettre.htm`**, réécrit `[TIRAGE]` dans `gsFicINI` (Sujet, ModeTest, Destinataire, Port, SMTP office365, Expediteur, Pass chiffré par `Crypte` PC SOFT avec une clé littérale p. 3904 — ne pas recopier), configure `CEmail`… **mais la boucle d'envoi ne contient aucun appel `bEnvoyerMail*`** (seulement construction du message et `Multitâche(6000)` par client → très lent). Code mort/inachevé ; dépendances Windows : `c:\temp`, `EmailLitTimeOut` (interdite Linux), DllUtils SMTP. À **ne pas migrer**.

### 3.16 `newexcept` — réception d'exceptions/logs/projets (p. 138, l. 1398-1404 ; `ReceptionException` p. 3967-3971)

| Paramètre | Rôle |
|---|---|
| `Param` | nom du zip de logs déjà **déposé dans `export\`** (ex. `E135019227035_2020061901223686.zip` ; 1re lettre `P`=e-Plans, `E`=Estimateur) |
| `project` | optionnel : zip du projet/dossier (ex. `F135019227035_903541_1_2020061901223686.zip` ; n° de projet = entre le 1er et le dernier `_`) |

Déplace `export\<project>` et `export\<Param>` vers **`LECATALOGUE_WEB\Exceptions\`** (créé si besoin ; `sRemoveLastSubRep(export)+"Exceptions"`) ; détecte `Defauts.zip` dans le zip projet ; extrait `Exception.txt` (sinon `ComputerInfo.txt`) du zip de logs, lit la ligne `Machine: xxx/login` pour retrouver le client (`isExistLogin`) et ajoute téléphone/courriels de la fiche ; sujet « Reception exception e-Plans / l'Estimateur Général », « Reception logs … », « Reception projet N … », « + et défauts » ; corps = `Lien vers les logs` + `www.lecatalogue.ca/lecatalogue_web/Exceptions/<Param>` + lien projet + contenu du txt ; pièce jointe = le txt extrait ; **envoi SMTP** via `CEmail:bEnvoyerMail2(goDllUtils,…)` (DllUtils/CSmtp, `m_bCodHex=Vrai`) à chaque adresse de `[CORRESP] CourrielDstExcept` (gsFicINI), expéditeur `[SMTP] Sender`. Puis `SupprimeAncienFichiers(export)`. Pas de `FermeTout()`. Réponse TermineProg. Comment le zip arrive dans `export\` : **non vérifié**.

### 3.17 `chilkat` (p. 135, l. 1197-1201 ; `SauveChilKat` p. 4004)

`Param` = clé de licence Chilkat encodée E. Décode pour la **tracer en clair dans `AATrace.log`** (!) et écrit `[CHILKAT] CLE_CHILKAT=<Param brut>` dans `gsFicINI`. Cette valeur est renvoyée telle quelle aux logiciels par `bCreationResultat` (`Chilkat=`) dans les réponses `wwwlog`/`recinf`. Réponse TermineProg.

### 3.18 `testcharge` (p. 135, l. 1202-1205 ; `RecupFichierTest` p. 3982-3983)

`Param` = nom distant. Supprime puis crée `export\<Param>.txt` : ligne 1 = nombre de processus, puis la liste des processus (`nEnumProcess` p. 3962 : `AppelDLL32` **psapi/kernel32 `EnumProcesses`, `OpenProcess`…**) et les statistiques mémoire (`bGetMemoryInfo` : `kernel32 GlobalMemoryStatusEx`) ; puis témoin `export\<Param>.fin` contenant `fin`. Pas de `FermeTout()`. Outil de diagnostic serveur **100 % Windows**.

### 3.19 `getdt` (p. 131, l. 1038-1042)

Ne fait rien : `FermeTout()` + TermineProg. Le client obtient la date/heure du serveur autrement (**non vérifié** : en-tête HTTP `Date` probable).

### 3.20 `addrip` (p. 131, l. 1012-1015 ; PAGE_ADDRIP p. 2246-2248)

`PageAffiche(PAGE_ADDRIP)` sans `FermeTout`. L'init calcule `NavigateurAdresseIP(Faux)` et `(Vrai)` mais la page n'a **aucun champ** dans le DT ni dans `FR/Page_AddrIP.htm` : réponse = page ActivXP vide. Usage client **non vérifié** (le logiciel voit peut-être son IP via les logs seulement).

### 3.21 `AUTRES CAS` — commande inconnue (p. 140, l. 1424-1452)

Si `AAType<>""` : trace `Commande inconnue >type< AALogin >…< UserC >…< >param1< … >param10<` (`PageParamètre(i)` positionnel) ; `isIntrus(gsAddrIp, AAType)` → si l'IP est déjà fichée avec >3 connexions : `LogGeneric(gsLogIntrus,…)`, **PAGE_REFUS** + `FinProgramme()` ; sinon TermineProg. Si `AAType=""` : appel normal du site web (ouverture de goMulticat, goCatalog, goClient, goNoteCatCli, goClientCat, goHistorique, goTrades, goAAClient) et poursuite vers la page d'accueil.

### 3.22 `AALoginHex`

Voir 3.1 : seul `creatsdp` le lit. Encodage hexadécimal majuscule/minuscule indifférent (`HexaVersEntier`), deux caractères par octet ; permet de passer des mots de passe contenant des caractères interdits en URL.

### 3.23 `AADownLoad` (l. 988-990 ; `PATH_DOWNLOAD` l. 657)

`SI AADownLoad<>"" ALORS PageAffiche(AADownLoad)` : **affiche la page WebDev dont le nom est passé en paramètre** (ex. `Consult`, `proprio`, `ContactEPlans`, valeurs de test l. 775-790), avant le `SELON`. `PATH_DOWNLOAD` (INI `[ADDRSERVER]`) = `/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue?AADownload`, utilisé pour construire les liens « page download ». Risque : tout nom de page du projet est affichable ; comportement si le nom n'existe pas : **non vérifié** (erreur WebDev probable). Hors SDP, listé ici parce qu'il précède le dispatch.

### 3.24 Autres `Type=` du même `SELON` (hors périmètre, pour mémoire)

`conference|commestim|contestim` (TraiteConference), `version` (TraiteVersion*), `reqrbq`, `unsubscribe` (PAGE_UNSUBSCRIBE), `eplanmaj`/`estimmaj` (contrôle de licence e-Plans/EG), `delmono`, `wwwlog`/`wwwcom` (`RecupWWWCommon` → `bCreationResultat` : fichier `export\…` clé=valeur `DateFin=`, `NbrLic=`, `AuthSDP=`, `SDPMaxSize=`, `Chilkat=`, `Common=`…), `rbqcie`, `rbq|rbx` (`listprocess`, `killrecup`, `rbq_histo`, `bRequeteRBQ`), `import`, `export|export14`, `liste|liste14`, `majversion`, `recinf`. À inventorier dans les annexes catalogue/licences/RBQ. Le `sdpflrep` est commenté (mort).

---

## 4. Cycle de vie d'une salle de plans

| Étape | Mécanisme | Référence |
|---|---|---|
| **Pré-création** | EG appelle `sdpmaj` → `RecupDirectorySDP(bMAJ=Vrai)` crée SDPINFO (référence générée, `SDP_DATELIMITE = demain`, stat OP_DIRSDP) et le répertoire ; renvoie référence, tailles max et autorisation. Puis EG téléverse les plans (**non vérifié**) et dépose `<repcie>\<x>.sdp`. | p. 3976-3979 |
| **Création / mise à jour** | `creatsdp` → `bConstructionPage(bSauve=Vrai)` → `bSauveInfoSalle` : DateLimite réelle (champ 5 de `sProjet`), SDPDESC (passe + requête chiffrées), DescProj.txt, stats fichiers. Référence stable (ne change pas à la mise à jour). | p. 3823-3825, 3873-3877 |
| **Consultation** | `numsdp` (humain, lien PDF/courriel/site public) → PAGE_NUMSDP2 → PAGE_PROJET ; téléchargements via `FichierAffiche` (stat OP_DOWNLOADFIC + SDPFIC) ; réponse Oui/Non/Peut-être du sous-traitant (INTERVEN, stat OP_REPONSE, captcha). e-Plans : `sdpdownload` pour les stats. | p. 2142-2146, 1945-1964 |
| **Synchro intervenants** | `sdpintv` (EG → serveur) et `bid` (serveur → EG : `.res`) via `ImportInterven\*.wdz`. | §3.11-3.12 |
| **Suivi** | `sdplist` (contenu), `sdpcli/acli/scli` (liste), `sdpstat` (statistiques zip). PAGE_PROJET recalcule `SDP_SIZE` d'après le disque et supprime les fichiers non référencés si la salle n'a pas été modifiée depuis 2 jours (`FoncSupprime`, p. 1963-1964). | |
| **Suppression manuelle** | `sdpdel` → `SupprimeUneSalle(bForce=Vrai)` : marquée supprimée + fichiers effacés immédiatement (sauf fichiers HFSQL/log/DescProj). | p. 3896-3897, 4056-4057 |
| **Expiration automatique** | `SupprimeAncienneSalle()` (p. 4051-4052), appelée par creatsdp, sdplog/sdpmaj, sdplist, sdpacli : **seulement si `Gauche(HeureSys(),2)>"20"`** (21 h et plus), sous verrou fichier `bd\LECATALOGUE\oper.lock` (`bBloqueOper`, ouverture bloquante ; `DebloqueOper` ferme). Parcours ClE_DELTIME : salles non supprimées avec `SDP_DATELIMITE < aujourd'hui` → `SupprimeUneSalle(bAuto=Vrai)` : `SetDeleted(Vrai)` (DATE_DELETE), `SDP_SIZE=0`, stat `OP_DELAUTO` (IP `0.0.0.0`) ; fichiers conservés **7 jours** puis effacés (`isTimeToDelFic`, p. 3517-3518 : `DATE_DELETE < aujourd'hui-7`) ; 2e parcours ClE_DELFIC pour les salles supprimées dont les fichiers restent. L'enregistrement SDPINFO est **conservé** (historique, dates de création). | |
| **Résurrection** | `sdplog/sdpmaj` sur une salle supprimée : `SetDeleted(Faux)` ; `bSauveInfoSalle` sur une salle existante : `SetDeleted(Faux)` + nouvelle DateLimite. | |
| **SDP_MAXTIME** | constante 60 jours (p. 115) copiée dans `AAClient.SDP_MAXTIME` si 0 et renvoyée dans `sdplog` ; commentaire de la fiche client (l. 99455) : « Pas utilisé. La date de fin est décidée dans l'Estimateur Général ». | |
| **SDP_MAXSIZE / tarifs** | 500 Mo par défaut (`AAClient.SDP_MAXSIZE`, forcé si <500 dans la fiche client, SDP autorisé d'office pour la version Or). Grille `[LISTEPRIX] SDP_TARIFS` = `taille/prix|…` défaut `500/0|1000/50|1500/100|2000/150|4000/200|8000/300|12000/400|16000/500` (`GlobInitPrixAchat` p. 3921) ; `InitTarifs` (page admin, p. 1585-1586) ajoute **+500 Mo** aux paliers <4000 et **+1000 Mo** aux autres (note 2024-02-06) ; `SDP_MAJORATION` (100 $) si version ≠ Or/Or essai/Invité (`mGetSDPRenouvellement` p. 3949) ; `nGetSDPIndTarif` choisit le premier palier ≥ taille max. `SDP_CURSIZE` = somme des salles actives (`SommeSalles`, PAGE_PROJET). | |

Classes impliquées : `CSDPInfo` (p. 3514-3528 : `isExistInfo` CLE_CLIDOSS, `isExistUnik` NUM_SALLE, `sSDPGener`, `SetDeleted`, `isTimeToDelFic`, `SetDefValues` = RAZ + timestamps), `CSDPDesc` (p. 3530-3532 : `bGetDesc`/`bSetDesc`), `CSDPStat` (p. 3536-3539 : `bAjoutStat`, `bSetAlias` ouvre aussi SDPFIC, `bSupprime` en cascade), `CSDPFic` (p. 3586 : `bAjoutFichier`), `CInterven` (p. 3593-3597 : `bAlimBase`, `bGetReponse`, REP_* 0-3, FL_EG), `CIntrusion`/`CSdpIntrus`/`CIPAddress` (p. 3782-3793), `CEstimeHF`/`CBasicHF` (alias, `CreationSiInexistant`, réindexation auto sur erreur 131113), `CFichier` (p. 3552), `CDllUtils` (p. 3468-3489 : `dwNewCryptage`, `nDecrypteChaine`, `nEnumProcess`, SMTP), `CRC32` (p. 3511-3512), `CZoneMem` (listes triées en mémoire), `CEmail`.

---

## 5. Pages web liées

| Page | Paramètres (procédure de déclaration) | Rôle | DT |
|---|---|---|---|
| `TermineProg` | aucun | `FermeTout()` + `FinProgramme(Vrai)` ; HTML vide avec `top.close()`. Réponse standard des commandes. | p. 685-687 |
| `PAGE_REFUS` | aucun | « Connexion refusée » ; `NavigateurFerme()` au chargement ; HTML avec Google Analytics + pixel Facebook (`FR/PAGE_REFUS.htm`). | p. 2908-2914 |
| `PAGE_ADDRIP` | aucun | calcule les deux `NavigateurAdresseIP` ; aucun champ. | p. 2246-2248 |
| `PAGE_NUMSDP2` | `(sReference, sCompl, gbVisu, bReponsePDF)` | saisie/entrée d'un n° de salle (`SAI_NUMSDP`, `BTN_ENTER`, `BTN_EXEMPLE` avec une référence de démo codée en dur, `LNK_LANGUE` FR/EN, `LNK_DECONNECTE` → PAGE_DECONNECT) ; déchiffre `sCompl` (C) ; gestion intrusion ; → PAGE_PROJET / PAGE_SDPDELETED / TermineProg. Contient aussi `bTraiteCourriel`/`Desabonne` (désabonnement, hors sujet). Version active. | p. 2142-2176 |
| `PAGE_NUMSDPX` | idem | ancienne version : messages `Info(MessTraduit(2000/2001))` au lieu de PAGE_SDPDELETED, `nNumAppel=3`. Non appelée par le dispatch (**à confirmer** : aucun `PageAffiche(PAGE_NUMSDPX)` trouvé). | p. 2035-2039 |
| `PAGE_PROJET` | `(sTimeLastEnvoiSDP, sEntreprise, sProjet, sListeFichier, gnLangue, sReference, gnCleDoss, gbVisu, gnReponse, bCaptcha, cSep=TAB)` | « Liste des plans » : fiche entreprise/projet, logo (redimensionné via `InfoBitmap` + `fRepEnCours`), zone répétée des fichiers par sous-titre avec taille/date réelles ou « Non Disponible », cases à cocher + lien « Transfert » (timer navigateur 130 ms déclenchant `LNK_NOMFIC1` ligne par ligne → `DownLoadFile` → `FichierAffiche(fichier, MIME, nom)` + stat OP_DOWNLOADFIC), cellule réponse Oui/Non/Peut-être + captcha (`CaptchaAffiche/CaptchaVérifie`) → INTERVEN + OP_REPONSE, enregistrement du `Common` du poste (`nAjoutRepCommon`), recalcul des tailles, suppression des fichiers non référencés (>2 jours), `LogIP`. Liens e-plans.ca, « Autre salle de plans » → PAGE_NUMSDP2. | p. 1945-1970 |
| `PAGE_DEPASSE` | aucun | « Date limite dépassée » ; synchronisation = `FinProgramme()` ; lien vers PAGE_NUMSDP2. | p. 2049-2059 |
| `PAGE_SDPDELETED` | `(gsNumSDP, gsNumProjet, sCompl, gbVisu, bReponsePDF, gnIdClient, nTypErr 1=supprimée/2=introuvable, gsRepCie)` | messages FR/EN « La salle de plans virtuelle ~ a été supprimée » / « La référence ~ n'a pas été trouvée », coordonnées du client (`GetInfoSalle` déchiffre SDPDESC pour extraire `User=`, `Mail=`, `Tel=`, sinon fiche AAClient) ; permet de ressaisir un numéro (même logique que NUMSDP2, `nNumAppel=4`). | p. 2326-2335 |
| `PAGE_LISTSDP` | aucun | admin : liste de toutes les SDPINFO (client, dossier, réf., dates, supprimée, taille Ko, date limite), total et moyenne en Mo. Appelée depuis une page admin (l. 40480). | p. 2094-2096 |
| `PAGE_STATSDP` | `(gsCrypteUser)` | statistiques d'une salle en page web ; init **commentée** (`bRemplitStat`), page probablement inactive. | p. 2120-2122 |
| `PAGE_DECONNECT` | aucun | « Déconnexion » ; `FinProgramme()`. | p. 2047-2048 |
| `WebDevOuiNon` | — | page interne WebDev (boîte Oui/Non JavaScript, `FR/WebDevOuiNon.htm`) utilisée par `OuiNon()` ; aucun code imprimé dans le DT (TOC p. 635 renvoie à une autre page) — **non vérifié** si utilisée par les pages SDP (`bAffOuiNon` est transmis mais jamais exploité dans `bConstructionPage`). | TOC l. 154, 1593 |

Titres : PAGE_NUMSDP2/NUMSDPX/SDPDELETED/STATSDP « Numéro salle de plans », PAGE_PROJET « Liste des plans », PAGE_LISTSDP « Liste des salles de plans ».

---

## 6. Dépendances Windows / éléments non portables (synthèse)

| Élément | Où | Impact migration |
|---|---|---|
| `AppelDLL32("DllUtils.Dll", "CR_dwNewCryptage" / "CR_nDecrypteChaine" / "CR_DeleteCryptage")` | tous les déchiffrements A et B | réimplémenter `CCryptage2` (sources C++ disponibles dans `~/Projects/WinDev/DllUtils`) |
| `Crypte/Décrypte(…, compresseChaîneCourte, encodePCS)` | numsdp (`cpl`, `ans`), unsubscribe | algorithme PC SOFT fermé : bloquant |
| `AppelDLL32("kernel32","GlobalMemoryStatusEx")`, psapi `EnumProcesses`, `OpenProcess` | testcharge | abandonner |
| `AppelDLL32("DllUtils", "nEnumProcess")`, `KillProcess` | testcharge, rbx | abandonner |
| DllUtils SMTP (`bEnvoyerMail2`, libtls/libssl/libcrypto), `EmailLitTimeOut` (« interdite en Linux », p. 142) | newexcept, envoitirage | remplacer par un client SMTP Node |
| `DllNotify.dll` (`bDecrypte`, `bCrypte`, `bAllocBuf`, notifications de répertoires) | `CCryptFic` (export/import catalogue), pas SDP | hors périmètre |
| Chemins : `c:\WebSite\Traces`, `c:\temp\InfoLettre.htm`, `d:\SalleDePlans` (défaut INI), `h:\…` (mode test), `c:\WebSite\estimation.qc.ca\…` (`REP_REQRBQ`, `CLE_VERSION`), UNC `\\<serveur-local>\…` dans les propriétés des pages | partout | paramétrer |
| HFSQL Classic **par répertoire de salle** (SDPDESC/SDPSTAT/SDPFIC/INTERVEN/CACHE*) + `HAlias`/`HChangeNom`/`HCréationSiInexistant`/réindexation 131113 | toutes les commandes SDP | remplacer par des tables PostgreSQL avec colonne `idsdpinfo` ; migrer les fichiers de chaque salle |
| Fichiers de verrou (`oper.lock`, `*.lock` des logs) via `fOuvre(foBloqueEcriture+foBloqueLecture)` | SupprimeAncienneSalle, traces | verrous applicatifs |
| `INIEcrit` à chaque requête, `.ini` ANSI | init projet | config statique |
| `zipOuvre/zipExtraitFichier/zipCrée` (WLangage, format zip standard) | sdpstat, sdpintv, bid, newexcept | zip Node |
| `fListeFichier(… "callback" …)`, `fRepEnCours`, `InfoBitmap` | suppression de salle, PAGE_PROJET | fs/sharp |
| `FichierAffiche(fichier, MIME, nom)` | téléchargement des plans | réponse HTTP avec `Content-Disposition` |
| `NavigateurAdresseIP(Vrai/Faux)` | IP (proxy ou directe) | `X-Forwarded-For` |
| `Multitâche()` (pauses bloquantes) | sdpstat, envoitirage | supprimer |
| Horaire « après 20 h » pour les purges | SupprimeAncienneSalle, export | tâche planifiée |

---

## 7. Points non vérifiés / incertitudes

1. **Mode de dépôt des fichiers côté serveur** (plans de la salle, `*.sdp`, `ImportInterven\*.wdz`, zips `newexcept` dans `export\`) : aucun code d'upload dans le site ; FTP supposé. À confirmer avec l'auteur et la config du serveur.
2. **URL exacte de récupération des fichiers réponse** : `http://www.lecatalogue.ca/LECATALOGUE_WEB/export/<nom>` déduite de `m_sRepDisk=fRepWeb()` et du lien `lecatalogue_web/Exceptions/`. Le listage du répertoire `LECATALOGUE_WEB/export` n'a pas pu être fait (accès refusé). À vérifier dans le code des logiciels clients.
3. **Représentation exacte des booléens et entiers** dans les fichiers réponse (`"1"/"0"` supposés d'après la conversion WLangage) et **encodage** (ANSI Windows-1252, sans BOM, CRLF) : à confirmer sur un fichier réel produit par le serveur.
4. **Sensibilité à la casse de `PageParamètre`** (les clients envoient `user=`, le code lit `"User"`) : supposée insensible.
5. **Emplacement du témoin `.fin` de `bid`** : `export\` si WLangage passe `sNomFic` par référence (comportement par défaut), sinon `ImportInterven\`.
6. **Déchiffrement C (PC SOFT `compresseChaîneCourte`/`encodePCS`)** : non reproductible sans documentation ; nécessite soit la modification des logiciels clients, soit une bibliothèque d'interopérabilité.
7. **Algorithme CCryptage2** : décrit d'après `bDecryptage` ; `dwGetMod` et `bEchange` non lus en détail (pour éviter de recopier des constantes) — à porter directement depuis le `.cpp`.
8. **`sdplog` ressuscitant une salle** : `SetDeleted(Faux)` sans `bModifie` systématique ; l'effet réel sur l'enregistrement dépend d'écritures ultérieures (`CEstimeHF` pourrait écrire à la fermeture). Non tracé.
9. **Usage réel de `getdt` et `addrip`** par les clients, et de `sdpcli` (« plus utilisé ? »), `answer` (vide), `envoitirage` (sans envoi) : à confirmer, probablement à abandonner.
10. **PAGE_NUMSDPX** et **PAGE_STATSDP** : aucun appel trouvé ; considérées mortes.
11. **Flag `IPADDRESS.EXCLURE`** : écrit mais jamais lu dans le code consulté.
12. **Sections/clés exactes de `lecatalogue.ini`** : la lecture des fichiers INI a été refusée ; les noms de clés proviennent du code (`SECTION_*`/`CLE_*`, p. 114-116, et littéraux `"REPERTOIRE"`, `"CORRESP"`, `"ADDRSERVER"`, `"TIRAGE"`, `"CHILKAT"`).
13. **`gbSDPAlternate`/`gsSDPRepAlternate`** : forcés à Faux/`d:\SalleDePlans`, aucune utilisation trouvée dans les procédures lues ; grep complet non fait.
14. **Taille des champs** : `AAClient.Mot_de_Passe` fait 10 caractères (et non 15 comme `Client.Password`) et est comparé en clair — à vérifier si la fiche admin le chiffre (`CAAClient` ne contient pas `isPassCrypte`).
