# API licences pour estimation.ca — guide de mise en place

estimation.ca (Node/TypeScript) **lit** la licence d'un client des logiciels et en **renouvelle** les dates
de fin, par une nouvelle commande `Type=apilic` du site lecatalogue (WebDev 18). L'écriture est immédiate.

Le code WLangage a été écrit à partir du dossier technique du 2026-10-01
(`Docs/dossier-technique.txt`). Si l'autre développeur a modifié `CAAClient` depuis, le compilateur
le signalera ; renvoie-moi l'erreur.

## Contenu

| Fichier | Rôle |
|---|---|
| [contrat.md](contrat.md) | Le contrat de l'API (paramètres, JSON, erreurs). À donner au développeur d'estimation.ca |
| [wlangage/1-code-projet-CAS-apilic.wl.txt](wlangage/1-code-projet-CAS-apilic.wl.txt) | 4 lignes à ajouter dans le code d'initialisation du projet |
| [wlangage/2-collection-API_Licences.wl.txt](wlangage/2-collection-API_Licences.wl.txt) | 13 procédures globales à créer dans une nouvelle collection |
| [wlangage/3-section-ini.txt](wlangage/3-section-ini.txt) | Section `[APILIC]` à ajouter dans `lecatalogue.ini` |
| [estimation-ca/licenceApi.ts](estimation-ca/licenceApi.ts) | Client typé (zod) à copier dans le dépôt d'estimation.ca |
| [test/test-apilic.ts](test/test-apilic.ts) | Banc de test de l'API, sans dépendance (Node 22.18+) |

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
   13 blocs, chacun commençant par `// ==== Procédure Nom ====`.
3. Pour **chaque** bloc, dans l'ordre du fichier :
   - clic droit sur la collection `API_Licences` → **Nouvelle procédure globale** ;
   - donne-lui exactement le nom du bloc (ex. `sAPITexte`) ;
   - dans l'éditeur de code qui s'ouvre, **sélectionne tout** (Ctrl+A) et remplace par le bloc,
     depuis la ligne `PROCEDURE ...` jusqu'à la fin du bloc. Les lignes de commentaire au-dessus
     de `PROCEDURE` peuvent être collées aussi.
4. L'ordre du fichier fait en sorte que chaque procédure n'utilise que des procédures déjà créées.
   Des soulignements rouges dans une procédure qui en appelle une autre pas encore créée sont normaux :
   ils disparaissent une fois toutes les procédures collées.

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

1. Ajoute la section `[APILIC]` de [3-section-ini.txt](wlangage/3-section-ini.txt) dans l'INI de test.
   En mode test, le code lit `H:\Mes Sites\lecatalogue\Exe\lecatalogue.ini` (chemin codé en dur dans
   le code du projet). Mets `Actif=1`, une `CleAPI` de test (`openssl rand -hex 32`) et laisse
   `IPAutorisees` vide.
2. Lance le site avec **GO** (projet). Dans la barre d'adresse du navigateur, garde le début de
   l'URL jusqu'à `/CONNECT/lecatalogue` et ajoute :
   ```
   ?Type=apilic&Action=ping&Cle=<ta clé de test>
   ```
   Résultat attendu : `{"ok":true,"ping":"pong","version":"1"}`
   (en GET pour ce test local seulement ; en production, la clé passe toujours en POST).
3. Puis : `?Type=apilic&Action=lire&Cle=<clé>&Login=<un login existant>` → la licence du client.
4. Vérifie le journal `H:\Temp\Traces\AALogAPI.log` (en test) : une ligne par appel, sans la clé.

Si le ping ne répond pas comme prévu, voir « Points à valider » plus bas.

## Étape 3 — Banc de test complet (local)

Depuis Linux ou Windows, avec Node 22.18+ :

```bash
APILIC_URL='http://<adresse du GO>/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue' \
APILIC_CLE='<clé de test>' APILIC_LOGIN='<login existant>' \
node docs/api-licences/test/test-apilic.ts
```

