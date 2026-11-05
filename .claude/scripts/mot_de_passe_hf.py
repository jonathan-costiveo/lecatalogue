#!/usr/bin/env python3
"""Retrouve dans le dossier technique le mot de passe HFSQL d'une constante du code (PASS_CLIENT par défaut).

La constante est déclarée dans le code d'initialisation du projet sous la forme
    PASS_CLIENT     = "abc"+"def"+...
Le script recolle les morceaux et copie le résultat dans le presse-papiers SANS l'afficher
(wl-copy, xclip ou xsel), pour le coller dans WDMap. Option --afficher pour l'écrire à l'écran.

Lit Docs/dossier-technique.txt, régénéré d'abord depuis Docs/lecatalogue.rtf si le RTF est plus récent.

Usage : python3 .claude/scripts/mot_de_passe_hf.py [NOM_CONSTANTE] [--afficher]
        python3 .claude/scripts/mot_de_passe_hf.py --liste      (noms des constantes PASS_*)
"""
import os
import re
import shutil
import subprocess
import sys

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RTF = os.path.join(RACINE, "Docs", "lecatalogue.rtf")
TXT = os.path.join(RACINE, "Docs", "dossier-technique.txt")
DECLARATION = re.compile(r"^\s*(PASS_\w+)\s*=\s*(.+?)\s*(//.*)?$")
# Un morceau : "chaîne" (guillemet doublé "" = guillemet) ou Caract(n)
MORCEAU = re.compile(r'\s*(?:"((?:[^"]|"")*)"|Caract\s*\(\s*(\d+)\s*\))\s*(\+|$)')


def dossier_a_jour():
    if os.path.exists(RTF) and (not os.path.exists(TXT) or os.path.getmtime(RTF) > os.path.getmtime(TXT)):
        print("Le RTF est plus récent : extraction du dossier technique…", file=sys.stderr)
        subprocess.run([sys.executable, os.path.join(RACINE, ".claude", "scripts", "rtf_dossier.py"), RTF, TXT],
                       check=True, stdout=subprocess.DEVNULL)


def constantes():
    """{nom: expression} des déclarations PASS_* (première déclaration de chaque nom)."""
    res = {}
    with open(TXT, encoding="utf-8") as f:
        for ligne in f:
            m = DECLARATION.match(ligne)
            if m and m.group(1) not in res:
                res[m.group(1)] = m.group(2)
    return res


def evalue(expr):
    """Concatène les morceaux "…"+"…"+Caract(n) ; refuse toute autre forme."""
    valeur, pos = "", 0
    if expr.rstrip().endswith("+"):
        raise ValueError("expression incomplète (se termine par +)")
    while pos < len(expr):
        m = MORCEAU.match(expr, pos)
        if not m:
            raise ValueError(f"forme non reconnue à la position {pos} (attendu \"…\"+\"…\")")
        valeur += m.group(1).replace('""', '"') if m.group(1) is not None else chr(int(m.group(2)))
        pos = m.end()
    return valeur


def copie_presse_papiers(texte):
    for cmd in (["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]):
        if shutil.which(cmd[0]):
            subprocess.run(cmd, input=texte.encode("utf-8"), check=True)
            return cmd[0]
    return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    nom = args[0] if args else "PASS_CLIENT"
    dossier_a_jour()
    toutes = constantes()
    if "--liste" in sys.argv:
        print("\n".join(sorted(toutes)) or "Aucune constante PASS_* trouvée.")
        return
    if nom not in toutes:
        sys.exit(f"{nom} introuvable dans {TXT}. Constantes trouvées : {', '.join(sorted(toutes)) or 'aucune'}")
    try:
        mdp = evalue(toutes[nom])
    except ValueError as e:
        sys.exit(f"{nom} : {e}")
    if " " in mdp:
        print("Attention : le mot de passe contient un espace ; l'extraction du RTF peut l'avoir mal reproduit.",
              file=sys.stderr)
    if "--afficher" in sys.argv:
        print(mdp)
        return
    outil = copie_presse_papiers(mdp)
    if not outil:
        sys.exit("Aucun outil de presse-papiers (wl-copy, xclip, xsel). Relancer avec --afficher.")
    print(f"{nom} ({len(mdp)} caractères) copié dans le presse-papiers ({outil}).")


if __name__ == "__main__":
    main()
