# API licences pour estimation.ca — guide de mise en place

estimation.ca (Node/TypeScript) **lit** la licence d'un client des logiciels et en **renouvelle** les dates
de fin, par une nouvelle commande `Type=apilic` du site lecatalogue (WebDev 18). L'écriture est immédiate.
Depuis le 2026-10-22, `Action=chercher` retrouve aussi les fiches d'un client à partir d'un **courriel**
(lecture seule) ; la lecture et le renouvellement se font toujours par login.
`lire` renvoie aussi les **montants de renouvellement** de la fiche (`renouvellement` : montants réels
saisis et montants calculés depuis la grille de prix, avec le détail).
Depuis le 2026-10-26, `Action=creer` **crée la fiche d'un nouveau client** (identité, version,
licences, options, dates) ; lecatalogue génère le login et le mot de passe. Désactivée tant que
`Creation=1` n'est pas dans `[APILIC]`.

Le code WLangage a été revalidé le 2026-10-22 contre le dossier technique de la version de Philippe
(référence, avec `isPartageLicence`/`SetPartageLicence` et `isFacturation`) : toutes les méthodes,
constantes, champs de `stNBRLIC` et variables utilisés existent.
Si les sources changent encore avant le collage, le compilateur le signalera ; renvoie-moi l'erreur.

## Contenu

| Fichier | Rôle |
|---|---|
| [contrat.md](contrat.md) | Le contrat de l'API (paramètres, JSON, erreurs). À donner au développeur d'estimation.ca |
| [wlangage/1-code-projet-CAS-apilic.wl.txt](wlangage/1-code-projet-CAS-apilic.wl.txt) | 4 lignes à ajouter dans le code d'initialisation du projet |
| [wlangage/2-collection-API_Licences.wl.txt](wlangage/2-collection-API_Licences.wl.txt) | 29 procédures globales à créer dans une nouvelle collection |
| [wlangage/3-section-ini.txt](wlangage/3-section-ini.txt) | Section `[APILIC]` à ajouter dans `lecatalogue.ini` |
| [estimation-ca/licenceApi.ts](estimation-ca/licenceApi.ts) | Client typé (zod) à copier dans le dépôt d'estimation.ca |
| [test/test-apilic.ts](test/test-apilic.ts) | Banc de test de l'API, sans dépendance (Node 22.18+) |
| [deploiement/README.md](deploiement/README.md) | Mise en ligne d'une nouvelle version de `lecatalogue.wdl`, avec le script [deploie-wdl.ps1](deploiement/deploie-wdl.ps1) |

## Étape 0 — Préparatifs

1. **Copie du projet** : avant de toucher à quoi que ce soit, copie le dossier complet du projet
   WebDev (là où se trouve `lecatalogue.WWP`) dans un dossier de sauvegarde.
2. **Une seule copie de référence** : préviens l'autre développeur que tu modifies le code du projet.
   Sinon, le dernier qui déploie écrase le travail de l'autre.
3. **Version** : vérifie que ton éditeur est bien WebDev 18, comme le moteur du serveur
   (`C:\WebDev18\...\wd180awp.exe` dans `LECATALOGUE_WEB/web.config`). N'ouvre pas le projet avec une
   autre version : il serait converti sans retour possible.
4. **Données de test** : en test (bouton GO), le site lit les fichiers HFSQL locaux
   `LECATALOGUE_WEB\bd\LECATALOGUE\`. Pour tester sur des données récentes, copie-y
   `AAClient.FIC`, `AAClient.NDX` et `AAClient.MMO` (s'il existe) récupérés du serveur par SFTP.
   Garde l'ancienne version de côté.

## Étape 1 — Coller le code dans WebDev

### 1a. La collection de procédures

1. Dans l'explorateur de projet (volet de gauche), trouve la branche **Procédures**.
   Clic droit → **Créer une collection de procédures** et nomme-la `API_Licences`.
   (Si le menu diffère : *Fichier → Nouveau → Code → Collection de procédures*.)
2. Ouvre [2-collection-API_Licences.wl.txt](wlangage/2-collection-API_Licences.wl.txt). Il contient
   16 blocs, chacun commençant par `// ==== Procédure Nom ====`.
