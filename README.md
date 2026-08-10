# Atlasz Kifőzde — atlaszkifozde.hu

Az Atlasz Kifőzde weboldala. **Eleventy** statikus generátor + **Tailwind CSS**,
a GitHub Pages szolgálja ki. A heti menü, a blog, a galéria és az elérhetőségek
böngészőből szerkeszthetők.

- **Élő oldal:** https://atlaszkifozde.hu
- **Szerkesztés:** https://atlaszkifozde.hu/admin/
- **Hosting:** GitHub Pages, a `main` ágra pusholt változás után a GitHub Actions
  build magától élesíti (~2 perc)
- **Domain:** a tárhely.eu-nál marad, csak a DNS mutat a GitHubra

---

## Szerkesztés böngészőből (ehhez nem kell fejlesztő)

Nyisd meg: **https://atlaszkifozde.hu/admin/** — négy dolgot lehet szerkeszteni:

| Menüpont | Mit állít |
|---|---|
| **Heti menü** | a hetek, napok, leves/főétel, árak |
| **Blog** | bejegyzések írása, képpel; a „Piszkozat” kapcsolóval el is rejthető |
| **Galéria** | a galéria oldal képei és képaláírásai |
| **Beállítások** | telefonszám, cím, nyitvatartás, bevezető szöveg, vendégvélemények |

Mentés után a GitHub Actions újraépíti az oldalt, és **1-2 percen belül élesedik**.

A heti menünél a hét **hétfői dátumát** kell megadni. A honlap mindig azt a hetet
emeli ki, amelyikbe a mai nap beleesik; a lejárt heteket magától elrejti, tehát
a régieket nem kötelező törölni.

### Belépés az admin felületre

A szerkesztő felülete **angol** (a Sveltia CMS-nek nincs magyar nyelve), de a
mezőnevek magyarok. A belépés GitHub-tokennel megy — az admin oldalon a
**„Sign In Using Access Token”** gomb kell:

1. GitHub → *Settings* → *Developer settings* → *Personal access tokens* →
   **Fine-grained tokens** → *Generate new token*
2. **Repository access:** csak ez az egy repó (`atlaszkifozde`)
3. **Permissions → Repository permissions → Contents: Read and write**
4. A kapott tokent az admin felületen kell beilleszteni. A böngésző megjegyzi,
   tehát elég egyszer megadni.

> A token olyan, mint egy jelszó — ne küldd tovább, és ha kikerül, a GitHubon
> azonnal vissza lehet vonni.

---

## Fejlesztés

```bash
npm install
npm run dev      # http://localhost:8080, mentésre újraépít (a CSS-t is)
npm run build    # egyszeri build a _site mappába
npm run kepek    # nyers fotókból webes WebP (lásd lentebb)
```

A Tailwind az Eleventy build **után** fut (`eleventy.after` esemény), és a kész
`_site/**/*.html`-ből olvassa ki a használt osztályokat. Így nem kell külön
figyelő folyamat, és a Nunjucksból generált markup is bekerül.

### Szerkezet

| Útvonal | Mi ez |
|---|---|
| `src/index.njk`, `heti-menu.njk`, `rolunk.njk`, `galeria.njk`, `kapcsolat.njk`, `blog.njk` | az oldalak |
| `src/blog/*.md` | **a blogbejegyzések** (a CMS ide ír) |
| `src/_data/menu.json` | **a heti menü** |
| `src/_data/galeria.json` | a galéria képei |
| `src/_data/beallitasok.json` | telefonszám, cím, nyitvatartás, vélemények |
| `src/_includes/base.njk` | a közös HTML-váz (meta, JSON-LD) |
| `src/_includes/reszek/` | fejléc, lábléc, heti menü kártya |
| `src/css/input.css` | Tailwind-forrás: paletta, gombok, kártyák, cikkszöveg |
| `src/assets/` | képek, betűtípusok, JS – változatlanul másolódik |
| `src/admin/` | Sveltia CMS (`config.yml` = a szerkesztő mezői) |
| `src/CNAME` | a saját domain a GitHub Pages-nek — **ne töröld** |
| `eleventy.config.js` | build-beállítás, szűrők (dátum, forint, aktuális hét) |
| `tools/` | kép-előkészítő és képernyőkép-készítő segédszkriptek |

### Képek

A fotók WebP-ben, ~1200–1600 px szélességben vannak. Új képnél:

1. tedd a nyers fájlt `src/assets/img/_nev.jpg` néven (a `_` előtagot a
   `.gitignore` kihagyja a repóból),
2. vedd fel a `tools/process-images.py` `FOTOK` listájába,
3. futtasd: `npm run kepek`.

A CMS-ből feltöltött képek is a `src/assets/img` mappába kerülnek — azok viszont
nem mennek át ezen az optimalizáláson, ezért nagy fájlt ne tölts fel oda.

---

## Fontos tudnivalók

- **A „mai nap” kiemelése build időben dől el.** Ezért a
  `.github/workflows/deploy.yml` **naponta lefuttatja a buildet** akkor is, ha
  nem volt módosítás. Ha ezt az ütemezést kiveszed, a heti menü napi kiemelése
  beragad az utolsó build napjára.
- **Sütik:** az oldal egyetlen sütit sem tesz le. A betűtípus helyben van, a
  térkép OpenStreetMap-beágyazás. Ezért nincs süti-sáv. Ha valaha bekerül Google
  Analytics / Google Maps / Facebook-pixel, **süti-tájékoztató is kell**.
- **Sveltia CMS:** az `src/admin/sveltia-cms.js` egy befagyasztott v0.184.0-s
  másolat, szándékosan nem CDN-ről töltjük. **`type="module"` NÉLKÜL kell
  betölteni** — modulként némán, hibaüzenet nélkül üres fehér oldalt ad.
- **A vicces „Az utolsó szó jogán” kép** (csirkeláb a levesben) szándékosan nincs
  a galériában — mém, nem étvágygerjesztő fotó. Ha mégis kell, a blogba illik.

## DNS (tárhely.eu)

| Típus | Név | Érték |
|---|---|---|
| A | `atlaszkifozde.hu.` | `185.199.108.153` · `.109.153` · `.110.153` · `.111.153` (négy rekord) |
| CNAME | `www` | `szaboleonardhenrik.github.io.` |

🔴 A `mail`, `MX`, `SPF`, `DMARC`, `DKIM`, `webmail`, `autodiscover` rekordokhoz
**nem szabad hozzányúlni**: a levelezés továbbra is a tárhely.eu szerverén fut,
ezért a tárhelyet nem lehet lemondani.
