# Plan maître — migration de lecatalogue.ca (WebDev 18 → Next.js / Node / PostgreSQL)

Version 0.4 du 2026-10-01, **à valider avant la rédaction des sous-plans**.
Stratégie : **construction complète, puis bascule unique** (pas de mise en production intermédiaire, pas de
proxy vers l'ancien serveur). Annexes d'inventaire : `docs/plan/annexes/A1` à `A9` (§ 11). Les renvois « p. N »
désignent les pages imprimées du dossier technique `Docs/dossier-technique.txt` ; « A9 § n » renvoie à l'annexe
sur le protocole des logiciels clients.

---

## 0. Questions et décisions

Les réponses changent le découpage ou l'effort. Les décisions prises sont en **gras** ; l'hypothèse retenue en
attendant une réponse est en italique.

| # | Question | Pourquoi c'est bloquant | État |
|---|----------|-------------------------|------|
| Q1 | **Hébergement.** Où tourne le serveur WebDev aujourd'hui (machine, Windows + IIS ou Apache, version du serveur d'application : la production renvoie des ressources `/WD190AWP/`, donc WebDev 19 ?) ; qui contrôle le DNS et le TLS de `lecatalogue.ca` / `www.lecatalogue.ca` ; TTL actuel ; le nouveau serveur Linux sera-t-il ailleurs ? | Bascule et retour arrière par DNS (§ 8) ; installation de l'enregistreur sur l'ancien serveur (§ 7.1). | *Nouveau VPS Linux ; DNS sous ton contrôle ; TTL abaissé à 300 s une semaine avant.* |
| Q2 | **Canal FTP/SFTP des logiciels.** | Fait partie du contrat. | **Répondu par le code (A9 § 3)** : même hôte que le HTTP (`www.lecatalogue.ca`) ; **SFTP par défaut dans l'EG, FTP passif par défaut dans e-Plans**, bascule automatique vers FTP ; ports **10221 (FTP) et 10222 (SFTP)** par défaut, 21/22 en option ; trois comptes FTP enracinés (export, salles de plans, ancien import) et un compte SFTP « tous répertoires » qui fait `cd` vers des **chemins Windows** (`C:\WebSite\lecatalogue\LECATALOGUE_WEB\export`, `d:\SalleDePlans`) ou vers ceux annoncés par `FTPRepClient.zip` (EG seulement). Reste à confirmer sur un poste réel : les valeurs d'INI effectives (`FTPSECUR`, `TYPE_TRANS`) et une capture réseau. |
| Q3 | **Stockage et volumes.** Taille des salles de plans, de `export/`, `import/`, `RecupEntrep/`, des traces ; nombre de salles actives ; `ls -l LECATALOGUE_WEB/bd/LECATALOGUE/` (tailles seulement). | Fenêtre de bascule (copie des fichiers). Listages refusés à l'outil. | *Quelques Go ; rsync initial avant la fenêtre, delta pendant.* |
| Q4 | **Export HFSQL.** Une exécution par répétition (2 ou 3) puis une pour la bascule : 3 à 4 exécutions manuelles ? `AAClient.FIC` est protégé par mot de passe HFSQL (`PASS_CLIENT`, p. 118). Migrer l'historique des salles **supprimées** (mini-bases HFSQL par salle) ou seulement les salles actives ? | Mesure de la fenêtre. | *3 à 4 exécutions ; salles supprimées archivées en fichiers, non migrées.* |
| Q5 | **Mots de passe en clair** (`Client.Password`, `AAClient.Mot_de_Passe`, envoyés par courriel par `Oubli` et `AADownload`, journalisés en clair en cas d'erreur p. 3997). | Schéma, page Oubli, retour arrière. | **Décidé : conservés en clair, tels quels ; la sécurité fera l'objet d'un projet ultérieur.** Seule exception : plus de mots de passe dans les journaux. |
| Q6 | **Chiffrement PC SOFT `Crypte(…, compresseChaîneCourte, encodePCS)`.** A9 § 8.g confirme que c'est **l'Estimateur Général** qui génère les liens d'invitation (`?param=<réf>&cpl=<chiffré>` et `&ans=`) insérés dans les PDF et courriels : ils continueront d'arriver ainsi tant que les logiciels vivront. | Sans déchiffrement, la salle de plans ne saura plus identifier le sous-traitant qui répond. | **Répondu : pas de paires disponibles.** Le code de l'EG ne contient pas l'algorithme (`Crypte` est une fonction du moteur PC SOFT). Un générateur de paires en WLangage est fourni (`docs/plan/outils/GenerePairesCrypte.wl.txt`) : à exécuter dans WebDev avec les clés du code ; il produit aussi des échantillons `fCompacte` et WDZ (Q18). Rétro-ingénierie au lot 0 ; en cas d'échec, dégradation (la salle s'ouvre, la réponse Oui/Non devient anonyme, R6). |
| Q7 | **RBQ.** Recherche faite par `RecupEntrep.exe` (WinDev 12) sur **sa base HFSQL locale** (`COMPAGNIE.fic`, avril 2023). | Lot 5. | **Décidé : données ouvertes de la RBQ importées par un job.** `rbqcie` : corps entièrement commenté, ne fait rien ; `reqrbq` : écrit un fichier pour estimation.qc.ca ; A9 § 2.2 indique qu'**aucune des deux n'est plus appelée** par les logiciels → abandonnées (la route répond une page vide, R15). |
| Q8 | **Logiciels et commandes réellement utilisés.** Versions d'EG et d'e-Plans en service ; comptage par commande. | Sort des commandes douteuses. | *L'enregistreur (§ 7.1) donnera les chiffres. A9 § 2.2 établit déjà que `version`, `majversion`, `reqrbq`, `rbqcie` ne sont plus appelées et que `wwwcom`, `projexp`, `chilkat`, `testcharge` le sont encore par certains chemins.* |
| Q9 | **Pages mortes.** Abandon de : Catalogue2, Demonstration, AAConfirmer, AARenouvelle, PAGE_NUMSDPX, PAGE_STATSDP, PAGE_ERRDESABON, PageBrouillon, Batch, ListProcess, AAEstime12/AAModule12 (redirigées vers 14), et des 20 `.wwh` hors projet (A1 § 1). | Effort. | *Abandonnées.* |
| Q10 | **Désabonnement et infolettre** (`PAGE_UNSUBSCRIBE` → fichier HFSQL externe `COURRIEL.FIC` d'un outil d'envoi Windows). | Compatibilité ou abandon. | **Décidé : remplacement par un service d'infolettre (Mailchimp ou équivalent) qui gère le désabonnement.** PAGE_UNSUBSCRIBE / PAGE_FINDESABON / PAGE_ERRDESABON et `COURRIEL.FIC` non migrés ; `Type=unsubscribe` affiche une page de courtoisie (« ce lien n'est plus valide, écrivez à … »). |
| Q11 | **Racine statique et partenaires.** `https://lecatalogue.ca/` sert une page statique hors projet (liens `rbq/*.htm` en 404). Mini-sites `www/<partenaire>/` encore référencés ? PDF `FichierXLS/Cata*.pdf` à jour ? | Redirections (§ 2.4). | *Racine → nouvelle accueil ; mini-sites en statique ; PDF conservés.* |
| Q12 | **Comptes et outils de test.** Compte abonné catalogue, webmaster catalogue, compte `AAClient` avec salle de plans ; installation d'EG 14 et d'e-Plans de test. Les deux logiciels ont un mode « serveur de test » (`gbServeurTest`, hôte `mytest2.lecatalogue.ca`, A9 § 1) et des clés d'INI pour l'hôte, les ports (`FTPSECUR`) et le protocole (`TYPE_TRANS`). | Préproduction (§ 7.2). | *Fournis au lot 0 ; `mytest2.lecatalogue.ca` → préproduction.* |
| Q13 | **Courriel.** smtp2go conservé ? Second identifiant ? Les formulaires `conference|commestim|contestim` viennent-ils encore du site estimation.ca ? Bogue de `Oubli` (courriel au partenaire plutôt qu'à l'usager, l. 5336) : reproduire ou corriger ? | Lots 0 et 2. | *Oui ; oui ; conservés ; corrigé.* |
| Q14 | **Langue UK.** Catalogue français seulement à l'exécution ; seules les pages de salle de plans basculent FR/EN. Reproduire tel quel ? | Effort i18n. | *Oui.* |
| Q15 | **Mode session WebDev** (pas AWP) : une seule URL, état en mémoire, pages non adressables, timers de reconnexion. Confirmer et indiquer la durée de session. | Sessions ; redirections. | *Mode session ; 20 min d'inactivité.* |
| Q16 | **Fenêtre de bascule.** Créneau acceptable pour quelques heures d'indisponibilité (les logiciels appellent le serveur au démarrage) ; qui prévenir. | § 8.1. | *Un samedi soir, 20 h à 2 h ; avis une semaine avant.* |
| Q17 | **Site estimation.qc.ca.** Les logiciels y lisent `/version/last/FTPRepClient.zip` (répertoires FTP annoncés), `/version/last/updateinfo.zip` (fichier HFSQL `update_info.fic` protégé par mot de passe), les installeurs, et les liens d'invitation aux salles de plans pointent vers `www.estimation.qc.ca/<REPSDP>?param=…&cpl=…` (A9 § 4, § 8.g). Le site lecatalogue lit aussi `c:\WebSite\estimation.qc.ca\Version\Last\*.txt` (versions courantes) et y écrit `reqrbq/`. Contrôles-tu ce site et son hébergement ? Comment `www.estimation.qc.ca/<REPSDP>` atteint-il aujourd'hui la page de salle de plans (redirection, proxy, même machine) ? | Les liens d'invitation et la configuration FTP des logiciels passent par ce site : la bascule doit y prévoir une redirection et, si l'on change les chemins FTP, une nouvelle `FTPRepClient.zip`. | *Même propriétaire, même machine Windows ; une redirection de `<REPSDP>` vers la nouvelle salle de plans et une `FTPRepClient.zip` mise à jour sont ajoutées au plan de bascule.* |
| Q18 | **Formats PC SOFT propriétaires côté fichiers.** `export14` produit un `.wdz` **`fCompacte`** (compression propriétaire, lu par `fDécompacte` dans l'EG, A9 § 8.d) ; `sdpintv`/`bid` déposent des archives créées par `zipCrée(…, "x.wdz")` (format WDZ ou ZIP ? A9 § 10.1). Peux-tu produire dans WebDev des échantillons (le générateur fourni le fait) et un `.wdz` d'import réel ? | Sans `fCompacte`, `export14` ne peut pas être reproduit ; sans WDZ, `sdpintv`/`bid` ne peuvent pas être lus. | *Échantillons fournis ; rétro-ingénierie au lot 0 ; sinon R18.* |

---

## 1. Résumé

lecatalogue.ca est un site WebDev 18 (60 pages, 63 classes, ≈52 000 lignes de WLangage, 42 fichiers HFSQL
Classic) qui réunit **trois applications** et **un service machine** derrière une seule URL d'entrée
`/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` :

1. le **site catalogue** (vitrine FR, connexion des abonnés, consultation du catalogue de coûts rendu en images
   PNG, panier, bon de commande, administration « webmaster catalogue ») ;
2. le **centre de mise à jour** des logiciels (`?AADownLoad=<login>`) et l'administration des clients des logiciels
   (`AATableClient`, `AAFicheClient2` : licences, options, salles de plans, RBQ, notes, démos) ;
3. la **salle de plans virtuelle** publique (`?Type=numsdp&Param=<réf>&cpl=…`) où des sous-traitants consultent et
   téléchargent des plans et répondent Oui/Non/Peut-être, atteinte par des liens générés par l'EG via
   `www.estimation.qc.ca` ;
4. ≈45 **commandes `Type=`** appelées par e-Plans et l'Estimateur Général (EG) installés chez les clients, en
   **POST HTTP clair sur le port 80**, corps brut sans encodage URL, réponse ignorée (A9 § 2). **Le résultat est un
   fichier** déposé dans `export\` (ou la salle de plans) que le logiciel va chercher par **SFTP ou FTP** sur des
   ports non standard, après avoir déposé ses fichiers d'entrée par le même canal ; il sonde le fichier toutes les
   200 ms pendant 5 à 20 s, l'accepte quand sa taille est stable, puis le supprime. Les paramètres sensibles sont
   chiffrés par CCryptage2 (DLL maison, source C++ disponible) ; la recherche RBQ passe par un exécutable WinDev 12
   externe et sa base locale.

La cible est Next.js (App Router, TSX) + Node + PostgreSQL sur Linux, sans DLL ni composant PC SOFT. Le nouveau
site est construit **en entier**, par lots ordonnés par risque et dépendances, validé en préproduction contre le
**trafic réel enregistré** sur l'ancien serveur (HTTP et FTP/SFTP) et contre les logiciels de test, puis **basculé en
une fois** (DNS, FTP/SFTP, données, fichiers, redirection depuis estimation.qc.ca) pendant une fenêtre de gel, avec un
retour arrière préparé qui réinjecte dans HFSQL ce qui aura été écrit après la bascule.

---

## 2. Architecture cible

### 2.1 Vue d'ensemble

```
Internet ──:80 (HTTP clair, obligatoire pour les logiciels) et :443 (TLS, navigateurs)──▶ Caddy sur Linux
   │        ├── /LECATALOGUE_WEB/{bannieres,res,FichierXLS,*.gif,*.jpg,*.png,*.css,*.js} → statique
   │        ├── /www/<partenaire>/…                                                  → statique
   │        └── tout le reste                                                        → Next.js (Node 22 LTS)
   │               ├── app/(site)/…           pages FR (+ FR/EN pour la salle de plans)
   │               ├── app/legacy/route.ts    URL historique, GET et POST, corps/query brut (jamais de redirection
   │               │                            http→https sur ce chemin) : ?Type=x → handler x ; ?AADownLoad=… ; sinon accueil
   │               ├── lib/legacy/            ccryptage2 + entrelacement d'heure, sDecrypteInfo (CRC32 + blocs 684),
   │               │                           ccryptfic (DllNotify, blocs 129→1026), fcompacte, wdz, decrypte-pcsoft,
   │               │                           formats des fichiers réponse (1252/CRLF, écriture atomique), parseur ParamRBQ
   │               ├── lib/db/                Drizzle ORM → PostgreSQL 16
   │               ├── lib/storage/           racines : export/, import/, sdp/, exceptions/, traces/
   │               ├── lib/mail/              nodemailer → smtp2go, gabarits TSX
   │               └── jobs/ (systemd timers) purge export (horaire), salles expirées (quotidien), import RBQ, export14 long
   │
 :10221 et :21  FTP passif  ─┐  service de transfert (Node : ssh2 pour le SFTP, ftp-srv pour le FTP) partageant
 :10222 et :22  SFTP (mdp)  ─┘  lib/storage ; comptes « export », « sdp », « import » (enracinés) et « tous répertoires » ;
                                 émulation des chemins Windows (`\`, `C:`, `d:`) et du listage attendu par WinInet/Chilkat
```

L'ancien serveur WebDev n'apparaît pas dans l'architecture cible : il reste allumé mais **hors trafic** après la
bascule, le temps de la période de retour arrière (§ 8.5), puis il est arrêté. Le site **estimation.qc.ca** (Q17)
reste en place : il doit rediriger `<REPSDP>` vers la nouvelle salle de plans et continuer de servir
`/version/last/*`.

### 2.2 Choix techniques (recommandations)

| Sujet | Choix | Justification |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict, React Server Components, Server Actions pour les formulaires | Demandé ; les pages WebDev sont des formulaires à traitement serveur. |
| Accès BD | PostgreSQL 16 ; Drizzle ORM (schéma TS, migrations SQL versionnées) | Schéma explicite et lisible. Prisma acceptable. |
| Sessions | Cookie signé `HttpOnly` + table `session` ; une session par public (abonné, webmaster catalogue, client logiciel, admin logiciels) | Remplace l'état en mémoire du mode session WebDev et les timers de reconnexion (A1 § 0). |
| i18n | Catalogue : **français seulement**. Salle de plans : FR/EN par cookie et paramètre (`langue` dans `cpl`), libellés extraits de `TraiteLangue` et des « Messages multilangues » | Contrainte 2 ; A1 § 6. |
| URL historique | Route handler sur `/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` et `/WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` ; **GET et POST** ; corps et query string lus **bruts** (séparateurs `&` et `=` seulement, valeurs non décodées : `\ ] ^ _ { | } ~ DEL #` passent tels quels), noms de paramètres insensibles à la casse, `Type` en minuscules ; **servi en HTTP clair sur 80 sans redirection** ; réponse immédiate (page vide) ; traitements longs (`export14`) exécutés en arrière-plan après réponse | A9 § 2.1 et § 9.1 : WinInet refuserait une redirection http→https d'un POST ; le client accorde 15 s par défaut. |
| Fichiers réponse | Module `Storage` ; noms **identiques** (`<login>_<heure>.txt` avec l'heure reçue recopiée telle quelle, `ResInf_<id>.res` puis `.fin`, `Entrep_<id>.res` puis `.fin`, `<login>.lst/.fst`, `<login> <cat>.exp/.wdz`, `<generic>.res/.zip`, `<nom>.fin/.res`) ; **écriture atomique** (fichier temporaire puis `rename`) ; `.res` avant `.fin` ; disponibles en moins de 5 s ; casse exacte | A9 § 3.4 et § 6 : le client accepte un fichier dont la taille est stable sur deux listages à 200 ms et non nulle. |
| Transfert de fichiers | **Service Node** : SFTP par `ssh2` (authentification par mot de passe, pas de clé d'hôte vérifiée côté client), FTP par `ftp-srv` (passif, binaire, `LIST` au format attendu par `FtpFindFirstFile`, noms avec espaces, transcodage des accents) ; ports 10221/10222 et 21/22 ; comptes enracinés ; **émulation des chemins Windows** : `cd \`, composantes `C:`, `WebSite`, … résolues vers les racines Linux. Variante : vsftpd + OpenSSH avec répertoires nommés `C:` et `d:` si les tests du lot 0 montrent que les DLL clientes l'acceptent | A9 § 3.3 et § 9.2-9.3 : e-Plans ignore `REPEXPORT=` et conserve le chemin Windows par défaut ; un service maison donne la maîtrise du listage et des chemins. |
| `FTPRepClient.zip` | Nouvelle archive publiée sur estimation.qc.ca à la bascule (Q17) annonçant les chemins choisis ; les chemins Windows par défaut restent émulés pour e-Plans et les postes non mis à jour | A9 § 4. |
| Encodage des fichiers échangés | `iconv-lite` : écriture Windows-1252, CRLF, sans BOM ; lecture 1252 | A2 § 1.5, A9 § 6. |
| Formats propriétaires | CCryptage2 + entrelacement d'heure : port TS. `sDecrypteInfo` : port TS. CCryptFic/DllNotify `bCrypte`/`bDecrypte` : port TS depuis `FNotify V9/DllNotify/CCryptage.cpp`. **`fCompacte`/`fDécompacte`** (`.wdz` d'`export14`) et **WDZ** (archives de `sdpintv`/`bid`) : rétro-ingénierie au lot 0 à partir d'échantillons (Q18). **`Crypte` PC SOFT** (`cpl`/`ans`) : rétro-ingénierie au lot 0 (Q6). | Contrainte 5 ; A9 § 9.5. |
| Courriel | nodemailer → smtp2go ; 8 gabarits (A6 § 8) en TSX ; table `courriel_envoi` | Remplace DllUtils/CSmtp/LibreSSL, `Email*` natifs. |
| Rendu du catalogue | HTML/CSS au lieu de PNG par ligne (`LibPNG.dll`) ; même mise en page | Contrainte 2 ; l'anti-copie par image disparaît (à confirmer). |
| Excel/PDF | `ExcelClient` → export CSV ; PDF statiques conservés | A8 § 1. |
| RBQ | Table `rbq_compagnie` chargée depuis les données ouvertes par un job ; recherche SQL (`pg_trgm`) ; `Entrep_<id>.res/.fin` au format lu par l'EG (A9 § 8.e) | Remplace RecupEntrep.exe, Chilkat, psapi. |
| Planification | systemd timers → scripts Node | Remplace le déclenchement « après 20 h ». |
| Journalisation | `pino` → un fichier par domaine + stdout ; **jamais de mot de passe** | Même granularité pour le soutien. |
| Tests | Vitest ; Playwright ; **harnais de rejeu différentiel** HTTP + FTP/SFTP (§ 6) | — |
| Déploiement | Docker Compose (caddy, next, postgres, transfert) ; secrets en variables d'environnement ; `pg_dump` quotidien + sauvegarde des fichiers ; préproduction identique | Le `.ini` disparaît. |

### 2.3 Ce qui n'existe plus dans la cible

`WD180Awp.exe`, `.awl`, contextes de session WebDev ; `DllUtils.dll`, `DllNotify.dll`, `LibPNG.dll`, LibreSSL,
`AppelDLL32`/`API(…)` ; `RecupEntrep.exe` et sa base ; HFSQL Classic (`HBloque`, `HSurErreur`, vues, réindexation,
mini-bases par salle, `HDéclareExterne`) ; chemins Windows réels (`c:\WebSite\…`, `d:\SalleDePlans`, `h:\…`, UNC) —
seule leur **émulation** dans le service de transfert subsiste ; registre, DDE, GDI, threads WebDev, `Multitâche` ;
`Crypte` PC SOFT pour les **nouveaux** liens du site (jeton HMAC) ; `lecatalogue.ini` (configuration d'environnement
+ table `parametre` pour `[LISTEPRIX]`/`[PRIX_LOCATION]`) ; `ListProcess`/`KillProcess` (`listprocess` et `killrecup`
répondent « OK » sans rien faire) ; le désabonnement maison et `COURRIEL.FIC` (Q10) ; `reqrbq`/`rbqcie`,
`version`/`majversion` (plus appelées, routes conservées avec réponse vide). Détail par élément : A8.

### 2.4 Redirections et continuité des liens

| Ancienne forme | Nouvelle cible |
|---|---|
| `/` (page statique « Bienvenue… ») | `/` nouvelle page d'accueil |
| `/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue` sans paramètre, `/WW70AWP/WW70AWP.EXE/CONNECT/LECATALOGUE` (lien « site web » des EG) | `/` |
| `…?AALogin=<provenance>` (mini-sites partenaires) | `/?partenaire=<prov>` |
| `…?AADownLoad=<login>` (courriels AAConfigure/AAFicheClient2) | `/mise-a-jour?login=<login>` |
| `http(s)://www.estimation.qc.ca/<REPSDP>?param=<réf>&cpl=…[&ans=…]` (PDF et courriels générés par les EG) | redirection 302 posée **sur estimation.qc.ca** vers `/salle-de-plans?param=…&cpl=…` (Q17) ; la route historique `…?Type=numsdp&Param=…` reste aussi servie |
| `…?Type=unsubscribe&Param=…&email=…` | page de courtoisie (Q10) |
| `…?Type=rbx&ParamRBQ=rbq_histo` | `/admin/rbq/historique` (authentifié) |
| `…?Type=<commande machine>&…` (POST) | **inchangé**, servi par la route historique |
| `/LECATALOGUE_WEB/FichierXLS/Cata<PROV>.pdf`, `/LECATALOGUE_WEB/bannieres/…`, `/logo.gif`, `/www/<prov>/…` | servis à l'identique |

---

## 3. Contrainte 3 révisée : construction complète, bascule unique

1. Les **lots** du § 4 sont des unités de construction : ordre de développement, livrables, critères d'acceptation.
   Aucun lot n'est mis en production seul. Aucun proxy vers l'ancien serveur, aucun partage de fichiers entre les
   deux serveurs, aucune double écriture.
2. La **préparation à la bascule** (lot 7, § 7) commence dès le lot 0 par l'enregistrement du trafic réel des
   logiciels sur l'ancien serveur (HTTP et FTP/SFTP), et se termine par des répétitions complètes en préproduction.
3. La **bascule** (lot 8, § 8) est une opération unique et planifiée : fenêtre, gel, migration, validation
   go/no-go, surveillance, retour arrière possible pendant une période définie, y compris pour les données écrites
   après la bascule.

---

## 4. Lots de construction

### 4.1 Liste et ordre

| Lot | Nom | Effort | Dépend de | Fichier |
|---|---|---|---|---|
| 0 | Socle : dépôt, Next.js/PG, service de transfert FTP/SFTP, gabarit visuel, chiffrements et formats PC SOFT (ports TS et rétro-ingénierie), courriel, CI, préproduction, **enregistreur de trafic sur l'ancien serveur** | XL | — | `01-socle.md` |
| 1 | Données : procédure d'export HFSQL (WebDev, manuelle, rejouable), chargeur PostgreSQL, vérifications, export inverse | L | 0 | `02-donnees.md` |
| 2 | Vitrine et pages publiques | M | 0, 1 | `03-vitrine.md` |
| 3 | Licences et versions : commandes de démarrage des logiciels, centre de mise à jour, administration des clients logiciels, exceptions, démos | XL | 0, 1, 2 | `04-licences.md` |
| 4 | Salles de plans | XL | 0, 1, 3 | `05-salles-de-plans.md` |
| 5 | RBQ | M | 0, 1, 3 | `06-rbq.md` |
| 6 | Catalogue des abonnés et import/export vers l'EG | XL | 0, 1, 2 | `07-catalogue.md` |
| 7 | Préparation à la bascule : préproduction complète, campagne de rejeu, répétitions de migration, plan de surveillance | L | 0 à 6 | `08-preparation-bascule.md` |
| 8 | Bascule et retour arrière | M | 7 | `09-bascule.md` |
| 9 | Après la bascule : observation, arrêt de l'ancien serveur, nettoyage | S | 8 | `10-apres-bascule.md` |

Les lots 4, 5 et 6 sont indépendants entre eux et peuvent avancer en parallèle après le lot 3.

### 4.2 Justification de l'ordre

- **Socle d'abord**, avec l'**enregistreur de trafic** (plus il démarre tôt, plus le corpus de rejeu est riche) et
  les **rétro-ingénieries** (`Crypte`, `fCompacte`, WDZ) dont les verdicts conditionnent les lots 4 et 6 ; le service
  de transfert FTP/SFTP est aussi un risque à lever tôt (émulation des chemins Windows face aux DLL clientes).
- **Données tôt** : le chargeur doit être éprouvé sur des exports réels ; les lots suivants développent sur des
  données réelles.
- **Vitrine** : petite et visible, elle fixe le gabarit réutilisé par les lots 3 à 6.
- **Licences avant RBQ et SDP** : `AAClient` est lu par `creatsdp`, par `isAutoriseWWW` et par l'administration ;
  `wwwlog` (démarrage de chaque logiciel, réponse semi-aléatoire) est la commande à rejouer le plus longtemps.
- **SDP et RBQ ensuite**, en parallèle : domaines fermés, la plus grosse dette Windows.
- **Catalogue en dernier** parmi les lots fonctionnels : le plus de pages, le rendu PNG, et les commandes
  `import`/`export14` dont les formats (`fCompacte`, CCryptFic) dépendent du verdict du lot 0.
- **Préparation, bascule, après-bascule** ferment la séquence.

### 4.3 Périmètre par lot : pages et commandes

Statuts (A1) : **A** active, **M** morte/doublon (non migrée), **S** système. Les 60 pages et les 45 cas du `SELON`
(p. 131-141) apparaissent chacun exactement une fois.

| Lot | Pages | Commandes `Type` | Pages mortes rattachées (non migrées) |
|---|---|---|---|
| 0 | TermineProg (S : réponse vide), PAGE_REFUS (S), PAGE_ADDRIP (S), WebDevOuiNon (S : remplacée par une confirmation navigateur) | `addrip`, `getdt`, `AUTRES CAS` (commande inconnue → trace + page vide ; blocage IP), `testcharge` (fichier `<param>.txt` minimal + `.fin`), `chilkat` (accepté, ignoré), `answer` (trace), `envoitirage` (page vide), `version` et `majversion` (plus appelées : page vide), `reqrbq` et `rbqcie` (plus appelées : page vide) | — |
| 1 | — | — | — |
| 2 | Accueil (vitrine ; le formulaire de connexion est câblé au lot 6), Mission, Conditions (texte), Contact, Commander, BonCommande, Partenaires, Demonstration3, PAGE_CONFIDENTIALITE, GestBan2 | `conference`, `commestim`, `contestim` | Demonstration (D), PageBrouillon (M) |
| 3 | AADownload, AAEstime14, AAModule14, AAConfEPlan, AATableClient, AAFicheClient2, AAInfoEcole, AAConfigure, PAGE_NOTES, PAGE_CLIENTDEMO, PAGE_HISTODEMO, PAGE_CLIEPLANS | `wwwlog`, `wwwcom`, `recinf`, `eplanmaj`, `estimmaj`, `delmono`, `newexcept` (et `projexp` encore émis par certains postes : accepté, zip archivé, courriel), `unsubscribe` (page de courtoisie) | AAEstime12, AAModule12 (redirigées vers 14), AAConfirmer, AARenouvelle, PAGE_UNSUBSCRIBE, PAGE_FINDESABON, PAGE_ERRDESABON, Batch |
| 4 | PAGE_NUMSDP2, PAGE_PROJET, PAGE_SDPDELETED, PAGE_DEPASSE, PAGE_DECONNECT, PAGE_LISTSDP | `creatsdp` (+ `AALoginHex`, `repcie`), `sdplog`, `sdpmaj`, `sdpdownload`, `sdplist`, `sdpcli`, `sdpacli`, `sdpscli`, `sdpdel`, `sdpstat`, `sdpintv`, `bid`, `numsdp` (avec `cpl`, `visu`, `ans`) | PAGE_NUMSDPX, PAGE_STATSDP |
| 5 | RBQ_HISTO, RBQ_ENTREP, RBQ_NOTFOUND | `rbq`, `rbx` (sous-commandes `verifnum`, `verifnum2`, `interv`, `interv2`, `rbq_histo` ; `listprocess`/`killrecup` sans effet) | ListProcess |
| 6 | Accueil (connexion), Accueil2, Catalogue, Assemblage, Panier, Oubli, Conditions (acceptation), ProfilClient2, TableClient, GestCat, LogList, ExcelClient, ParamSMTP (page de paramètres sans secret en clair) | `import`, `export`, `export14`, `liste`, `liste14`, `AADownLoad=<page>` (restreint aux pages connues) | Catalogue2 |
| 9 | — | — | les 20 `.wwh` hors projet (A1 § 1) : supprimés |

Couverture : 4 (lot 0) + 10 + 2 mortes (lot 2) + 12 + 8 mortes (lot 3) + 6 + 2 mortes (lot 4) + 3 + 1 morte (lot 5)
+ 13 + 1 morte (lot 6) − 2 (Accueil et Conditions comptées en 2 et 6) = 60 pages. Commandes : 45 cas du `SELON` +
`AUTRES CAS` + `AADownLoad` + `AALoginHex`, tous attribués ; les cas commentés (`verdisp`, `sdpflrep`) ne sont pas
reproduits ; `projexp` (commenté côté serveur mais encore émis par des postes, A9 § 2.2) est accepté au lot 3.

### 4.4 Périmètre par lot : tables

Toutes les tables basculent ensemble (lot 8) ; ce tableau indique dans quel lot chacune est **modélisée et
développée**.

| Lot | Tables | Remarques |
|---|---|---|
| 1 | schéma PostgreSQL complet des 42 fichiers (A5 § 8), chargeur, vérifications | `AAClient.FIC` avec mot de passe HFSQL ; mini-bases par salle |
| 2 | `Banniere2`, `Commande`, `COURRIELS`, `PROVENANCE` (configuration), `Envoi` (gabarit) | `Historique` reçoit les bons de commande |
| 3 | `AAClient`, `REPCOMMON`, `LISTFORM`, `VERSION`, `LOGVERSION`, `CLIENTDEMO`, `HISTODEMO`, `INFO_ECOLE`, `NOTE_CLIENT` | `FORMATION` et `LOGMODIF` jamais utilisées, non migrées ; `COURRIEL.FIC` externe abandonné (Q10) |
| 4 | `SDPINFO`, `INTRUSION`, `SDP_INTRUS`, `IPADDRESS` (journal), et par salle `SDPDESC`, `SDPSTAT`, `SDPFIC`, `INTERVEN`, `CACHEDICO`, `CACHEOPER` → tables uniques avec colonne `idsdpinfo` | fichiers de plans copiés à la bascule |
| 5 | `RBQ_ENTREP`, `RBQ_HISTO` ; nouvelle `rbq_compagnie` (données ouvertes) ; `COMPAGNIE.fic` externe abandonnée | `rbq` ancien lit `AAClient.RBQInterdit` et `ListeClient.txt` (→ table) |
| 6 | `Client`, `ClientCat`, `Multicat`, `Itemcat`, `LienAsmb`, `TRADES`, `TRADESTX`, `EQUIPELEM`, `TUNITE`, `TTYPUNIT`, `TTABCONV`, `TRESERVE`, `Historique`, `NOTE_CATCLIENT` | `import` remplace aujourd'hui physiquement les `.FIC` : devient une transaction SQL |

Total : 5 + 9 + 10 + 2 + 14 + 2 non migrées = 42.

### 4.5 Contenu attendu de chaque lot (résumé ; détail dans les sous-plans)

**Lot 0 — Socle (XL).** Dépôt Git, Next.js + Drizzle + PostgreSQL, Caddy (80 clair + 443), Docker Compose ;
préproduction (`mytest2.lecatalogue.ca`) ; gabarit visuel et dictionnaire des libellés extraits de `FR/*.htm` ;
route historique GET/POST à corps brut ; **service de transfert** FTP/SFTP (ports 10221/10222/21/22, comptes,
émulation des chemins Windows, listage WinInet/Chilkat, journal) testé avec l'EG et e-Plans de test en FTP **et**
SFTP ; **enregistreur de trafic sur l'ancien serveur** (§ 7.1) ; ports TS de CCryptage2 + entrelacement d'heure,
`sDecrypteInfo`, CCryptFic/DllNotify, validés par le déchiffrement du trafic enregistré ; **rétro-ingénierie** de
`Crypte` PC SOFT (`compresseChaîneCourte`, `crypteRapide`, `crypteAnsi`, `crypteSécurisé` + `encodePCS`), de
`fCompacte` et de WDZ à partir des échantillons du générateur (Q6, Q18), verdict go/no-go par format ; nodemailer et
bac à sable courriel ; CI ; sauvegardes. Acceptation : 100 % des `User` et des `www_*.txt` enregistrés sur une
semaine déchiffrés ; dépôt et lecture de fichiers réussis par les deux logiciels de test dans les deux protocoles ;
verdicts rendus.

**Lot 1 — Données (L).** Procédure WebDev d'export (XML ou CSV UTF-8 par fichier, `AAClient` avec son mot de
passe, mini-bases de chaque salle active) ; chargeur Node (décodage 1252 strict, `rtrim`, dates `AAAAMMJJ`, heures
`hhmm`, booléens, monétaires → `numeric`, mémos, bits de `Flags`) ; mots de passe conservés tels quels (Q5) ; schéma
complet avec clés étrangères déclarées et unicités équivalentes ; vérifications (§ 6.3) ; **export inverse** (CSV
`HImporteTexte`) ; chronométrage. Acceptation : chargement complet d'un export réel sans erreur ni perte, durée mesurée.

**Lot 2 — Vitrine (M).** Pages publiques FR fidèles (mêmes menus et textes), bannière par provenance, Contact et
Commander (courriels + `Commande`), PDF statiques, confidentialité, administration des bannières ; formulaires
`conference/commestim/contestim` ; redirections § 2.4. Acceptation : liste de contrôle champ par champ verte ;
courriels identiques dans le bac à sable.

**Lot 3 — Licences et versions (XL).** Reproduction à l'octet près de la réponse de `wwwlog` (première ligne
17/21/23 ou 24-100, `DateSys=`, `Auth=`, `REPEXPORT=`, lignes `COMMON=` à 12 champs `|`, versions lues aujourd'hui
dans `Version\Last` → table `VERSION`), lecture et déchiffrement des `www_<login>_<heure>.txt` à 21 champs TAB
déposés par les logiciels, `recinf` (`ResInf_*.res` texte clair puis `.fin`), `eplanmaj`/`estimmaj`, `delmono`,
`newexcept`/`projexp` (zip + courriel) ; centre de mise à jour (`AADownload` et ses trois pages de téléchargement
vers estimation.qc.ca) ; administration complète (`AATableClient`, `AAFicheClient2`, notes, démos, école, campagne
`AAConfigure`) ; grille de prix en table ; page de courtoisie `unsubscribe` ; suppression des comptes génériques et
mots de passe codés en dur (A1 § 4.2) ; plus de mots de passe dans les journaux. Acceptation : rejeu différentiel
vert sur 100 % des commandes du lot enregistrées, y compris la séquence FTP/SFTP (dépôt, sondage, suppression).

**Lot 4 — Salles de plans (XL).** Modèle unique en PostgreSQL ; stockage des plans déposés par SFTP/FTP dans
`<racine>\<repcie>\<salle>\…` (création de répertoires à la volée par le client) ; référence à 10 caractères ;
cycle de vie en job quotidien ; quotas et tarifs ; toutes les commandes SDP et leurs fichiers (`.txt` type 1 et 2,
`##1001-1005`, `##1-7`, `<generic>.res/.zip` avec `.txt` puis `.dic`, `<nom>.fin/.res` de `bid`) ; lecture des `.sdp`
et des archives `ImportInterven\*.wdz` ; pages publiques FR/EN (captcha, réponse Oui/Non/Peut-être, téléchargement) ;
anti-intrusion repensé mais mêmes seuils visibles ; `cpl`/`ans` déchiffrés si le lot 0 a réussi, sinon dégradation
(R6) ; redirection depuis estimation.qc.ca (Q17). Acceptation : rejeu vert ; parcours sous-traitant complet depuis un
PDF généré par l'EG de test.

**Lot 5 — RBQ (M).** Parseur `ParamRBQ` identique ; quotas et interdictions ; historique ; `Entrep_<id>.res/.fin`
au format lu par l'EG (A9 § 8.e) ; table des entreprises depuis les données ouvertes avec job ; pages
d'administration authentifiées ; `listprocess`/`killrecup` sans effet. Acceptation : l'EG de test affiche les mêmes
résultats qu'avec l'ancien serveur sur 50 recherches (à source de données égale).

**Lot 6 — Catalogue (XL).** Connexion, conditions, `Accueil2`, `Catalogue` (HTML au lieu de PNG), `Assemblage`,
`Panier`, `Oubli` (mot de passe envoyé comme aujourd'hui, Q5 ; destinataire corrigé, Q13), administration catalogue ;
commandes `import` (`.imp` + `.wdz` déposés → transaction SQL), `export14` (`.exp` + `.wdz` = CSV chiffré CCryptFic
puis `fCompacte`), `liste14` (`.lst/.fst`), `liste`/`export` v12. Dépend des verdicts `fCompacte`/WDZ du lot 0 (R18).
Acceptation : rejeu vert ; parcours abonné et webmaster complets ; un catalogue exporté par le nouveau serveur
s'importe dans l'EG de test et inversement.

**Lot 7 — Préparation à la bascule (L).** § 7. **Lot 8 — Bascule (M).** § 8.

**Lot 9 — Après la bascule (S).** Observation (§ 8.4) ; à l'issue de la période de retour arrière : arrêt de
l'ancien serveur, de ses FTP/SFTP et de l'enregistreur ; archivage des données HFSQL et des traces ; suppression
des 20 `.wwh` hors projet ; **purge des secrets en clair** dans les dossiers techniques imprimés (A9 § 10.4) ; revue
de sécurité ; mise à jour de `CLAUDE.md`.

---

## 5. Dépendances Windows : règle de traitement

Pour chaque dépendance recensée en A8 (34 familles) et A9 § 9.5 (formats), le sous-plan concerné indique
**remplacement** ou **suppression justifiée**. Aucune étape récurrente ne dépend de Windows. Exceptions bornées :
l'ancien serveur jusqu'à la fin de la période de retour arrière, l'enregistreur installé dessus (§ 7.1), l'export
HFSQL manuel (Q4). Hors périmètre mais à signaler : `updateinfo.zip` (fichier HFSQL produit à chaque version de
l'EG) relève du processus de livraison des logiciels, sur estimation.qc.ca (Q17).

---

## 6. Stratégie de tests

### 6.1 Rejeu différentiel du trafic réel (contrainte 1)

1. **Corpus réel** : trafic enregistré sur l'ancien serveur (§ 7.1) : requête HTTP brute (POST, corps brut),
   réponse brute, fichiers déposés par FTP/SFTP juste avant, fichiers produits juste après, lectures et suppressions
   qui ont suivi.
2. **Corpus construit** : avec l'EG et e-Plans de test (Q12), chaque commande dans ses variantes (login
   valide/invalide, abonnement expiré, démo, catalogue inexistant, salle expirée/supprimée, quota dépassé, FTP et
   SFTP, chemins Windows et chemins annoncés).
3. **Rejeu** : le harnais charge en préproduction l'export HFSQL pris **au même moment** que la capture, dépose les
   fichiers d'entrée par le même protocole, envoie la requête, lit les fichiers produits comme le ferait le logiciel
   (sondage à 200 ms, taille stable) et compare **octet par octet** avec l'enregistrement, en neutralisant uniquement
   les champs variables connus : date/heure, identifiant de session WebDev, **première ligne de `wwwlog`** (par classe
   17/21/23 ou 24-100), sel d'heure des chaînes CCryptage2 (comparaison sur le déchiffré), ordre des `COMMON=` si
   instable. Toute autre différence est un échec. Le délai de disponibilité du fichier est mesuré et doit rester
   sous 5 s.
4. **Campagne finale** (lot 7) : rejeu de l'intégralité du trafic enregistré, rapport de couverture (commandes,
   versions de logiciels, protocoles, cas d'erreur observés) ; critère go/no-go § 8.3.
5. **Sources de vérité** : code WLangage des procédures qui écrivent les fichiers (A2-A4) et code des logiciels qui
   les lisent (A9 § 8), confirmés par les captures.

### 6.2 Tests des pages (contrainte 2)

Captures Playwright de chaque page ancienne ; liste de contrôle des libellés, champs, boutons, messages et ordre ;
parcours de bout en bout.

### 6.3 Tests de données

Comptage par table ; somme de contrôle par colonne ; échantillon aléatoire de 50 enregistrements par table ; mémos ;
dates sentinelles ; blancs de fin ; bits de `Flags` ; connexion de chaque compte de test ; déchiffrement de toutes les
valeurs chiffrées ; **chronométrage**.

### 6.4 Tests unitaires du socle

CCryptage2 (paires, propriété aller-retour, longueurs modulo 3, octets > 127) ; entrelacement d'heure ;
`sDecrypteInfo` ; CCryptFic ; `fCompacte`, WDZ et `Crypte` PC SOFT sur les échantillons ; encodage 1252/CRLF ;
parseur de corps brut ; parseur `ParamRBQ` ; nommage et écriture atomique des fichiers ; service de transfert
(listage, chemins Windows, comptes) ; purges (horloge simulée).

---

## 7. Lot 7 — Préparation à la bascule

### 7.1 Enregistrement du trafic réel (installé au lot 0, actif jusqu'à la bascule)

Sur l'ancien serveur Windows, sans modifier le site WebDev :

- **HTTP** : relais local devant le serveur d'application (mitmproxy ou service Node), ou journalisation détaillée
  du serveur web, écrivant pour chaque requête vers `/WD180AWP/…` la ligne de requête, les en-têtes, le **corps brut**
  et la réponse complète. La capture confirme aussi **HTTP 80 ou HTTPS 443** (A9 § 10.1).
- **FTP/SFTP** : journaux des serveurs existants (connexions, commandes, fichiers, tailles, ports 10221/10222/21/22)
  et un **observateur de répertoires** (`export/`, `import/`, `SalleDePlans/`, `ImportInterven/`, `Exceptions/`) qui
  copie chaque fichier créé ou modifié dès son apparition, avec horodatage et empreinte, et note sa suppression.
- **Corrélation** : chaque appel HTTP est rapproché des dépôts qui le précèdent et des fichiers, lectures et
  suppressions qui le suivent (même login déchiffré, même « heure » du nom).
- **Protection** : zone d'archive hors du dossier web, chiffrée au repos, copiée vers la préproduction par canal
  sécurisé, purgée après la bascule ; elle contient des mots de passe en clair et n'est jamais versionnée.

Livrable du lot 0 : enregistreur en service, premier rapport par commande, protocole et version de logiciel.

### 7.2 Préproduction complète

VM Linux identique à la cible, PostgreSQL, service de transfert, bac à sable courriel, DNS `mytest2.lecatalogue.ca`,
certificat TLS, jeu de données = **export réel** rechargé à chaque campagne, logiciels de test configurés sur cet
hôte en FTP puis en SFTP ; un faux `estimation.qc.ca` de préproduction servant `/version/last/*` et la redirection
`<REPSDP>`. Reconstruite depuis zéro par script à chaque répétition.

### 7.3 Campagnes de rejeu et tests de bout en bout

Rejeu différentiel de tout le trafic enregistré (rapport par commande) ; parcours réels avec les logiciels de test
(démarrage, À propos, export/import de catalogue, salle de plans jusqu'au PDF et à la réponse, recherche RBQ, centre
de mise à jour) ; parcours web Playwright ; test de charge du pic de démarrage matinal (estimé depuis
l'enregistrement, rejoué ×3) incluant les connexions FTP/SFTP simultanées.

### 7.4 Répétitions chronométrées de la migration des données

Au moins **deux répétitions complètes** suivant le déroulé du § 8.2 (gel simulé, export WebDev, copie des fichiers,
chargement, vérifications, bascule DNS de `mytest2`, redirection sur le faux estimation.qc.ca), chronométrées étape
par étape. La deuxième tient dans la fenêtre (Q16) avec 50 % de marge. Chaque répétition produit le **cahier
d'exécution** qui devient le script de la bascule.

### 7.5 Plan de surveillance (préparé ici, exécuté au § 8.4)

Taux d'erreur HTTP par commande ; commandes inconnues ; connexions et échecs FTP/SFTP par compte, protocole et
fichier ; fichiers attendus non produits ou produits trop tard (> 5 s) ; fichiers jamais supprimés par le client
(signe qu'il ne les a pas trouvés) ; erreurs `##1001`/`##1002` comparées au taux historique ; courriels en échec ;
latence ; espace disque ; comparaison quotidienne « volume par commande » avec la même semaine de l'enregistrement.

---

## 8. Lot 8 — Plan de bascule

### 8.1 Avant la fenêtre (J−14 à J−1)

- J−14 : go/no-go de préparation (§ 8.3) ; avis aux clients et partenaires ; gel des évolutions (corrections seulement).
- J−7 : TTL DNS à 300 s ; copie initiale des fichiers (plans, exports, bannières, PDF) par rsync ; répétition
  finale si la précédente date de plus de deux semaines ; nouvelle `FTPRepClient.zip` prête (non publiée).
- J−1 : vérification des accès (DNS, hébergeur, ancien serveur, estimation.qc.ca, WebDev pour l'export) ;
  sauvegarde complète de l'ancien serveur ; sauvegarde de la production Linux vide.

### 8.2 Pendant la fenêtre (déroulé type, à caler sur la répétition)

| Étape | Action | Durée (à remplacer par celle de la répétition) |
|---|---|---|
| 1 | **Gel des écritures** : page d'entretien sur l'ancien site ; arrêt des serveurs FTP/SFTP anciens ; arrêt de l'enregistreur | 10 min |
| 2 | Export WebDev de tous les fichiers HFSQL (lot 1) ; mini-bases des salles actives | mesuré |
| 3 | Copie différentielle des fichiers (rsync) | mesuré |
| 4 | Chargement PostgreSQL ; vérifications § 6.3 ; rapport | mesuré |
| 5 | Démarrage de la production Linux (application, transfert, jobs) ; **fumée** contre l'IP de production : toutes les commandes `Type` avec les comptes de test en FTP et SFTP, parcours web, courriel de test | 15 min |
| 6 | **Go/no-go** (§ 8.3) | — |
| 7 | Bascule DNS (`lecatalogue.ca`, `www`) ; sur estimation.qc.ca : redirection `<REPSDP>` → nouvelle salle de plans et publication de la nouvelle `FTPRepClient.zip` ; ouverture des ports 80, 443, 21, 22, 10221, 10222 | 5 min + propagation |
| 8 | Observation active ; l'ancien serveur reste gelé | fin de fenêtre |

### 8.3 Critères de validation (go/no-go)

**J−14** : tous les lots acceptés ; campagne de rejeu **verte à 100 % des cas non neutralisés** pour les commandes
appelées au cours des 90 derniers jours, verte ou expliquée pour les autres ; dépôt et lecture validés en FTP et en
SFTP avec les deux logiciels ; deux répétitions dans la fenêtre avec marge ; retour arrière répété une fois ;
surveillance en place ; réponses à Q1, Q2 (valeurs réelles d'INI), Q4, Q16, Q17.

**Étape 6** : vérifications de données vertes ; fumée verte ; durée écoulée inférieure au seuil (fin de fenêtre −
durée d'un retour arrière). Un critère rouge = **no-go** : dégel de l'ancien serveur, analyse, nouvelle fenêtre.

**J+1, J+3, J+7** : taux d'erreur par commande au niveau historique ; aucun fichier attendu non produit ni non
supprimé ; aucune commande inconnue nouvelle ; connexions des comptes de test et d'un échantillon de clients
volontaires. Décision de **clore la période de retour arrière** à J+7 (ou J+14).

### 8.4 Surveillance après la bascule

Tableau de bord § 7.5 en continu 48 h puis quotidien ; alertes ; journal des incidents avec décision (corriger en
avant / retour arrière) ; corrections par la chaîne normale (CI, préproduction, production). Les journaux de
l'ancien serveur sont aussi surveillés pour détecter du trafic résiduel (caches DNS, IP en dur).

### 8.5 Retour arrière vers l'ancien serveur

Possible pendant la période de retour arrière (J+7, prolongeable à J+14) :

1. **Gel du nouveau site** (page d'entretien, arrêt du service de transfert) ; horodatage T₁.
2. **Export inverse** (lot 1) : enregistrements créés ou modifiés entre T₀ (bascule) et T₁ (colonnes
   `created_at`/`updated_at` sur toutes les tables), convertis au format d'origine (1252, `AAAAMMJJ`, booléens,
   bits de `Flags`) en CSV `HImporteTexte` par fichier HFSQL, avec un script WebDev d'import appliquant créations,
   modifications et suppressions (table `suppression`). Les mots de passe, conservés en clair (Q5), reviennent
   comme les autres rubriques.
3. **Fichiers** : rsync inverse des fichiers créés ou modifiés depuis T₀ vers les répertoires Windows.
4. **Journaux** (`Historique`, `LOGVERSION`, `IPADDRESS`, `RBQ_HISTO`, `COURRIELS`, `SDPSTAT`) : importés en ajout.
5. Dégel de l'ancien serveur, redémarrage de ses FTP/SFTP ; **DNS** vers l'ancienne adresse ; sur estimation.qc.ca :
   retrait de la redirection et republication de l'ancienne `FTPRepClient.zip`.
6. Fumée sur l'ancien serveur ; avis aux clients ; analyse ; les données du nouveau site restent archivées.

Le retour arrière est **répété une fois** en préproduction au lot 7 ; sa durée entre dans le calcul de la fenêtre.

---

## 9. Risques principaux

| # | Risque | Impact | Réduction |
|---|---|---|---|
| R1 | Format d'un fichier réponse mal reproduit (mots-clés, ordre, encodage, codes `##`, délai) | Logiciels en erreur chez tous les usagers le même jour | Rejeu de plusieurs mois de trafic réel ; corpus construit ; A9 § 8 comme spécification côté lecteur ; go/no-go à 100 % ; retour arrière |
| R2 | **Bascule unique** : un défaut non couvert par le corpus touche tout le monde | Idem | Enregistrement long ; rapport de couverture ; période de retour arrière ; corrections en avant rapides |
| R3 | **Transfert de fichiers** : émulation des chemins Windows refusée par les DLL clientes (`cd \`, `C:`), listage incompatible avec WinInet/Chilkat, accents, noms avec espaces, ports bloqués par des pare-feu clients | Les logiciels ne trouvent plus leurs fichiers | Spike au lot 0 avec les deux logiciels de test en FTP et SFTP ; service maison paramétrable ; sessions réelles enregistrées et rejouées ; mêmes ports qu'aujourd'hui |
| R4 | HTTP : les logiciels appellent en clair sur 80 et ignorent la réponse ; une redirection vers HTTPS ou un délai > 15 s casserait les appels | Commandes perdues sans que le client le sache | Route historique servie en clair sans redirection ; réponse immédiate ; traitements longs en arrière-plan ; capture réseau pour confirmer 80 vs 443 |
| R5 | Port de chiffrement incorrect sur un cas limite | Authentification impossible pour certains logins | Déchiffrement de 100 % des `User` et `www_*.txt` enregistrés |
| R6 | **`Crypte` PC SOFT non reproduit** alors que les EG génèrent les liens `cpl`/`ans` | Réponses de sous-traitants anonymes | Rétro-ingénierie au lot 0 avec le générateur de paires ; dégradation documentée |
| R7 | **RBQ** : format `.res` à reproduire d'après le lecteur (A9 § 8.e), source de données périmée | Recherche RBQ indisponible dans l'EG | Données ouvertes ; tests sur captures réelles de `.res` ; 50 recherches comparées |
| R8 | Encodage 1252 ↔ UTF-8 | Corruption silencieuse | Décodage strict, sommes de contrôle, réencodage 1252 |
| R9 | **Fenêtre dépassée** | Indisponibilité prolongée ou no-go | Deux répétitions chronométrées ; rsync à J−7 ; seuil de no-go |
| R10 | **Dérive entre répétition et bascule** | Surprise le jour J | Répétition finale à moins de deux semaines ; gel des évolutions ; rejeu des deux dernières semaines |
| R11 | **Retour arrière complexe** | Pertes de données | Export inverse développé au lot 1, répété au lot 7 ; `created_at`/`updated_at` ; période courte |
| R12 | DNS : caches, IP en dur (mode test `ADDR_IP` des logiciels) | Trafic résiduel vers l'ancien serveur | TTL abaissé ; surveillance de l'ancien serveur ; page d'entretien dessus |
| R13 | Mots de passe en clair (conservés, Q5), secrets dans l'INI et **dans les dossiers techniques imprimés** (A9 § 10.4) | Sécurité | Décision assumée ; secrets en environnement ; plus de journalisation de mots de passe ; purge des dossiers au lot 9 ; TLS pour les navigateurs ; administration authentifiée |
| R14 | Dérive visuelle ou fonctionnelle (PNG → HTML, panier, Oubli) | Appels de soutien | Liste de contrôle ; mêmes libellés ; validation du gabarit au lot 2 |
| R15 | Code mort pris pour vivant ou l'inverse (`projexp` encore émis, `version` plus appelée) | Effort ou fonction perdue | Comptages de l'enregistreur ; routes conservées avec réponse vide |
| R16 | Serveur de production en WebDev 19 ; DLL cliente déployée différente des sources lues | Différences non documentées | Captures réelles prioritaires sur les sources ; Q1 |
| R17 | Projet long sans valeur livrée ; ancien serveur à maintenir | Fatigue | Lots courts avec acceptation ; démonstrations en préproduction ; vitrine tôt |
| R18 | **`fCompacte` / WDZ non reproduits** | `export14` impossible ; `sdpintv`/`bid` illisibles | Échantillons (Q18) et rétro-ingénierie au lot 0 ; sinon décision avant les lots 4 et 6 (ex. demander aux clients l'option FTP sans compression si elle existe, ou accepter la perte de ces fonctions) |
| R19 | **Dépendance à estimation.qc.ca** (liens d'invitation, `FTPRepClient.zip`, `updateinfo.zip`, fichiers de version) | Liens cassés, configuration FTP non mise à jour | Q17 ; redirection et publication incluses dans le plan de bascule et son retour arrière ; faux estimation.qc.ca en préproduction |

---

## 10. Méthode de travail

1. Validation de ce plan maître et réponses aux questions ouvertes du § 0.
2. Rédaction des sous-plans par l'agent `redacteur-sous-plan` (un par lot, en parallèle), chacun recevant ce plan,
   son lot, les extraits d'annexes et les sources utiles ; fichiers `docs/plan/01-socle.md` … `10-apres-bascule.md`.
3. Relecture croisée : dépendances, couverture (chaque page et chaque commande du § 4.3 dans exactement un lot),
   cohérence des formats de fichiers entre lots (serveur A2-A4 ↔ lecteur A9 § 8), cohérence du plan de bascule avec
   les livrables des lots 1 et 7, puis présentation.

---

## 11. Annexes d'inventaire (`docs/plan/annexes/`)

| Annexe | Contenu | Taille |
|---|---|---|
| A1 | Pages (60) : statut, public, rôle, navigation, session, bilingue, modèle ActivXP, redirections | 826 l. |
| A2 | Commandes `Type` : salles de plans et divers ; canal de réponse ; cycle de vie des salles | 397 l. |
| A3 | Commandes `Type` : versions, licences, catalogues, désabonnement ; paramètre `User` ; modèle de licence | 579 l. |
| A4 | Commandes `Type` : RBQ ; `RecupEntrep.exe` ; anti-intrusion | 491 l. |
| A5 | Les 42 fichiers HFSQL : rubriques, types, clés, relations, correspondance PostgreSQL, mots de passe | 1 053 l. |
| A6 | Traitements en lot et 19 points d'envoi de courriels | 523 l. |
| A7 | Fichiers lus/écrits sur disque, boîte aux lettres `export/`, salles, purges | 391 l. |
| A8 | Dépendances Windows et PC SOFT (34 familles) : remplacement ou suppression | 348 l. |
| A9 | Protocole côté logiciels clients : HTTP POST, FTP/SFTP, ports, comptes, sondage, formats lus, mise à jour, contrats à honorer | 637 l. |

Outil : `docs/plan/outils/GenerePairesCrypte.wl.txt` (générateur WLangage d'échantillons `Crypte`, `fCompacte`, WDZ).

### Hypothèses et points non vérifiés (synthèse)

- Listages de `LECATALOGUE_WEB/bd/`, `export/` et lecture des `lecatalogue.ini` **refusés** par la politique de
  permissions : clés INI déduites du code ; volumes inconnus (Q3).
- HTTP 80 clair vs HTTPS : les sources C++ de la DLL cliente disent 80 ; la DLL déployée peut différer : capture
  réseau au lot 0.
- Valeurs réelles d'INI des postes clients (`FTPSECUR`, `TYPE_TRANS`, hôtes) : déduites des défauts du code.
- Format des `.wdz` produits par `zipCrée` (WDZ ou ZIP) et du `.wdz` d'import catalogue : à vérifier sur échantillons.
- Serveur de production WebDev 19 ? (`/WD190AWP/`) ; `Catalogue.wwh` absent du dossier local ; encodage exact des
  fichiers réponse (1252, CRLF, sans BOM) déduit du défaut WebDev ; deux codifications de `AAClient.TypeVersion` ;
  `PageParamètre` insensible à la casse ; `CLAUDE.md` parle d'AWP alors que le site est en mode session.