3. Pour **chaque** bloc, dans l'ordre du fichier :
   - clic droit sur la collection `API_Licences` → **Nouvelle procédure globale** ;
   - donne-lui exactement le nom du bloc (ex. `sAPITexte`) ;
   - dans l'éditeur de code qui s'ouvre, **sélectionne tout** (Ctrl+A) et remplace par le bloc,
     depuis la ligne `PROCEDURE ...` jusqu'à la fin du bloc. Les lignes de commentaire au-dessus
     de `PROCEDURE` peuvent être collées aussi.
4. L'ordre du fichier fait en sorte que chaque procédure n'utilise que des procédures déjà créées.
   Des soulignements rouges dans une procédure qui en appelle une autre pas encore créée sont normaux :
   ils disparaissent une fois toutes les procédures collées.

**Ajout de `chercher` dans une collection déjà en place** (la collection `API_Licences` existe avec
ses 14 procédures) : crée seulement `sAPIChampCourriel` puis `sAPIChercher`, et remplace tout le
contenu de `TraiteAPILicence` par son nouveau bloc. Le code d'initialisation du projet (1b) ne change
pas. `sAPIChercher` lit l'indicateur `CAAClient::FL_DELETE` avec `lnGetFlags()` (méthode de `CEstimeHF`).

Dans la version de Philippe (dossier du 2026-10-22), deux procédures de la collection sont encore
anciennes :
- `sAPIJSONClient` exporte `"tplans"` avec `isOptionTPlans()`, retiré du contrat. **Remplace-la** par
  le bloc du fichier : sinon elle cessera de compiler quand `isOptionTPlans` sera retirée de `CAAClient`.
- `APIEnvoie` utilise `FichierAffiche` (fichier temporaire), version qui fonctionne en production.
  Le bloc du fichier utilise `ChaîneAffiche`, plus simple. La remplacer est facultatif ; si tu le fais,
  vérifie la réponse en test (GO) puis avec le banc de test après le déploiement.

**Ajout des montants de renouvellement dans une collection déjà en place** (16 procédures, avec
`chercher`) : crée `APIInitTarifs` puis `sAPIJSONRenouvellement`, et remplace tout le contenu de
`sAPIJSONClient` par son nouveau bloc. Rien d'autre ne change. Points à surveiller à la compilation :
- `sAPIJSONRenouvellement` utilise `QUAND EXCEPTION DANS … FAIRE … FIN` (syntaxe déjà employée dans
  le projet) : si le calcul échoue, `lire` répond quand même, avec `"calcule": null`, et la cause va
  dans `AATrace.log` ;
- `APIInitTarifs` reprend `InitTarifs` de `AATableClient` (grille `[LISTEPRIX]` et tarifs de salle de
  plans) ; la variable `sInfo` de la boucle n'est pas déclarée, comme dans l'original.

**Ajout de `creer` dans une collection déjà en place** (18 procédures, avec les montants) :
1. crée `bAPICourrielValide` puis `sAPIClientsCourriel` ;
2. remplace tout le contenu de `sAPIChercher` (elle utilise maintenant `sAPIClientsCourriel` ;
   sa réponse ne change pas) ;
3. crée, dans cet ordre : `sAPIParamTexte`, `nAPIParamEntier`, `bAPIParamOption`, `sAPIGenereLogin`,
   `sAPIGenereMotDePasse`, `nAPIIdClientParNom`, `bAPIDemandeTraitee`, `sAPIJSONCreation`, `sAPICreer` ;
4. remplace tout le contenu de `TraiteAPILicence` (nouveau `CAS "creer"`, mot de passe retiré du journal).

