// Client de l'API licences de lecatalogue.ca (contrat : docs/api-licences/contrat.md).
// À copier dans le dépôt d'estimation.ca. Dépendance : zod.
//
// Configuration (variables d'environnement, jamais dans le code) :
//   LECATALOGUE_API_URL  ex. https://www.lecatalogue.ca/WD180AWP/WD180Awp.exe/CONNECT/lecatalogue
//   LECATALOGUE_API_CLE  clé partagée (section [APILIC] de lecatalogue.ini)

import { randomUUID } from "node:crypto";
import { z } from "zod";

const DateOuVide = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

const Montant = z.number();

/** Montants annuels de renouvellement, comme les deux colonnes de la fiche client (contrat.md). */
export const MontantsRenouvellementSchema = z.object({
  /** « Montants réels » saisis dans la fiche : ceux retenus pour le client. */
  reel: z.object({ logiciels: Montant, salleDePlans: Montant, total: Montant }),
  /** « Montants calculés » depuis la grille de prix du site ; null si le calcul est impossible. */
  calcule: z
    .object({
      achat: Montant,
      location: Montant,
      logiciels: Montant,
      salleDePlans: Montant,
      total: Montant,
      detail: z.array(z.object({ libelle: z.string(), montant: Montant })),
    })
    .nullable(),
});
export type MontantsRenouvellement = z.infer<typeof MontantsRenouvellementSchema>;

export const LicenceClientSchema = z.object({
  id: z.number().int(),
  login: z.string(),
  nom: z.string(),
  contact: z.string(),
  courriels: z.array(z.string()),
  abonnement: z.boolean(),
  abonnementMensuel: z.boolean(),
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
    partageAvecEG: z.boolean(),
  }),
  options: z.object({
    catalogue: z.boolean(),
    eplans: z.boolean(),
    echeancier: z.boolean(),
    comparatif: z.boolean(),
    ventilation: z.boolean(),
    repartition: z.boolean(),
    invitation: z.boolean(),
    salleDePlans: z.boolean(),
  }),
  /** Compatibilité : égal à renouvellement.reel.logiciels. */
  montantMAJ: z.number(),
  renouvellement: MontantsRenouvellementSchema,
});
export type LicenceClient = z.infer<typeof LicenceClientSchema>;

export const CodesErreur = [
  "AUTH",
  "LOGIN_INCONNU",
  "AUCUNE_DONNEE",
  "DATE_INVALIDE",
  "COURRIEL_INVALIDE",
  "DONNEE_INVALIDE",
  "NOM_EXISTE",
  "COURRIEL_EXISTE",
  "CREATION_INACTIVE",
  "ACTION_INCONNUE",
  "ERREUR_INTERNE",
] as const;
export type CodeErreur = (typeof CodesErreur)[number] | "INDISPONIBLE" | "REPONSE_INVALIDE";

const LireSchema = z.object({ ok: z.literal(true), client: LicenceClientSchema });
const RenouvelerSchema = z.object({
  ok: z.literal(true),
  modifie: z.boolean(),
  avant: LicenceClientSchema,
  apres: LicenceClientSchema,
});

export const ClientTrouveSchema = z.object({
  login: z.string(),
  nom: z.string(),
  champ: z.enum(["courriel", "courriel2", "courriel3"]),
  actif: z.boolean(),
});
export type ClientTrouve = z.infer<typeof ClientTrouveSchema>;

/** Refus : `clients` accompagne COURRIEL_EXISTE, `login` accompagne NOM_EXISTE. */
const ErreurSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
  clients: z.array(ClientTrouveSchema).optional(),
  tronque: z.boolean().optional(),
  login: z.string().optional(),
});

const ChercherSchema = z.object({
  ok: z.literal(true),
  clients: z.array(ClientTrouveSchema),
  tronque: z.boolean().optional(),
});

