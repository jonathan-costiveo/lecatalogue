# A6 — Traitements en lot et envois de courriels

Inventaire des envois de courriels et des traitements « en lot » du site lecatalogue.ca (WebDev 18), établi à partir
de `Docs/dossier-technique.txt` (références « p.N » = page imprimée du dossier), des fichiers `Exe/lecatalogue.ini`
et `LECATALOGUE_WEB/lecatalogue.ini` (noms de clés seulement) et des sources C++ de `~/Projects/WinDev/DllUtils/`.

Conventions : aucune adresse courriel réelle, aucun mot de passe ni clé n'est recopié ; les adresses sont désignées
par leur rôle ou par la clé INI qui les porte. « XX/XXX » en suffixe d'une procédure = procédure neutralisée par
le développeur (corps commenté, ne fait plus rien).

---

## 1. Vue d'ensemble

- **Aucun ordonnanceur** : il n'y a ni tâche planifiée WebDev, ni thread persistant, ni service Windows dans le
  projet. Tout traitement « en lot » est déclenché soit par un clic d'un administrateur (webmaster) sur une page
  d'administration, soit par une requête HTTP `…/CONNECT/lecatalogue?Type=xxx` émise par les logiciels clients
  (Estimateur Général, e-Plans) ou par le développeur (dispatch `SELON Minuscule(AAType)`, code projet p.131-140).
  Les purges de fichiers (« à partir de 20 heures ») sont faites *à l'occasion* de ces requêtes.
