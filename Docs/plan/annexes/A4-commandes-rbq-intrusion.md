# A4 — Commandes RBQ (recherche d'entrepreneurs) et sous-système anti-intrusion / adresses IP

Inventaire de l'existant WebDev 18 en vue de la réécriture Next.js/Node/PostgreSQL. Toutes les références
« p. N » renvoient aux marqueurs `--- page N ---` de `Docs/dossier-technique.txt` ; « l. N » = numéro de ligne
du même fichier. Les valeurs sensibles (IP réelles, identifiants de postes, noms d'entreprises des commentaires de
test, clés de chiffrement) ne sont pas recopiées ; elles sont désignées par leur emplacement.

---

## 0. Vue d'ensemble

Le site reçoit des appels HTTP de l'**Estimateur Général** (EG, logiciel Windows WinDev) sous la forme
`/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue?Type=<cmd>&ParamRBQ=...&Numrbq=...&User=...`.
Le code d'initialisation du projet (p. 118-141, l. 500-1480) lit les paramètres par `PageParamètre(...)`
(p. 123-124, l. 726-752), applique un contrôle d'intrusion par adresse IP (p. 129-130, l. 953-981), puis
dispatche par `SELON Minuscule(AAType)` (p. 131 et suivantes, à partir de l. 1021).

Quatre commandes touchent le RBQ :

| `Type=` | Paramètres lus | Procédure appelée | Réponse HTTP |
|---|---|---|---|
| `reqrbq` | `Numrbq` | `ConstruitReqRBQ(AANumRBQ)` (p. 3877-3878) | page `TermineProg` |
| `rbqcie` | `User` (chiffré) | `RecupRequeteCie(repExport, AAUserC)` (p. 3989-3991) | `FermeTout()` + `TermineProg` |
| `rbq` | `ParamRBQ` | `isAutoriseWWW(AAParamRBQ)` **puis** même logique que `rbx` (p. 136, l. 1223-1260) | `TermineProg` (ou page `RBQ_HISTO`) |
| `rbx` | `ParamRBQ` | sous-commandes `listprocess`, `killrecup`, `rbq_histo`, sinon `bRequeteRBQ(AAParamRBQ, repExport)` | `TermineProg` (ou page `RBQ_HISTO`) |

Point structurant : **la réponse HTTP ne porte jamais le résultat**. Le résultat de la recherche est produit
par un **exécutable Windows externe** (`RecupEntrep.exe`, lancé en non bloquant par `LanceAppli`) qui écrit des
fichiers `Entrep_<id>.res` et `Entrep_<id>.fin` dans le répertoire `LECATALOGUE_WEB/export/`, servi
statiquement. L'EG va ensuite chercher ces fichiers (détails § 4).

---

## 1. Lecture des paramètres et pré-contrôle d'intrusion (code projet)

### 1.1 Variables de page (p. 123-124, l. 726-752)

| Variable WLangage | `PageParamètre(...)` | Usage RBQ/intrusion |
|---|---|---|
| `AAType` | `"Type"` | commande |
| `AAParamRBQ` | `"ParamRBQ"` | chaîne de paramètres rbq/rbx |
| `AANumRBQ` | `"Numrbq"` | numéro de licence RBQ pour `reqrbq` |
| `AAUserC` | `"User"` | login/mot de passe chiffrés (rbqcie, wwwlog…) |
| `AAParam` | `"Param"` | numéro de salle de plans pour `numsdp` (sert au comptage d'intrusion) |
| `AADownLoad` | `"AADownLoad"` | si non vide, `PageAffiche(AADownLoad)` directement (l. 984) |

Le dispatch utilise `Minuscule(AAType)` : la commande est **insensible à la casse** (`RBX`, `rbx`, `Rbx`
équivalents). Les tests `AAParamRBQ~="listprocess"` utilisent l'opérateur `~=` (égalité souple WLangage :
insensible à la casse, aux espaces de bordure et aux accents) — les sous-commandes aussi sont donc insensibles à
la casse.

### 1.2 Contrôle d'intrusion AVANT le dispatch (p. 129-130, l. 953-981)

```
gsAddrIp = NavigateurAdresseIP(Vrai)        // IP du client (Vrai = tient compte des proxys, X-Forwarded-For)
SI AAType="numsdp" ALORS
    SI AAParam="" ALORS                       // salle de plans vide
        LogSDPVide(...)                       // AALogSDPVide.log
        SI isIntrus(gsAddrIp,"") ALORS goIPAddress:bAddAddress(gsAddrIp,Vrai)   // marquer EXCLURE
        FermeTout(); PageAffiche(PAGE_REFUS); FinProgramme(); RETOUR
    FIN
    SI isIntrus(gsAddrIp,AAParam) ALORS       // IP déjà fichée INTRUSION et >3 connexions
        LogGeneric(gsLogIntrus,"Blocage adresse IP ...")       // AALogIntrus.log
        goIPAddress:bAddAddress(gsAddrIp,Vrai)                 // EXCLURE=Vrai
        FermeTout(); PageAffiche(PAGE_REFUS); FinProgramme(); RETOUR
    FIN
    goIPAddress:bAddAddress(gsAddrIp,Faux)
SINON
    SI AAType<>"wwwlog" _ET_ AAType<>"rbx" ALORS TraceLog(gsAddrIp+" AAType >"+AAType+"<")   // AATrace.log
    goIPAddress:bAddAddress(gsAddrIp,Faux)   // toute IP est journalisée dans IPADDRESS, EXCLURE=Faux
FIN
```

Observations :
- **Toutes** les requêtes (y compris `rbq`/`rbx`) écrivent ou mettent à jour une ligne `IPADDRESS` (IP, horodatage).
  `rbx` et `wwwlog` sont exclus du `TraceLog` seulement pour ne pas inonder `AATrace.log`.
- Le blocage effectif (`PAGE_REFUS`) n'est appliqué qu'à `numsdp` et aux **commandes inconnues** (cas `AUTRES CAS`,
  p. 140, l. 1430-1447) ; une IP fichée comme intruse peut quand même exécuter `rbx`.
- `isIntrus` ne crée jamais d'enregistrement `INTRUSION` : il ne fait qu'incrémenter une IP **déjà** fichée. Les
  fiches INTRUSION sont créées par la page publique `PAGE_NUMSDP2` (voir § 7.3).

---

## 2. Grammaire du paramètre `ParamRBQ`

