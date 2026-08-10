"""Egyszeri kép-előkészítés: a nyers (_ előtagú) képekből webes méretű WebP-k.

Futtatás:  python src/process-images.py
A nyers képek az assets/img/_*.jpg|png fájlok — ezek NEM kerülnek a repóba (.gitignore).
"""
from PIL import Image
import os

IMG = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "img")

# nyers fájl (a _ nélkül) -> (kimeneti név, max szélesség)
FOTOK = {
    # 2026-08 – új fotók
    "csirke-bulgur": 1600,
    "tepsis-pizza": 1400,
    "baconos-szuzerme": 1200,
    "bbq-csirke": 1400,
    "paella": 1400,
    "kacsacomb": 1400,
    "meggyes-piskota": 1200,
    "kapros-turos": 1200,
    "csirkeragu": 1400,
    "toltott-paprika": 1200,
    "pult": 1400,
    # a vicces „utolsó szó jogán” kép szándékosan NINCS itt — lásd README
}


def save_webp(im, name, max_w, quality=80):
    im = im.convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    path = os.path.join(IMG, name)
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"  {name:26s} {im.width}x{im.height}  {os.path.getsize(path) // 1024} kB")


def logo():
    """A logó pergamen háttere megmarad (textúrás, nem vágható ki tisztán),
    ezért az oldalon mindig ugyanolyan papírszínű (#F6F1E4) alapra kerül."""
    im = Image.open(os.path.join(IMG, "_logo-uj.jpg")).convert("RGB")
    save_webp(im, "logo.webp", 440, quality=88)
    save_webp(im, "logo-nagy.webp", 900, quality=88)

    # Böngésző-ikon: a PARADICSOMOS rész kivágva. A teljes címer 16 pixelen
    # olvashatatlan péppé esik szét, a piros gömb viszont ott is felismerhető.
    # A paradicsom mért helye a 441x1024-es képen: x 62–378, y 220–456. A négyzet
    # ezért lefelé bővül (a felirat felé nem), különben a betűk alja belelógna.
    cimer = im.crop((62, 220, 378, 536))
    cimer.resize((180, 180), Image.LANCZOS).save(os.path.join(IMG, "favicon.png"))
    cimer.resize((32, 32), Image.LANCZOS).save(os.path.join(IMG, "favicon-32.png"))
    cimer.save(
        os.path.join(IMG, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("  favicon.png + favicon-32.png + favicon.ico kész")


def main():
    print("Logó:")
    logo()
    print("Fotók:")
    for nev, szel in FOTOK.items():
        f = os.path.join(IMG, f"_{nev}.jpg")
        if not os.path.exists(f):
            print(f"  ! hiányzik: {f}")
            continue
        save_webp(Image.open(f), f"{nev}.webp", szel)


if __name__ == "__main__":
    main()
