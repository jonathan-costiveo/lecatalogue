#!/usr/bin/env python3
"""Régénère les index lisibles du projet WebDev 18 dans .claude/docs/.

Les sources WebDev (.wwh, .wdc, .wdg, .WWP) sont binaires/compressées : on extrait
seulement ce qui est lisible.
  - lecatalogue.xdd (analyse XML)        -> modele-donnees.md
  - en-têtes des classes .wdc            -> classes.md (noms de méthodes)
  - pages .wwh + gabarits FR/*.htm       -> pages.md (champs de chaque page)

Usage : python3 .claude/scripts/gen_index.py   (depuis la racine du projet)
"""
import glob, os, re, datetime
import xml.etree.ElementTree as ET

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS = os.path.join(ROOT, '.claude', 'docs')
os.chdir(ROOT)

# Codes de type HFSQL dans le .xdd. Correspondance déduite (taille + noms de rubriques) :
# ceux marqués « ? » ne sont pas confirmés.
TYPES = {
    '2': 'Texte', '3': 'Caractère ?', '5': 'Entier 4', '6': 'Entier s.s. 4 ?',
    '7': 'Réel 8', '9': 'Entier 2', '11': 'Heure ?', '14': 'Date (AAAAMMJJ)',
    '17': 'Monétaire', '25': 'Entier 8 ?', '26': 'Entier s.s. 4 (clé étrangère)',
    '27': 'Entier s.s. 8 ?', '29': 'Numérique 8 ?', '36': 'Entier 1 ?',
    '37': 'Booléen', '38': 'ID automatique',
}
CLES = {'0': '', '1': 'clé unique', '2': 'clé avec doublons'}


def gen_modele():
    r = ET.parse('lecatalogue.xdd').getroot()
    out = ['# Modèle de données (analyse HFSQL)', '',
           f'Généré depuis `lecatalogue.xdd` par `.claude/scripts/gen_index.py`. Ne pas éditer à la main.',
           'Types : correspondance déduite des codes du .xdd (« ? » = non confirmé). '
           'Fichiers physiques : `LECATALOGUE_WEB/bd/LECATALOGUE/*.FIC`.', '']
    fichiers = r.findall('FICHIER')
    out.append('| Fichier | Rubriques |')
    out.append('|---|---|')
    for f in fichiers:
        out.append(f"| [{f.get('Nom')}](#{f.get('Nom').lower()}) | {len(f.findall('RUBRIQUE'))} |")
    out.append('')
    for f in fichiers:
        out += [f"## {f.get('Nom')}", '', '| Rubrique | Type | Taille | Clé |', '|---|---|---|---|']
        for ru in f.findall('RUBRIQUE'):
            comp = ru.find('COMPOSEE')
            if comp is not None:
                parts = '+'.join(c.get('Nom') for c in comp.findall('COMPOSANTE'))
                out.append(f"| {ru.get('Nom')} | clé composée ({parts}) | | {CLES.get(ru.findtext('TYPE_CLE'), '')} |")
                continue
            t = ru.findtext('TYPE')
            out.append(f"| {ru.get('Nom')} | {TYPES.get(t, 'code ' + str(t))} | {ru.findtext('TAILLE')} | "
                       f"{CLES.get(ru.findtext('TYPE_CLE'), ru.findtext('TYPE_CLE'))} |")
        out.append('')
    return out


METH = re.compile(rb'[\x00\x02]([A-Za-z_][A-Za-z0-9_]*)\x00.{8}\x00\x00([\x00-\x20])\x00', re.S)


def gen_classes():
    out = ['# Classes (.wdc) — noms de méthodes', '',
           'Généré par `.claude/scripts/gen_index.py`. Extrait de l\'en-tête binaire des .wdc : '
           'seuls les noms sont lisibles, pas le code ni les signatures. '
           '« (compressé) » = en-tête illisible, ouvrir dans WebDev.',
           'Préfixes hongrois : b=booléen, s=chaîne, n/ln=entier, d=réel, c=caractère, dw=entier s.s., is=test, Set/Get=accesseurs.', '']
    files = sorted(set(glob.glob('*.wdc') + glob.glob('*.WDC')), key=str.lower)
    for fn in files:
        names = [n.decode() for n, _ in METH.findall(open(fn, 'rb').read())]
        names = [n for n in names if n not in ('Constructeur', 'Destructeur')]
        out.append(f"- **{fn}** — " + (', '.join(names) if names else '(compressé)'))
    return out


CHAMP = re.compile(r'\bname="([A-Z][A-Z0-9_]*)"')


def gen_pages():
    out = ['# Pages (.wwh)', '',
           'Généré par `.claude/scripts/gen_index.py`. Champs extraits des gabarits HTML générés `FR/<page>.htm` '
           '(reflètent la dernière génération, pas forcément la source courante). '
           'Les pages préfixées AA / PAGE_ sont surtout l\'administration et les outils internes.', '']
    for fn in sorted(glob.glob('*.wwh'), key=str.lower):
        page = fn[:-4]
        mtime = datetime.date.fromtimestamp(os.path.getmtime(fn)).isoformat()
        htm = next((p for p in glob.glob('FR/*.htm') if os.path.basename(p)[:-4].lower() == page.lower()), None)
        if htm:
            champs = sorted(c for c in set(CHAMP.findall(open(htm, encoding='utf-8', errors='replace').read()))
                            if c != page.upper() and not c.startswith('WD_') and not re.search(r'_DEB$|_COM_F', c))
            detail = ', '.join(champs) if champs else '(aucun champ nommé)'
        else:
            detail = '(pas de gabarit FR — page probablement inutilisée)'
        out.append(f"- **{page}** ({mtime}) — {detail}")
    return out


for name, fn in (('modele-donnees.md', gen_modele), ('classes.md', gen_classes), ('pages.md', gen_pages)):
    with open(os.path.join(DOCS, name), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(fn()) + '\n')
    print('écrit', os.path.join('.claude/docs', name))