Le code d'initialisation du projet (1b) ne change pas. Points à surveiller à la compilation :
- `sAPIParamTexte` utilise `UTF8VersChaîne` (conversion des accents envoyés par estimation.ca) ;
- `sAPIGenereMotDePasse` utilise `InitHasard` et `Hasard(1,n)` ;
- `sAPICreer` utilise `CNoteClient::NOTE_AUTRE`, `goNoteClient` (variable globale du projet) et
  `goAAClient:bAjoute(Vrai)` (le `Vrai` évite un message d'erreur à l'écran en cas de doublon) ;
- si une procédure est signalée « paramètre passé par valeur », renvoie-moi le message : `nNbr`,
  `bTronque` et `sErreur` doivent revenir modifiés à l'appelant (passage par adresse, par défaut en WLangage).

Test en GO de `creer` : dans `[APILIC]` de l'INI de test, ajoute `Creation=1` ; dans `[APILIC_TEST]`,
`Action=creer`, `Nom=ZZ Test API Été` (avec un accent, pour vérifier la conversion),
`Courriel=zz-test@exemple.invalid`, `TypeVersion=1`, `EGAchat=1` et une `IdDemande` nouvelle. GO :
la réponse donne `cree:true`, le login et le mot de passe. Vérifie ensuite :
- dans `AAFicheClient2`, la fiche (nom accentué correct, version Or, 1 licence EG, options cochées,
  note « Fiche créée par estimation.ca [demande API …] ») ;
- refais GO sans rien changer : `cree:false`, même login ;
- change seulement `IdDemande` : `NOM_EXISTE` ; change aussi `Nom` : `COURRIEL_EXISTE` ; ajoute `Forcer=1` :
  deuxième fiche créée ;
- `H:\Temp\Traces\AALogAPI.log` : la ligne `creer` ne contient pas le mot de passe ;
- connecte le logiciel (Estimateur Général) avec ce login et ce mot de passe.
Supprime ensuite les fiches de test.

Test en GO : `Action=lire` et un `Login` dont tu connais la fiche. Compare `renouvellement` avec le
cadre de renouvellement de `AAFicheClient2` : `reel` = « Montants réels », `calcule` = « Montants
calculés » (`logiciels` = Estimateur Général + e-Plans, `salleDePlans`, `total` = Grand total), et
`detail` = le tableau du détail des prix.

### 1b. Le code d'initialisation du projet

1. Ouvre le code du projet : clic droit sur le nom du projet en haut de l'explorateur →
   **Code du projet** (ou menu *Projet → Code du projet*).
2. Dans la partie **Initialisation**, cherche (Ctrl+F) `SELON Minuscule(AAType)`.
3. Juste **après** cette ligne et **avant** `CAS "conference","commestim","contestim":`, colle le
   contenu de [1-code-projet-CAS-apilic.wl.txt](wlangage/1-code-projet-CAS-apilic.wl.txt)
   (les 4 lignes qui commencent à `CAS "apilic":`).

### 1c. Compiler

Lance **Recompiler le projet** (menu *Projet*, ou l'icône dans la barre d'outils). Les erreurs
s'affichent dans le volet du bas. **Copie-moi le texte des erreurs** (pas une capture) et je
corrige.

## Étape 2 — Premier test en local