export class LicenceApiErreur extends Error {
  constructor(
    public readonly code: CodeErreur,
    message: string,
    /** COURRIEL_EXISTE : fiches où figure le courriel. */
    public readonly clients?: ClientTrouve[],
    /** NOM_EXISTE : login de la fiche qui porte déjà ce nom. */
    public readonly login?: string,
  ) {
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
    throw new LicenceApiErreur(erreur.data.code as CodeErreur, erreur.data.message, erreur.data.clients, erreur.data.login);
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

/**
 * Fiches clients dont l'un des trois courriels est `courriel` (casse et espaces ignorés).
 * Liste vide si aucune ; au plus 20 (tronque=true s'il y en a d'autres).
 * Sert à identifier la fiche : faire choisir ou confirmer, puis lire/renouveler par login.
 * Un courriel trouvé ne prouve pas que l'utilisateur en est le propriétaire : le vérifier avant.
 */
export async function chercherClients(courriel: string): Promise<{ clients: ClientTrouve[]; tronque: boolean }> {
  const rep = await appeler(ChercherSchema, { Action: "chercher", Courriel: courriel.trim() });
  return { clients: rep.clients, tronque: rep.tronque ?? false };
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

/** TypeVersion : 1 Or, 2 Argent+, 3 Argent, 4 Bronze, 5 Invitation, 6 e-Plans, 7 Or essai, 8 À déterminer. */
export type TypeVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface NouveauClient {
  /** Unique dans lecatalogue (80 caractères au plus). */
  nom: string;
  courriel: string;
  /** Obligatoire : à conserver avec la demande pour pouvoir la rejouer sans créer de doublon. */
  idDemande: string;
  typeVersion: TypeVersion;
  contact?: string;
  courriel2?: string;
  courriel3?: string;
  telephone?: string;
  telephone2?: string;
  licences?: {
    egAchat?: number;
    egLocation?: number;
    eplansMonoAchat?: number;
    eplansMonoLocation?: number;
    eplansMultiAchat?: number;
    eplansMultiLocation?: number;
  };
  /** Absente : réglage par défaut de la version (contrat.md). */
  options?: {
    echeancier?: boolean;
    comparatif?: boolean;
    ventilation?: boolean;
    repartition?: boolean;
    invitation?: boolean;
    salleDePlans?: boolean;
    catalogue?: boolean;
  };
  dateFinAbonnement?: Date | string;
  dateFinEG?: Date | string;
  dateFinEPlans?: Date | string;
  abonnementMensuel?: boolean;
  /** Créer même si un courriel figure déjà dans une fiche (après confirmation). */
  forcer?: boolean;
}

const CreerSchema = z.object({
  ok: z.literal(true),
  cree: z.boolean(),
  login: z.string().min(1),
  /** Mot de passe du logiciel : à transmettre au client, jamais à journaliser. */
  motDePasse: z.string().min(1),
  client: LicenceClientSchema,
});

/**
 * Crée la fiche du client ; lecatalogue génère login et mot de passe.
 * Idempotent par idDemande : le rejeu renvoie la fiche déjà créée avec cree=false.
 * Erreurs à traiter : COURRIEL_EXISTE (err.clients : proposer la fiche existante ou rappeler avec
 * forcer=true), NOM_EXISTE (err.login), DONNEE_INVALIDE, CREATION_INACTIVE.
 */
export async function creerClient(c: NouveauClient) {
  const params: Record<string, string> = {
    Action: "creer",
    Nom: c.nom.trim(),
    Courriel: c.courriel.trim(),
    IdDemande: c.idDemande,
    TypeVersion: String(c.typeVersion),
  };
  const texte: [keyof NouveauClient, string][] = [
    ["contact", "Contact"], ["courriel2", "Courriel2"], ["courriel3", "Courriel3"],
    ["telephone", "Telephone"], ["telephone2", "Telephone2"],
  ];
  for (const [cle, nom] of texte) {
    const v = c[cle];
    if (typeof v === "string" && v.trim() !== "") params[nom] = v.trim();
  }
  const licences: Record<keyof NonNullable<NouveauClient["licences"]>, string> = {
    egAchat: "EGAchat", egLocation: "EGLocation",
    eplansMonoAchat: "EPlansMonoAchat", eplansMonoLocation: "EPlansMonoLocation",
    eplansMultiAchat: "EPlansMultiAchat", eplansMultiLocation: "EPlansMultiLocation",
  };
  for (const [cle, nom] of Object.entries(licences)) {
    const n = c.licences?.[cle as keyof typeof licences];
    if (n !== undefined) params[nom] = String(n);
  }
  const options: Record<keyof NonNullable<NouveauClient["options"]>, string> = {
    echeancier: "Echeancier", comparatif: "Comparatif", ventilation: "Ventilation",
    repartition: "Repartition", invitation: "Invitation", salleDePlans: "SalleDePlans", catalogue: "Catalogue",
  };
  for (const [cle, nom] of Object.entries(options)) {
    const b = c.options?.[cle as keyof typeof options];
    if (b !== undefined) params[nom] = b ? "1" : "0";
  }
  if (c.dateFinAbonnement) params.DateFinAbonnement = versAAAAMMJJ(c.dateFinAbonnement);
  if (c.dateFinEG) params.DateFinEG = versAAAAMMJJ(c.dateFinEG);
  if (c.dateFinEPlans) params.DateFinEPlans = versAAAAMMJJ(c.dateFinEPlans);
  if (c.abonnementMensuel !== undefined) params.AbonnementMensuel = c.abonnementMensuel ? "1" : "0";
  if (c.forcer) params.Forcer = "1";
  return appeler(CreerSchema, params);
}
