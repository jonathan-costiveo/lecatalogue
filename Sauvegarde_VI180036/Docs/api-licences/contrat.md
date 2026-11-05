# API licences lecatalogue — contrat v1

API que lecatalogue.ca expose à estimation.ca pour lire la licence d'un client des logiciels
(Estimateur Général, e-Plans), en renouveler les dates de fin, retrouver un client par son courriel
et créer la fiche d'un nouveau client.

Ajouts compatibles depuis la mise en production (2026-10-21) : `Action=chercher` et le code
`COURRIEL_INVALIDE` (2026-10-22) ; `Action=creer` et ses codes d'erreur (2026-10-26).
Les réponses existantes ne changent pas.

Ce contrat doit survivre à la migration vers Next.js (lot 3 du plan maître) : mêmes paramètres,
même JSON. Seule l'URL pourra changer.

## Appel

```
POST https://www.lecatalogue.ca/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue
Content-Type: application/x-www-form-urlencoded
```

| Paramètre | Obligatoire | Valeur |
|---|---|---|
| `Type` | oui | `apilic` |
| `Action` | oui | `ping`, `lire`, `renouveler`, `chercher` ou `creer` |
| `Cle` | oui | Clé secrète partagée (32 caractères ou plus). **Toujours dans le corps POST, jamais dans l'URL.** |
| `Login` | `lire`, `renouveler` | Login du client (`AAClient.Login`) |
| `Courriel` | `chercher` | Courriel à rechercher (60 caractères au plus) |
| `DateFinAbonnement` | non | `AAAAMMJJ`. Fin de l'abonnement aux mises à jour |
| `DateFinEG` | non | `AAAAMMJJ`. Fin de licence Estimateur Général |
| `DateFinEPlans` | non | `AAAAMMJJ`. Fin de licence e-Plans |
| `IdDemande` | conseillé (obligatoire pour `creer`) | Identifiant unique de la demande côté estimation.ca (UUID, 64 caractères au plus), noté au journal |

Les paramètres propres à `creer` sont décrits dans sa section.

Les noms de paramètres sont à écrire **exactement** comme ci-dessus.

La réponse est toujours en HTTP 200, `application/json; charset=utf-8`. Le succès se lit dans `ok`.

## `Action=ping`

Vérifie la clé et la disponibilité. Réponse : `{"ok":true,"ping":"pong","version":"1"}`

## `Action=lire`

```json
{
  "ok": true,
  "client": {
    "id": 1234,
    "login": "ABC123",
    "nom": "Construction ABC inc.",
    "contact": "Jean Tremblay",
    "courriels": ["jean@abc.ca"],
    "abonnement": true,
    "abonnementMensuel": false,
    "actif": true,
    "dateFinAbonnement": "2027-03-31",
    "dateFinEG": "",
    "dateFinEPlans": "",
    "dateDerniereVisite": "2026-10-20",
    "typeVersion": 1,
    "typeVersionLibelle": "Or",
    "licences": {
      "egAchat": 2, "egLocation": 0,
      "eplansOrAchat": 2, "eplansOrLocation": 0,
      "eplansMonoAchat": 0, "eplansMonoLocation": 0,
      "eplansMultiAchat": 1, "eplansMultiLocation": 0,
      "totalEG": 2, "totalEPlans": 3,
      "location": false,
      "partageAvecEG": false
    },
    "options": {
      "catalogue": true, "eplans": true, "echeancier": true,
      "comparatif": false, "ventilation": false, "repartition": false,
      "invitation": true, "salleDePlans": true
    },
    "montantMAJ": 495.00,
    "renouvellement": {
      "reel": { "logiciels": 495.00, "salleDePlans": 120.00, "total": 615.00 },
      "calcule": {
        "achat": 495.00, "location": 0.00,
        "logiciels": 495.00, "salleDePlans": 120.00, "total": 615.00,
        "detail": [
          { "libelle": "Mise à jour licence achat E.G. Or", "montant": 495.00 },
          { "libelle": "Abonnement licence Salle de plans", "montant": 120.00 }
        ]
      }
    }
  }
}
```