En mode test (GO), les paramètres d'URL n'arrivent pas au code du projet, et le code projet force
`AADownLoad="philippe"` (raccourci de test de l'autre programmeur). On teste donc ainsi :

1. Lecteur `H:` : en mode test, le code lit `H:\Mes Sites\lecatalogue\Exe\lecatalogue.ini` et écrit ses
   journaux dans `H:\Temp\Traces`. Dans la VM : `subst H: C:\H` (à refaire après chaque redémarrage).
2. Dans cet INI de test, ajoute les sections `[APILIC]` (avec `Actif=1`, une `CleAPI` de test et
   `IPAutorisees` vide) **et** `[APILIC_TEST]` de [3-section-ini.txt](wlangage/3-section-ini.txt).
3. Dans le code d'initialisation du projet, bloc `SI EnModeTest() ALORS`, remplace la ligne
   `AADownLoad="philippe"` par `//AADownLoad="philippe"` suivie de `AAType="apilic"`.
   Dans la version de Philippe, la ligne `//aatYPE="apilic"` est déjà là, deux lignes plus bas :
   il suffit de commenter `AADownload="philippe"` et de décommenter celle-là.
   Remets-les comme avant une fois les tests finis.
4. **GO du projet** (ruban Projet). Résultat attendu avec `Action=ping` :
   `{"ok":true,"ping":"pong","version":"1"}` (affiché ou proposé en téléchargement).
5. Change `Action=lire` et `Login=<un login existant>` dans `[APILIC_TEST]`, refais GO.
   Pour `chercher` : `Action=chercher` et `Courriel=<courriel d'un client>` (essaie aussi en majuscules,
   puis un courriel inconnu : `{"ok":true,"clients":[]}`).
6. Journaux : `H:\Temp\Traces\AATrace.log` doit montrer `AAType >apilic<`, et
   `H:\Temp\Traces\AALogAPI.log` une ligne par appel (sans la clé).

Si le ping ne répond pas comme prévu, voir « Points à valider » plus bas.

## Étape 3 — Banc de test complet (local)

Depuis Linux ou Windows, avec Node 22.18+ :

```bash
APILIC_URL='http://<adresse du GO>/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue' \
APILIC_CLE='<clé de test>' APILIC_LOGIN='<login existant>' \
node docs/api-licences/test/test-apilic.ts
```

Il vérifie la clé, les erreurs, le format du JSON et le refus des dates invalides (rien n'est écrit),
ainsi que `chercher` (courriel invalide, courriel inconnu). Ajoute `APILIC_COURRIEL='<courriel d'un client>'`
pour vérifier que `chercher` le trouve (le banc l'envoie en majuscules, entouré d'espaces).
Si `Creation=1`, il vérifie aussi les refus de `creer` sans rien écrire (données invalides, nom
d'une fiche existante, et avec `APILIC_COURRIEL` un courriel déjà présent). L'option `--creation`
crée en plus une vraie fiche « ZZ Test API … Québec » (accents, rejeu, doublons) : à réserver au test
local, et à supprimer ensuite dans l'administration.

Pour tester l'écriture, ajoute `APILIC_LOGIN_TEST='<client de test>'` et l'option `--ecriture` :
le test prolonge l'abonnement de ce client (à demain s'il est échu) et vérifie que rejouer la même
demande ne change rien. Contrôle ensuite la fiche dans `AAFicheClient2`.

## Étape 4 — Déploiement en production

1. **Sauvegarde** sur le serveur, dans `C:\WebSite\Sauvegardes_lecatalogue\` (jamais dans le dossier du site) :
   `lecatalogue.wdl`, `AAClient.*` de `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\`, et l'INI de production.
2. **Déploie** le site mis à jour comme d'habitude. Pour un premier déploiement, fais-le avec l'autre
   développeur.
3. Ajoute `[APILIC]` dans `C:\WebSite\lecatalogue\LECATALOGUE_WEB\lecatalogue.ini` avec `Actif=0`,
   une **nouvelle** clé (différente de celle de test) et l'IP de sortie d'estimation.ca dans
   `IPAutorisees`. Ce fichier n'est pas servi par IIS (vérifié : 404).
4. Passe `Actif=1`. Laisse `Creation=0` (ou absent) tant qu'estimation.ca n'utilise pas `creer`.

**Coupe-circuit** : `Actif=0` dans l'INI ferme l'API immédiatement, sans redéploiement.

**Mises en ligne suivantes** (nouvelle version du code, l'INI ne change pas) : seul `lecatalogue.wdl`
change ; suivre [deploiement/README.md](deploiement/README.md).

## Étape 5 — Recette en production

1. Depuis une IP autorisée (ajoute temporairement la tienne dans `IPAutorisees`), lance le banc de test
   **sans** `--ecriture` sur l'URL de production. Ensuite, retire ton IP de la liste.
2. Compare `Action=lire` avec la fiche `AAFicheClient2` de 2 ou 3 clients réels.
3. Un renouvellement sur un client de test : vérifie la fiche, `c:\WebSite\Traces\AALogAPI.log`, puis
   qu'un démarrage du logiciel de ce client voit la nouvelle date.

## Étape 6 — Branchement d'estimation.ca

Copie [estimation-ca/licenceApi.ts](estimation-ca/licenceApi.ts) dans estimation.ca (dépendance `zod`)
et définis `LECATALOGUE_API_URL` et `LECATALOGUE_API_CLE` dans sa configuration secrète.
Fonctions : `ping()`, `chercherClients(courriel)`, `lireLicence(login)`,
`renouvelerLicence({ login, dateFinAbonnement, idDemande })`,
`creerClient({ nom, courriel, idDemande, typeVersion, licences, options, ... })`.
Pour `creerClient`, conserver l'`idDemande` avec la commande (rejeu sans doublon) et transmettre le
mot de passe au client sans l'écrire dans les journaux. Sur `COURRIEL_EXISTE`, `err.clients` liste les
fiches existantes : proposer la fiche existante, ou rappeler avec `forcer: true` après confirmation.
Conserver l'`idDemande` avec la demande permet de la rejouer sans risque de double prolongation.
`chercherClients` sert seulement à identifier la fiche (un courriel peut en désigner plusieurs) :
estimation.ca retient ensuite le login choisi pour `lire` et `renouveler`.

## Points validés et remarques

- Validés en test (GO) le 2026-10-21 : appel depuis le code projet, `ChaîneVersUTF8`, `FinProgramme`,
  contrôle de la clé, `ping` et `lire`.
- Production (moteur WebDev 19, mode session), validé le 2026-10-21 : l'appel sans clé renvoie
  `{"ok":false,"code":"AUTH",...}` en `application/json`. `APIEnvoie` utilise maintenant `ChaîneAffiche`
  (plus simple, sans fichier temporaire) ; l'ancienne version avec `FichierAffiche` fonctionnait aussi.
- **Déploiement : ne jamais laisser de fichier `lecatalogue.wdl.<suffixe>` dans `C:\WebSite\lecatalogue`.**
  Le moteur charge aussi ces fichiers, et l'ancien code reprend le dessus. Ranger les sauvegardes dans
  `C:\WebSite\Sauvegardes_lecatalogue\`, déposer le nouveau fichier dans `C:\WebSite\Depot\`, et faire
  l'échange service arrêté, sans `wd190admin`/`wd190session` restants : c'est ce que fait
  [deploiement/deploie-wdl.ps1](deploiement/deploie-wdl.ps1).
- En test, les paramètres d'URL n'arrivent pas au code projet : voir `sAPIParam` et `[APILIC_TEST]`.
- En test, la réponse est envoyée en `text/plain` (le navigateur de la VM télécharge le JSON au lieu
  de l'afficher) ; en production, en `application/json`.

## Sécurité, en bref

- Clé de 32 caractères minimum, dans l'INI seulement, envoyée en POST sur HTTPS.
- Filtrage par IP (`NavigateurAdresseIP(Faux)`, l'adresse de connexion réelle).
- Jamais exposés : mot de passe du client, notes, ajustements, grille de prix.
- Journal `AALogAPI.log` : chaque appel (avec le courriel recherché pour `chercher`), chaque refus,
  et l'état avant tout renouvellement.
- `chercher` ne renvoie que login, nom, rubrique trouvée et `actif` : rien qui permette de se
  connecter. Il permet quand même de savoir si un courriel est client ; d'où la clé et le filtrage par IP.
- `creer` renvoie le mot de passe de la fiche créée (et, au rejeu, son mot de passe actuel) : c'est
  la seule action qui en expose un. Coupe-circuit propre (`Creation=0`) ; le mot de passe n'est
  jamais écrit dans `AALogAPI.log`.
