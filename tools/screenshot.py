"""Képernyőképek az oldalakról (fejlesztői segédeszköz).

Előbb build + helyi szerver a _site mappából:
    npm run build
    cd _site && python -m http.server 8898
Aztán:
    python tools/screenshot.py [kimeneti_mappa]
"""
import sys, os
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8898"
OLDALAK = [
    ("index", "/"),
    ("heti-menu", "/heti-menu/"),
    ("rolunk", "/rolunk/"),
    ("galeria", "/galeria/"),
    ("kapcsolat", "/kapcsolat/"),
    ("blog", "/blog/"),
    ("bejegyzes", "/blog/uj-cimer-atlasz/"),
    ("404", "/404.html"),
]
ki = sys.argv[1] if len(sys.argv) > 1 else "."

# Apró lépésekben görgetünk, hogy a lazy-load képek mind sorra kerüljenek, és
# a végén NEM ugrunk vissza a tetejére: ha visszaugranánk, a böngésző elvetné a
# még el sem indult betöltéseket, és üres helyek maradnának a képen.
GORGETES = """() => new Promise(v => {
    let y = 0;
    const l = setInterval(() => {
        window.scrollTo(0, y);
        y += 400;
        if (y > document.body.scrollHeight) { clearInterval(l); v(); }
    }, 40);
})"""
# Az üres src-ű képeket kihagyjuk: a galéria nagyítójában szándékosan van egy
# üres <img>, amit csak kattintásra töltünk fel.
KEPEK_KESZ = """() => Array.from(document.images)
    .filter(i => i.getAttribute('src'))
    .every(i => i.complete && i.naturalWidth > 0)"""

with sync_playwright() as p:
    # A gépre telepített Chrome-ot használjuk (a playwright saját böngésző-
    # letöltése és a python csomag verziója itt épp nem passzol egymáshoz).
    b = p.chromium.launch(channel="chrome")
    hibak = []
    for nev, ut in OLDALAK:
        for cimke, meret in (("asztali", {"width": 1440, "height": 1000}),
                             ("mobil", {"width": 390, "height": 844})):
            oldal = b.new_page(viewport=meret)
            oldal.on("console", lambda m: hibak.append(f"[konzol] {m.type}: {m.text}")
                     if m.type == "error" else None)
            oldal.on("pageerror", lambda e: hibak.append(f"[js] {e}"))
            oldal.goto(BASE + ut, wait_until="networkidle")
            oldal.evaluate(GORGETES)
            try:
                oldal.wait_for_function(KEPEK_KESZ, timeout=15000)
            except Exception:
                hibak.append(f"[kép] {nev}/{cimke}: van be nem töltött kép")
            oldal.evaluate("window.scrollTo(0, 0)")
            oldal.wait_for_timeout(400)
            oldal.screenshot(path=os.path.join(ki, f"{nev}-{cimke}.png"), full_page=True)
            oldal.close()
        print("kész:", nev)
    b.close()
    if hibak:
        print("\nHIBÁK:")
        for h in dict.fromkeys(hibak):
            print(" ", h)
    else:
        print("\nNincs JS/konzol hiba.")
