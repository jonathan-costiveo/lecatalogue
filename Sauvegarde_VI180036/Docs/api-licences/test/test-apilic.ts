// Banc de test de l'API licences (contrat : docs/api-licences/contrat.md).
// Aucune dépendance. Node 22.18+ ou 24 exécute le TypeScript directement :
//
//   APILIC_URL=http://localhost/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue \
//   APILIC_CLE=... APILIC_LOGIN=<login existant> \
//   node docs/api-licences/test/test-apilic.ts
//
// Facultatif : APILIC_COURRIEL=<courriel d'un client existant> vérifie que « chercher » le trouve.
//
// Tests d'écriture (renouvellement réel) : seulement avec --ecriture ET APILIC_LOGIN_TEST,
// un client de test dont on accepte que la date de fin d'abonnement soit prolongée.
// La date déjà enregistrée est reprise telle quelle si elle est dans le futur (aucun changement),
// sinon elle devient demain.
//
// « creer » : les refus (données invalides, nom ou courriel déjà présents) sont testés sans rien
// écrire, si Creation=1 dans [APILIC] (sinon CREATION_INACTIVE et ces tests sont sautés).
// Création réelle seulement avec --creation (en local de préférence) : crée une fiche
// « ZZ Test API <horodatage> » à supprimer ensuite dans l'administration.

export {}; // module ESM (await au niveau supérieur)

const URL_API = process.env.APILIC_URL;
const CLE = process.env.APILIC_CLE;
const LOGIN = process.env.APILIC_LOGIN;
const LOGIN_TEST = process.env.APILIC_LOGIN_TEST;
const COURRIEL = process.env.APILIC_COURRIEL;
const ECRITURE = process.argv.includes("--ecriture");
const CREATION = process.argv.includes("--creation");

if (!URL_API || !CLE || !LOGIN) {
  console.error("Définir APILIC_URL, APILIC_CLE et APILIC_LOGIN.");
  process.exit(2);
}

type Json = Record<string, unknown>;
let echecs = 0;