- **Trois mécanismes d'envoi coexistent** (du plus récent au plus ancien) :
  1. `CDllUtils:bSendMail(bOAuth2, stINTERFSMTP)` → `AppelDLL32("DllUtils.dll", "nSMTPSendMailEx", …)` : client
     SMTP maison en C++ (`CSmtp.cpp`, 3 259 lignes, LibreSSL pour TLS/SSL). C'est la voie **active** pour tous les
     envois en production.
  2. `CEmail` (classe WLangage) : wrapper objet autour de (1) via `bEnvoyerMail2` ; `bEnvoyerMail` (ancienne
     version, fonctions natives PC SOFT `EmailOuvreSessionSMTP`/`EmailEnvoieMessage`) n'est plus appelée.
  3. `CAAEmail:bEnvoiMessage` : wrapper plus simple (un destinataire, pas de pièce jointe) qui relit la section
     `[SMTP]` du INI à chaque appel, puis appelle (1).
  4. Fonctions natives PC SOFT `EmailOuvreSessionSMTP` + structure `Email.*` + `EmailEnvoieMessage` : encore
     actives dans **deux** traitements (page Batch, bouton `BTN_LISTABON` d'AATableClient) ; partout ailleurs
     elles sont en commentaire. `EmailLitTimeOut()` est appelé dans 6 endroits (liste « fonction interdite en
     Linux », p.142-143).
- **Journalisation des envois** : aucune table d'historique des courriels envoyés. Seules traces : lignes
  `TraceLog(...)` dans `AATrace.log` (émises par `CEmail:bEnvoyerMail2` et `CDllUtils:bSendMail`, et par certains
  appelants), `AALogEstime.log` pour `TraiteConference`, et le fichier HFSQL `COURRIELS` qui n'enregistre que
  les *demandes reçues* par `TraiteConference` (pas les envois). Le fichier `Envoi` ne stocke qu'un gabarit de
  texte (rubrique `Haut`), pas un journal.

---

## 2. Infrastructure d'envoi

### 2.1 Configuration INI (noms de clés seulement)

Constantes du code projet (p.114-115) : `SECTION_SMTP="SMTP"`, `CLE_SERVER="Server"`, `CLE_PORT="Port"`,
`CLE_SECUR="Secur"`, `CLE_LOGIN="Login"`, `CLE_PASSWORD="Pass"`, `CLE_EXPEDITEUR="Sender"`,
`CLE_DESTTEST="DestTest"`, `CLE_CONFIRME="Confirm"`.

| Section INI | Clés présentes dans `Exe/lecatalogue.ini` et `LECATALOGUE_WEB/lecatalogue.ini` | Lue par | Rôle |
|---|---|---|---|
| `[SMTP]` | `Server`, `Port`, `Secur`, `Login`, `Pass`, `Sender`, `DestTest`, `Confirm` | code projet p.121 (globales `gsServeurSMTP`, `gnPortSMTP`, `gsSecurSMTP`→`gnSecurSMTP`, `gsLoginSMTP`, `gsPassCrypt`) ; `CAAEmail:bEnvoiMessage` p.3453 (relecture à chaque appel) ; page ParamSMTP p.1794 ; `ReceptionException` p.3970 (`Sender`) | Serveur SMTP (valeur par défaut dans le code : relais smtp2go, port 587, TLS), identifiants, expéditeur par défaut, destinataire de test, demande d'accusé de lecture |
| `[CORRESP]` | `Courriel`, `CourrielExcept`, `CourrielDstExcept` | code projet p.121 (`gsMailInfo` = adresse « noreply » servant d'expéditeur par défaut) ; `ReceptionException`/`ReceptionProjet` p.3970-3973 | Expéditeur noreply ; expéditeur et liste (séparateur `;`) des destinataires internes des courriels d'exception |
| `[COURRIEL]` | `CODHEX`, `CHARSET`, `ENCODING`, `MAILER` (écrites par le code si absentes) | `CConfigCat:isCodHex`, `sGetCharSet`, `sGetEncoding`, `sGetMailer` p.3133-3140 | Encodage des accents en hexa, jeu de caractères (défaut ISO-8859-1), transfer-encoding (défaut 8bit), en-tête X-Mailer |
| `[CONFERENCE]` | `Courriel1`, `Courriel2` (+ `Sujet`, `Sujet2`, `Sujet3` lues avec défaut mais absentes du INI) | `TraiteConference` p.4063-4064 | Destinataires internes des formulaires « café conférence / nous contacter / pour commander » du site estimation |
| `[TIRAGE]` | `Sujet`, `ModeTest`, `Destinataire`, `Port`, `SMTP`, `Expediteur`, `Pass` (+ `Last` lue/écrite) | `EnvoiTirage` p.3904-3906 | Campagne « 20 ans » (concours) : serveur SMTP distinct (Office 365 par défaut dans le code), mode test, reprise après interruption |
| `[PREPARENVOI]` | `REPBASE`, `REPSAVE` | `PAGE_UNSUBSCRIBE.Desabonne` p.2176-2177 | Répertoire d'un fichier HFSQL externe `COURRIEL.FIC` (base d'infolettre d'un autre logiciel) et répertoire de sauvegarde |
| `[ADDRSERVER]` | `IPADDRESS`, `PATH_DOWNLOAD` | code projet p.121 (`ADDR_SITE`, `PATH_DOWNLOAD`) | Construction du lien « centre de mise à jour » inséré dans les courriels aux clients AAClient |

**Mot de passe SMTP** : stocké chiffré dans `[SMTP] Pass`. Chiffrement/déchiffrement par les procédures globales
`sGlobCryptePasse` / `sGlobDecryptePasse` (Procedures_globales_RAD, p.3812-3814, lignes 132223-132317, qui
s'appuient sur `goDllUtils`) et, côté page ParamSMTP, par les procédures locales `sCryptePasse`/`sDecryptePasse`
(p.1801). Le code projet p.121 et `CAAEmail:bEnvoiMessage` p.3453 contiennent des lignes (certaines actives !)
qui **réécrivent le mot de passe par défaut dans le INI à chaque appel** : à signaler comme anomalie (valeur en
dur dans le code ; ne pas la reproduire). L'ancienne méthode `Crypte(...,"…",crypteAnsi,encodePCS)` (format
propriétaire PC SOFT) subsiste en commentaire p.121 et **active** dans `EnvoiTirage` p.3904 pour le mot de passe
`[TIRAGE] Pass`.

### 2.2 Couche DLL : `CDllUtils:bSendMail` (classe p.3468-3501, méthode p.3480-3482)

- Structure d'interface WLangage `stINTERFSMTP` (p.3468) : sujet, message, expéditeur, destinataires (séparés par
  `|`), CC (séparés par `|`), serveur, sécurité (`NO_SECURITY`/`USE_TLS`/`USE_SSL`), port, login, mot de passe,
  nombre et liste de pièces jointes (séparées par `|`) avec leurs content-types, X-Mailer, nombre d'essais,
  accusé de lecture, verbose, charset, encoding, `m_bCodHex`.
- Les chaînes sont recopiées dans un buffer alloué par `CUTILS::pMalloc` et passées par pointeurs dans la
  structure C `stSMTP` ; `sTraitePoint` double les points en début de ligne (protocole SMTP).
- Exports de `DllUtils.def` utilisés : `nSMTPSendMailEx` (voie normale), `nSMTPGetLastError`, et pour OAuth2 (code
  présent mais `bOAuth2=Faux` dans **tous** les appels du site) : `bSMTP_InitOAuth2`, `nSMTP_DoAuthAndSendMail`,
  `SMTP_FinOAuth2` (`COAuth2.cpp`). `nSMTPSendMail` (ancien) est commenté.
- 50 messages d'erreur traduits (5000-5049, p.3461-3467) ; `sGetMailError` p.3496.
- Reply-To et nom d'expéditeur = adresse expéditeur ; priorité normale.

### 2.3 Classe `CEmail` (p.3736-3758)

Membres : expéditeur, 20 destinataires max (`MAXLNGDEST=127` car.), 200 CC max, liste de pièces jointes
(`CListeChaine`), serveur/port/sécurité/login/mot de passe chiffré, charset (défaut ISO-8859-1), encoding (8bit),
`m_bCodHex`, `MAILER_DEF="General Estimator"`.
Méthodes utiles : `SetParamSMTP(sNomUser, sSMTP, nPort, nSecur, sLogin, sPassCrypt, bRedemande)` p.3746,
`SetExpediteur`, `bAjoutDestinataire`, `bAjoutCC`, `bAjoutFichierAttache` (vérifie l'existence du fichier),
`ResetMail`, `SetTimeOut` (p.3747, reçoit `EmailLitTimeOut()`), `sGetContentType` (p.3747, table d'extensions →
MIME), `bEnvoyerMail2` p.3742-3744 (déchiffre le mot de passe via `sGlobDecryptePasse`, construit `stINTERFSMTP`,
appelle `pDll:bSendMail(Faux, …)`, trace tout dans `AATrace.log`), `bEnvoyerMail` p.3738-3742 (ancienne voie
native PC SOFT, **plus appelée**), `sNomFicPass`/`sRecupPassFic` p.3757 (fichier de mot de passe dans le
répertoire common — hérité de l'Estimateur Général, utilise `RéseauUtilisateur`, interdit Linux ; non utilisé par
le site).

### 2.4 Classe `CAAEmail` (p.3453-3455)

Instance globale `goAAEMail` créée dans le code projet p.123 avec (`gsMailInfo`, `gsServeurSMTP`).
`bEnvoiMessage(sDestinataire, sSujet, sMessage, sExpediteur)` : un seul destinataire, pas de CC ni de PJ, 1 essai,
relit `[SMTP]` à chaque appel (« pour pouvoir changer le INI sans redémarrer »), **mais utilise `:m_sServeurSMTP`
(figé au constructeur) comme serveur**, pas la valeur relue ; en mode test le constructeur force un ancien relais
SMTP. Le constructeur contient un mot de passe en dur (membre `m_sPassword`, non utilisé par `bEnvoiMessage`) :
à supprimer à la migration. Message HTML passé tel quel (`m_sContentType=""`).

### 2.5 Page `ParamSMTP` (p.1734-1801)

Page d'administration (lien `LIEN_SMTP` de TableClient p.1238). Champs : serveur, port, sécurité (combo
Aucune/TLS/SSL → port 25/587/465 automatiquement), login, mot de passe (déchiffré à l'affichage), expéditeur,
destinataire de test, accusé de lecture. `BTN_SAVE`/`BTN_QUIT` → `SauvePage()` écrit `[SMTP]` (mot de passe
rechiffré). `BTN_TEST` envoie un courriel HTML minimal (logo + « test ») via `goDllUtils:bSendMail` avec les
valeurs saisies (pas encore sauvegardées).

### 2.6 Autres éléments transverses

- `LOGO_GIF` (URL du logo du site, code projet p.120) et `HTTP_ANIM_ESTIM` (bannière animée 468×60, p.122) sont
  insérés en `<img>` dans la plupart des gabarits HTML.
- `goConfig:sGetDestinataire()` = courriel de la **provenance** (partenaire : CEGQ, APECQ, ACQ…, ou « Nous-même »)
  chargé par `CConfigCat:SetProvenance` p.3135-3137 depuis le fichier `PROVENANCE` (alimenté en dur par
  `CProvenance:bInitTable` p.2981-2982, qui contient les coordonnées des partenaires). `goConfig:sGetMailNousMeme()`
  = courriel de la provenance « Nous-même » (code projet p.123). `goConfig:isNousMeme()` : vrai si pas de partenaire.
- Plusieurs envois ajoutent **en dur** l'adresse personnelle du développeur et/ou l'adresse de contact de
  l'entreprise comme destinataires supplémentaires (hors mode test) : Contact, Commander, EnvoiTirage (bilan),
  TestCourriel, ReceptionProjet. À remplacer par une configuration.

---

## 3. Tableau récapitulatif des appelants d'envoi

| # | Élément (dossier) | Mécanisme | Déclencheur | État |
|---|---|---|---|---|
| 1 | Oubli, `BOUTON6` p.284-285 | `CEmail:bEnvoyerMail2` | Usager public « mot de passe oublié » (catalogue) | actif |
| 2 | AADownload, `B_OUBLI` p.1413-1414 | `CAAEmail:bEnvoiMessage` ×3 | Client EG « mot de passe oublié » (centre de mise à jour) | actif |
| 3 | Contact, `Bouton1` p.651-652 | `CEmail:bEnvoyerMail2` ×1-2 | Formulaire de contact public | actif |
| 4 | Commander, `ENVOYER` p.934-936 | `CEmail:bEnvoyerMail2` ×1-2 | Bon de commande public | actif |
| 5 | ProfilClient2, `Bouton2` p.577-579 | `goDllUtils:bSendMail` direct | Webmaster, fiche client catalogue | actif |
| 6 | Batch, `Bouton2` + proc. locale `EnvoiCourriel` p.1020-1023 | **natif PC SOFT** `EmailOuvreSessionSMTP`/`EmailEnvoieMessage` | Webmaster, envoi en lot aux clients catalogue | actif (page accessible ? voir §6) |
| 7 | AAConfigure, `Bouton1` p.1722-1724 | `CAAEmail:bEnvoiMessage` ×3 par client, puis `CEnvoiEMail` | Webmaster, envoi en lot aux clients AAClient | actif |
| 8 | AAFicheClient2, `Bouton2` p.2854-2855 | `CAAEmail:bEnvoiMessage` ×1-3 | Webmaster, fiche client AAClient | actif |
| 9 | AARenouvelle, `Bouton1` p.2459-2461 | — (tout commenté) | Webmaster | **mort** |
| 10 | AATableClient, `BTN_LISTABON` p.1569-1572 | **natif PC SOFT** avec pièce jointe | Webmaster, liste des abonnés | actif |
| 11 | AATableClient, `BTN_ENVOICONCOURS` p.1566-1569 | — (tout commenté) | Webmaster | **mort** (remplacé par `EnvoiTirage`) |
| 12 | ParamSMTP, `BTN_TEST` p.1797-1799 | `goDllUtils:bSendMail` direct | Webmaster | actif |
| 13 | Proc. `TraiteConference` p.4061-4065 | `CAAEmail:bEnvoiMessage` ×1-2 | HTTP `Type=conference|commestim|contestim` (site estimation) | actif |
| 14 | Proc. `ReceptionException` p.3966-3971 | `CEmail:bEnvoyerMail2` ×N (un par destinataire) | HTTP `Type=newexcept` (EG / e-Plans) | actif |
| 15 | Proc. `ReceptionProjet` p.3971-3974 | `CAAEmail:bEnvoiMessage` ×2 | HTTP `Type=projexp` (**commenté** dans le dispatch p.139) | **mort** |
| 16 | Proc. `EnvoiTirage` p.3901-3906 | `CEmail:bEnvoyerMail2` (préparé) | HTTP `Type=envoitirage` | actif mais **incomplet** (voir §4.14) |
| 17 | Proc. `TestCourriel` p.4058 | `CEmail:bEnvoyerMail2` | appel commenté (code projet p.123) | debug |
| 18 | Proc. `EnvoiCourrielXX` p.3900, `bGlobEnvoiVerifxx` p.3856 | — | — | **mort** |
| 19 | Code projet p.129 (bloc `si EnModeTest()` commenté) | `CEmail` | — | debug commenté |

---

## 4. Inventaire détaillé des envois

### 4.1 Oubli — « Code d'accès (lecatalogue.ca) » (p.284-286)

- **Déclencheur** : page publique Oubli, clic `BOUTON6` ; validation navigateur `bVerifieFormatEmail(email1)`
  (procédure navigateur p.4073). Serveur : `goClient:isExistMail123(email1)` (recherche dans Courriel/Courriel2/
  Courriel3 de `Client`, p.3017).
- **Expéditeur** : adresse noreply en dur (identique à la valeur par défaut de `[CORRESP] Courriel`) ; mailer
  `gsMailInfo`. Paramètres SMTP : globales projet, mot de passe relu dans `[SMTP] Pass`.
- **Destinataires** : **anomalie** : `goConfig:sGetDestinataire()` = courriel de la provenance (partenaire),
  et **non** l'adresse saisie par l'usager (`email1`). En mode test : adresse du développeur. L'ancien code commenté
  envoyait bien à `email1`.
- **Sujet** : « Code d'accès (lecatalogue.ca) ».
- **Corps** : HTML construit en dur dans le code (charset iso-8859-1, logo, « Bonjour cher(ère) abonné(e)… »,
  **login et mot de passe en clair** du client `goClient:sGetLogin()`/`sGetPassword()`). Aucun gabarit externe.
- **PJ** : aucune. **Journalisation** : `TraceLog` en cas d'erreur seulement ; pas d'`Historique`.
- Après succès : `Info(...)` puis `PageAffiche(Accueil)`.

### 4.2 AADownload `B_OUBLI` — « Code d'accès (Centre de mise à jour) » (p.1413-1414)

- **Déclencheur** : page AADownload (centre de mise à jour des logiciels, login client AAClient passé en
  paramètre `AADownLoad`), clic `B_OUBLI` ; `goAAClient:isExistLogin(AADownLoad)`.
- **Expéditeur** : `gsMailInfo`. **Destinataires** : `AAClient.Courriel`, `Courriel2`, `Courriel3` non vides (un
  envoi par adresse via `goAAEMail:bEnvoiMessage`).
- **Sujet** : « Code d'accès (Centre de mise à jour) ».
- **Corps** : HTML en dur : login et **mot de passe en clair** (`AAClient.Mot_de_Passe`), bannière
  `HTTP_ANIM_ESTIM` liée vers le site estimation.
- **PJ** : aucune. **Journalisation** : aucune (Info à l'écran avec la liste des adresses servies).

### 4.3 Contact — « www.lecatalogue.ca / <provenance> » (p.650-652)

- **Déclencheur** : page publique Contact (formulaire nom/courriel/message), clic `Bouton1` ; validations
  navigateur (champs non vides).
- **Expéditeur** : adresse noreply en dur ; mailer `gsMailInfo`.
- **Destinataires** (envoi 1) : courriel de la provenance (`goConfig:sGetDestinataire()`) **+ adresse personnelle
  du développeur en dur**. Mode test : développeur seul.
- **Sujet** : « www.lecatalogue.ca / » + abréviation de la provenance.
- **Corps** : texte brut : message + « Nom : … » + « Courriel : … » (le courriel de l'usager n'est pas utilisé
  comme Reply-To).
- **Envoi 2** (si `PAS goConfig:isNousMeme()`, c.-à-d. accès via un partenaire) : copie à l'adresse « Nous-même »
  (`sGetMailNousMeme()`) + développeur, sujet « Demande d'information du partenaire <provenance> », corps « Copie du
  message » + idem.
- **PJ** : aucune. **Journalisation** : `TraceLog` si erreur. Pas d'écriture dans `COURRIELS`.

### 4.4 Commander — « Bon de commande pour Le Catalogue » (p.933-936)

- **Déclencheur** : page publique Commander, clic `ENVOYER` ; validations navigateur (nom, prénom, société,
  adresse, téléphone, code postal, courriel obligatoires).
- **Persistance** : fichier HFSQL `Commande` via `goCommande` (clé `Cle_Bon` = NomMAJ+Courriel : ajout ou
  modification) ; `goHistorique:bAjout(..., HST_BONCOMMANDESEND, Nom+" "+Courriel)`.
- **Expéditeur** : adresse noreply en dur ; mailer `gsMailInfo`.
- **Destinataires** (envoi 1) : courriel de la provenance + **développeur en dur + adresse de contact de
  l'entreprise en dur** (une 4e adresse « ventes » est commentée).
- **Sujet** : « Bon de commande pour Le Catalogue ». **Corps** : texte brut listant les champs saisis.
- **Envoi 2** (si partenaire) : sujet « Bon de commande CC », mêmes destinataires internes + « Nous-même », corps
  = message + « Copie du message envoyé à <provenance> ».
- **PJ** : aucune. Les gabarits Word/HTML `MailCommande.htm`, `BonCommande.htm`, `BonCommande.doc` à la racine du
  projet (2005) ne sont **pas référencés** par le code : vestiges.
- Page `BonCommande` (p.1069-1079) : affiche un HTML statique (champ `html1`, remplacement « XXXX » par le
  partenaire et « 999 » par `HNbEnr(Itemcat)`) ; le lien PDF utilise `CConfigCat:sGetBonCommandePDF()` →
  `LECATALOGUE_WEB\FichierXLS\Cata<PROVENANCE>.pdf` (p.3138) et journalise `HST_BONCOMMANDEPDF` (Catalogue, l.29754).
  Aucun courriel.

### 4.5 ProfilClient2 — courriel individuel à un client catalogue (p.577-579)

- **Déclencheur** : page d'administration ProfilClient2 (fiche d'un client `Client`), clic `Bouton2` ; confirmation
  navigateur ; sujet obligatoire. Champs : `sujet` (→ `Client.Sujet`), `textecourriel` (→ `Client.TexteMemo`, mémo),
  `Combo1` = liste des 3 courriels du client (p.578, l.16297-16299), interrupteur `Batch` (Cellule7, libellé « Ne
  pas envoyer de courriel dans l'envoi en "batch" », p.14905 ; sauvegardé inversé : `goClient:SetBatch(Batch=0)`).
- **Expéditeur** : `gsMailInfo`. **Destinataire** : adresse choisie dans `Combo1`. Login/mot de passe SMTP passés
  **vides** (`m_sLogin=""`, `m_sPassword=""`) : anomalie probable (fonctionne seulement si le relais accepte sans
  authentification).
- **Sujet** : saisi. **Corps** : HTML en dur (logo + texte saisi, RC→`<br>`). Les champs `sujet`/`textecourriel`
  sont persistés dans la fiche client et servent de brouillon réutilisable.
- **PJ** : aucune. **Journalisation** : `CUTILS::TraceLog(goDllUtils:m_sTrace)` (trace SMTP verbose) si succès.

### 4.6 Batch — envoi en lot aux clients du catalogue (p.955-1023)

- **Accès** : page `Batch` ; le lien `Image2` de TableClient qui l'ouvrait est **commenté** (p.1236). Aucune autre
  `PageAffiche(Batch)` trouvée dans le dossier : page vraisemblablement **inaccessible** depuis l'interface (voir
  §Points non vérifiés).
- **Déclencheur** : clic `Bouton2` (Cellule5), confirmation navigateur, sujet obligatoire. `Sélecteur1` : texte ou
  HTML (RC→`<br>`).
- **Boucle** : `goClient:bLitPremier("Nom")` … pour chaque client avec `isBatch()` vrai, et pour chacun de ses 3
  courriels non vides → `EnvoiCourriel(nJour, sMail, sujet)` (procédure locale p.1022).
- **Mécanisme** : **natif PC SOFT** `EmailOuvreSessionSMTP(gsMailInfo, gsServeurSMTP)` sans authentification ni
  port/TLS, puis `Email.*` + `EmailEnvoieMessage`. Avec le relais actuel (587/TLS + login) cet envoi **échoue
  très probablement** (interdit en Linux de toute façon).
- **Expéditeur** : `gsMailInfo`. **Sujet** : saisi. **Corps** : HTML en dur : logo, texte saisi, « Il vous reste N
  jour(s) à votre abonnement » (`goClient:nGetJourRestant()`, p.3020).
- **Journalisation** : lignes ajoutées à `ZoneRépétée1` à l'écran seulement.

### 4.7 AAConfigure — envoi en lot aux clients AAClient (centre de mise à jour) (p.1721-1724)

- **Déclencheur** : page d'administration AAConfigure (versions des logiciels + texte d'envoi), clic `Bouton1`
  (Cellule3) après confirmation « Vous allez envoyer un email en BATCH… ».
- **Gabarit** : champ `haut` chargé depuis le fichier HFSQL **`Envoi`** (`HLit(Envoi,1)`, rubrique `Haut`, mémo) et
  réécrit (`goEnvoi:bModifie()`) avant l'envoi. `Envoi` ne contient qu'un enregistrement ; les rubriques
  `ligne1..4`/`bas` ne sont plus utilisées (commentées).
- **Boucle** : `HFiltre(AAClient, Nom, …)` / `HLitPremier` … tous les AAClient avec `NoEmail <> 1`, trois
  courriels chacun via `goAAEMail:bEnvoiMessage`. **Aucun filtre** sur abonnement actif, école, webmaster, etc.
- **Expéditeur** : `gsMailInfo`. **Sujet** : « Centre de mise à jour de L'ESTIMATEUR GÉNÉRAL ».
- **Corps** : HTML en dur : `haut`, « Il reste N jour(s) à votre abonnement » (`DateFinAbonnement`), lien
  `http://ADDR_SITE + PATH_DOWNLOAD + "=" + AAClient.Login` (lien de connexion au centre de mise à jour **avec
  le login en clair dans l'URL**), bannière `HTTP_ANIM_ESTIM`.
- **Journalisation** : `ZoneRépétée1` à l'écran ; `Info`/`Erreur` récapitulatifs. Rien en base.
- **Suite du code (p.1724)** : création d'un fichier `fRepWeb()+"RevisionAbonne.txt"` via `CEnvoiEMail`
  (`bCreationMessage(REVISION_ABONNEMENT, …)` p.3457-3460 : lignes `Type=`, `Sujet=`, `Param,1=NJOUR,AAClient.datefin`,
  `Param,2=AACLIENT.LOGIN`, `Mess=[[<html>…]]` avec `%1`/`%2`), puis `bDemarre(sFic)` = `LanceAppli(gsNomProgEnvoi
  + " \"fichier\"")`. `gsNomProgEnvoi` n'est **jamais affecté** (déclaré p.120 seulement) → `LanceAppli("" …)`
  échoue et affiche une erreur. Mécanisme d'externalisation vers un exécutable Windows jamais finalisé ;
  `bDifferenceClient` (type 2) n'a aucun appelant. **Code mort à ne pas migrer.**

### 4.8 AAFicheClient2 — courriel à un client AAClient (p.2853-2855)

- **Déclencheur** : fiche client (administration), clic `Bouton2` (Cellule8) ; validations navigateur : login,
  mot de passe, au moins un des interrupteurs `INT_COURRIEL1..3` coché avec adresse non vide ; confirmation.
  Exécute d'abord `BTN_SAUVE` (sauvegarde de la fiche).
- **Expéditeur** : `gsMailInfo`. **Destinataires** : `AAClient.Courriel/2/3` selon interrupteurs.
- **Sujet** : champ `SAISIE2`. **Corps** : HTML en dur : `saisie1` (RC→`<br/>`), « Il reste N jour(s) à votre
  abonnement » (`SAI_JOURRESTANTS`), lien centre de mise à jour avec login, bannière.
- **PJ** : aucune. **Journalisation** : `Info` récapitulatif seulement.
- Les lignes 84466-84485 (AARenouvelle) sont la version commentée du même code.

### 4.9 AARenouvelle — renouvellement de licence (p.2439-2461) : **aucun envoi**

- Initialisation p.2457 : charge le gabarit `goConfig:m_sRepBase + "Renouvellement.html"` (fichier sur disque dans
  le répertoire de la base, lu par `fOuvre/fLit`) dans `SAI_MESSAGE` ; à défaut, texte par défaut en dur avec
  marqueurs `@titre`, `@nom`, `@datefin`. `SAI_DESTINATAIRE` initialisé à l'adresse de contact de l'entreprise.
- `Bouton1` : **tout le corps est commenté** (ancien envoi en lot identique à AAConfigure + `CEnvoiEMail`). La page
  ne fait donc rien d'autre qu'afficher le texte.
- **Prix/détail** : la structure `stDETAILRENOUV` (code projet p.112-113 : totaux e-Plans mono/multi/Or
  achat/location, total achat, total location, EG achat/location, montant SDP, `m_sListe` = lignes de détail
  `libellé TAB prix RC`) est remplie par `mDetailRenouvellement` (p.3943-3954) / `mAjoutDetail` (p.3942-3943) et
  `mMontantRenouvellement` (p.3954-3957) à partir des grilles `[LISTEPRIX]`/`[PRIX_LOCATION]` du INI
  (`GlobInitPrixAchat`/`GlobInitPrixLocat`). Utilisée par AATableClient (`stResult`, l.52923, 53474) et
  AAFicheClient2 (`RemplitTable2(stResult)`, l.101021, 101662) pour **afficher** le détail à l'écran, et par
  `EnvoiTirage`/`CouponTirage` pour calculer le nombre de coupons. Aucun courriel de renouvellement n'est généré
  par le site.

### 4.10 AATableClient — listes et campagnes (p.1561-1601)

- **`BTN_LISTABON`** (p.1569-1572) : parcourt `AAClient` (`isClientAutorise`, abonnés non webmaster non école,
  date de fin ≥ 2020-10-18 en dur), calcule le prix de renouvellement (`mMontantRenouvellement`) et des tranches
  de coupons, écrit `goAAClient:sGetRep(Vrai)+"ListAbon.csv"` (CSV `;`, trié via `CZoneMem`), puis l'envoie en
  **pièce jointe** par les fonctions **natives PC SOFT** (`EmailOuvreSessionSMTP(gsMailInfo, gsServeurSMTP)`,
  `Email.Attache[1]`) : expéditeur `gsMailInfo`, destinataire = champ `SAI_MAILDEST` (initialisé en dur à
  l'adresse d'un dirigeant, p.1576), sujet « Liste des abonnés au AAAA/MM/JJ », corps « ci-joint la liste ».
  Même réserve qu'en 4.6 (échec probable avec le relais actuel).
- **`BTN_ENVOICONCOURS`** (p.1566-1569) : entièrement commenté (prototype d'`EnvoiTirage`).
- **`LIEN_STAT`** (p.1575-1576) → procédure locale `Statistiques1(goConfig:m_sRepBase, Faux)` (p.1601-1630) :
  module « statistiques » (41 colonnes, totaux achats/locations/SDP par version et options) qui écrit un fichier
  dans le répertoire de la base ; c'est la version **vivante** de la procédure globale `StatistiquesXXX`
  (p.4022-4050, neutralisée). Pas de courriel.
- Procédure locale `AjoutCourriel` (p.1581-1582) : nettoyage d'adresses (espaces, `@`) lors de la constitution de
  listes CSV ; `Trace(...)` des anomalies.

### 4.11 ParamSMTP `BTN_TEST` (p.1797-1799) — voir §2.5. Sujet « Test », corps HTML minimal, destinataire
`[SMTP] DestTest`, expéditeur `[SMTP] Sender`.

### 4.12 `TraiteConference` — formulaires du site estimation (p.4061-4065)

- **Déclencheur** : HTTP `Type=conference|commestim|contestim` (dispatch p.131), paramètres de page lus par
  `sAjoutParam` (p.4003-4004 : `PageParamètre(sMot1)` ou `sMot2`). Ces requêtes viennent d'un **site web
  externe** (formulaires du site estimation) — non vérifié.
- **Persistance** : fichier HFSQL **`COURRIELS`** via `goCourriels` (classe `CCourriels` p.3713-3717 :
  `TYPE_COURRIEL` = 1 `CAFE_CONFERENCE`, 2 `CONTACT_ESTIME`, 3 `COMMANDER` ; société, courriel, nom, prénom,
  téléphone, `AUTRE_INFO` (mémo, champs concaténés par `|`), `TimeStamp` AAAAMMJJHHMMSS tronqué à 17).
- **Expéditeur** : adresse « info » de l'entreprise en dur. **Destinataires** : `[CONFERENCE] Courriel1` (défaut
  = la même adresse info) et `Courriel2` si non vide.
- **Sujet** : `[CONFERENCE] Sujet|Sujet2|Sujet3` (défauts « Inscription café conférence », « Nous Contacter »,
  « Pour Commander »). **Corps** : texte brut « Date … Heure … » + lignes « Libellé: valeur ».
- **Journalisation** : `LogEstimation` → `AALogEstime.log` (réception et erreurs) ; bloc `QUAND EXCEPTION`.

### 4.13 `ReceptionException` — courriel d'exception (p.3966-3971)

- **Déclencheur** : HTTP `Type=newexcept&Param=<zip logs>&project=<zip projet>` envoyé par l'Estimateur Général
  (préfixe `E`) ou e-Plans (préfixe `P`) après dépôt des fichiers dans le répertoire export
  (`goConfig:sGetRepExport()`). Le dispatch (p.138) appelle ensuite `SupprimeAncienFichiers` **sans** condition
  d'heure.
- **Traitement fichiers** : déplace les zips vers `<parent de export>\Exceptions\` ; ouvre le zip (`zipOuvre`,
  WDZ/zip PC SOFT), extrait `Exception.txt` ou `ComputerInfo.txt`, lit les lignes (extrait le login client après
  « Machine: … / »), supprime le fichier extrait ; détecte `Defauts.zip` dans le zip projet ; extrait le numéro de
  projet du nom du zip.
- **Expéditeur** : `[SMTP] Sender` (défaut noreply) ; `gsMailInfo` est **écrasé** par « General Estimator » (sert
  de X-Mailer) — effet de bord sur la variable globale.
- **Destinataires** : liste `[CORRESP] CourrielDstExcept` (séparateur `;`, défauts en dur = 3 adresses internes),
  **un envoi par adresse**, 2 essais, `m_bCodHex=Vrai`.
- **Sujet** : « Reception exception e-Plans | l'Estimateur Général », ou « Reception logs … », ou « Reception
  projet N … / dossier N … », + « et défauts ».
- **Corps** : texte brut : « Lien vers les logs » + URL publique
  `www.lecatalogue.ca/lecatalogue_web/Exceptions/<zip>` (+ lien projet), « Info fiche client » (nom, téléphones,
  courriels du client AAClient retrouvé par login), contenu du fichier d'info.
- **PJ** : `oFic:sGetNomFic()` est ajouté, mais le fichier a été **supprimé** juste avant (`fSupprime`) →
  `bAjoutFichierAttache` renvoie faux (« File not found ») : en pratique **pas de pièce jointe**.
- **Journalisation** : `TraceLog` (AATrace.log) pour chaque étape et chaque envoi OK/KO.
- `ReceptionProjet` (p.3971-3974) : variante plus ancienne (`Info.txt`, destinataires en dur, `CAAEmail`),
  appelée par `Type=projexp` qui est **commenté** dans le dispatch → morte.

### 4.14 `EnvoiTirage` — campagne « 20 ans » (p.3901-3906) et procédures associées

- **Déclencheur** : HTTP `Type=envoitirage` (dispatch p.131), sans aucune authentification : **quiconque connaît
  l'URL peut lancer la campagne**. Dates de tirage **en dur** (2020-10-18 → 2021-03-18) : campagne ponctuelle
  terminée.
- **Étape 1** : parcourt `AAClient` (autorisés, abonnés, non webmaster, non école, date de fin ≥ 1er tirage),
  calcule le prix de renouvellement et le nombre de coupons (1 par tranche de 100 $, cumulés par tirage), écrit
  `goAAClient:sGetRep(Vrai)+"ListeEnvoi.csv"` (`NomCie;Courriel;NbCoupon;NbTotal`, + lignes « Aucun courriel »).
- **Étape 2** : SMTP dédié `[TIRAGE]` (serveur Office 365 par défaut, port 587, TLS, mot de passe chiffré
  `Crypte(...,encodePCS)` **avec une valeur par défaut en dur dans le code**). Prépare un premier courriel « Liste
  des envois au … » avec le CSV en PJ vers `[TIRAGE] Destinataire`. Charge le gabarit HTML
  **`c:\temp\InfoLettre.htm`** (`sGetPageTirage` p.4018-4019 : export d'une infolettre Cyberimpact, URLs d'images
  réécrites vers le site estimation) puis, pour chaque ligne du CSV, `sPageInfoClient` (p.4021-4022) remplace
  `[ENTREPRISE]`, `[#nombre]`, `[#Total]`, accorde « coupon(s) ». Reprise après `[TIRAGE] Last` ; `ModeTest` →
  2 envois max vers le destinataire interne ; throttling `Multitâche(360000/60)` (≈ 60/h) ; bilan final « Envoi
  terminé » vers destinataire interne + développeur.
- **Anomalie majeure** : dans la boucle comme pour le bilan, **aucun `bEnvoyerMail2` n'est appelé** : les messages
  sont construits (`sMessage`) mais jamais envoyés. Seul le premier courriel (liste) a `bAjoutFichierAttache`/
  `bAjoutDestinataire` sans envoi non plus. Soit le code a été volontairement désactivé après la campagne, soit
  l'envoi se faisait par un autre moyen. Les fonctions `EmailLitTimeOut` y figurent toujours (liste p.143).
- `CouponTirage` (p.3878-3881) : génère la liste des coupons individuels (`ListeEnvoi.csv`, un par coupon), appel
  commenté en mode test (p.124). `ListeCourriel` (p.3936-3937) : extrait les courriels uniques des AAClient dans
  `Courriels.csv` (appel commenté p.124). Outils ponctuels du développeur.

### 4.15 `TestCourriel(pDllUtils)` (p.4058) : courriel « Test courriel » vers l'adresse du développeur ; appel
commenté dans le code projet (p.123). Debug.

### 4.16 Désabonnement d'infolettre — `PAGE_UNSUBSCRIBE` (p.2149-2177), `PAGE_FINDESABON`, `PAGE_ERRDESABON`

- **Déclencheur** : HTTP `Type=unsubscribe&Param=<jeton>&email=<adresse>` (dispatch p.132), lien placé dans les
  infolettres envoyées par un **autre outil**. Le jeton = `Crypte(adresse, <clé en dur>, compresseChaîneCourte,
  encodePCS)` (format PC SOFT propriétaire) ; la page le déchiffre et le compare à l'adresse (p.2173) ; si
  différent, bouton grisé.
- **Action** `BTN_UNSUBSCRIBE` → `Desabonne(gsMail, 3)` (p.2176-2177) : ouvre un fichier HFSQL **externe**
  `COURRIEL.FIC` (`HDéclareExterne`, répertoire `[PREPARENVOI] REPBASE`, défaut `c:\EnvoiBern`), ajoute ou marque
  `COURRIEL_EXCLUS=Vrai` (rubriques `COURRIEL_ADDR`, `COURRIEL_SOCIETE`), copie le fichier vers
  `[PREPARENVOI] REPSAVE`, puis affiche `PAGE_FINDESABON` (qui fait `FinProgramme()`). `PAGE_ERRDESABON` n'est
  affichée nulle part dans le code lu (non vérifié). `bTraiteCourriel` normalise l'adresse (minuscules, guillemets,
  cas particulier d'un fournisseur sans `@`).
- **Aucun courriel envoyé** ; journalisation `TraceLog`. Ce fichier `COURRIEL` **n'est pas dans l'analyse** (hors
  des 42 fichiers) : dépendance vers une base externe de l'outil d'infolettre.

### 4.17 Salle de plans (SDP) et invitations aux sous-traitants : **le site n'envoie pas de courriel**

- `PAGE_PROJET` (p.1857-1971) affiche la salle de plans à un intervenant ; `LIB_COURRIEL` est un simple lien
  `mailto:` côté navigateur (p.1956) ; `BTN_ENVOI` (p.1956-1957) enregistre la **réponse** du sous-traitant
  (`CInterven:SetReponse` 1 Oui/2 Non/3 Peut-être, `SetReponseTS`, `SetFromEG(Faux)`) dans `INTERVEN` de la
  salle et une stat `OP_REPONSE` dans `SDPSTAT`, après captcha. Timer navigateur `TransfertFichier` (130 cs)
  pour le suivi des téléchargements.
- `PAGE_NUMSDP2` (p.2127-2148) déchiffre le paramètre `ans` (jeton `Crypte(..., compresseChaîneCourte, encodePCS)`
  avec une clé en dur, p.2145) pour afficher la réponse ; `bConstructionPage` (p.3822-3828) construit
  la page.
- Les invitations elles-mêmes (courriels aux sous-traitants avec lien `?Type=numsdp&Param=…&ans=…`) sont
  préparées et envoyées par l'**Estimateur Général** (poste client) ; le site reçoit en retour les listes
  d'intervenants (`Type=sdpintv` → `RecupInfoInterven` p.3983-3986 : zip `<timestamp>Interv.wdz` dans
  `…\ImportInterven\`, `CInterven:bAlimBase`) et les réponses (`Type=bid` → `RecupReponseInvitation` p.3986-3988 :
  `<timestamp>Ret.wdz`, `bGetReponse` → fichier `.res` + témoin `.fin` dans export). `Type=answer` →
  `ReponseIntervenant` ne fait qu'un `TraceLog`. `ReponseInvitation`, `SDPChangeReponseXX`, `TraiteReponsePDF`
  sont vides/commentées.

### 4.18 Procédures d'envoi mortes

`EnvoiCourrielXX` (p.3900-3901, corps vide), `bGlobEnvoiVerifxx` (p.3856-3857, « Différences », tout commenté),
`CEnvoiEMail:bDifferenceClient` (aucun appelant), `ReceptionProjet`, `AARenouvelle.Bouton1`,
`AATableClient.BTN_ENVOICONCOURS`, bloc de test p.129.

---

## 5. Fichiers de données et journaux liés aux courriels

| Fichier / journal | Rôle réel | Écrit par | Lu par |
|---|---|---|---|
| `COURRIELS` (HFSQL, 10 rubriques) | Journal des **demandes reçues** des formulaires du site estimation (conférence, contact, commande) ; pas un journal d'envois | `TraiteConference` | aucune page du site (non trouvé) |
| `Envoi` (HFSQL, 7 rubriques) | Un seul enregistrement : gabarit `Haut` du courriel en lot d'AAConfigure ; `ligne1..4`, `bas` inutilisés | AAConfigure | AAConfigure (`HLit(Envoi,1)`) ; `goEnvoi` fermé dans `FermeTout` p.3910 |
| `Commande` (HFSQL) | Bons de commande saisis sur Commander | Commander | TableClient/ExcelClient ? (non vérifié) |
| `Historique` (HFSQL) | `HST_BONCOMMANDESEND=1`, `HST_BONCOMMANDEPDF=13`, `HST_FINABONNEMENT=12`, `HST_PASSWORD=9` (constantes p.3144 ; `HST_PASSWORD` sans appelant trouvé) | Commander, Catalogue, Demonstration (l.45133) | LogList |
| `Client.Batch`, `Client.Sujet`, `Client.TexteMemo` | Exclusion de l'envoi en lot ; brouillon de courriel par client | ProfilClient2 | Batch, ProfilClient2 |
| `AAClient.NoEmail` | Exclusion de l'envoi en lot AAConfigure | AAFicheClient2 | AAConfigure |
| `PROVENANCE.Courriel` | Destinataire des formulaires Contact/Commander (par partenaire) | `CProvenance:bInitTable` (valeurs en dur) | `CConfigCat:SetProvenance` |
| `COURRIEL.FIC` (externe, hors analyse) | Liste d'exclusion de l'infolettre | PAGE_UNSUBSCRIBE | outil d'infolettre externe |
| `AATrace.log` (`c:\WebSite\Traces\`, code projet p.118-119) | Trace générale, dont chaque tentative d'envoi via `CEmail`/`CDllUtils` (expéditeur, destinataires, serveur, login en clair !) | `TraceLog` → `CBasicObjet::LogGeneric` p.3241 (verrou `.lock`) | personne (fichier) |
| `AALogEstime.log` | Formulaires estimation (`LogEstimation`) | `TraiteConference` | — |
| `ListAbon.csv`, `ListeEnvoi.csv`, `Courriels.csv` (répertoire de la base, `goAAClient:sGetRep(Vrai)`) | Extractions ponctuelles | AATableClient, EnvoiTirage, CouponTirage, ListeCourriel | envoyés en PJ / lus par le développeur |
| `RevisionAbonne.txt` (`fRepWeb()`) | Fichier d'ordre pour un programme externe jamais configuré | `CEnvoiEMail` | — (mort) |
| `Renouvellement.html` (répertoire de la base) | Gabarit affiché par AARenouvelle | développeur (manuel) | AARenouvelle |
| `c:\temp\InfoLettre.htm` | Gabarit de la campagne 20 ans | développeur (manuel) | `sGetPageTirage` |

---

## 6. Traitements en lot, purges et « planification »

| Traitement | Où | Déclencheur réel | Condition d'heure | Ce qu'il fait |
|---|---|---|---|---|
| `SupprimeAncienFichiers(sRepExport)` p.4050-4051 | dispatch `export`/`export14` (p.138) et `newexcept` (p.138) | requête HTTP d'un logiciel client | `Gauche(HeureSys(),2)>="20"` pour export ; **aucune** pour newexcept (le `SI` est commenté) | supprime dans le répertoire export les `*.txt`, `*.res`, `*.fin` dont la date/heure est antérieure à l'heure courante (fichiers d'échange EG↔site) |
| `SupprimeAncienneSalle()` p.4051-4052 | dispatch `creatsdp` (p.133) ; `CreationListeClient` (p.3891-3892, `Type=sdpcli/sdpacli/sdpscli`) ; `RecupDirectorySDP` (p.3976, `Type=sdplog/sdpmaj`) | ouverture d'une salle de plans par un visiteur ou requête de l'Estimateur Général | `Gauche(HeureSys(),2)>"20"` (donc à partir de 21 h) | sous verrou `bBloqueOper`, parcourt `SDPINFO` par `ClE_DELTIME` (salles non supprimées à date limite dépassée) et `ClE_DELFIC` (salles supprimées dont les fichiers restent) → `SupprimeUneSalle` ; `TraceLog` du temps si > 1 s |
| `SupprimeOld(sGeneric)` p.4053-4054 | `bRequeteRBQ` (p.3871, `Entrep_*.*` dans le répertoire RBQ) ; `RecupWWWCommon` (p.3993, `*.txt`, `*.res`, `*.fin` du répertoire export, `Type=wwwlog`) | requêtes RBQ et démarrage des logiciels clients | **aucune** : fichiers d'hier ou de plus de 5 minutes | purge des fichiers d'échange temporaires |
| `bCreatFicStat` p.3828-3829 → `bCreationFichierStat`/`2` p.3829-3856 | dispatch `sdpstat` | Estimateur Général | — | génère `<info>.txt/.zip/.res` des statistiques d'une salle (SDPSTAT/SDPFIC/CACHE*) dans export |
| `DispatchSDPStat` p.3897-3900 | appel commenté (p.130) | — | — | outil de migration des stats vers les répertoires de salles |
| `ReductionLogVersion` p.3998 | appel commenté (p.130) | — | — | nettoyage LOGVERSION |
| `Statistiques1` (AATableClient p.1601) / `StatistiquesXXX` (p.4022, neutralisée) | clic `LIEN_STAT` ; appel `Statistiques(goConfig:m_sRepBase,Faux)` **commenté** en mode test (p.123, 124) | webmaster | — | statistiques de parc (licences, montants) écrites en fichier |
| Envois en lot (Batch, AAConfigure, EnvoiTirage) | §4.6, 4.7, 4.14 | clic webmaster / URL `Type=` | — | boucles synchrones dans la requête HTTP (risque de timeout ; `Multitâche` pour EnvoiTirage) |
| `Timer(...)` navigateur | Commander p.26100 (`Reconnexion`, 5 min), AAFicheClient2 l.99529-99530 (`Reconnexion` 3 min, `Recalcul`), PAGE_PROJET (`TransfertFichier`) | page ouverte | — | garder la session / rafraîchir ; pas des traitements serveur |
| `ThreadExécute` | `CParcoursTous` l.105998 **commenté** ; `ThreadSuspend/Reprend` dans `bPageSuivante` (p.143, interdit Linux) | — | — | parcours asynchrone du catalogue, abandonné |

Aucune occurrence de tâche planifiée WebDev, `TimerSys`, service, ni de boucle au démarrage du projet (le code
projet se termine par le dispatch et `HSurErreur`). `HstDuree.log` (racine du projet) n'est référencé nulle part
dans le dossier technique (fichier de l'éditeur WebDev, vraisemblablement).

---

## 7. Gabarits HTML à la racine du projet (vestiges 2005-2006)

`MailCommande.htm` (« Bon de commande », export Word), `BonCommande.htm`/`BonCommande..htm`/`BonCommande.doc`,
`Bienvenue2..7.htm(l)`, `Bienvenue sur le site lecatalogue.htm`, `Conditions.html`, `Anciennes Conditions.html`,
`05-02-05 CONDITIONS.htm`, `Notre Mission*.html`, `Demonstration.htm`, `Le Catalogue.htm`, `PageAcc.htm` :
**aucun n'est référencé par le code** du dossier technique (grep sur les noms). Les corps de courriels sont tous
construits par concaténation de chaînes dans le code (charset iso-8859-1 déclaré, encodage réel Windows-1252,
entités HTML dans certains textes). Les champs HTML statiques des pages (`html1` de BonCommande, `HTML1` de
PAGE_UNSUBSCRIBE) sont dans les `.wwh`.

---

## 8. Implications pour la migration (synthèse)

1. Un seul service d'envoi (Nodemailer ou API transactionnelle) remplaçant les 4 voies ; configuration par
   variables d'environnement (serveur, port, TLS, identifiants, expéditeur noreply, destinataires internes :
   exceptions, contact, conférence). Supprimer toutes les adresses et mots de passe en dur.
2. Gabarits : 8 corps distincts seulement (mot de passe oublié ×2, contact, bon de commande, courriel client ×2,
   lot centre de mise à jour, exception, formulaires estimation, test) → templates (ex. MJML/React Email) UTF-8.
3. Ne **plus envoyer de mots de passe en clair** (Oubli, AADownload) : lien de réinitialisation à jeton ; corriger
   le destinataire d'Oubli (bogue actuel : part au partenaire).
4. Envois en lot : file d'attente/worker (BullMQ, cron) hors requête HTTP, avec journal des envois (nouvelle table
   `courriel_envoi` : type, destinataire, statut, horodatage) — inexistant aujourd'hui.
5. Purges (fichiers export, salles expirées) : vraie tâche planifiée quotidienne au lieu du déclenchement
   opportuniste « après 20 h ».
6. À ne pas migrer : CEnvoiEMail/RevisionAbonne, EnvoiTirage/CouponTirage/ListeCourriel (campagne 2020-2021),
   ReceptionProjet, bGlobEnvoiVerifxx, EnvoiCourrielXX, TestCourriel, AARenouvelle (sauf si l'on veut recréer un
   vrai courriel de renouvellement à partir de `stDETAILRENOUV`), page Batch (doublon d'AAConfigure, natif
   PC SOFT, inaccessible).
7. Désabonnement : dépend d'un fichier HFSQL externe (`COURRIEL.FIC`) et d'un jeton PC SOFT propriétaire → à
   remplacer par une table d'exclusion propre et un jeton HMAC, ou à abandonner si l'infolettre externe disparaît.
8. `Type=conference|commestim|contestim` : point d'entrée public non authentifié recevant des formulaires d'un
   autre site → à conserver seulement si ce site existe encore (vérifier).

---

## Points non vérifiés / incertitudes

- **Page Batch inaccessible ?** Le seul lien trouvé (`Image2` de TableClient) est commenté ; une `PageAffiche`
  dynamique par nom de chaîne ou un accès direct par URL `…?Batch` reste possible (le dispatch fait
  `PageAffiche(AADownLoad)` pour le paramètre `AADownLoad` seulement). À confirmer dans WebDev.
- **Fonctionnement réel des envois natifs PC SOFT** (Batch, BTN_LISTABON) avec le relais SMTP actuel
  (587/TLS/authentifié) : déduit comme défaillant d'après les paramètres passés (`EmailOuvreSessionSMTP` sans mot
  de passe ni port) ; non testé.
- **EnvoiTirage** : l'absence d'appel `bEnvoyerMail2` dans la boucle pourrait être une coupure volontaire après la
  campagne ou une ligne perdue à l'impression (les coupures de ligne au saut de page ne sont pas toutes recollées).
  Vérifier dans l'éditeur WebDev avant de conclure.
- **Bogue du destinataire d'Oubli** (`goConfig:sGetDestinataire()` au lieu de `email1`) : lecture du code
  imprimé ; à confirmer en production.
- **ReceptionException sans pièce jointe** (fichier supprimé avant l'attache) : déduit du code ; à confirmer.
- **Origine des requêtes `Type=conference|commestim|contestim`** (site estimation ?) et existence actuelle de ce site.
- **Qui envoie les invitations SDP** : déduit de l'architecture (fichiers `Interv.wdz`/`Ret.wdz` déposés par le
  logiciel) ; le code de l'Estimateur Général n'a pas été consulté.
- **PAGE_ERRDESABON** : aucune `PageAffiche(PAGE_ERRDESABON)` trouvée ; peut-être affichée par le gabarit ou
  un autre mécanisme.
- `sGlobCryptePasse`/`sGlobDecryptePasse` et `sCryptePasse`/`sDecryptePasse` (ParamSMTP) : utilisent `goDllUtils`
  (CCryptage2) ; l'algorithme est traité dans une autre annexe ; compatibilité entre les deux paires non vérifiée.
- **Lecture de `COURRIELS`** : aucune page de consultation trouvée ; la table pourrait être lue par un outil externe.
- `[TIRAGE] Last`, `[CONFERENCE] Sujet*`, `[COURRIEL] *` : clés lues avec valeur par défaut, absentes du INI au
  moment de la lecture (le code les écrit à la première exécution).
- Les montants/volumes réels d'envoi (nombre de clients avec `Batch`, `NoEmail`) n'ont pas été consultés (données
  clients interdites).
- Le fichier `HstDuree.log` à la racine est supposé être un journal de l'éditeur WebDev (non référencé).
