"""Képernyőképek az oldalakról (fejlesztői segédeszköz).

Előbb indíts helyi szervert a projekt gyökeréből:  python -m http.server 8899
Aztán:  python src/screenshot.py [kimeneti_mappa]
"""
import sys, os
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8899"
OLDALAK = [
    ("index", "/"),
    ("heti-menu", "/heti-menu.html"),
    ("rolunk", "/rolunk.html"),
    ("galeria", "/galeria.html"),
    ("kapcsolat", "/kapcsolat.html"),
]
ki = sys.argv[1] if len(sys.argv) > 1 else "."

with sync_playwright() as p:
    # A gépre telepített Chrome-ot használjuk (a playwright saját böngésző-
    # letöltése és a python csomag verziója itt épp nem passzol egymáshoz).
    b = p.chromium.launch(channel="chrome")
    hibak = []
    for nev, ut in OLDALAK:
        for cimke, meret in (("asztali", {"width": 1440, "height": 1000}),
                             ("mobil", {"width": 390, "height": 844})):
            oldal = b.new_page(viewport=meret, device_scale_factor=1)
            oldal.on("console", lambda m: hibak.append(f"[konzol] {m.type}: {m.text}")
                     if m.type == "error" else None)
            oldal.on("pageerror", lambda e: hibak.append(f"[js] {e}"))
            oldal.goto(BASE + ut, wait_until="networkidle")
            # Végiggörgetünk, hogy a lazy-load képek is betöltsenek a teljes
            # oldalas képen (különben üres helyek maradnának a hajtás alatt).
            oldal.evaluate(
                """() => new Promise(v => {
                    let y = 0;
                    const l = setInterval(() => {
                        window.scrollTo(0, y);
                        y += window.innerHeight;
                        if (y > document.body.scrollHeight) { clearInterval(l); window.scrollTo(0,0); v(); }
                    }, 60);
                })"""
            )
            oldal.wait_for_timeout(800)
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