async function appel(params: Record<string, string>): Promise<Json> {
  const rep = await fetch(URL_API!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ Type: "apilic", ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  const texte = await rep.text();
  try {
    return JSON.parse(texte) as Json;
  } catch {
    throw new Error(`Réponse non JSON (HTTP ${rep.status}, ${rep.headers.get("content-type")}) : ${texte.slice(0, 300)}`);
  }
}

async function cas(nom: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ok    ${nom}`);
  } catch (e) {
    echecs++;
    console.log(`  ÉCHEC ${nom}\n        ${(e as Error).message}`);
  }
}

function verifie(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function verifieErreur(r: Json, code: string) {
  verifie(r.ok === false && r.code === code, `attendu ok=false code=${code}, reçu ${JSON.stringify(r)}`);
}

const DATE = /^(\d{4}-\d{2}-\d{2})?$/;
function verifieClient(c: unknown) {
  verifie(c && typeof c === "object", "client absent");
  const o = c as Json;
  for (const k of ["login", "nom", "contact", "typeVersionLibelle"]) verifie(typeof o[k] === "string", `${k} n'est pas une chaîne`);
  for (const k of ["id", "typeVersion", "montantMAJ"]) verifie(typeof o[k] === "number", `${k} n'est pas un nombre`);
  for (const k of ["abonnement", "abonnementMensuel", "actif"]) verifie(typeof o[k] === "boolean", `${k} n'est pas un booléen`);
  for (const k of ["dateFinAbonnement", "dateFinEG", "dateFinEPlans", "dateDerniereVisite"])
    verifie(typeof o[k] === "string" && DATE.test(o[k] as string), `${k} mal formée : ${o[k]}`);
  verifie(Array.isArray(o.courriels), "courriels n'est pas un tableau");
  const lic = o.licences as Json;
  for (const k of ["egAchat", "egLocation", "eplansOrAchat", "eplansOrLocation", "eplansMonoAchat",
    "eplansMonoLocation", "eplansMultiAchat", "eplansMultiLocation", "totalEG", "totalEPlans"])
    verifie(Number.isInteger(lic?.[k]), `licences.${k} absent`);
  verifie(typeof lic.location === "boolean" && typeof lic.partageAvecEG === "boolean", "licences.location/partageAvecEG absents");
  verifie(lic.totalEG === (lic.egAchat as number) + (lic.egLocation as number), "totalEG incohérent");
  const opt = o.options as Json;
  for (const k of ["catalogue", "eplans", "echeancier", "comparatif", "ventilation", "repartition", "invitation", "salleDePlans"])
    verifie(typeof opt?.[k] === "boolean", `options.${k} absent`);
  verifieRenouvellement(o.renouvellement, o.montantMAJ);
}

// Montants au cent près : la somme de montants arrondis peut s'écarter d'un cent par ligne
const egal = (a: unknown, b: unknown, lignes = 1) => Math.abs((a as number) - (b as number)) <= 0.011 * lignes;
function verifieRenouvellement(r: unknown, montantMAJ: unknown) {
  verifie(r && typeof r === "object", "renouvellement absent");
  const reel = (r as Json).reel as Json;
  for (const k of ["logiciels", "salleDePlans", "total"]) verifie(typeof reel?.[k] === "number", `renouvellement.reel.${k} absent`);
  verifie(egal(reel.total, (reel.logiciels as number) + (reel.salleDePlans as number)), "reel.total incohérent");
  verifie(reel.logiciels === montantMAJ, "montantMAJ différent de reel.logiciels");
  const calc = (r as Json).calcule as Json | null;
  verifie(calc !== undefined, "renouvellement.calcule absent (null attendu si le calcul est impossible)");
  if (calc === null) return;
  for (const k of ["achat", "location", "logiciels", "salleDePlans", "total"]) verifie(typeof calc[k] === "number", `renouvellement.calcule.${k} absent`);
  verifie(egal(calc.logiciels, (calc.achat as number) + (calc.location as number)), "calcule : achat + location ≠ logiciels");
  verifie(egal(calc.total, (calc.logiciels as number) + (calc.salleDePlans as number)), "calcule : logiciels + salleDePlans ≠ total");
  verifie(Array.isArray(calc.detail), "calcule.detail n'est pas un tableau");
  const detail = calc.detail as Json[];
  for (const l of detail) verifie(typeof l.libelle === "string" && l.libelle !== "" && typeof l.montant === "number", `ligne de détail invalide : ${JSON.stringify(l)}`);
  const somme = detail.reduce((t, l) => t + (l.montant as number), 0);
  verifie(egal(somme, calc.total, detail.length + 1), `somme du détail (${somme.toFixed(2)}) ≠ total (${calc.total})`);
}

function verifieChercher(r: Json) {
  verifie(r.ok === true && Array.isArray(r.clients), `attendu ok=true et clients[], reçu ${JSON.stringify(r)}`);
  const clients = r.clients as Json[];
  verifie(clients.length <= 20, `plus de 20 clients : ${clients.length}`);
  verifie(r.tronque === undefined || r.tronque === true, `tronque inattendu : ${r.tronque}`);
  for (const c of clients) {
    verifie(typeof c.login === "string" && c.login !== "" && typeof c.nom === "string", `client mal formé : ${JSON.stringify(c)}`);
    verifie(["courriel", "courriel2", "courriel3"].includes(c.champ as string), `champ inattendu : ${c.champ}`);
    verifie(typeof c.actif === "boolean", `actif n'est pas un booléen : ${JSON.stringify(c)}`);
  }
  return clients;
}

function aaaammjj(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

console.log(`API : ${URL_API}`);

await cas("ping avec la bonne clé", async () => {
  const r = await appel({ Action: "ping", Cle: CLE! });
  verifie(r.ok === true && r.ping === "pong", JSON.stringify(r));
});
await cas("mauvaise clé -> AUTH", async () => verifieErreur(await appel({ Action: "ping", Cle: "x".repeat(40) }), "AUTH"));
await cas("clé absente -> AUTH", async () => verifieErreur(await appel({ Action: "lire", Login: LOGIN! }), "AUTH"));
await cas("action inconnue -> ACTION_INCONNUE", async () => verifieErreur(await appel({ Action: "detruire", Cle: CLE! }), "ACTION_INCONNUE"));
await cas("login inconnu -> LOGIN_INCONNU", async () =>
  verifieErreur(await appel({ Action: "lire", Cle: CLE!, Login: "ZZ_INEXISTANT_" + Date.now() }), "LOGIN_INCONNU"));
await cas(`lire ${LOGIN} -> contrat respecté`, async () => {
  const r = await appel({ Action: "lire", Cle: CLE!, Login: LOGIN! });
  verifie(r.ok === true, JSON.stringify(r));
  verifieClient(r.client);
  console.log(`        ${JSON.stringify(r.client)}`);
});
await cas("renouveler sans date -> AUCUNE_DONNEE", async () =>
  verifieErreur(await appel({ Action: "renouveler", Cle: CLE!, Login: LOGIN! }), "AUCUNE_DONNEE"));
await cas("renouveler date mal formée -> DATE_INVALIDE (rien écrit)", async () =>
  verifieErreur(await appel({ Action: "renouveler", Cle: CLE!, Login: LOGIN!, DateFinAbonnement: "20261341" }), "DATE_INVALIDE"));
await cas("renouveler date passée -> DATE_INVALIDE (rien écrit)", async () =>
  verifieErreur(await appel({ Action: "renouveler", Cle: CLE!, Login: LOGIN!, DateFinAbonnement: "20200101" }), "DATE_INVALIDE"));
await cas("renouveler date à plus de 5 ans -> DATE_INVALIDE (rien écrit)", async () =>
  verifieErreur(await appel({ Action: "renouveler", Cle: CLE!, Login: LOGIN!, DateFinAbonnement: "20990101" }), "DATE_INVALIDE"));
for (const [libelle, courriel] of [["absent", undefined], ["sans @", "pas-un-courriel"], ["de plus de 60 caractères", "a".repeat(55) + "@abc.ca"]] as const) {
  await cas(`chercher courriel ${libelle} -> COURRIEL_INVALIDE`, async () =>
    verifieErreur(await appel({ Action: "chercher", Cle: CLE!, ...(courriel === undefined ? {} : { Courriel: courriel }) }), "COURRIEL_INVALIDE"));
}
await cas("chercher courriel inconnu -> liste vide", async () => {
  const clients = verifieChercher(await appel({ Action: "chercher", Cle: CLE!, Courriel: `zz-inexistant-${Date.now()}@exemple.invalid` }));
  verifie(clients.length === 0, `attendu aucun client, reçu ${JSON.stringify(clients)}`);
});
if (COURRIEL) {
  await cas(`chercher ${COURRIEL} (majuscules et espaces) -> au moins un client`, async () => {
    const clients = verifieChercher(await appel({ Action: "chercher", Cle: CLE!, Courriel: `  ${COURRIEL.toUpperCase()} ` }));
    verifie(clients.length >= 1, "aucun client trouvé");
    console.log(`        ${JSON.stringify(clients)}`);
  });
}

// ---- creer ----
const demain = aaaammjj(new Date(Date.now() + 86_400_000));
const creerValide = (nom: string, courriel: string, extra: Record<string, string> = {}) => ({
  Action: "creer", Cle: CLE!, Nom: nom, Courriel: courriel, TypeVersion: "1", EGAchat: "1",
  IdDemande: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...extra,
});
const inconnu = () => `zz-inexistant-${Date.now()}@exemple.invalid`;
const sonde = await appel({ Action: "creer", Cle: CLE! });
if (sonde.code === "CREATION_INACTIVE") {
  console.log("  creer désactivée (Creation=0) : tests de creer sautés.");
} else {
  await cas("creer sans paramètres -> DONNEE_INVALIDE", async () => verifieErreur(sonde, "DONNEE_INVALIDE"));
  const invalides: [string, Record<string, string>][] = [
    ["TypeVersion 1 sans licence EG", { EGAchat: "0" }],
    ["TypeVersion 6 avec licence EG", { TypeVersion: "6", EPlansMultiAchat: "1" }],
    ["TypeVersion 8 avec licence EG", { TypeVersion: "8" }],
    ["TypeVersion 9", { TypeVersion: "9" }],
    ["EGAchat non numérique", { EGAchat: "abc" }],
    ["option à 2", { Echeancier: "2" }],
    ["courriel sans @", { Courriel: "pas-un-courriel" }],
    ["nom de plus de 80 caractères", { Nom: "Z".repeat(81) }],
    ["sans IdDemande", { IdDemande: "" }],
  ];
  for (const [libelle, extra] of invalides) {
    await cas(`creer ${libelle} -> DONNEE_INVALIDE (rien écrit)`, async () =>
      verifieErreur(await appel(creerValide(`ZZ Test API ${Date.now()}`, inconnu(), extra)), "DONNEE_INVALIDE"));
  }
  await cas("creer date passée -> DATE_INVALIDE (rien écrit)", async () =>
    verifieErreur(await appel(creerValide(`ZZ Test API ${Date.now()}`, inconnu(), { DateFinAbonnement: "20200101" })), "DATE_INVALIDE"));
  await cas(`creer avec le nom de ${LOGIN} -> NOM_EXISTE (rien écrit)`, async () => {
    const lu = await appel({ Action: "lire", Cle: CLE!, Login: LOGIN! });
    verifie(lu.ok === true, JSON.stringify(lu));
    const r = await appel(creerValide((lu.client as Json).nom as string, inconnu()));
    verifieErreur(r, "NOM_EXISTE");
    verifie(r.login === LOGIN, `login de la fiche existante attendu (${LOGIN}), reçu ${r.login}`);
  });
  if (COURRIEL) {
    await cas(`creer avec ${COURRIEL} -> COURRIEL_EXISTE (rien écrit)`, async () => {
      const r = await appel(creerValide(`ZZ Test API ${Date.now()}`, COURRIEL.toUpperCase()));
      verifieErreur(r, "COURRIEL_EXISTE");
      verifie(Array.isArray(r.clients) && (r.clients as Json[]).length >= 1, `clients attendus : ${JSON.stringify(r)}`);
    });
  }
  if (CREATION) {
    await cas("creer une fiche de test, la lire, rejouer, puis doublons", async () => {
      const ts = Date.now();
      const nom = `ZZ Test API ${ts} Québec`;
      const courriel = `zz-test-${ts}@exemple.invalid`;
      const demande = creerValide(nom, courriel, { Contact: "Test Été", EPlansMultiAchat: "1", DateFinAbonnement: demain });
      const r1 = await appel(demande);
      verifie(r1.ok === true && r1.cree === true, JSON.stringify(r1));
      verifie(typeof r1.login === "string" && /^[A-Z0-9]{3,12}$/.test(r1.login), `login inattendu : ${r1.login}`);
      verifie(typeof r1.motDePasse === "string" && r1.motDePasse.length === 10, "mot de passe de 10 caractères attendu");
      verifieClient(r1.client);
      const c = r1.client as Json;
      const lic = c.licences as Json;
      const opt = c.options as Json;
      verifie(c.nom === nom, `nom mal enregistré (accents ?) : ${c.nom}`);
      verifie(c.contact === "Test Été", `contact mal enregistré (accents ?) : ${c.contact}`);
      verifie(c.typeVersion === 1 && c.abonnement === true && c.actif === true, `version/abonnement : ${JSON.stringify(c)}`);
      verifie(lic.egAchat === 1 && lic.eplansOrAchat === 1 && lic.eplansMultiAchat === 1, `licences : ${JSON.stringify(lic)}`);
      verifie(opt.eplans === true && opt.echeancier === true && opt.salleDePlans === true, `options de la version Or : ${JSON.stringify(opt)}`);
      console.log(`        fiche créée : login ${r1.login} (à supprimer dans l'administration)`);
      const lu = await appel({ Action: "lire", Cle: CLE!, Login: r1.login as string });
      verifie(lu.ok === true, `lire après création : ${JSON.stringify(lu)}`);
      const r2 = await appel(demande);
      verifie(r2.ok === true && r2.cree === false && r2.login === r1.login && r2.motDePasse === r1.motDePasse,
        `le rejeu n'a pas renvoyé la même fiche : ${JSON.stringify(r2)}`);
      verifieErreur(await appel({ ...demande, IdDemande: `autre-${ts}` }), "NOM_EXISTE");
      const r3 = await appel(creerValide(`${nom} bis`, courriel));
      verifieErreur(r3, "COURRIEL_EXISTE");
      verifie((r3.clients as Json[]).some((x) => x.login === r1.login), `fiche créée absente de clients : ${JSON.stringify(r3)}`);
    });
  }
}

if (ECRITURE) {
  if (!LOGIN_TEST) {
    console.log("  --ecriture demandé sans APILIC_LOGIN_TEST : tests d'écriture sautés.");
  } else {
    await cas(`renouveler ${LOGIN_TEST} puis rejouer (idempotence)`, async () => {
      const lu = await appel({ Action: "lire", Cle: CLE!, Login: LOGIN_TEST });
      verifie(lu.ok === true, JSON.stringify(lu));
      const actuelle = ((lu.client as Json).dateFinAbonnement as string).replaceAll("-", "");
      const demain = new Date(Date.now() + 86_400_000);
      const cible = actuelle > aaaammjj(new Date()) ? actuelle : aaaammjj(demain);
      const id = `test-${Date.now()}`;
      const r1 = await appel({ Action: "renouveler", Cle: CLE!, Login: LOGIN_TEST, DateFinAbonnement: cible, IdDemande: id });
      verifie(r1.ok === true, JSON.stringify(r1));
      verifieClient(r1.apres);
      const apres = r1.apres as Json;
      verifie((apres.dateFinAbonnement as string).replaceAll("-", "") === cible, `date non appliquée : ${apres.dateFinAbonnement}`);
      verifie(apres.abonnement === true, "abonnement non coché");
      const r2 = await appel({ Action: "renouveler", Cle: CLE!, Login: LOGIN_TEST, DateFinAbonnement: cible, IdDemande: id });
      verifie(r2.ok === true && r2.modifie === false, `le rejeu a modifié : ${JSON.stringify(r2)}`);
    });
  }
}

console.log(echecs === 0 ? "\nTous les tests passent." : `\n${echecs} test(s) en échec.`);
process.exit(echecs === 0 ? 0 : 1);
