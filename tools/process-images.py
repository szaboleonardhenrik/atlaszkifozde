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


# A kártyákon és a galéria-rácsban megjelenő bélyegképek maximális szélessége.
# A legszélesebb ilyen hely a blogkártya mobilon (~390 CSS px), ezt kétszeres
# képpontsűrűségen is kiszolgálja. A teljes méretű kép csak a bejegyzés
# borítóján és a galéria nagyítójában kell.
KICSI_SZELESSEG = 720
KICSI_MAGASSAG = 900


def logo():
    """A logó pergamen háttere megmarad (textúrás, nem vágható ki tisztán),
    ezért az oldalon mindig ugyanolyan papírszínű (#F6F1E4) alapra kerül."""
    im = Image.open(os.path.join(IMG, "_logo-uj.jpg")).convert("RGB")
    save_webp(im, "logo.webp", 440, quality=88)
    save_webp(im, "logo-nagy.webp", 900, quality=88)
    # A fejlécben ~24, a láblécben ~55 képpont széles a címer – oda a 440 pontos
    # változat (100 kB) minden látogatónak felesleges súly.
    save_webp(im, "logo-kicsi.webp", 200, quality=86)

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


def fejkep(forras="_pult.jpg", nev="fejkep.webp", szel=1800, arany=16 / 9):
    """Széles vágat a főoldal fejlécképéhez.

    A meglévő fotók állóak vagy 1400 pont szélesek; a fejléc viszont teljes
    képernyő széles, ott egy 1072 pontos kép felnagyítva lágy lenne. Ezért a
    nyers fájlból készül egy 16:9-es, középre igazított vágat.
    """
    ut = os.path.join(IMG, forras)
    if not os.path.exists(ut):
        print(f"  ! hiányzik a nyers fájl: {ut}")
        return
    im = Image.open(ut).convert("RGB")
    cel_ma = round(im.width / arany)
    if cel_ma <= im.height:  # álló kép: fentről-lentről vágunk
        felso = (im.height - cel_ma) // 2
        im = im.crop((0, felso, im.width, felso + cel_ma))
    else:  # túl széles: oldalt vágunk
        cel_sz = round(im.height * arany)
        bal = (im.width - cel_sz) // 2
        im = im.crop((bal, 0, bal + cel_sz, im.height))
    # Sötét réteg kerül rá, ezért a 72-es minőség is bőven elég — a fejléckép
    # egyben az oldal legelső letöltött képe (LCP), ott minden kilobájt számít.
    save_webp(im, nev, szel, quality=72)


def bélyegkepek():
    """Minden fotóhoz `-sm.webp` változat a kártyákhoz és a galéria-rácshoz.

    Forrásnak a kész WebP-t használjuk, nem a nyers JPG-t: több fotóhoz (régebbi
    képek) már nincs meg a nyers fájl, és egy kicsinyítésnyi újrakódolás ezen a
    méreten nem látszik.
    """
    for f in sorted(os.listdir(IMG)):
        if not f.endswith(".webp") or f.startswith("logo") or f.endswith("-sm.webp"):
            continue
        im = Image.open(os.path.join(IMG, f))
        # Az álló képeknél a szélesség-korlát önmagában keveset fog (egy 640×1422
        # kép így is 139 kB), ezért a magasságot is maximáljuk.
        if im.height > KICSI_MAGASSAG:
            uj_szel = round(im.width * KICSI_MAGASSAG / im.height)
            im = im.convert("RGB").resize((uj_szel, KICSI_MAGASSAG), Image.LANCZOS)
        # A 80-as minőség a nagy nézethez kell; bélyegképen a 70 nem látszik meg,
        # a fájlméret viszont a harmadával kisebb. A már 720-nál keskenyebb
        # képeknél is megéri: azoknál csak az újrakódolás nyer súlyt.
        save_webp(im, f.replace(".webp", "-sm.webp"), KICSI_SZELESSEG, quality=70)


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
    print("Fejléckép:")
    fejkep()
    print("Bélyegképek:")
    bélyegkepek()


if __name__ == "__main__":
    main()