Source : analyse de `bRequeteRBQ` (p. 3869-3871, l. 134628-134680), `isAutoriseWWW` (p. 3928-3929) et les
exemples en commentaire du code projet (p. 126-127, l. 806-850 ; valeurs masquées ici).

### 2.1 Forme générale

```
ParamRBQ = <souscommande> [ ";" <clé> "=" <valeur> ]*   [";"]
```

- Séparateur d'éléments : `;` (`ExtraitChaîne(sParamRBQ,n,";")`, boucle jusqu'à `EOT`).
- Séparateur clé/valeur : `=` ; la clé est `Majuscule(ExtraitChaîne(sInfo,1,"="))`, la valeur
  `ExtraitChaîne(sInfo,2,"=")`. Un élément **sans `=`** est traité comme un drapeau (`/MOTCLE`).
- Casse : clés et sous-commande insensibles à la casse (mises en majuscules ; comparaisons `~=`).
  Un exemple en commentaire est entièrement en majuscules (`VERIFNUM;ID=...;NUM=...`).
- Les valeurs ne sont **pas** décodées (pas d'URL-decode explicite au-delà de ce que fait le moteur AWP) ; les
  espaces sont conservés (`nomentrep=Les Constructions ... Inc.`, `versiones=gold 14.02T`).
- Dans la valeur de `nom`, les mots de recherche sont séparés par des **virgules** (`nom=mot1,mot2,mot3`) ; cette
  valeur est passée telle quelle à l'exécutable.
- Un exemple ancien montre `interv,id=...;region=15,categ=1,22` (virgule au lieu de `;` après la sous-commande
  et dans `categ`) : la virgule n'est pas un séparateur pour le site ; cet exemple est probablement obsolète
  (non vérifié).
- **Suffixe `##`** : dans un exemple commenté (l. 835), la valeur `addrip` est suivie de `##<chaîne base64-like>####...`.
  Le code gère ce cas : `sAddrIP=ExtraitChaîne(sVal,1,"#")` et journalise `"RequeteRBQ Correction @IP"` si une
  troncature a eu lieu (l. 134662-134667). Il s'agit d'un **défaut d'encodage côté EG** (concaténation parasite d'une
  chaîne chiffrée au paramètre) toléré par le serveur, pas d'une grammaire voulue. À reproduire : tronquer `addrip`
  au premier `#`.

### 2.2 Sous-commandes (premier élément)

| Sous-commande | Traitement côté site | Transmise à RecupEntrep.exe ? |
|---|---|---|
| `listprocess` | `KillProcess(Faux)` (énumère seulement), `LogRBQ("TermineProg (13)")`, `TermineProg` | non |
| `killrecup` | `KillProcess()` = `KillProcess(Vrai)` (tue `RecupEntrep.exe` et `wd180session.exe`), `TermineProg` | non |
| `rbq_histo` | `PageAffiche(RBQ_HISTO)` — page HTML d'administration de l'historique | non |
| `verifnum`, `verifnum2`, `interv`, `interv2`, `recupliste`, autre | cas général `bRequeteRBQ` : l'élément devient `/VERIFNUM`, `/INTERV2`… en tête de ligne de commande | oui |