- Une date absente vaut `""`.
- `actif` = abonnement coché **et** `dateFinAbonnement` non dépassée (même règle que le site).
- `abonnementMensuel` : abonnement renouvelé au mois (case « Mensuel » de la fiche). Pour le
  renouveler, estimation.ca envoie la nouvelle `DateFinAbonnement` (un mois plus tard) ; la fiche
  d'administration calcule ce mois en gardant la fin de mois (31 janv. → 28 ou 29 févr.).
- `licences.partageAvecEG` : licences partagées avec l'Estimateur Général (case « Partage » de la fiche).
- `typeVersion` : 1 Or, 2 Argent+, 3 Argent, 4 Bronze, 5 Invitation, 6 e-Plans, 7 Or essai, 8 À déterminer.
- Les licences viennent de `CAAClient:GetLicences`, qui gère les deux modèles de licence du site.
  Les licences e-Plans « Or » sont les licences EG d'une version Or et sont comprises dans `totalEPlans`.
- `montantMAJ` : conservé pour compatibilité, égal à `renouvellement.reel.logiciels`.

### Montants de renouvellement (`renouvellement`)

Ce sont les deux colonnes du cadre de renouvellement de la fiche client (`AAFicheClient2`).
Montants annuels, en dollars, avant taxes.

- `reel` : colonne **« Montants réels »**, saisie dans la fiche. `logiciels` = Estimateur Général
  + e-Plans + modules, `salleDePlans` = salle de plans, `total` = leur somme. Ce sont les montants
  retenus pour le client : ils peuvent différer du calcul (prix convenu, ancien tarif). Peuvent valoir 0
  si personne ne les a saisis.
- `calcule` : colonne **« Montants calculés »**, recalculée à chaque appel depuis la grille de prix
  du site (`[LISTEPRIX]`), les licences et les options du client, comme la fiche et la liste des
  clients. `achat` et `location` partagent `logiciels` selon le type de licence
  (`achat + location = logiciels`), `total = logiciels + salleDePlans`. `detail` donne les lignes
  du calcul dans l'ordre de la fiche (libellés en français, pour affichage) ; leur somme vaut `total`.
- `calcule` vaut `null` si le calcul est impossible (grille absente ou erreur) : le reste de la
  réponse reste valable.
- Le calcul suit les règles du site : 0 pour une version école, montants non significatifs pour
  `typeVersion` 8 (À déterminer). L'abonnement au catalogue n'y est pas compté. Pour un
  `abonnementMensuel`, le site ne calcule pas de montant mensuel.
- La différence `reel.total - calcule.total` est celle que la fiche affiche (« Réel - Calculé »).

## `Action=renouveler`

Seules les dates fournies sont écrites. Il faut au moins une date.

- Les dates sont **absolues** : rejouer la même requête (après un délai dépassé, par exemple) ne
  prolonge pas deux fois. La seconde réponse a `"modifie": false`.
- Chaque date doit être valide, **postérieure à aujourd'hui** et à **5 ans au plus**. Une seule date
  refusée annule toute la requête (rien n'est écrit).
- Fournir `DateFinAbonnement` coche aussi l'abonnement (`abonnement: true`).
- Les dates par installation (postes) ne sont pas modifiées, comme dans la fiche d'administration.

Réponse :

```json
{ "ok": true, "modifie": true, "avant": { ...client... }, "apres": { ...client... } }
```

`avant` et `apres` ont la même forme que `client` dans `lire`, montants de renouvellement compris.
`renouveler` ne modifie aucun montant.

## `Action=chercher`

Retrouve les clients dont l'un des trois courriels de la fiche (`Courriel`, `Courriel2`,
`Courriel3`) est le courriel donné. Lecture seule.

- Comparaison exacte, sans tenir compte de la casse ni des espaces au début et à la fin.
  Pas de recherche partielle : `abc.ca` ne trouve pas `jean@abc.ca`.
- `Courriel` vide, sans `@` ou de plus de 60 caractères : erreur `COURRIEL_INVALIDE`.
- Les fiches supprimées et les fiches sans login sont écartées.
- Toujours `ok: true`, même sans résultat (`clients: []`). Au plus 20 clients, triés par nom ;
  `tronque: true` est ajouté s'il y en a d'autres (absent sinon).
