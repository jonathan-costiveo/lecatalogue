# Modèle de données (analyse HFSQL)

Généré depuis `lecatalogue.xdd` par `.claude/scripts/gen_index.py`. Ne pas éditer à la main.
Types : correspondance déduite des codes du .xdd (« ? » = non confirmé). Fichiers physiques : `LECATALOGUE_WEB/bd/LECATALOGUE/*.FIC`.

| Fichier | Rubriques |
|---|---|
| [TRADES](#trades) | 22 |
| [RBQ_ENTREP](#rbq_entrep) | 7 |
| [RBQ_HISTO](#rbq_histo) | 10 |
| [Commande](#commande) | 17 |
| [Historique](#historique) | 9 |
| [PROVENANCE](#provenance) | 10 |
| [TTABCONV](#ttabconv) | 6 |
| [TRESERVE](#treserve) | 7 |
| [TUNITE](#tunite) | 8 |
| [TTYPUNIT](#ttypunit) | 3 |
| [LienAsmb](#lienasmb) | 35 |
| [ClientCat](#clientcat) | 3 |
| [Client](#client) | 29 |
| [Multicat](#multicat) | 11 |
| [Itemcat](#itemcat) | 67 |
| [INTERVEN](#interven) | 10 |
| [SDPFIC](#sdpfic) | 7 |
| [SDPSTAT](#sdpstat) | 16 |
| [LOGMODIF](#logmodif) | 6 |
| [FORMATION](#formation) | 6 |
| [NOTE_CLIENT](#note_client) | 9 |
| [SDPDESC](#sdpdesc) | 3 |
| [SDPINFO](#sdpinfo) | 16 |
| [Envoi](#envoi) | 7 |
| [Banniere2](#banniere2) | 6 |
| [Version](#version) | 15 |
| [AAClient](#aaclient) | 75 |
| [TRADESTX](#tradestx) | 12 |
| [HISTODEMO](#histodemo) | 9 |
| [IPADDRESS](#ipaddress) | 8 |
| [SDP_INTRUS](#sdp_intrus) | 5 |
| [INTRUSION](#intrusion) | 4 |
| [CLIENTDEMO](#clientdemo) | 15 |
| [INFO_ECOLE](#info_ecole) | 11 |
| [COURRIELS](#courriels) | 10 |
| [LOGVERSION](#logversion) | 10 |
| [CACHEOPER](#cacheoper) | 15 |
| [CACHEDICO](#cachedico) | 6 |
| [EQUIPELEM](#equipelem) | 17 |
| [NOTE_CATCLIENT](#note_catclient) | 9 |
| [LISTFORM](#listform) | 5 |
| [REPCOMMON](#repcommon) | 20 |

## TRADES

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDTRADES | ID automatique | 4 | clé unique |
| IDTRADPARENT | Entier s.s. 4 (clé étrangère) | 4 | clé avec doublons |
| TYPE_TRADE | Entier 2 | 2 | clé avec doublons |
| METIER_CODE | Texte | 12 | clé avec doublons |
| TAUX_VAL | Monétaire | 10 |  |
| TAUX_UTEMPS | Entier 4 | 4 |  |
| TAUX_DATE | Date (AAAAMMJJ) | 8 |  |
| INVARIANT | Texte | 19 | clé avec doublons |
| USERS | Texte | 20 | clé avec doublons |
| TIMESTAMP_AJOUT | Texte | 14 |  |
| TIMESTAMP_MODIF | Texte | 14 |  |
| ELEM_EQUIPE | Booléen | 1 |  |
| HIDE_TRADE | Booléen | 1 |  |
| Flags | Entier 4 | 4 |  |
| METIER_DESC | Texte | 300 |  |
| B_PRODDEF | Booléen | 1 |  |
| MO_NBRUNIT | Réel 8 | 8 |  |
| CODEUNITE | Texte | 30 | clé avec doublons |
| TEMPSPRODH | Réel 8 | 8 |  |
| T_TUCLEUNIK | Entier 4 | 4 |  |
| B_FIXEDOSS | Booléen | 1 |  |
| CLE_TYPEIDTRADES | clé composée (TYPE_TRADE+IDTRADES) | | clé avec doublons |

## RBQ_ENTREP

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDRBQ_ENTREP | ID automatique | 4 | clé unique |
| RBQ_NOMENTREP | Texte | 120 | clé avec doublons |
| RBQ_ADDRIP | Entier 4 | 4 | clé avec doublons |
| RBQ_ADDRIP_S | Texte | 40 | clé avec doublons |
| RBQ_CUMUL | Entier 4 | 4 |  |
| RBQ_INTERDIT | Booléen | 1 |  |
| RBQ_LIMITE | Entier 4 | 4 |  |

## RBQ_HISTO

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDRBQ_HISTO | ID automatique | 4 | clé unique |
| RBQ_NOMENTREP | Texte | 120 | clé avec doublons |
| RBQ_ADDRIP | Entier 4 | 4 | clé avec doublons |
| RBQ_ADDRIP_S | Texte | 40 | clé avec doublons |
| RBQ_CUMUL | Entier 4 | 4 |  |
| RBQ_DATE | Texte | 8 | clé avec doublons |
| RBQ_HEURE | Texte | 6 |  |
| RBQ_REQUETE | Texte | 200 |  |
| RBQ_VERSION | Texte | 20 |  |
| CLE_DATE | clé composée (RBQ_DATE+RBQ_HEURE) | | clé avec doublons |

## Commande

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDCommande | ID automatique | 4 | clé unique |
| Nom | Texte | 60 | clé avec doublons |
| Prenom | Texte | 50 |  |
| NomSociete | Texte | 60 |  |
| Fonct | Texte | 50 |  |
| Adresse | Texte | 100 |  |
| Ville | Texte | 60 |  |
| Province | Texte | 50 |  |
| Pays | Texte | 40 |  |
| CodePostal | Texte | 10 |  |
| Telephone | Texte | 20 |  |
| Telecopieur | Texte | 20 |  |
| Courriel | Texte | 65 | clé avec doublons |
| DateBon | Date (AAAAMMJJ) | 8 |  |
| Flags | Entier s.s. 4 (clé étrangère) | 4 |  |
| NomMAJ | Texte | 60 |  |
| Cle_Bon | clé composée (NomMAJ+Courriel) | | clé unique |

## Historique

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDHistorique | ID automatique | 4 | clé unique |
| IdClient | Entier 4 | 4 | clé avec doublons |
| NomTable | Texte | 10 | clé avec doublons |
| CleTable | Entier s.s. 4 (clé étrangère) | 4 | clé avec doublons |
| TimeStamp | Texte | 17 | clé avec doublons |
| NoLigne | Entier 4 | 4 |  |
| TypeAction | Entier 4 | 4 |  |
| DescAction | Texte | 40 |  |
| CleHisto | clé composée (IdClient+NomTable+CleTable+TimeStamp+NoLigne) | | clé unique |

## PROVENANCE

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDPROVENANCE | ID automatique | 4 | clé unique |
| Abreviation | Texte | 15 |  |
| Description | Texte | 200 |  |
| AbrevMaj | Texte | 15 | clé unique |
| Courriel | Texte | 65 | clé avec doublons |
| Telecopieur | Texte | 26 |  |
| Telephone | Texte | 26 |  |
| TelSansFrais | Texte | 26 |  |
| AddrComplete | Texte | 300 |  |
| Flags | Entier s.s. 4 (clé étrangère) | 4 |  |

## TTABCONV

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| TUIDENT1 | Entier 4 | 4 | clé avec doublons |
| TUIDENT2 | Entier 4 | 4 | clé avec doublons |
| VALCONV | Réel 8 | 8 |  |
| SVALCONV | Texte | 40 |  |
| Flags | Entier s.s. 4 (clé étrangère) | 4 |  |
| CLE_CONV | clé composée (TUIDENT1+TUIDENT2) | | clé unique |

## TRESERVE

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| TRCLEUNIK | ID automatique | 4 | clé unique |
| LANGUE | Caractère ? | 2 | clé avec doublons |
| MOTRESERVE | Texte | 32 |  |
| MOTMAJUS | Texte | 32 | clé avec doublons |
| SYNTAXE | Texte | 80 |  |
| DESCMOT | Texte | 200 |  |
| CLE_MOT | clé composée (MOTMAJUS+LANGUE) | | clé unique |

## TUNITE

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| TUCLEUNIK | ID automatique | 4 | clé unique |
| CLETYPUNIT | Caractère ? | 2 | clé avec doublons |
| NOMUNITE | Texte | 16 |  |
| FRLIBUNIT | Texte | 40 |  |
| GBLIBUNIT | Texte | 40 |  |
| METRIMP | Texte | 1 |  |
| SYMBOLE | Texte | 10 |  |
| CLE_UTRI | clé composée (CLETYPUNIT+METRIMP) | | clé avec doublons |

## TTYPUNIT

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| CLETYPUNIT | Caractère ? | 2 | clé unique |
| TTDESCFR | Texte | 30 |  |
| TTDESCGB | Texte | 30 |  |

## LienAsmb

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| LACLEUNIK | ID automatique | 4 | clé unique |
| CLE_PARENT | Entier 4 | 4 | clé avec doublons |
| MUCLEUNIK | Entier 4 | 4 | clé avec doublons |
| IMCLEUNIK | Entier 4 | 4 | clé avec doublons |
| TYPEITEM | Entier 2 | 2 | clé avec doublons |
| NoLigne | Entier 2 | 2 |  |
| QUANTASS | Réel 8 | 8 |  |
| Cat_Unite | Texte | 15 |  |
| Cat_MainOeuvre | Monétaire | 10 |  |
| Cat_Cout | Monétaire | 10 |  |
| Cat_Equipement | Monétaire | 10 |  |
| Cat_SousTraitant | Monétaire | 10 |  |
| Cat_MontantDivers | Monétaire | 10 |  |
| Cat_poids | Réel 8 | 8 |  |
| P_TUCLEUNIK | Entier 4 | 4 |  |
| Cat_Volume | Réel 8 | 8 |  |
| V_TUCLEUNIK | Entier 4 | 4 |  |
| TEMPSPRODH | Réel 8 | 8 |  |
| T_TUCleUnik | Entier 4 | 4 |  |
| Cat_Ratio | Réel 8 | 8 |  |
| Cat_Carton | Réel 8 | 8 |  |
| FLAGMODECALC | Entier 4 | 4 |  |
| FLAGS | Entier s.s. 4 (clé étrangère) | 4 |  |
| CONTENU_CALC | Numérique 8 ? | 8 |  |
| CONTENU_CALCA | Numérique 8 ? | 8 |  |
| CONTENU_CALCP | Numérique 8 ? | 8 |  |
| CONTENU_CALCE | Numérique 8 ? | 8 |  |
| CONTENU_CALCS | Numérique 8 ? | 8 |  |
| CONTENU_CALCD | Numérique 8 ? | 8 |  |
| PROTECT | Entier 4 | 4 |  |
| RATCART | Entier 2 | 2 |  |
| IDTRADES | Entier 4 | 4 | clé avec doublons |
| MO_NBRUNIT | Réel 8 | 8 |  |
| CLE_LIEN1 | clé composée (CLE_PARENT+TYPEITEM+NoLigne) | | clé avec doublons |
| CLE_PARENTIMLIG | clé composée (CLE_PARENT+IMCLEUNIK+NoLigne) | | clé avec doublons |

## ClientCat

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDClient | Entier 4 | 4 | clé avec doublons |
| MUCLEUNIK | Entier 4 | 4 | clé avec doublons |
| CLE_CAT4 | clé composée (IDClient+MUCLEUNIK) | | clé unique |

## Client

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDClient | ID automatique | 4 | clé unique |
| Nom | Texte | 60 | clé avec doublons |
| Contact | Texte | 60 |  |
| Courriel | Texte | 65 | clé avec doublons |
| Courriel2 | Texte | 65 |  |
| Courriel3 | Texte | 65 |  |
| Login | Texte | 15 | clé unique |
| Password | Texte | 15 |  |
| DateFinAbonnement | Date (AAAAMMJJ) | 8 |  |
| DateAchat | Date (AAAAMMJJ) | 8 |  |
| DateDerniereVisite | Date (AAAAMMJJ) | 8 |  |
| Batch | Booléen | 1 |  |
| WebMaster | Booléen | 1 |  |
| Abonnement | Booléen | 1 |  |
| Telephone | Texte | 26 |  |
| Fax1 | Texte | 26 |  |
| Sujet | Texte | 50 |  |
| TexteMemo | Numérique 8 ? | 8 |  |
| Flags | Entier s.s. 4 (clé étrangère) | 4 |  |
| IDPROVENANCE | Entier 4 | 4 | clé avec doublons |
| LoginMaj | Texte | 15 | clé avec doublons |
| NomMaj | Texte | 60 |  |
| Adresse | Texte | 100 |  |
| Ville | Texte | 60 |  |
| Province | Texte | 50 |  |
| Pays | Texte | 40 |  |
| CodePostal | Texte | 10 |  |
| FacturationAuto | Booléen | 1 |  |
| NBHFORM | Entier s.s. 4 ? | 4 |  |

## Multicat

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| MUCLEUNIK | ID automatique | 4 | clé unique |
| NomCatalog | Texte | 100 |  |
| TypeCatalog | Entier 2 | 2 | clé avec doublons |
| NomFic | Texte | 260 |  |
| Flags | Entier s.s. 4 (clé étrangère) | 4 |  |
| NomExec | Texte | 260 |  |
| LigneCMD | Texte | 200 |  |
| NUMREV | Entier 4 | 4 |  |
| DATEREV | Date (AAAAMMJJ) | 8 |  |
| NBRITEM | Entier 4 | 4 |  |
| NOMCATMAJ | Texte | 100 | clé unique |

## Itemcat

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IMCLEUNIK | ID automatique | 4 | clé unique |
| MUCLEUNIK | Entier 4 | 4 | clé avec doublons |
| CAT_NIVEAU | Entier 2 | 2 | clé avec doublons |
| TYPEITEM | Entier 2 | 2 | clé avec doublons |
| CLE_PARENT | Entier 4 | 4 | clé avec doublons |
| Cat_Code | Texte | 40 | clé avec doublons |
| Cat_Description_fr | Texte | 120 |  |
| Cat_Description_en | Texte | 120 |  |
| Cat_Description_es | Texte | 120 |  |
| Cat_P_Description | Booléen | 1 |  |
| Cat_MainOeuvre | Monétaire | 10 |  |
| Cat_P_MainOeuvre | Booléen | 1 |  |
| Cat_Ratio_Pose | Booléen | 1 |  |
| Cat_Carton_Pose | Booléen | 1 |  |
| Cat_Cout | Monétaire | 10 |  |
| Cat_P_Cout | Booléen | 1 |  |
| Cat_Ratio_Achat | Booléen | 1 |  |
| Cat_Carton_Achat | Booléen | 1 |  |
| Cat_Equipement | Monétaire | 10 |  |
| Cat_P_Equipement | Booléen | 1 |  |
| Cat_Ratio_Equip | Booléen | 1 |  |
| Cat_Carton_Equip | Booléen | 1 |  |
| Cat_SousTraitant | Monétaire | 10 |  |
| Cat_P_SousTraitant | Booléen | 1 |  |
| Cat_Ratio_SousT | Booléen | 1 |  |
| Cat_Carton_SousT | Booléen | 1 |  |
| Cat_Unite | Texte | 15 |  |
| Cat_P_Unite | Booléen | 1 |  |
| Cat_DateRevision | Date (AAAAMMJJ) | 8 |  |
| FLAGMODECALC | Entier 4 | 4 |  |
| Cat_Ratio | Réel 8 | 8 |  |
| Cat_P_Ratio | Booléen | 1 |  |
| Cat_Carton | Réel 8 | 8 |  |
| Cat_P_Carton | Booléen | 1 |  |
| Cat_MontantDivers | Monétaire | 10 |  |
| Cat_P_MontantDivers | Booléen | 1 |  |
| Cat_Escompte | Monétaire | 10 |  |
| Cat_P_Escompte | Booléen | 1 |  |
| Pourcentage | Booléen | 1 |  |
| Cat_Volume | Réel 8 | 8 |  |
| Cat_P_Volume | Booléen | 1 |  |
| V_TUCLEUNIK | Entier 4 | 4 |  |
| Cat_Poids | Réel 8 | 8 |  |
| Cat_P_Poids | Booléen | 1 |  |
| P_TUCLEUNIK | Entier 4 | 4 |  |
| TEMPSPRODH | Réel 8 | 8 |  |
| P_TEMPSPRODH | Booléen | 1 |  |
| T_TUCLEUNIK | Entier 4 | 4 |  |
| DATECRE | Date (AAAAMMJJ) | 8 |  |
| DATEMOD | Date (AAAAMMJJ) | 8 |  |
| NBRELEM | Entier 4 | 4 |  |
| Flags | Entier s.s. 4 (clé étrangère) | 4 |  |
| PROTECT | Entier 4 | 4 |  |
| MO_NBRUNIT | Réel 8 | 8 |  |
| DDN2007 | Texte | 12 |  |
| IDTRADES | Entier 4 | 4 | clé avec doublons |
| P_IDTRADES | Booléen | 1 |  |
| Cat_DescMaj_FR | Texte | 120 |  |
| Cat_DescMaj_EN | Texte | 120 |  |
| Cat_DescMaj_ES | Texte | 120 |  |
| Cat_CODEG | Texte | 40 |  |
| Cat_CODED | Texte | 40 |  |
| CLE_TYPEG | clé composée (MUCLEUNIK+CAT_NIVEAU+Cat_CODEG) | | clé avec doublons |
| CLE_TYPED | clé composée (MUCLEUNIK+CAT_NIVEAU+Cat_CODED) | | clé avec doublons |
| CLE_CODEG | clé composée (MUCLEUNIK+CLE_PARENT+Cat_CODEG) | | clé unique |
| CLE_CODED | clé composée (MUCLEUNIK+CLE_PARENT+Cat_CODED) | | clé unique |
| CLE_MUTRADES | clé composée (MUCLEUNIK+IDTRADES) | | clé avec doublons |

## INTERVEN

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| ITCLEUNIK | Entier s.s. 4 (clé étrangère) | 4 | clé unique |
| IT_NOMCIE | Texte | 80 |  |
| IT_RESPONSABLE | Texte | 60 |  |
| IT_CODEPOSTAL | Texte | 10 |  |
| IT_COURRIEL | Texte | 60 |  |
| IT_TELBUR | Texte | 20 |  |
| IT_LANGC | Entier 2 | 2 |  |
| IT_REPONSE | Entier 2 | 2 |  |
| IT_TIMESTAMP | Texte | 17 |  |
| FLAGS | Entier s.s. 4 (clé étrangère) | 4 |  |

## SDPFIC

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDSDPSTAT | Entier 4 | 4 | clé avec doublons |
| SDPDATE | Date (AAAAMMJJ) | 8 |  |
| SDPHEURE | Heure ? | 4 |  |
| SDPSIZEFIC | Entier 8 ? | 8 |  |
| SDPNOMFIC | Numérique 8 ? | 8 |  |
| Flags | Entier 4 | 4 |  |
| IDSDPSTATSDPDATESDPHEURE | clé composée (IDSDPSTAT+SDPDATE+SDPHEURE) | | clé avec doublons |

## SDPSTAT

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDSDPSTAT | ID automatique | 4 | clé unique |
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| IDSDPINFO | Entier 4 | 4 | clé avec doublons |
| SDPTYPEOP | Entier 2 | 2 |  |
| SDPTimeStamp | Texte | 17 |  |
| SDPLANGC | Entier 1 ? | 1 |  |
| SDPADDRIP | Entier s.s. 4 (clé étrangère) | 4 | clé avec doublons |
| SDPADDRIP_S | Texte | 40 | clé avec doublons |
| SDPSIZEFIC | Entier 8 ? | 8 |  |
| SDPCLEDOSS | Entier 4 | 4 |  |
| FL_DICO | Booléen | 1 |  |
| FL_OPER | Booléen | 1 |  |
| CLE_SDPTRI | clé composée (IDAAClient+IDSDPINFO+SDPTimeStamp+SDPTYPEOP+SDPADDRIP) | | clé avec doublons |
| CLE_SDPTYPEOP | clé composée (IDAAClient+IDSDPINFO+SDPTYPEOP+SDPTimeStamp) | | clé avec doublons |
| CLE_SDPTRI2 | clé composée (IDAAClient+IDSDPINFO+FL_OPER+SDPTimeStamp+SDPTYPEOP+SDPADDRIP) | | clé avec doublons |
| CLE_SDPTYPEOP2 | clé composée (IDAAClient+IDSDPINFO+FL_DICO+SDPTYPEOP+SDPTimeStamp) | | clé avec doublons |

## LOGMODIF

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| DATE_MODIF | Date (AAAAMMJJ) | 8 |  |
| HEURE_MODIF | Heure ? | 4 |  |
| LOGIN_MODIF | Texte | 20 |  |
| FLAG_MODIF | Entier 4 | 4 |  |
| CLE_MODIFDATE | clé composée (IDAAClient+DATE_MODIF+HEURE_MODIF) | | clé unique |

## FORMATION

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| DATE_FORMATION | Date (AAAAMMJJ) | 8 |  |
| Contact | Texte | 50 |  |
| TEMPS_FORMATION | Entier 4 | 4 |  |
| NOTE_FORMATION | Numérique 8 ? | 8 |  |
| CLE_CLIFORM | clé composée (IDAAClient+DATE_FORMATION) | | clé avec doublons |

## NOTE_CLIENT

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDNOTECLIENT | ID automatique | 4 | clé unique |
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| NOTE_DATE | Date (AAAAMMJJ) | 8 |  |
| NOTE_TYPE | Entier 2 | 2 |  |
| NOTE_TEXT | Numérique 8 ? | 8 |  |
| TimeStamp | Texte | 17 | clé avec doublons |
| NOTE_LOGIN | Texte | 20 | clé avec doublons |
| CLE_CLIDATE | clé composée (IDAAClient+NOTE_DATE+TimeStamp) | | clé avec doublons |
| CLE_CLITYPE | clé composée (IDAAClient+NOTE_TYPE) | | clé avec doublons |

## SDPDESC

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDSDPINFO | Entier 4 | 4 | clé unique |
| SDP_PASS | Texte | 30 |  |
| SDP_REQ | Numérique 8 ? | 8 |  |

## SDPINFO

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDSDPINFO | ID automatique | 4 | clé unique |
| IDClient | Entier 4 | 4 | clé avec doublons |
| DOSSIER_NOM | Texte | 12 |  |
| NUM_SALLE | Texte | 10 | clé unique |
| TIMESTAMP_CREAT | Texte | 17 |  |
| TIMESTAMP_MODIF | Texte | 17 |  |
| SDP_DELETED | Booléen | 1 |  |
| DATE_DELETE | Date (AAAAMMJJ) | 8 |  |
| SDP_DELFIC | Booléen | 1 |  |
| SDP_LANGUE | Entier 2 | 2 |  |
| SDP_SIZE | Entier 8 ? | 8 |  |
| SDP_NBRFIC | Entier 4 | 4 |  |
| SDP_DATELIMITE | Date (AAAAMMJJ) | 8 | clé avec doublons |
| CLE_CLIDOSS | clé composée (IDClient+DOSSIER_NOM) | | clé unique |
| ClE_DELTIME | clé composée (SDP_DELETED+SDP_DATELIMITE) | | clé avec doublons |
| ClE_DELFIC | clé composée (SDP_DELETED+SDP_DELFIC+DATE_DELETE) | | clé avec doublons |

## Envoi

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDEnvoi | ID automatique | 4 | clé unique |
| Haut | Numérique 8 ? | 8 |  |
| ligne1 | Texte | 100 |  |
| ligne2 | Texte | 100 |  |
| ligne3 | Texte | 100 |  |
| ligne4 | Texte | 100 |  |
| bas | Texte | 500 |  |

## Banniere2

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDBanniere2 | ID automatique | 4 | clé unique |
| Nom | Texte | 60 | clé avec doublons |
| image | Texte | 50 |  |
| LienURL | Texte | 200 |  |
| Pourcentage | Caractère ? | 2 |  |
| Flash2 | Caractère ? | 2 |  |

## Version

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDVersion | ID automatique | 4 | clé unique |
| EstimeVersion5 | Texte | 50 |  |
| DescVersion5 | Texte | 200 |  |
| EstimeVersion12 | Texte | 50 |  |
| DescVersion_Guide | Texte | 200 |  |
| ModuleVersion12 | Texte | 50 |  |
| DescVersion_Estime12 | Texte | 200 |  |
| Version_Module12 | Texte | 50 |  |
| DescVersion_Module12 | Texte | 200 |  |
| Version_EPlans | Texte | 50 |  |
| DescVersion_EPlan | Texte | 200 |  |
| EstimeVersion14 | Texte | 50 |  |
| DescVersion_Estime14 | Texte | 200 |  |
| Version_Module14 | Texte | 50 |  |
| DescVersion_Module14 | Texte | 200 |  |

## AAClient

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDAAClient | ID automatique | 4 | clé unique |
| NUM_FICHE | Texte | 10 | clé avec doublons |
| Nom | Texte | 80 | clé unique |
| Contact | Texte | 50 |  |
| Date | Date (AAAAMMJJ) | 8 |  |
| Courriel | Texte | 60 | clé avec doublons |
| Login | Texte | 20 | clé unique |
| Mot_de_Passe | Texte | 10 |  |
| Abonnement | Booléen | 1 |  |
| DateFinAbonnement | Date (AAAAMMJJ) | 8 |  |
| DateDerniereVisite | Date (AAAAMMJJ) | 8 |  |
| NombreLicence | Entier 2 | 2 |  |
| EstimeVersion5 | Texte | 20 |  |
| EstimeDateVersion5 | Date (AAAAMMJJ) | 8 |  |
| EstimeVersion12 | Texte | 20 |  |
| EstimeDateVersion12 | Date (AAAAMMJJ) | 8 |  |
| ModuleVersion12 | Texte | 20 |  |
| ModuleDateVersion12 | Date (AAAAMMJJ) | 8 |  |
| EstimeVersion14 | Texte | 20 |  |
| EstimeDateVersion14 | Date (AAAAMMJJ) | 8 |  |
| ModuleVersion14 | Texte | 20 |  |
| ModuleDateVersion14 | Date (AAAAMMJJ) | 8 |  |
| Version_EPlans | Texte | 20 |  |
| DateVersionEPlans | Date (AAAAMMJJ) | 8 |  |
| TypeVersion | Entier 4 | 4 |  |
| TypeVersionEPlans | Entier 4 | 4 |  |
| NoEmail | Booléen | 1 |  |
| Courriel2 | Texte | 60 |  |
| Courriel3 | Texte | 60 |  |
| WebMaster | Entier 2 | 2 |  |
| Telephone | Texte | 26 |  |
| Telephone2 | Texte | 26 |  |
| MontantMAJ | Monétaire | 10 |  |
| MontantSDP | Monétaire | 10 |  |
| Flags | Entier 4 | 4 |  |
| DureeVersion | Entier 4 | 4 |  |
| DateActivation | Date (AAAAMMJJ) | 8 |  |
| OptEcheancier | Booléen | 1 |  |
| OptComparatif | Booléen | 1 |  |
| OptVentilation | Booléen | 1 |  |
| OptRepartition | Booléen | 1 |  |
| OptInvitation | Booléen | 1 |  |
| OptCatalogue | Booléen | 1 |  |
| OptEPlans | Booléen | 1 |  |
| OptTPlans | Booléen | 1 |  |
| SDP_AUTORISE | Booléen | 1 |  |
| SDP_MAXSIZE | Entier 4 | 4 |  |
| SDP_MAXTIME | Entier 4 | 4 |  |
| SDP_CURSIZE | Entier 8 ? | 8 |  |
| RBQInterdit | Booléen | 1 |  |
| AutoriseTuto | Booléen | 1 |  |
| MotCles | Texte | 50 |  |
| NoteClient | Texte | 600 |  |
| LASTMODIF | Texte | 17 |  |
| NUMVENDEUR | Entier 4 | 4 | clé avec doublons |
| DateFinEG | Date (AAAAMMJJ) | 8 |  |
| DateFinEPlans | Date (AAAAMMJJ) | 8 |  |
| IGNORECOMMON | Booléen | 1 |  |
| NBLICEPLANS | Entier 2 | 2 |  |
| EPLANSMONOPOSTE | Booléen | 1 |  |
| AUTHIPMULTI | Booléen | 1 |  |
| FILTREIP | Texte | 15 |  |
| VERSION14 | Booléen | 1 |  |
| LOCATION1 | Booléen | 1 |  |
| LOCATION2 | Booléen | 1 |  |
| B_ECOLE | Booléen | 1 |  |
| B_MIGREVERSION | Booléen | 1 |  |
| EGACHAT | Entier 2 | 2 |  |
| EGLOCAT | Entier 2 | 2 |  |
| EPLMONOACHAT | Entier 2 | 2 |  |
| EPLMULTIACHAT | Entier 2 | 2 |  |
| EPLMONOLOCAT | Entier 2 | 2 |  |
| EPLMULTILOCAT | Entier 2 | 2 |  |
| AJUSTEMENT | Monétaire | 10 |  |
| NBHFORM | Entier s.s. 4 ? | 4 |  |

## TRADESTX

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDTRADES | Entier 4 | 4 | clé avec doublons |
| TAUX_DATE | Date (AAAAMMJJ) | 8 |  |
| TAUX_VAL | Monétaire | 10 |  |
| TAUX_UTEMPS | Entier 4 | 4 |  |
| USERS | Texte | 20 | clé avec doublons |
| TIMESTAMP_AJOUT | Texte | 14 |  |
| TIMESTAMP_MODIF | Texte | 14 |  |
| INV_NUMJOUR | Entier 4 | 4 |  |
| MARQUE_DEL | Booléen | 1 |  |
| CLE_IDDATE | clé composée (IDTRADES+TAUX_DATE) | | clé unique |
| CLE_IDINVNUM | clé composée (IDTRADES+INV_NUMJOUR) | | clé unique |
| CLE_DELTAUX | clé composée (IDTRADES+MARQUE_DEL) | | clé avec doublons |

## HISTODEMO

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDCLIENTDEMO | Entier 4 | 4 | clé avec doublons |
| NOMMACHINE | Texte | 50 |  |
| TimeStamp | Texte | 17 | clé avec doublons |
| TIMESTAMPORDI | Texte | 17 |  |
| IDENTCOMMON | Texte | 30 | clé avec doublons |
| SOFTVERSION | Texte | 10 |  |
| SOFTTYPE | Entier 4 | 4 |  |
| RESTEJOUR | Entier 4 | 4 |  |
| CLE_IDTIME | clé composée (IDCLIENTDEMO+TimeStamp) | | clé unique |

## IPADDRESS

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IPADDR | Texte | 15 | clé unique |
| EXCLURE | Booléen | 1 |  |
| IPPAYS | Texte | 40 | clé avec doublons |
| IPPROVINCE | Texte | 3 |  |
| IPVILLE | Texte | 50 |  |
| NBRCONNECT | Entier 4 | 4 |  |
| TimeStamp | Texte | 17 | clé avec doublons |
| ClE_IPEXCLURE | clé composée (IPADDR+EXCLURE) | | clé unique |

## SDP_INTRUS

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDINTRUSION | Entier 4 | 4 | clé avec doublons |
| NUM_SALLE | Texte | 10 | clé avec doublons |
| TimeStamp | Texte | 17 | clé avec doublons |
| NBRCONNECT | Entier 4 | 4 |  |
| CLE_IPSDP | clé composée (IDINTRUSION+NUM_SALLE) | | clé unique |

## INTRUSION

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDINTRUSION | ID automatique | 4 | clé unique |
| ADRESSE_IP | Texte | 20 | clé unique |
| TimeStamp | Texte | 17 | clé avec doublons |
| NBRCONNECT | Entier 4 | 4 |  |

## CLIENTDEMO

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDCLIENTDEMO | ID automatique | 4 | clé unique |
| ADDR_IP | Texte | 40 | clé avec doublons |
| SOFTTYPE | Entier 4 | 4 | clé avec doublons |
| Courriel | Texte | 60 |  |
| VERSION | Texte | 10 |  |
| NBRCONNECT | Entier 4 | 4 |  |
| FIN_DEMO | Booléen | 1 |  |
| RESTEJOUR | Entier 4 | 4 |  |
| BLK_DEMO | Booléen | 1 |  |
| DATEDEBUT | Date (AAAAMMJJ) | 8 |  |
| DATEBUTOIR | Date (AAAAMMJJ) | 8 |  |
| DATELAST | Date (AAAAMMJJ) | 8 |  |
| VERSION_EG | Texte | 10 |  |
| NBRCONNECT_EG | Entier 4 | 4 |  |
| CLE_IPSOFT | clé composée (ADDR_IP+SOFTTYPE) | | clé avec doublons |

## INFO_ECOLE

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDAAClient | Entier 4 | 4 | clé unique |
| CEGEP_ADRESSE | Texte | 80 |  |
| CEGEP_VILLE | Texte | 60 |  |
| CEGEP_PROVINCE | Texte | 30 |  |
| CEGEP_CODEPOSTAL | Texte | 10 |  |
| CEGEP_PAYS | Texte | 20 |  |
| CEGEP_TELEPHONE | Texte | 26 |  |
| CEGEP_TELECOPIE | Texte | 26 |  |
| CEGEP_MOBILE | Texte | 26 |  |
| CEGEP_COURRIEL | Texte | 60 |  |
| CEGEP_SITEWEB | Texte | 60 |  |

## COURRIELS

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDCOURRIELS | ID automatique | 4 | clé unique |
| TYPE_COURRIEL | Entier 2 | 2 | clé avec doublons |
| NOM_SOCIETE | Texte | 100 |  |
| Courriel | Texte | 60 | clé avec doublons |
| NOM_CONTACT | Texte | 50 |  |
| PRENOM_CONTACT | Texte | 50 |  |
| TEL_CONTACT | Texte | 16 |  |
| AUTRE_INFO | Numérique 8 ? | 8 |  |
| TimeStamp | Texte | 17 | clé avec doublons |
| Cle_TYPEDATE | clé composée (TYPE_COURRIEL+TimeStamp) | | clé avec doublons |

## LOGVERSION

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDLOGVERSION | ID automatique | 4 | clé unique |
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| LOG_DATE | Date (AAAAMMJJ) | 8 |  |
| LOG_HEURE | Heure ? | 4 |  |
| ADDR_IP | Texte | 40 | clé avec doublons |
| NOMMACHINE | Texte | 50 |  |
| NUMLOGICIEL | Entier 1 ? | 1 |  |
| DATESYSCLI | Date (AAAAMMJJ) | 8 |  |
| IDREPCOMMON | Entier 4 | 4 | clé avec doublons |
| Cle_TRILOG | clé composée (IDAAClient+LOG_DATE+LOG_HEURE+NOMMACHINE+ADDR_IP) | | clé avec doublons |

## CACHEOPER

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDCACHEOPER | ID automatique | 4 | clé unique |
| TYPE_OPER | Entier 4 | 4 |  |
| TimeStamp | Texte | 17 |  |
| ADDRIP | Entier 4 | 4 |  |
| ADDRIP_S | Texte | 40 |  |
| ITCLEUNIK | Entier s.s. 4 (clé étrangère) | 4 | clé avec doublons |
| IDCACHEDICO | Entier 4 | 4 | clé avec doublons |
| IDENT_PLAN | Entier 2 | 2 | clé avec doublons |
| NOM_CIE | Texte | 80 |  |
| NOM_MAJUS | Texte | 80 |  |
| CLE_DOSS | Entier 4 | 4 |  |
| CLE_DEF | Entier 4 | 4 |  |
| LANGC | Entier 2 | 2 |  |
| REPONSE | Entier 2 | 2 |  |
| CLE_TRIOPER | clé composée (NOM_MAJUS+ITCLEUNIK+TYPE_OPER+IDENT_PLAN) | | clé avec doublons |

## CACHEDICO

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDCACHEDICO | ID automatique | 4 | clé unique |
| NBRUSE | Entier 4 | 4 |  |
| NOMPLAN | Texte | 260 |  |
| CLEPLAN | Texte | 520 | clé unique |
| SIZE8 | Entier s.s. 8 ? | 8 |  |
| IDENT_PLAN | Entier 2 | 2 |  |

## EQUIPELEM

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDPARENT | Entier s.s. 4 (clé étrangère) | 4 | clé avec doublons |
| NOLIGNE | Caractère ? | 2 |  |
| IDEQUIPMEMB | Entier 4 | 4 | clé avec doublons |
| ELEM_NOM | Texte | 80 |  |
| IDTRADES | Entier 4 | 4 | clé avec doublons |
| TYPE_TRADE | Entier 2 | 2 | clé avec doublons |
| RATIO | Réel 8 | 8 |  |
| FLAGS | Entier s.s. 4 (clé étrangère) | 4 |  |
| MARQUE_DEL | Booléen | 1 |  |
| USERS | Texte | 20 | clé avec doublons |
| TIMESTAMP_AJOUT | Texte | 14 |  |
| TIMESTAMP_MODIF | Texte | 14 |  |
| INVARIANT | Texte | 19 | clé avec doublons |
| CLE_ELEM | clé composée (IDPARENT+NOLIGNE) | | clé unique |
| CLE_DELELEM | clé composée (IDPARENT+MARQUE_DEL) | | clé avec doublons |
| CLE_TYPE | clé composée (IDPARENT+TYPE_TRADE) | | clé avec doublons |
| CLE_TRADPARENT | clé composée (IDTRADES+IDPARENT) | | clé avec doublons |

## NOTE_CATCLIENT

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDNOTE_CATCLIENT | ID automatique | 4 | clé unique |
| IDClient | Entier 4 | 4 | clé avec doublons |
| NOTE_DATE | Date (AAAAMMJJ) | 8 |  |
| NOTE_TYPE | Entier 2 | 2 |  |
| NOTE_TEXT | Numérique 8 ? | 8 |  |
| TimeStamp | Texte | 17 | clé avec doublons |
| NOTE_LOGIN | Texte | 20 | clé avec doublons |
| CLE_CATDATE | clé composée (IDClient+NOTE_DATE+TimeStamp) | | clé avec doublons |
| CLE_CATTYPE | clé composée (IDClient+NOTE_TYPE) | | clé avec doublons |

## LISTFORM

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDLISTFORM | ID automatique | 4 | clé unique |
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| NoLigne | Entier 4 | 4 |  |
| Contact | Texte | 50 |  |
| CLE_TRILIG | clé composée (IDAAClient+NoLigne) | | clé avec doublons |

## REPCOMMON

| Rubrique | Type | Taille | Clé |
|---|---|---|---|
| IDREPCOMMON | ID automatique | 4 | clé unique |
| IDAAClient | Entier 4 | 4 | clé avec doublons |
| NOM_ENTREP | Texte | 80 |  |
| LOCKREP | Booléen | 1 |  |
| REP_COMMON | Texte | 300 |  |
| REP_NETTOYER | Booléen | 1 |  |
| NBRLICENCE | Entier 4 | 4 |  |
| TypeVersion | Entier 4 | 4 |  |
| OPTIONESTIME | Entier 4 | 4 |  |
| ADDR_IP | Texte | 40 | clé avec doublons |
| DateFinAbonnement | Date (AAAAMMJJ) | 8 |  |
| DateCreat | Date (AAAAMMJJ) | 8 |  |
| NOMMACHINE | Texte | 50 |  |
| RESTEJOUR | Entier 4 | 4 |  |
| CADENAS_CLI | Caractère ? | 2 |  |
| CADENAS_SRV | Caractère ? | 2 |  |
| INDIC_REP | Texte | 20 |  |
| ENREG_MONO | Entier 4 | 4 |  |
| TimeStamp | Texte | 17 | clé avec doublons |
| CLE_CLI_IP_ORDI | clé composée (IDAAClient+ADDR_IP+NOMMACHINE) | | clé avec doublons |

