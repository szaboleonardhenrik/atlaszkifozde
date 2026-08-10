# Atlasz Kifőzde — atlaszkifozde.hu

Az Atlasz Kifőzde weboldala. Statikus oldal (HTML + Tailwind CSS), a GitHub
Pages szolgálja ki, a heti menü böngészőből szerkeszthető.

- **Élő oldal:** https://atlaszkifozde.hu
- **Menü szerkesztése:** https://atlaszkifozde.hu/admin/
- **Hosting:** GitHub Pages (a `main` ág gyökere) — a push után ~1-2 perccel él
- **Domain:** a tárhely.eu-nál marad, csak a DNS mutat a GitHubra

---

## A heti menü frissítése (ehhez nem kell fejlesztő)

1. Nyisd meg: **https://atlaszkifozde.hu/admin/**
2. Belépés GitHub-tokennel (lásd lentebb, „Belépés az admin felületre”).
3. **Heti menü** → a legfelső hét a soron következő. Új hétnél:
   - a **Hetek** listában „Add hét”, a dátum mindig az adott hét **hétfője**,
   - napokhoz leves + főétel + ár.
4. **Save** — a mentés egy commitot készít a repóba, az oldal 1-2 perccel
   később magától frissül.

Az oldal mindig azt a hetet emeli ki, amelyikbe a mai nap beleesik; ha a mai nap
egyik hétbe sem esik, a legközelebbi jövőbelit mutatja. A lejárt heteket a
`heti-menu.html` automatikusan elrejti, tehát a régieket nem kötelező törölni.

### Belépés az admin felületre

A szerkesztő felülete **angol** (a Sveltia CMS-nek nincs magyar nyelve), de a
mezőnevek magyarok: „Heti menü”, „Hetek”, „Leves”, „Főétel”, „Ár”.

A belépés GitHub-tokennel megy (nem kell hozzá külön szerver) — az admin
oldalon a **„Sign In Using Access Token”** gomb kell:

1. GitHub → *Settings* → *Developer settings* → *Personal access tokens* →
   **Fine-grained tokens** → *Generate new token*
2. **Repository access:** csak ez az egy repó (`atlaszkifozde`)
3. **Permissions → Repository permissions → Contents: Read and write**
4. A kapott tokent az admin felületen a **„Sign In with Token”** gombnál kell
   beilleszteni. A böngésző megjegyzi, tehát elég egyszer megadni.

> A token olyan, mint egy jelszó — ne küldd tovább, és ha kikerül, a GitHubon
> azonnal vissza lehet vonni.

---

## Fejlesztés

```bash
npm install          # egyszer, a Tailwindhez
npm run watch        # CSS újrafordítás mentéskor
npm start            # helyi szerver: http://127.0.0.1:8899
```

**Fontos:** a kiszolgált CSS (`assets/css/style.css`) a repóban van, mert a
GitHub Pages nem futtat buildet. Ha `src/input.css`-t vagy bármelyik HTML
osztályait módosítod, **`npm run build` és a `style.css` commitolása kötelező**,
különben élesben nem látszik a változás.

### Fájlszerkezet

| Útvonal | Mi ez |
|---|---|
| `index.html`, `heti-menu.html`, `rolunk.html`, `galeria.html`, `kapcsolat.html` | az öt oldal |
| `404.html` | hibaoldal (a GitHub Pages automatikusan használja) |
| `data/menu.json` | **a heti menü adatai** — ezt írja az admin felület |
| `assets/js/menu.js` | a menüt jeleníti meg a JSON-ből |
| `assets/js/oldal.js` | mobil menü, évszám, galéria-nagyító |
| `src/input.css` | a Tailwind forrása (paletta, gombok, kártyák) |
| `assets/css/style.css` | **lefordított CSS — ezt szolgáljuk ki, commitolni kell** |
| `admin/` | Sveltia CMS (`config.yml` = a szerkesztő mezői) |
| `src/process-images.py` | egyszeri kép-előkészítő (nyers fotó → webes WebP) |
| `src/screenshot.py` | fejlesztői képernyőkép-készítő |
| `CNAME` | a saját domain a GitHub Pages-nek — **ne töröld** |

A fejléc és a lábléc szándékosan minden oldalon külön szerepel (nincs
sablonrendszer, mert nincs build-lánc): ha módosítod, **mind az öt oldalon** át
kell vezetni.

### Képek

A fotók WebP-ben, ~1000 px szélességben vannak. Új képnél a nyers fájlt tedd az
`assets/img/` mappába `_` előtaggal (ezeket a `.gitignore` kihagyja), vedd fel a
`src/process-images.py` listájába, és futtasd:

```bash
python src/process-images.py
```

---

## Üzemeltetési tudnivalók

- **Sütik:** az oldal egyetlen sütit sem tesz le. A betűtípus helyben van, a
  térkép OpenStreetMap-beágyazás. Ezért nincs süti-sáv. Ha valaha bekerül
  Google Analytics / Google Maps / Facebook-pixel, **süti-tájékoztató is kell**.
- **A menü nem SEO-tartalom:** a heti menü JavaScripttel jelenik meg. Ha fontos
  lesz, hogy a Google a fogásokat is indexelje, statikus generátorra (Eleventy /
  Astro) kell váltani, ami build időben HTML-be írja a menüt.
- **Sveltia CMS:** az `admin/sveltia-cms.js` egy befagyasztott v0.184.0-s
  másolat, szándékosan nem CDN-ről töltjük. Frissítés = a fájl cseréje egy
  újabb `dist/sveltia-cms.mjs`-re.

## DNS (tárhely.eu)

A domain a tárhely.eu-nál marad, a rekordoknak a GitHub Pages-re kell mutatniuk:

| Típus | Név | Érték |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `szaboleonardhenrik.github.io.` |

A GitHub oldalán: *Settings* → *Pages* → *Custom domain* = `atlaszkifozde.hu`,
majd ha a DNS átállt, **Enforce HTTPS** bekapcsolása (a tanúsítvány kiállítása
pár percet–órát vehet igénybe).