- `champ` : la rubrique où le courriel a été trouvé (la première des trois, dans l'ordre).
- `actif` : même règle que dans `lire`.

```json
{
  "ok": true,
  "clients": [
    { "login": "ABC123", "nom": "Construction ABC inc.", "champ": "courriel", "actif": true },
    { "login": "ABC124", "nom": "Construction ABC (Québec)", "champ": "courriel2", "actif": false }
  ]
}
```

**Identifier par courriel, puis lire et renouveler par login.** Un même courriel peut figurer
dans plusieurs fiches (succursales, ancienne fiche, comptable commun). `chercher` sert seulement
à proposer les fiches possibles ; estimation.ca fait choisir ou confirmer la fiche, retient son
`login`, puis appelle `lire` et `renouveler` avec ce login. Il n'y a pas de renouvellement
« par courriel ». Trouver un courriel dans une fiche ne prouve pas que l'utilisateur
d'estimation.ca en est le propriétaire : vérifier ce courriel de son côté (lien de confirmation)
avant de lui montrer ou de renouveler une licence.

## `Action=creer`

Crée la fiche d'un nouveau client, comme le bouton « Nouveau » de la fiche d'administration.
**lecatalogue génère le login et le mot de passe** et les renvoie. L'écriture est immédiate.
Désactivée tant que `Creation=1` n'est pas dans la section `[APILIC]` (`CREATION_INACTIVE`).

| Paramètre | Obligatoire | Valeur |
|---|---|---|
| `Nom` | oui | Nom de l'entreprise, 80 caractères au plus. **Unique** dans le site |
| `Courriel` | oui | Courriel principal, 60 caractères au plus |
| `IdDemande` | oui | Identifiant unique de la demande (UUID) : rend la création rejouable |
| `TypeVersion` | oui | 1 Or, 2 Argent+, 3 Argent, 4 Bronze, 5 Invitation, 6 e-Plans, 7 Or essai, 8 À déterminer |
| `Contact` | non | 50 caractères au plus |
| `Courriel2`, `Courriel3` | non | 60 caractères au plus |
| `Telephone`, `Telephone2` | non | 26 caractères au plus |
| `EGAchat`, `EGLocation` | non | Licences Estimateur Général (entier 0 à 99, défaut 0) |
| `EPlansMonoAchat`, `EPlansMonoLocation`, `EPlansMultiAchat`, `EPlansMultiLocation` | non | Licences e-Plans en plus de celles d'une version Or (entier 0 à 99, défaut 0) |
| `Echeancier`, `Comparatif`, `Ventilation`, `Repartition`, `Invitation`, `SalleDePlans` | non | `1` ou `0`. Absent : réglage par défaut de la version (ci-dessous) |
| `Catalogue` | non | `1` ou `0` : abonnement au catalogue (défaut 0) |
| `DateFinAbonnement`, `DateFinEG`, `DateFinEPlans` | non | `AAAAMMJJ`, mêmes règles que `renouveler`. `DateFinAbonnement` coche l'abonnement |
| `AbonnementMensuel` | non | `1` ou `0` (défaut 0) |
| `Forcer` | non | `1` : créer même si un courriel figure déjà dans une fiche (voir `COURRIEL_EXISTE`) |

Les textes sont attendus en UTF-8 (encodage normal d'un formulaire POST).

Règles (celles de la fiche d'administration) :
- `TypeVersion` 1 à 5 et 7 : au moins une licence EG. 6 (e-Plans) : aucune licence EG et au moins
  une licence e-Plans. 8 (À déterminer) : aucune licence EG.
- Or et Or essai : les licences e-Plans « Or » valent les licences EG (comme dans `lire`) et
  l'option e-Plans est cochée. L'option e-Plans est aussi cochée dès qu'il y a une licence e-Plans.
- Réglage par défaut des options : Or et Or essai → échéancier, invitation, comparatif, ventilation,
  répartition et salle de plans ; Invitation → salle de plans (toujours cochée pour cette version) ;
  autres versions → aucune. Un paramètre `1`/`0` l'emporte sur ce réglage.
- Tout est contrôlé avant d'écrire : un seul motif de refus et rien n'est créé.
- Les montants réels de renouvellement ne sont pas fixés par l'API (0 dans `renouvellement.reel`) :
  la fiche les initialise à sa première ouverture. `renouvellement.calcule` est donné tout de suite.
- Version école, vendeur, notes et formations : non gérés par l'API (fiche d'administration).

Login et mot de passe :
- Login : lettres et chiffres du nom, sans accent, en majuscules, 8 au plus, suivis de 2, 3… s'il est
  déjà pris (`Construction ABC inc.` → `CONSTRUC`, puis `CONSTRUC2`). Ne pas le deviner : le lire dans la réponse.
- Mot de passe : 10 caractères, lettres et chiffres sans caractères ambigus. C'est celui du logiciel ;
  il est stocké en clair dans la fiche, comme ceux saisis à la main. estimation.ca le transmet au
  client sans le conserver dans ses journaux.

Réponse :

```json
{ "ok": true, "cree": true, "login": "CONSTRUC", "motDePasse": "k7Hq2mXa9P", "client": { ...comme lire... } }
```

**Rejeu** : la demande est notée dans une note de la fiche (« Fiche créée par estimation.ca
[demande API <IdDemande>] »). Rejouer la même `IdDemande` avec le même `Nom` (après un délai
dépassé, par exemple) ne crée rien et renvoie la fiche déjà créée avec `"cree": false`, son login
et son mot de passe actuel.

Refus propres à `creer` :

```json
{ "ok": false, "code": "COURRIEL_EXISTE", "message": "...",
  "clients": [ { "login": "ABC123", "nom": "Construction ABC inc.", "champ": "courriel", "actif": true } ] }
```

- `COURRIEL_EXISTE` : l'un des courriels donnés figure déjà dans une fiche (même règle que
  `chercher`, fiches dans `clients`, au plus 20, `tronque` s'il y en a d'autres). Le client a
  peut-être déjà une fiche : la proposer plutôt que d'en créer une autre. Si la nouvelle fiche est
  voulue (succursale, comptable commun), rappeler avec `Forcer=1`.
- `NOM_EXISTE` : une autre fiche porte ce nom ; la réponse ajoute son `login`. Changer le nom
  (ex. ajouter la ville) ou utiliser la fiche existante. `Forcer` ne s'applique pas.

## Erreurs

```json
{ "ok": false, "code": "LOGIN_INCONNU", "message": "Login inconnu" }
```

| `code` | Cause |
|---|---|
| `AUTH` | API inactive, clé absente ou invalide, ou IP non autorisée (pas de détail renvoyé ; la cause est au journal du serveur) |
| `LOGIN_INCONNU` | Aucun client avec ce login |
| `AUCUNE_DONNEE` | `renouveler` sans aucune date |
| `DATE_INVALIDE` | Date mal formée, passée ou à plus de 5 ans (le message précise laquelle). Pour `creer`, seulement si les dates sont le seul motif de refus |
| `COURRIEL_INVALIDE` | `chercher` avec un `Courriel` vide, sans `@` ou de plus de 60 caractères |
| `DONNEE_INVALIDE` | `creer` : paramètre absent, trop long ou hors limites, ou règle de version non respectée (le message nomme chaque paramètre en cause) |
| `NOM_EXISTE` | `creer` : une fiche porte déjà ce nom (`login` de cette fiche ajouté) |
| `COURRIEL_EXISTE` | `creer` : un courriel figure déjà dans une fiche (`clients` ajouté) ; `Forcer=1` pour créer quand même |
| `CREATION_INACTIVE` | `creer` désactivée dans la configuration du serveur |
| `ACTION_INCONNUE` | `Action` absente ou inconnue |
| `ERREUR_INTERNE` | Base indisponible ou écriture refusée par HFSQL |

Si le serveur ne répond pas ou renvoie autre chose que du JSON, estimation.ca doit considérer
l'information comme temporairement indisponible et pouvoir rejouer la demande plus tard.

## Côté serveur

- Configuration : section `[APILIC]` de `lecatalogue.ini` (`Actif`, `CleAPI`, `IPAutorisees`, `Creation`).
- Journal : `c:\WebSite\Traces\AALogAPI.log` (IP, action, login, courriel recherché ou nom créé,
  `IdDemande`, début de la réponse ; l'état avant modification pour chaque renouvellement).
  La clé et le mot de passe d'une fiche créée n'y sont jamais écrits. Chaque création est aussi notée
  dans le journal des fiches (« API Ajout client »), comme une création depuis la fiche.