Les sous-commandes `verifnum*`/`interv*` ne sont **pas** interprétées par le site : seule leur présence (sans `=`)
en fait un drapeau `/<MAJUSCULE>`. La différence `verifnum` vs `verifnum2`, `interv` vs `interv2` n'existe que pour
`RecupEntrep.exe` (probablement format de réponse v12 vs v14 de l'EG ; **non vérifié**, le source de RecupEntrep
n'est pas dans le dépôt).

Cas particulier `recupliste` : si `Position(Minuscule(sCommande),"recupliste")>0`, aucune écriture dans
`RBQ_HISTO`/`RBQ_ENTREP` et aucun contrôle de limite (l. 134686) : c'est la récupération de la liste des
catégories/régions, non comptabilisée.

### 2.3 Clés reconnues

| Clé | Rôle | Consommée par le site | Passée à l'exécutable |
|---|---|---|---|
| `id` | identifiant de la requête = `<nom poste>_<HHMMSSCC>` (nom machine Windows + horodatage) ; sert de suffixe aux fichiers `Entrep_<id>.res/.fin` | oui (`sIdent`) | **oui** (`/ID=`) |
| `num` | numéro de licence RBQ recherché (10 chiffres, sans tirets) | non | oui (`/NUM=`) |
| `cp` | code postal (sans espace) | non | oui (`/CP=`) |
| `nom` | mots du nom d'entreprise séparés par `,` | non | oui (`/NOM=`) |
| `tel` | téléphone (10 chiffres) | non | oui (`/TEL=`) |
| `ville` | ville | non | oui (`/VILLE=`) |
| `ct` | entier (2 dans tous les exemples) ; sens inconnu (type de contenu / version du format ?) — non vérifié | non | oui (`/CT=`) |
| `region` | code région RBQ (1-30, cf. `[REGION_EXPLORE]` de RecupEntrep.ini) — pour `interv*` | non | oui (`/REGION=`) |
| `categ` | code catégorie/sous-catégorie de licence — pour `interv*` | non | oui (`/CATEG=`) |
| `nomentrep` | nom de l'entreprise **cliente** (titulaire de licence EG) | oui (`sNomEntrep`, compteurs) | **non** |
| `nbrrecup` | cumul de fiches déjà récupérées par ce client (compteur tenu par l'EG) | oui (`nNbrRecup`) | **non** |
| `addrip` | adresse IP **déclarée par l'EG** (IP locale/privée dans les exemples ; tronquée au `#`) | oui (`sAddrIP`) | **non** |
| `versiones` | version de l'EG (`demo`, `12.00Ak`, `gold 14.02T`…) | oui (`sVersion`, `TraiteVersion`) | **non** |
| `log` | drapeau sans valeur : met `gbLogActif=Vrai` (variable globale, aucun autre usage trouvé — l. 547, 134671) | oui | non |

Toute autre clé `X=Y` est passée telle quelle (`/X=Y`) ; tout autre mot sans `=` devient `/X`.

### 2.4 Ligne de commande résultante

```
<RepDisk>\RecupEntrep\RecupEntrep.exe /VERIFNUM2 /ID=<id> /NUM= /CP= /NOM=mot1,mot2 /TEL= /VILLE= /CT=2 /REP="<RepDisk>\export\"
```
(`sCommande+=" /REP="""+sRep+""""`, l. 134757 ; `sRep` = `goConfig:sGetRepExport()` =
`m_sRepDisk+"export\"`, p. 3132 l. 109063, où `m_sRepDisk=ComplèteRep(fRepWeb())` = `C:\WebSite\lecatalogue\LECATALOGUE_WEB\`).
Note : les clés vides sont émises (`/NUM=`), l'ordre suit celui de `ParamRBQ`, les valeurs **ne sont pas** mises
entre guillemets (sauf `/REP`), ce qui rend fragile un `nom` contenant des espaces (non vérifié côté exécutable).

---

## 3. Commandes : traitement détaillé

### 3.1 `Type=rbx` (version courante) — p. 136, l. 1223-1260

1. Pas de contrôle d'autorisation côté site (contrairement à `rbq`).
2. `listprocess` / `killrecup` / `rbq_histo` : voir § 2.2.
3. Sinon `bRequeteRBQ(AAParamRBQ, goConfig:sGetRepExport())` puis `FermeTout()`, `PageAffiche(TermineProg)`.

### 3.2 `Type=rbq` (ancienne version de l'EG) — p. 136, l. 1227-1232

Identique à `rbx` mais **précédé** de `isAutoriseWWW(AAParamRBQ)` (p. 3928-3929, l. 137192-137250) :

- Extrait `id=` et `nomentrep=` de `ParamRBQ` (recherche `Position(Minuscule(...),"id=")` — attention :
  `"id="` matche aussi la fin de `…rbq;…id=`, mais aussi n'importe quel `xxid=` ; pas un problème avec les clés actuelles).
- Ouvre le fichier texte **`<bd>\LECATALOGUE\ListeClient.txt`** (chemin codé en dur
  `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\ListeClient.txt`), format par ligne `<cléAAClient>;<nom entreprise>[;…]`,
  cherche la ligne dont le nom `~=` `nomentrep`.
- Si trouvé : `goAAClient:isExist(nCle)` puis
  `bAutorise = isAbonnement() ET sGetDateFin()>DateSys() ET PAS isRBQInterdit()`.
- `LogRBQ("isAutoriseWWW <nom> Ident <id> bTrouve … Autorise … Abonne … Cle …")`.
- Si **non autorisé** et `id` non vide : écrit `export\Entrep_<id>.fin` contenant la ligne `INTERDIT` et renvoie Faux ;
  le projet affiche alors `TermineProg` sans lancer l'exécutable.
- Le fichier `ListeClient.txt` : **aucune procédure du dossier technique ne l'écrit** (la `CreationListeClient`
  des commandes `sdpcli/sdpacli/sdpscli` produit un autre fichier). Production manuelle ou par un autre outil :
  **non vérifié**. C'est un mécanisme hérité, remplacé dans `rbx` par la table `RBQ_ENTREP` + drapeau
  `AAClient.RBQInterdit` transmis à l'EG au démarrage (§ 3.6).

### 3.3 Cas général `bRequeteRBQ(sParamRBQ, sRep)` — p. 3869-3872, l. 134628-134765

Étapes dans l'ordre :

1. `goRBQHisto:bSetAlias`, `goRBQEntrep:bSetAlias` (ouverture HFSQL dans `m_sRepBase`).
2. **Migration unique** (`goConfig:isMigreRBQ()` lit `[MIGRATION] RBQ` dans `lecatalogue.ini`, p. 3133) : convertit
   `RBQ_ADDRIP` (entier IPv4) → `RBQ_ADDRIP_S` (texte IPv4/IPv6) sur toutes les lignes de `RBQ_ENTREP` et `RBQ_HISTO`,
   puis `SetMigreRBQ(Vrai)` — méthode **vide** dans le dossier (p. 3135, l. 109146-109150) : la migration est donc
   rejouée à chaque requête tant que la clé INI n'est pas mise à 1 à la main (non vérifié si l'INI de production la contient).
3. Analyse de `ParamRBQ` (§ 2) → `sCommande`, `sNomEntrep`, `nNbrRecup`, `sAddrIP`, `sVersion`, `sIdent`.
4. Si `sCommande<>""` :
   - `SupprimeOld(<export>\Entrep_*.*)` (p. 4054, l. 142732) : supprime les fichiers `Entrep_*` d'une date antérieure
     ou vieux de plus de **5 minutes** le jour même.
   - Si pas `recupliste` :
     - Ajout d'une ligne **RBQ_HISTO** : date (`DateSys()`), heure (6 premiers caractères de `HeureSys()`),
       nom entreprise, IP (`addrip` déclaré), cumul (`nbrrecup`), `RBQ_REQUETE=sCommande` (200 car. max), version.
     - Si ajout OK et nom+IP non vides : recherche **RBQ_ENTREP** par clé `RBQ_ADDRIP_S` puis égalité souple du nom
       (`~=`) — la clé fonctionnelle est donc **(IP déclarée, nom d'entreprise)**.
       - Trouvé : `SetCumul(nNbrRecup)`, `TraiteVersion(sVersion)` (p. 4067 : si version commence par `demo`,
         `SetLimite(200)`), `bModifie()`. Puis :
         - `isInterdit()` → écrit `Entrep_<id>.fin` = ligne `INTERDIT`, **RETOUR** (pas d'exécutable).
         - sinon si `nNbrRecup >= nGetLimite()` et `nGetLimite()>0` → écrit `Entrep_<id>.fin` = `LIMITE=<limite>`, **RETOUR**.
       - Non trouvé : création RBQ_ENTREP (IP, cumul, nom, limite 200 si démo, sinon 0 = illimité, interdit = Faux).
   - `sCommande += ' /REP="<export>\"'`.
   - `sRepExe = m_sRepDisk + "RecupEntrep\"` ; `LogRBQ("RequeteRBQ(3) Commande: … RepExe …")`.
   - **`LanceAppli(sRepExe+"RecupEntrep.exe "+sCommande, exeNonBloquant)`** ; en cas d'échec, `LogRBQ` + `ErreurInfo(errComplet)`.
5. Retour au projet : `FermeTout()`, `PageAffiche(TermineProg)` — la réponse HTTP part **avant** que l'exécutable ait fini.

Remarques : la limite n'est vérifiée que **sur la valeur `nbrrecup` envoyée par l'EG** (le serveur ne compte pas
lui-même) ; `RBQ_CUMUL` est écrasé, pas incrémenté. Un client qui envoie `nbrrecup=0` contourne la limite.
Le cumul par entreprise est donc une donnée déclarative.

### 3.4 `Type=reqrbq&Numrbq=<n>` — `ConstruitReqRBQ` (p. 3877-3878, l. 134985-135040)

Rôle : fournir à un consommateur externe l'URL de la **fiche détenteur** sur le registre public de la RBQ pour un
numéro de licence.

1. `sRep = m_sRepDisk + "RecupEntrep"` (en test : un chemin local `H:\...\BaseRBQ`).
2. `HDéclareExterne(<RecupEntrep>\COMPAGNIE.FIC, "Cie")` : ouvre directement la **base HFSQL de RecupEntrep**
   (copie locale du registre RBQ), `HLitRecherche(Cie, "NUMLICENCE", sNumRBQ, hIdentique)` (tirets retirés).
3. Si trouvé et `CODECIE` non vide et ne commence pas par `1-` :
   `sRes = "https://www.pes.rbq.gouv.qc.ca/RegistreLicences/Recherche/Resultats/FicheDetenteur?mode=Entreprise&crit=<jeton opaque fixe codé en dur>&ent=" + CODECIE`.
   Sinon `sRes="NotFound"` (+ `LogRBQ("Erreur pas trouve NumRBQ …")`).
4. Écrit **un fichier `rbq<numéro>.txt`** dans `goConfig:sGetRepReqRBQ()` (p. 3141 : clé INI `[REPERTOIRE] REP_REQRBQ`,
   défaut `c:\WebSite\estimation.qc.ca\reqrbq` — c'est-à-dire **le dossier web d'un autre site**, estimation.qc.ca ;
   créé avec un `index.html` si absent), contenant **une ligne** = `Crypte(sRes, <clé littérale codée en dur, p. 3878>, crypteRapide+encodePCS)`.
5. Réponse HTTP : `TermineProg`. Le consommateur (site estimation.qc.ca ? EG ?) lit ensuite le `.txt` : **non vérifié**.

Dépendances : fonction `Crypte` WLangage (algorithme propriétaire PC SOFT `crypteRapide`, encodage `encodePCS`) —
à ré-implémenter ou à remplacer par accord avec le consommateur ; accès HFSQL direct au fichier `COMPAGNIE.FIC`
(rubriques `NUMLICENCE`, `CODECIE`). Le `crit=` est un jeton de recherche figé copié depuis une session du site RBQ ;
sa validité à long terme n'est pas garantie (non vérifié).

### 3.5 `Type=rbqcie&User=<chiffré>` — `RecupRequeteCie` (p. 3989-3991, l. 139807-139925)

- Déchiffre `User` via `sGlobDecryptePasse` (DllUtils, clé dérivée d'une constante p. 3813) → `login<TAB>pass<TAB>heure<TAB>num`.
- Calcule `sNomFic="www_"+login+"_"+heure+".txt"` … et **tout le reste du corps est en commentaire**. La procédure
  **ne fait plus rien** d'effectif (ni lecture, ni écriture). Le commentaire d'origine montre qu'elle lisait un
  fichier `export\www_<login>_<heure>.txt` chiffré déposé par l'EG, vérifiait login/mot de passe, et produisait
  `export\<login>_<heure>.txt` via `bCreationResultat` — logique aujourd'hui portée par `wwwlog`/`RecupWWWCommon`.
- À considérer comme **obsolète** ; conserver une réponse `TermineProg` vide pour compatibilité.

### 3.6 Lien avec `wwwlog` / `RecInf` : le drapeau d'autorisation RBQ transmis à l'EG

Hors des commandes RBQ, deux fichiers de réponse écrits par le site informent l'EG s'il a le droit d'utiliser la
recherche RBQ :
- `bCreationResultat` (p. 3845, l. 133538) : ligne `NoRBQ=<isRBQInterdit()>` ;
- `CreatInfoClient` (commande `recinf`, p. 3885, l. 135307) : ligne `AUTHRBQ=<PAS isRBQInterdit()>` dans `export\ResInf_<id>.res`.

Le drapeau `AAClient.RBQInterdit` (« Interdire RBQ », booléen, analyse l. 2296/2564) se coche dans la fiche client
admin (`AAFicheClient2`, champ `INT_RBQINTERDIT`, l. 99404-100918). Il existe donc **deux niveaux d'interdiction** :
par client (AAClient.RBQInterdit, appliqué par l'EG lui-même et par l'ancien `rbq`) et par couple IP/nom
(`RBQ_ENTREP.RBQ_INTERDIT`, appliqué par `rbx`).

---

## 4. Contrat de réponse vers l'Estimateur Général

### 4.1 Réponse HTTP

Pour `rbq`, `rbx` (hors `rbq_histo`), `reqrbq`, `rbqcie` : la page **`TermineProg`** (p. 684-685, l. 20166-20246).
Code serveur d'initialisation : `FermeTout()` puis `FinProgramme(Vrai)` ; code navigateur onload : `NavigateurFerme()`.
Le HTML renvoyé est donc la page `TermineProg` générée par WebDev (gabarit `FR/TermineProg.htm` ; titre « Fin programme »),
sans aucune donnée métier. L'EG **n'analyse vraisemblablement pas ce HTML** (il n'y a rien à y lire) ; il attend
l'apparition des fichiers (non vérifié : le code de l'EG n'est pas disponible).

Pour `rbx` + `ParamRBQ=rbq_histo` : la page HTML d'administration `RBQ_HISTO` (session interactive).

### 4.2 Fichiers déposés dans `LECATALOGUE_WEB/export/` (servis statiquement par IIS/Apache)

| Fichier | Écrit par | Contenu | Encodage |
|---|---|---|---|
| `Entrep_<id>.fin` | **site** (bRequeteRBQ / isAutoriseWWW) | une ligne `INTERDIT` **ou** `LIMITE=<n>` + CRLF | ANSI, CRLF |
| `Entrep_<id>.fin` | **RecupEntrep.exe** à la fin de son traitement | `Result: 1` + CRLF (constaté sur deux fichiers réels de 11 octets dans `export/`) | ANSI, CRLF |
| `Entrep_<id>.res` | **RecupEntrep.exe** | résultat de la recherche. Constaté : fichier texte « obscurci » commençant par un préfixe numérique (`1212n=*…`), caractères imprimables décalés + quelques octets > 127 ; taille 0 (aucun résultat ?), 540 et 1287 octets sur les exemplaires présents | inconnu — **non vérifié** (produit par l'exécutable, probablement chiffrement maison décodé par l'EG) |
| `rbq<num>.txt` | site (`ConstruitReqRBQ`) | une ligne chiffrée `Crypte(...)` | encodePCS (base64-like PC SOFT) |

Le marqueur de **fin** est le `.fin` : l'EG attend probablement `export/Entrep_<id>.fin`, le lit (`INTERDIT` /
`LIMITE=n` / `Result: 1`) puis télécharge `Entrep_<id>.res` si disponible (non vérifié). Le `.fin` écrit par le site
court-circuite l'exécutable : dans ce cas il n'y a pas de `.res`.

Nettoyage : `SupprimeOld("Entrep_*.*")` avant chaque requête (fichiers d'une date antérieure ou > 5 min) ;
`SupprimeAncienFichiers(repExport)` (p. 4050-4051) supprime `*.txt`, `*.res`, `*.fin` de l'heure précédente (appelée
par d'autres commandes, ex. `wwwlog` l. 140021-140022 via `SupprimeOld("*.res")`/`("*.fin")`).

### 4.3 Chiffrement et `SIZE_REQ=512`

`SIZE_REQ=512 // Taille découpage chaine requête cryptée` (constante projet p. 115, l. 366) sert au découpage des
chaînes chiffrées par `goDllUtils:nCrypteChaine` / `sDecrypteInfo` (p. 4060-4061, l. 143031 ; p. ~4001, l. 140654) :
c'est le mécanisme des **requêtes de salles de plans** (SDP), pas du RBQ. Aucune utilisation de `SIZE_REQ` ni de
DllUtils dans `bRequeteRBQ`, `ConstruitReqRBQ` ou `isAutoriseWWW`. Le paramètre `ParamRBQ` circule **en clair** dans
l'URL ; seul `User` (rbqcie) est chiffré (DllUtils `CR_nDecrypteChaine`).

---

## 5. Procédures de gestion de processus (dépendance Windows majeure)

| Procédure | Emplacement | API Windows (`AppelDLL32`) | Effet |
|---|---|---|---|
| `KillProcess(bDel=Vrai)` (globale) | p. 3933-3936, l. 137406-137520 | `psapi.dll!EnumProcesses`, `kernel32!OpenProcess`, `psapi!EnumProcessModules`, `psapi!GetModuleBaseNameA`, `kernel32!TerminateProcess`, `GetLastError`, `CloseHandle` | énumère tous les processus du serveur, `TraceLog` chacun ; si `bDel`, **termine** tout processus nommé `RecupEntrep.exe` ou `wd180session.exe` (sessions du moteur WebDev !) |
| `nEnumProcess(sResult)` (globale) | p. 3962-3964, l. 138639-138700 | mêmes API psapi/kernel32, avec `QUAND EXCEPTION` | compte les processus dont le nom commence par `wd190session` (sic, v19) ; retourne le nombre et une liste `pid hMod nom`. Appelée par `RecupFichierTest` (`Type=testcharge`, l. 139541) ; appel commenté dans l'init projet (l. 710) |
| `CDllUtils::nEnumProcess` (méthode) | p. 3488-3489, l. 121307 | `DllUtils.dll!nEnumProcess` (C++ maison) | variante déléguée à la DLL maison ; appel commenté (l. 121414) |
| `ListProcess.ListeProcessus` / `nSupprimeProcessus` (page) | p. 1853-1856, l. 63075-63200 | idem psapi/kernel32 + `API("KERNEL32","GetCurrentProcessId")` | interface admin : liste tous les processus dans une zone répétée (case pré-cochée sauf le processus courant), bouton `BTN_DELETE` termine les cochés, `BTN_REFRESH` |

Finalité : `RecupEntrep.exe` (WinDev 12, 15,9 Mo, GUI) peut rester bloqué (fenêtre modale, verrou `Dico.lock`,
fichier `BloqueTout.bin` = « Blocage » dans son dossier) ; l'EG ou l'administrateur envoie alors `rbx&ParamRBQ=killrecup`
pour tuer les instances. Tuer `wd180session.exe` tue aussi les sessions AWP en cours des autres visiteurs.

Pour la migration : tout ce bloc disparaît si la recherche RBQ est ré-implémentée en service Node (requête SQL
PostgreSQL sur une copie du registre RBQ, ou appel au registre public) sans processus externe. `listprocess` et
`killrecup` doivent rester acceptés (répondre « OK » sans rien faire) pour les EG déployés.

---

## 6. Dépendance `RecupEntrep.exe` et son répertoire `LECATALOGUE_WEB/RecupEntrep/`

Contenu constaté (246 entrées) :
- `RecupEntrep.exe` (PE32 i386, WinDev 12, 2021-10), `RecupEntrep.ini`, `RecupEntrep.REP`, `RecupEntrep.wdd`
  (analyse), `RecupEntrep.wx`, `MonWinDev.WDK`, ~20 DLL `WD120*.DLL` (runtime WinDev 12), `DllNotify.dll` + `DllNotify.log`.
- **Base HFSQL « BaseRBQ »** (copie locale du registre RBQ et dictionnaires) : `COMPAGNIE.fic/.NDX` (31 Mo, 2023-04-03,
  rubriques connues `NUMLICENCE`, `CODECIE`), `CIEDIVISION`, `CODEPOSTAUX`, `CATEGORIES`, `LIENCATEG`, `LIENQUALIF`,
  `DOMQUALIF`, `RESTRICTIONS` (.mmo), `RESPONSABLE`, `REGION`, `VILLES`, `VILLE_CODEP`, `PAYS`, `PROVINCE`, `ETATUSA`,
  `DICOLIEN_01..37`, `DICOREF_01..37` (index plein texte maison), `DICOGEST`, `RECH3LETTRE`, `TRAITECODE`, `NUMTRAITE`,
  `HISTOMOT`, `HISTOREGCAT`, `STATINTRC`, `SESSION`, `AVANCEMENT` ; `BaseRB.zip` (113 Mo, 2022-02) ; `COMPAGNIE.XLS`,
  `RESPONSABLE.XLS`, `TRAITECODE.XLS`.
- `RecupRBQ.fin` (« Result 1 »), `RecupRBQ.log` (ne pas lire), `BloqueTout.bin` (« Blocage »), `Dico.lock`,
  `ListeCourriel.csv` (ne pas lire), sous-dossiers d'archives `2020 01`, `2022 02` … `2023 12` contenant des
  `<horodatage>_RecupRBQ.log`.
- `RecupEntrep.ini` : sections `[REPERTOIRE] BaseDonnees`, `[SCANPHP] Directory, Actif`, `[FTP] Addr, URL2`,
  `[REGION_EXPLORE] REGION_1..REGION_30` (valeurs non recopiées).

Interprétation (non vérifié, source de l'exécutable absent) : RecupEntrep.exe interroge **sa base HFSQL locale**
(dernière mise à jour de `COMPAGNIE.fic` : avril 2023) et non le site de la RBQ en direct ; les sections `[SCANPHP]`/`[FTP]`
suggèrent un mode de mise à jour/scraping séparé. Aucune `HTTPRequête` vers rbq.gouv.qc.ca n'existe côté site
lecatalogue (seule l'URL `FicheDetenteur` est **construite**, jamais appelée).

Pour la migration : importer `COMPAGNIE` (+ tables liées) dans PostgreSQL ou remplacer par une source à jour
(données ouvertes de la RBQ) ; le format `.res` attendu par l'EG doit être rétro-analysé à partir de l'EG ou de
RecupEntrep (projet WinDev séparé, à demander à l'utilisateur).

---

## 7. Sous-système anti-intrusion / adresses IP

### 7.1 Tables HFSQL (analyse p. ~213-220 ; `docs/modele-donnees.md`)

| Table | Rubriques | Clés | Rôle |
|---|---|---|---|
| `IPADDRESS` | `IPADDR` (texte 15), `EXCLURE` (bool), `IPPAYS` (40), `IPPROVINCE` (3), `IPVILLE` (50), `NBRCONNECT` (ent), `TimeStamp` (17) | `IPADDR` unique ; `ClE_IPEXCLURE` (IPADDR+EXCLURE) unique | journal de **toutes** les IP vues ; `EXCLURE` = marquée intruse. `IPPAYS/IPPROVINCE/IPVILLE/NBRCONNECT` : **jamais alimentés** dans le code (aucun setter trouvé). `IPADDR` limité à 15 car. : une IPv6 est tronquée (non vérifié si le moteur lève une erreur) |
| `INTRUSION` | `IDINTRUSION` (auto), `ADRESSE_IP` (texte 20), `TimeStamp` (17), `NBRCONNECT` | `ADRESSE_IP` unique | compteur d'essais par IP (salles de plans) |
| `SDP_INTRUS` | `IDINTRUSION`, `NUM_SALLE` (10), `TimeStamp`, `NBRCONNECT` | `CLE_IPSDP` (IDINTRUSION+NUM_SALLE) unique | numéros de salle essayés par chaque IP intruse |

### 7.2 Classes (toutes héritent de `CEstimeHF` → `CBasicHF`)

- **`CIPAddress`** (p. 3791-3793, l. 131553-131740) : `bAddAddress(sAddress, bExclure)` — cherche par clé `IPADDR`
  (`isCleExiste`), crée si absent, puis **toujours** `SetExclure(bExclure)` et `SetTimeStamp(DateSys()+HeureSys())`,
  `bAddModif`. Conséquence : un appel ultérieur avec `bExclure=Faux` (toute requête normale) **remet EXCLURE à Faux** ;
  le marquage d'exclusion n'est donc jamais durable et **n'est lu nulle part** (aucun `GetValeur(EXCLURE)` trouvé).
  Méthodes : `isExistAddress`, `SetAddress`, `SetExclure`, `SetTimeStamp`.
- **`CIntrusion(pSdpIntrus)`** (p. 3782-3784, l. 131332-131420) : `isExistAdresse(sAddr)`, `IncConnect()`
  (`NBRCONNECT+1`), `nGetNbrConnect()`, `SetAdresseIP`, `SetTimeStamp`.
- **`CSdpIntrus`** (p. 3786-3789, l. 131422-131550) : `bAddNumSalle(nIdIntrus, sNum)` — ignore `sNum` vide ; crée ou
  incrémente le couple (intrusion, salle) avec horodatage ; `isExistIntrus`, `IncConnect`, `SetIdIntrus`, `SetNumSDP`,
  `SetTimeStamp`.
- **`CCommon`** (p. 3607, l. 125131) : membre **global de classe** `m_sLogRBQ` (chemin du log RBQ, initialisé p. 118
  l. 519 à `<sRepTrace>\AALogRBQ.log`) et méthode globale `LogRBQ(sMess)` → `CBasicObjet::LogGeneric(::m_sLogRBQ, sMess)`
  (p. 3611, l. 125289-125303). La procédure globale `LogRBQ` (p. 3942, l. 137771) n'est qu'un relais.
- **`CRBQEntrep`** (p. 2989-2992, l. 104804-104900) sur `RBQ_ENTREP` : `isInterdit`, `nGetCumul`, `nGetLimite`,
  `nGetAddrIPXX` (ancien entier), `sGetAddrIP` (texte), `sGetNomEntreprise`, `SetAddrIP(s)` (valide via
  `CUTILS::isAddrIPValide`, normalise, stocke l'entier IPv4 big-endian **et** le texte ; 0 pour IPv6), `SetNumAddrIP(n)`
  (entier → texte pointé), `SetCumul`, `SetInterdit`, `SetLimite`, `SetNomEntreprise`.
- **`CRBQHisto`** (p. 3364-3367, l. 116979-117060) sur `RBQ_HISTO` : mêmes accesseurs IP + `SetDate`, `SetHeure`
  (6 car.), `SetCommande` (→ `RBQ_REQUETE`), `Setversion`, `sGetDate/sGetHeure(bFormat)`, `sGetRequete`, `sGetVersion`, `nGetCumul`.

### 7.3 `isIntrus(sAddrIP, sNumSalle)` — p. 3933, l. 137392-137405

```
SI goIntrusion:isExistAdresse(sAddrIp) ALORS      // IP déjà fichée seulement
    IncConnect(); SetTimeStamp(DateSys()+HeureSys()); bModifie()
    goSdpIntrus:bAddNumSalle(lnClePP(), sNumSalle)  // trace la salle demandée (ou "" → ignoré)
    SI nGetNbrConnect()>3 ALORS RENVOYER Vrai       // seuil : plus de 3 connexions cumulées
FIN
RENVOYER Faux
```

- **Seuil : `NBRCONNECT > 3`**, cumul **à vie** : il n'y a **aucune fenêtre de temps** ni remise à zéro (le `TimeStamp`
  est écrit mais jamais comparé). Une IP fichée reste bloquée tant que l'enregistrement INTRUSION existe (purge manuelle,
  aucune procédure de purge trouvée).
- Création de la fiche INTRUSION : **`PAGE_NUMSDP2`** (page publique « entrer un numéro de salle de plans », p. 2146,
  l. 73530-73557) : quand le numéro de salle saisi **n'existe pas**, l'IP (`NavigateurAdresseIP(Faux)` — sans proxy,
  contrairement à `isIntrus` qui reçoit `NavigateurAdresseIP(Vrai)`) est créée/incrémentée dans INTRUSION, le numéro
  essayé ajouté à SDP_INTRUS, une ligne `<numSalle><TAB><ip>` écrite dans **AALogIntrus.log**, et si `NBRCONNECT>1`
  (**2e essai raté**) la page `TermineProg` est affichée (fermeture du navigateur). Le commentaire `// >3` indique que
  le seuil a été abaissé de 3 à 1 ici.
- Appels de `isIntrus` : init projet pour `numsdp` (l. 959, 970) et commandes inconnues (l. 1442). Les IPs légitimes
  qui se trompent deux fois de numéro de salle sont donc fichées, puis bloquées (PAGE_REFUS) à la 4e connexion `numsdp`,
  et marquées EXCLURE dans IPADDRESS.
- Visualisation admin : `AATableClient` (p. 1575, l. 52846-52858), bouton `BTN_RONDROUGE` : pour une IP saisie
  (`SAI_ADDRIP`, 3 points requis = IPv4), affiche rond rouge si `goIntrusion:isExistAdresse`, vert sinon. Aucune page
  de **retrait** d'une IP de la liste noire n'a été trouvée.

### 7.4 Journaux fichiers (répertoire `sRepTrace` = `c:\WebSite\Traces`, p. 118-119, l. 512-532)

| Fichier | Variable | Écrit par | Contenu |
|---|---|---|---|
| `AATrace.log` | `CBasicObjet::bSetActiveLog` | `TraceLog(...)` partout | trace générale (toutes commandes sauf `wwwlog`/`rbx` à l'entrée) |
| `AALogRBQ.log` | `CCommon::m_sLogRBQ` | `LogRBQ` | isAutoriseWWW, commande lancée (« RequeteRBQ(3) Commande: … »), erreurs de lancement, « TermineProg (13) », correction @IP, erreurs reqrbq |
| `AALogIntrus.log` | `gsLogIntrus` | init projet (l. 971, 1443) et PAGE_NUMSDP2 (l. 73553) | « Blocage adresse IP <ip> AAType <type> » ; `<numSalle>\t<ip>` |
| `AALogSDPVide.log` | `gsLogSDPVide` | `LogSDPVide` | appels `numsdp` sans paramètre |
| `LogIP\LogIP<AAAAMMJJ>.log` | `gsLogIP` (sous-dossier `LogIP`, un fichier par jour) | `LogIP(sMess)` (p. 3941, l. 137755) | `<NomPage> <ip>` : appelé à l'ouverture de `Catalogue`, `Catalogue2`, `Accueil2`, `AADownload`, `PAG_PROJET` (l. 25505, 36023, 46513, 66689, 83268) |

Ces logs sont écrits via `CBasicObjet::LogGeneric(chemin, message)` (horodatage + message, append ; format exact non
vérifié). Ils ne sont pas dans `LECATALOGUE_WEB` et ne doivent pas être lus ici.

### 7.5 Pages liées

| Page | Rôle | Paramètres | Qui l'appelle / accès |
|---|---|---|---|
| `PAGE_REFUS` (p. 2908-2910, l. 102383-102560) | « Connexion refusée / Connection denied » ; aucun champ ; onload navigateur `NavigateurFerme()` ; en-tête Google Analytics | aucun | init projet après `isIntrus` (`numsdp`, commande inconnue). Publique de fait |
| `PAGE_ADDRIP` (p. 2246-2248, l. 76917-77000) | « Adresse IP » : affiche l'IP vue par le serveur. Code serveur : `sAddrIP1=NavigateurAdresseIP(Faux)`, `sAddrIP2=NavigateurAdresseIP(Vrai)` (aucun champ nommé ; affichage probablement par libellés liés, non vérifié) | aucun | `Type=addrip` (p. 131, l. 1010-1013). Outil de diagnostic « quelle est mon IP / mon proxy » ; **sans authentification** |
| `RBQ_HISTO` (p. 680-683, l. 19118-20165) | « Historique » des requêtes RBQ : table triée par `CLE_DATE` décroissante, filtres entreprise (contient), date, IP ; bouton `BTN_CIE` ouvre la fiche `RBQ_ENTREP` du couple (IP, nom) ou `RBQ_NOTFOUND` ; `Rechercher`, `TOUS` | `(gsEntrep, gsDate, gsAddrIPX)` optionnels | `Type=rbq|rbx&ParamRBQ=rbq_histo` — **sans authentification** (n'importe quelle IP peut consulter l'historique, qui contient noms d'entreprises clientes, IP et requêtes) |
| `RBQ_ENTREP` (p. 688-703, l. 20247-20840) | « Entreprise » : fiche RBQ_ENTREP (nom, IP, cumul lecture seule ; `RBQ_INTERDIT` interrupteur et `RBQ_LIMITE` saisie modifiables) ; `OK` sauvegarde, `ANNULER` → RBQ_HISTO | `sParam` = `<clé>TAB<ip>TAB<date>TAB<entreprise>` | depuis RBQ_HISTO uniquement ; **sans authentification** |
| `RBQ_NOTFOUND` (p. 232-238, l. 3400-3600) | « Not found » : le couple n'a pas de fiche RBQ_ENTREP ; `ANNULER` → RBQ_HISTO | idem | depuis RBQ_HISTO |
| `ListProcess` (p. 1804-1856, l. 61263-63200) | liste/termine les processus Windows du serveur (§ 5) | aucun | lien `LIEN_PROCESS` de `TableClient` (p. 1239, l. 40487) — page d'administration des clients catalogue (webmaster) ; `TableClient` elle-même n'a pas de garde dans son init (l. 40296-40310), l'accès dépend de la navigation (non vérifié) |
| `LogList` (p. 938-953, l. 29759-30340) | « Log catalogue » : zone répétée de la table `HISTORIQUE` (client, table, type d'action, description, horodatage), bouton `DelHisto` exporte en texte puis purge (code l. 30292+) | aucun | lien `LienLog` de `TableClient` (p. 1237, l. 40439). Pas lié au RBQ ni aux IP : c'est l'historique des modifications du catalogue |
| `TermineProg` (p. 684-685) | page vide de fin : `FermeTout()`, `FinProgramme(Vrai)`, `NavigateurFerme()` | aucun | réponse de toutes les commandes `Type=` |

---

## 8. Synthèse des dépendances Windows / PC SOFT à remplacer

| Dépendance | Où | Remplacement envisageable |
|---|---|---|
| `LanceAppli("RecupEntrep.exe …", exeNonBloquant)` | bRequeteRBQ p. 3872 | service Node interne (requête PostgreSQL sur registre RBQ importé) écrivant `.res`/`.fin` au même format, ou nouveau protocole si l'EG est mis à jour |
| `AppelDLL32 psapi/kernel32` (EnumProcesses, OpenProcess, TerminateProcess…) | KillProcess, nEnumProcess, ListProcess | supprimer ; `listprocess`/`killrecup` → no-op |
| `HDéclareExterne` sur `RecupEntrep\COMPAGNIE.FIC` | ConstruitReqRBQ p. 3878 | table PostgreSQL `compagnie(numlicence, codecie)` |
| `Crypte(..., crypteRapide+encodePCS)` | ConstruitReqRBQ | à clarifier avec le consommateur de `rbq<num>.txt` |
| `DllUtils.dll` (`sGlobDecryptePasse`) | rbqcie (obsolète), wwwlog | hors périmètre A4 (voir annexe chiffrement) |
| Chemins Windows codés en dur : `c:\WebSite\Traces`, `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\ListeClient.txt`, `c:\WebSite\estimation.qc.ca\reqrbq`, `H:\…` (mode test) | init projet, isAutoriseWWW, sGetRepReqRBQ | configuration d'environnement |
| `NavigateurAdresseIP(Vrai/Faux)` | init, PAGE_NUMSDP2, PAGE_ADDRIP | `X-Forwarded-For` / IP socket |
| Fichiers de log `*.log` via `LogGeneric` | partout | journalisation applicative |

---

## 9. Modèle cible suggéré (pour discussion, pas de code)

- Conserver les URL `?Type=rbx&ParamRBQ=…` et `?Type=rbq&ParamRBQ=…` et le parseur `;`/`=` insensible à la casse,
  avec troncature de `addrip` au `#`.
- Tables PostgreSQL `rbq_entrep (id, nom_entrep, addr_ip text, cumul, interdit, limite)` avec contrainte
  d'unicité fonctionnelle (addr_ip, lower(nom_entrep)) et `rbq_histo (id, nom_entrep, addr_ip, cumul, date, heure, requete, version)`
  ; abandonner la colonne IPv4 entière (`RBQ_ADDRIP`) après migration des lignes où `RBQ_ADDRIP_S=''`.
- Tables `ipaddress`, `intrusion`, `sdp_intrus` : à repenser (fenêtre glissante, expiration), car l'existant n'a ni
  fenêtre de temps ni purge, et `EXCLURE` est inopérant.
- Fichiers `export/Entrep_<id>.{res,fin}` : les produire à l'identique (y compris `Result: 1`, `INTERDIT`, `LIMITE=n`,
  CRLF) tant que l'EG n'est pas modifié ; le format interne du `.res` reste à obtenir du projet RecupEntrep.

---

## Points non vérifiés / incertitudes

1. **Format du fichier `.res`** produit par `RecupEntrep.exe` (encodage/obscurcissement, structure) : non vérifié ; le
   source de RecupEntrep (projet WinDev 12 séparé) n'est pas dans le dépôt. Seuls deux exemplaires réels ont été
   inspectés sur leurs premiers octets (texte obscurci, préfixe numérique).
2. **Comportement de l'EG** après l'appel (sondage de `export/Entrep_<id>.fin`, délai, lecture de `.res`, interprétation
   de `INTERDIT`/`LIMITE=n`/`Result: 1`) : déduit, non vérifié (code de l'EG non disponible).
3. Sens exact de `ct=`, différence `verifnum`/`verifnum2` et `interv`/`interv2` : interprétés par RecupEntrep.exe ; non vérifié.
4. RecupEntrep.exe interroge-t-il sa base HFSQL locale ou le site de la RBQ (sections `[SCANPHP]`, `[FTP]` de son INI) :
   non vérifié.
5. Qui produit `bd\LECATALOGUE\ListeClient.txt` (utilisé par `isAutoriseWWW`) : aucune procédure trouvée ; non vérifié.
6. Qui consomme `rbq<num>.txt` dans `REP_REQRBQ` (site estimation.qc.ca ?) et validité du jeton `crit=` de l'URL RBQ : non vérifié.
7. Valeur réelle de `[MIGRATION] RBQ` et `[REPERTOIRE] REP_REQRBQ` dans `Exe/lecatalogue.ini` : la lecture du fichier
   INI a été refusée par la politique d'accès de la session ; non vérifié (`SetMigreRBQ` est vide dans le dossier
   technique, la migration serait donc rejouée à chaque requête si la clé n'est pas à 1).
8. Contrôle d'accès réel de `TableClient` (donc de `ListProcess` et `LogList`) : aucune garde dans le code
   d'initialisation ; l'accès se fait par navigation depuis une session webmaster ; non vérifié qu'une URL directe soit bloquée.
9. `RBQ_HISTO`/`RBQ_ENTREP` accessibles par `?Type=rbx&ParamRBQ=rbq_histo` sans authentification : constaté dans le
   code ; non testé sur le site public (interdit par les consignes).
10. Comportement de `IPADDRESS.IPADDR` (15 car.) avec une IPv6 (troncature silencieuse ou erreur HFSQL) : non vérifié.
11. Format exact des lignes écrites par `CBasicObjet::LogGeneric` (horodatage, séparateur) : non lu.
12. Affichage effectif de `PAGE_ADDRIP` (les deux IP calculées ne sont rattachées à aucun champ nommé dans `FR/`) : non vérifié.
13. L'exemple `interv,id=…;region=15,categ=1,22` (virgules) : grammaire ancienne ou faute de frappe ; non vérifié.
