"""Egyszeri kép-előkészítés: a nyers (_ előtagú) képekből webes méretű WebP-k.

Futtatás:  python src/process-images.py
A nyers képek az assets/img/_*.jpg|png fájlok — ezek NEM kerülnek a repóba (.gitignore).
"""
from PIL import Image
import os

IMG = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
CREAM = (253, 246, 233)


def save_webp(im, name, max_w, quality=82):
    im = im.convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    path = os.path.join(IMG, name)
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"  {name:24s} {im.width}x{im.height}  {os.path.getsize(path) // 1024} kB")


def transparent_logo():
    """A logó krém hátterét átlátszóvá teszi, és külön menti a fazék-ikont."""
    im = Image.open(os.path.join(IMG, "_jelkep.png")).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            # ponytail: egyszerű küszöb elég — a logó lapos, két-színű vektorgrafika.
            if r > 244 and g > 233 and b > 212:
                px[x, y] = (r, g, b, 0)
    im.crop(im.getbbox()).save(os.path.join(IMG, "logo.png"))
    # a fazék-ikon a felső harmadban van, a felirat alatta
    icon = im.crop((0, 0, im.width, 330))
    icon.crop(icon.getbbox()).save(os.path.join(IMG, "logo-ikon.png"))
    print("  logo.png + logo-ikon.png kész")


def main():
    print("Logó:")
    transparent_logo()

    print("Fotók:")
    photos = {
        "etel-01": "ragu",           # zöldbabos csirkeragu
        "etel-09": "grillcsirke",    # grillezett csirkemell
        "etel-10": "toltott-hus",    # tejszínes hústekercs
        "etel-02": "grizes",         # grízes tészta / pite
        "etel-04": "habos-suti",
        "etel-05": "torta",
        "etel-06": "kakaos-csiga",
        "etel-07": "tiramisu",
        "etel-08": "jegeskave",
    }
    for src, name in photos.items():
        f = os.path.join(IMG, f"_{src}.jpg")
        if not os.path.exists(f):
            print(f"  ! hiányzik: {f}")
            continue
        save_webp(Image.open(f), f"{name}.webp", 1000)

    # csapatfotó a Rólunk oldalra + hero háttér
    team = Image.open(os.path.join(IMG, "_promo-01.png"))
    save_webp(team, "csapat.webp", 1000)


if __name__ == "__main__":
    main()
