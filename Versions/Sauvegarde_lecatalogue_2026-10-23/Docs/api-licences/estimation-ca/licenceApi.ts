// Client de l'API licences de lecatalogue.ca (contrat : docs/api-licences/contrat.md).
// À copier dans le dépôt d'estimation.ca. Dépendance : zod.
//
// Configuration (variables d'environnement, jamais dans le code) :
//   LECATALOGUE_API_URL  ex. https://www.lecatalogue.ca/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue
//   LECATALOGUE_API_CLE  clé partagée (section [APILIC] de lecatalogue.ini)

import { randomUUID } from "node:crypto";
import { z } from "zod";

const DateOuVide = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

export const LicenceClientSchema = z.object({
  id: z.number().int(),
  login: z.string(),
  nom: z.string(),
  contact: z.string(),
  courriels: z.array(z.string()),
  abonnement: z.boolean(),
  actif: z.boolean(),
  dateFinAbonnement: DateOuVide,
  dateFinEG: DateOuVide,
  dateFinEPlans: DateOuVide,
  dateDerniereVisite: DateOuVide,
  typeVersion: z.number().int(),
  typeVersionLibelle: z.string(),
  licences: z.object({
    egAchat: z.number().int(),
    egLocation: z.number().int(),
    eplansOrAchat: z.number().int(),
    eplansOrLocation: z.number().int(),
    eplansMonoAchat: z.number().int(),
    eplansMonoLocation: z.number().int(),
    eplansMultiAchat: z.number().int(),
    eplansMultiLocation: z.number().int(),
    totalEG: z.number().int(),
    totalEPlans: z.number().int(),
    location: z.boolean(),
  }),
  options: z.object({
    catalogue: z.boolean(),
    eplans: z.boolean(),
    tplans: z.boolean(),
    echeancier: z.boolean(),
    comparatif: z.boolean(),
    ventilation: z.boolean(),
    repartition: z.boolean(),
    invitation: z.boolean(),
    salleDePlans: z.boolean(),
  }),
  montantMAJ: z.number(),
});
export type LicenceClient = z.infer<typeof LicenceClientSchema>;

export const CodesErreur = [
  "AUTH",
  "LOGIN_INCONNU",
  "AUCUNE_DONNEE",
  "DATE_INVALIDE",
  "ACTION_INCONNUE",
  "ERREUR_INTERNE",
] as const;
export type CodeErreur = (typeof CodesErreur)[number] | "INDISPONIBLE" | "REPONSE_INVALIDE";

const ErreurSchema = z.object({ ok: z.literal(false), code: z.string(), message: z.string() });
const LireSchema = z.object({ ok: z.literal(true), client: LicenceClientSchema });
const RenouvelerSchema = z.object({
  ok: z.literal(true),
  modifie: z.boolean(),
  avant: LicenceClientSchema,
  apres: LicenceClientSchema,
});

export class LicenceApiErreur extends Error {
  constructor(public readonly code: CodeErreur, message: string) {
    super(message);
    this.name = "LicenceApiErreur";
  }
}

/** Date JS ou "AAAA-MM-JJ" -> "AAAAMMJJ" attendu par l'API. */
function versAAAAMMJJ(date: Date | string): string {
  if (typeof date === "string") return date.replaceAll("-", "");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const jj = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}${mm}${jj}`;
}

async function appeler<T extends z.ZodTypeAny>(
  schema: T,
  params: Record<string, string>,
  delaiMs = 15_000,
): Promise<z.infer<T>> {
  const url = process.env.LECATALOGUE_API_URL;
  const cle = process.env.LECATALOGUE_API_CLE;
  if (!url || !cle) throw new Error("LECATALOGUE_API_URL et LECATALOGUE_API_CLE doivent être définies");

  let texte: string;
  try {
    const rep = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ Type: "apilic", Cle: cle, ...params }),
      signal: AbortSignal.timeout(delaiMs),
    });
    texte = await rep.text();
  } catch (e) {
    throw new LicenceApiErreur("INDISPONIBLE", `lecatalogue injoignable : ${(e as Error).message}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(texte);
  } catch {
    throw new LicenceApiErreur("REPONSE_INVALIDE", `Réponse non JSON : ${texte.slice(0, 200)}`);
  }
  const erreur = ErreurSchema.safeParse(json);
  if (erreur.success) {
    throw new LicenceApiErreur(erreur.data.code as CodeErreur, erreur.data.message);
  }
  const ok = schema.safeParse(json);
  if (!ok.success) {
    throw new LicenceApiErreur("REPONSE_INVALIDE", `Réponse hors contrat : ${ok.error.message}`);
  }
  return ok.data;
}

export async function ping(): Promise<void> {
  await appeler(z.object({ ok: z.literal(true), ping: z.literal("pong") }), { Action: "ping" });
}

export async function lireLicence(login: string): Promise<LicenceClient> {
  const rep = await appeler(LireSchema, { Action: "lire", Login: login });
  return rep.client;
}

export interface Renouvellement {
  login: string;
  dateFinAbonnement?: Date | string;
  dateFinEG?: Date | string;
  dateFinEPlans?: Date | string;
  /** À conserver avec la demande pour pouvoir la rejouer telle quelle. */
  idDemande?: string;
}

/**
 * Applique les nouvelles dates de fin. Idempotent : rejouer le même renouvellement
 * (mêmes dates, même idDemande) renvoie modifie=false sans rien écrire.
 */
export async function renouvelerLicence(r: Renouvellement) {
  const params: Record<string, string> = {
    Action: "renouveler",
    Login: r.login,
    IdDemande: r.idDemande ?? randomUUID(),
  };
  if (r.dateFinAbonnement) params.DateFinAbonnement = versAAAAMMJJ(r.dateFinAbonnement);
  if (r.dateFinEG) params.DateFinEG = versAAAAMMJJ(r.dateFinEG);
  if (r.dateFinEPlans) params.DateFinEPlans = versAAAAMMJJ(r.dateFinEPlans);
  return appeler(RenouvelerSchema, params);
}