Il vérifie la clé, les erreurs, le format du JSON et le refus des dates invalides (rien n'est écrit).
Pour tester l'écriture, ajoute `APILIC_LOGIN_TEST='<client de test>'` et l'option `--ecriture` :
le test prolonge l'abonnement de ce client (à demain s'il est échu) et vérifie que rejouer la même
demande ne change rien. Contrôle ensuite la fiche dans `AAFicheClient2`.

## Étape 4 — Déploiement en production

1. **Sauvegarde** sur le serveur : copie `AAClient.*` de
   `C:\WebSite\lecatalogue\LECATALOGUE_WEB\bd\LECATALOGUE\`, et l'INI de production.
2. **Déploie** le site mis à jour comme d'habitude. Pour un premier déploiement, fais-le avec l'autre
   développeur.
3. Ajoute `[APILIC]` dans `C:\WebSite\lecatalogue\LECATALOGUE_WEB\lecatalogue.ini` avec `Actif=0`,
   une **nouvelle** clé (différente de celle de test) et l'IP de sortie d'estimation.ca dans
   `IPAutorisees`. Ce fichier n'est pas servi par IIS (vérifié : 404).
4. Passe `Actif=1`.

**Coupe-circuit** : `Actif=0` dans l'INI ferme l'API immédiatement, sans redéploiement.

## Étape 5 — Recette en production

1. Depuis une IP autorisée (ajoute temporairement la tienne dans `IPAutorisees`), lance le banc de test
   **sans** `--ecriture` sur l'URL de production. Ensuite, retire ton IP de la liste.
2. Compare `Action=lire` avec la fiche `AAFicheClient2` de 2 ou 3 clients réels.
3. Un renouvellement sur un client de test : vérifie la fiche, `c:\WebSite\Traces\AALogAPI.log`, puis
   qu'un démarrage du logiciel de ce client voit la nouvelle date.

## Étape 6 — Branchement d'estimation.ca

Copie [estimation-ca/licenceApi.ts](estimation-ca/licenceApi.ts) dans estimation.ca (dépendance `zod`)
et définis `LECATALOGUE_API_URL` et `LECATALOGUE_API_CLE` dans sa configuration secrète.
Fonctions : `ping()`, `lireLicence(login)`, `renouvelerLicence({ login, dateFinAbonnement, idDemande })`.
Conserver l'`idDemande` avec la demande permet de la rejouer sans risque de double prolongation.

## Points à valider dans WebDev 18

Ces fonctions ne sont pas utilisées ailleurs dans le projet. Le ping de l'étape 2 les valide toutes.

| Point | Si ça ne marche pas |
|---|---|
| `FichierAffiche` appelé depuis le code d'initialisation du projet | Créer une page vide `PAGE_APILIC`, mettre l'appel `TraiteAPILicence()` dans son code d'initialisation serveur, et remplacer le CAS par `PageAffiche(PAGE_APILIC)` puis `RETOUR` |
| `fSupprime` juste après `FichierAffiche` (la réponse arrive vide ?) | Retirer la ligne `fSupprime(sFic)` de `APIEnvoie` ; je fournirai une purge des anciens fichiers |
| `FinProgramme()` après l'envoi (du HTML s'ajoute après le JSON ?) | Me copier la réponse brute |
| `ChaîneVersUTF8` (accents mal affichés ou erreur de compilation) | Retirer la conversion et annoncer `charset=windows-1252` |
| Continuation de ligne `...` à l'intérieur d'un appel (`sAPIJSONClient`) | Regrouper chaque appel `sAPIPaire("licences", …)` et `sAPIPaire("options", …)` sur une seule ligne |

## Sécurité, en bref

- Clé de 32 caractères minimum, dans l'INI seulement, envoyée en POST sur HTTPS.
- Filtrage par IP (`NavigateurAdresseIP(Faux)`, l'adresse de connexion réelle).
- Jamais exposés : mot de passe du client, notes, ajustements, grille de prix.
- Journal `AALogAPI.log` : chaque appel, chaque refus, et l'état avant tout renouvellement.
- Les fichiers JSON temporaires sont écrits dans `c:\WebSite\Traces\API\`, hors du site web, et supprimés
  après envoi.
