// Banc de test de l'API licences (contrat : docs/api-licences/contrat.md).
// Aucune dépendance. Node 22.18+ ou 24 exécute le TypeScript directement :
//
//   APILIC_URL=http://localhost/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue \
//   APILIC_CLE=... APILIC_LOGIN=<login existant> \
//   node docs/api-licences/test/test-apilic.ts
//
// Tests d'écriture (renouvellement réel) : seulement avec --ecriture ET APILIC_LOGIN_TEST,
// un client de test dont on accepte que la date de fin d'abonnement soit prolongée.
// La date déjà enregistrée est reprise telle quelle si elle est dans le futur (aucun changement),
// sinon elle devient demain.

export {}; // module ESM (await au niveau supérieur)

const URL_API = process.env.APILIC_URL;
const CLE = process.env.APILIC_CLE;
const LOGIN = process.env.APILIC_LOGIN;
const LOGIN_TEST = process.env.APILIC_LOGIN_TEST;
const ECRITURE = process.argv.includes("--ecriture");

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
  for (const k of ["abonnement", "actif"]) verifie(typeof o[k] === "boolean", `${k} n'est pas un booléen`);
  for (const k of ["dateFinAbonnement", "dateFinEG", "dateFinEPlans", "dateDerniereVisite"])
    verifie(typeof o[k] === "string" && DATE.test(o[k] as string), `${k} mal formée : ${o[k]}`);
  verifie(Array.isArray(o.courriels), "courriels n'est pas un tableau");
  const lic = o.licences as Json;
  for (const k of ["egAchat", "egLocation", "eplansOrAchat", "eplansOrLocation", "eplansMonoAchat",
    "eplansMonoLocation", "eplansMultiAchat", "eplansMultiLocation", "totalEG", "totalEPlans"])
    verifie(Number.isInteger(lic?.[k]), `licences.${k} absent`);
  verifie(lic.totalEG === (lic.egAchat as number) + (lic.egLocation as number), "totalEG incohérent");
  const opt = o.options as Json;
  for (const k of ["catalogue", "eplans", "tplans", "echeancier", "comparatif", "ventilation", "repartition", "invitation", "salleDePlans"])
    verifie(typeof opt?.[k] === "boolean", `options.${k} absent`);
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
