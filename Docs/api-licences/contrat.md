# API licences lecatalogue — contrat v1

API que lecatalogue.ca expose à estimation.ca pour lire la licence d'un client des logiciels
(Estimateur Général, e-Plans) et en renouveler les dates de fin.

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
| `Action` | oui | `ping`, `lire` ou `renouveler` |
| `Cle` | oui | Clé secrète partagée (32 caractères ou plus). **Toujours dans le corps POST, jamais dans l'URL.** |
| `Login` | `lire`, `renouveler` | Login du client (`AAClient.Login`) |
| `DateFinAbonnement` | non | `AAAAMMJJ`. Fin de l'abonnement aux mises à jour |
| `DateFinEG` | non | `AAAAMMJJ`. Fin de licence Estimateur Général |
| `DateFinEPlans` | non | `AAAAMMJJ`. Fin de licence e-Plans |
| `IdDemande` | conseillé | Identifiant unique de la demande côté estimation.ca (UUID), noté au journal |

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
      "location": false
    },
    "options": {
      "catalogue": true, "eplans": true, "tplans": false, "echeancier": true,
      "comparatif": false, "ventilation": false, "repartition": false,
      "invitation": true, "salleDePlans": true
    },
    "montantMAJ": 495.00
  }
}
```

- Une date absente vaut `""`.
- `actif` = abonnement coché **et** `dateFinAbonnement` non dépassée (même règle que le site).
- `typeVersion` : 1 Or, 2 Argent+, 3 Argent, 4 Bronze, 5 Invitation, 6 e-Plans, 7 Or essai, 8 À déterminer.
- Les licences viennent de `CAAClient:GetLicences`, qui gère les deux modèles de licence du site.
  Les licences e-Plans « Or » sont les licences EG d'une version Or et sont comprises dans `totalEPlans`.
- `montantMAJ` : montant de renouvellement noté dans la fiche du client (peut être 0).

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

## Erreurs

```json
{ "ok": false, "code": "LOGIN_INCONNU", "message": "Login inconnu" }
```

| `code` | Cause |
|---|---|
| `AUTH` | API inactive, clé absente ou invalide, ou IP non autorisée (pas de détail renvoyé ; la cause est au journal du serveur) |
| `LOGIN_INCONNU` | Aucun client avec ce login |
| `AUCUNE_DONNEE` | `renouveler` sans aucune date |
| `DATE_INVALIDE` | Date mal formée, passée ou à plus de 5 ans (le message précise laquelle) |
| `ACTION_INCONNUE` | `Action` absente ou inconnue |
| `ERREUR_INTERNE` | Base indisponible ou écriture refusée par HFSQL |

Si le serveur ne répond pas ou renvoie autre chose que du JSON, estimation.ca doit considérer
l'information comme temporairement indisponible et pouvoir rejouer la demande plus tard.

## Côté serveur

- Configuration : section `[APILIC]` de `lecatalogue.ini` (`Actif`, `CleAPI`, `IPAutorisees`).
- Journal : `c:\WebSite\Traces\AALogAPI.log` (IP, action, login, `IdDemande`, résultat ; l'état
  avant modification pour chaque renouvellement). La clé n'y est jamais écrite.
