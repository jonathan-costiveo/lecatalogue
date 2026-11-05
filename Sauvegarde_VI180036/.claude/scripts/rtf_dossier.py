#!/usr/bin/env python3
"""Extrait le texte du dossier technique WebDev imprimé en RTF (Docs/lecatalogue.rtf).

Le RTF de WebDev place chaque mot dans un cadre positionné (\\posx, \\posy) et intègre
des images WMF en binaire (\\bin). On reconstruit les lignes page par page en groupant
les cadres par \\posy puis en les triant par \\posx ; l'indentation du code vient de \\posx.

Usage : python3 .claude/scripts/rtf_dossier.py Docs/lecatalogue.rtf Docs/dossier-technique.txt
"""
import mmap
import re
import sys

TOKEN = re.compile(
    rb"\\bin(\d+) ?"
    rb"|\\pard\\plain\\posx(-?\d+)\\posy(-?\d+)\\absw(\d+)\\absh(-?\d+) ?"
    rb"|\\page\b"
)
# WebDev n'échappe pas les accolades du texte : on ne les retire pas (seuls \\{ \\} \\\\ et \\'hh sont décodés)
CTRL = re.compile(rb"\\'([0-9a-fA-F]{2})|\\([\\{}])|\\[a-z]+-?\d* ?")
ENTETE = re.compile(r"^\s*Projet\s+lecatalogue\b")
PIED = re.compile(r"^\s*\d{4}-\d{2}-\d{2}\s+(\d+)$")
TWIPS_PAR_CAR = 108  # largeur d'un caractère en Lucida Console 9 pt (cadres de 109/108 twips)
LARGEUR_PAGE = 14858  # largeur utile de la page A4 paysage (filets de séparation)
MARGE_COUPURE = 40 * TWIPS_PAR_CAR  # une coupure se fait au plus un mot avant la marge


def texte_cadre(brut: bytes) -> str:
    def rempl(m):
        if m.group(1):
            return bytes([int(m.group(1), 16)])
        if m.group(2):
            return m.group(2)
        return b""
    return CTRL.sub(rempl, brut).decode("cp1252", errors="replace")


def lignes_page(cadres):
    """cadres : liste (x, y, largeur, texte). Retourne (n° imprimé, lignes de la page)."""
    par_y = {}
    for x, y, w, t in cadres:
        par_y.setdefault(y, []).append((x, w, t))
    lignes, numero = [], "?"
    for y in sorted(par_y):
        elems = sorted(par_y[y])
        if all(not t.strip() for _, _, t in elems):
            continue
        ligne = ""
        fin_prec = None
        prec_code = False
        nb_code = 0
        for x, w, t in elems:
            # Code : police à chasse fixe, cadre de la largeur exacte du texte
            code = abs(w - len(t) * TWIPS_PAR_CAR) <= 2
            # Les chaînes sont en police proportionnelle : on colle dès qu'un des deux voisins est du code
            if fin_prec is not None and (prec_code or code) and abs(x - fin_prec) <= 2:
                pass  # mot accolé au précédent : les espaces réels sont des cadres « »
            else:
                colonne = max(0, round(x / TWIPS_PAR_CAR))
                if len(ligne) < colonne:
                    ligne += " " * (colonne - len(ligne))
                elif fin_prec is not None and not ligne.endswith(" "):
                    ligne += "  "
            ligne += t
            fin_prec = x + w
            prec_code = code
            nb_code += code
        pied = PIED.match(ligne.rstrip())
        if pied:
            numero = pied.group(1)
        elif not ENTETE.match(ligne):  # en-tête et pied répétés à chaque page
            lignes.append([elems[0][0], fin_prec, nb_code, ligne])  # espace final gardé pour recoller
    return numero, recolle_coupures(lignes)


def instruction_incomplete(ligne: str) -> bool:
    """Vrai si la ligne de code ne peut pas se terminer là (parenthèse ou chaîne ouverte, opérateur final)."""
    profondeur, dans_chaine, i = 0, False, 0
    while i < len(ligne):
        c = ligne[i]
        if c == '"':
            dans_chaine = not dans_chaine
        elif not dans_chaine:
            if ligne.startswith("//", i):
                ligne = ligne[:i]
                break
            profondeur += {"(": 1, ")": -1, "[": 1, "]": -1}.get(c, 0)
        i += 1
    fin = ligne.rstrip()
    if dans_chaine or profondeur > 0:
        return True
    if fin.endswith("..."):  # continuation explicite écrite par le développeur
        return False
    return fin.endswith(tuple(",(+-*/=:.&[")) or fin.split()[-1:] in (["OU"], ["ET"], ["_OU_"], ["_ET_"],
                                                                      ["est"], ["un"], ["une"])


def recolle_coupures(lignes):
    """Recolle les instructions que l'impression a coupées en bout de ligne.

    Une coupure : ligne de code qui atteint la marge droite, instruction incomplète, et ligne
    suivante qui reprend à la même position x (WebDev n'ajoute pas d'indentation de suite).
    """
    sortie = []
    for x, droite, nb_code, ligne in lignes:
        if sortie:
            px, pdroite, pnb, pligne = sortie[-1]
            if (pnb >= 2 and nb_code and abs(x - px) <= 2
                    and LARGEUR_PAGE - pdroite < MARGE_COUPURE
                    and instruction_incomplete(pligne)):
                sortie[-1] = [px, droite, nb_code, pligne + ligne[round(x / TWIPS_PAR_CAR):]]
                continue
        sortie.append([x, droite, nb_code, ligne])
    return [l[3].rstrip() for l in sortie]


def ecrire_page(out, cadres):
    numero, lignes = lignes_page(cadres)
    if lignes:  # les pages de graphes (images seules) sont omises
        out.write(f"--- page {numero} ---\n" + "\n".join(lignes) + "\n")


def main(src, dst):
    with open(src, "rb") as f, open(dst, "w", encoding="utf-8", newline="\n") as out:
        buf = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        pos, page, cadres = 0, 1, []
        n = len(buf)
        while True:
            m = TOKEN.search(buf, pos)
            if not m:
                break
            if m.group(1) is not None:  # données binaires d'image : on saute
                pos = m.end() + int(m.group(1))
                continue
            if m.group(0).startswith(b"\\page"):
                ecrire_page(out, cadres)
                page += 1
                cadres = []
                pos = m.end()
                continue
            x, y = int(m.group(2)), int(m.group(3))
            fin = buf.find(b"\\par", m.end())
            # \\par suivi d'une lettre = autre mot de contrôle (\\pard) ; on cherche le vrai \\par
            while fin != -1 and fin + 4 < n and buf[fin + 4:fin + 5].isalpha():
                fin = buf.find(b"\\par", fin + 4)
            if fin == -1:  # dernier cadre du fichier, fermé par « } » sans \\par
                fin = buf.rfind(b"}")
            brut = buf[m.end():fin]
            if b"{\\pict" not in brut:
                cadres.append((x, y, int(m.group(4)), texte_cadre(brut)))
            pos = fin + 4 if b"{\\pict" not in brut else m.end()
        ecrire_page(out, cadres)
    print(f"{page} pages")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
