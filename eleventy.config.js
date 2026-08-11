import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import feedPlugin from "@11ty/eleventy-plugin-rss";

const GYOKER = import.meta.dirname;
const KEP_KONYVTAR = path.join(GYOKER, "src/assets/img");

/**
 * Kép valódi képpont-mérete a fájl fejlécéből (WebP és PNG).
 *
 * Azért olvassuk ki magunk, mert a `width`/`height` attribútum hiánya a
 * betöltés közbeni ugrálás (CLS) fő oka, kézzel karbantartani pedig nem lehet:
 * a képek egy részét a CMS-ből cserélik. Néhány bájt fejléc elég hozzá, így
 * nem kell képfeldolgozó függőség.
 */
const meretBufferbol = (b) => {
  if (b.length > 24 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const fajta = b.toString("ascii", 12, 16);
    if (fajta === "VP8 ") return { sz: b.readUInt16LE(26) & 0x3fff, ma: b.readUInt16LE(28) & 0x3fff };
    if (fajta === "VP8L") {
      const n = b.readUInt32LE(21);
      return { sz: (n & 0x3fff) + 1, ma: ((n >> 14) & 0x3fff) + 1 };
    }
    if (fajta === "VP8X") {
      return {
        sz: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1,
        ma: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1,
      };
    }
    return null;
  }
  if (b.length > 24 && b.toString("ascii", 12, 16) === "IHDR") {
    return { sz: b.readUInt32BE(16), ma: b.readUInt32BE(20) };
  }
  return null;
};

const meretGyorstar = new Map();
const kepMeret = (webUt) => {
  if (!meretGyorstar.has(webUt)) {
    let m = null;
    try {
      const fd = fs.openSync(path.join(GYOKER, "src", webUt.replace(/^\//, "")), "r");
      const b = Buffer.alloc(40);
      fs.readSync(fd, b, 0, 40, 0);
      fs.closeSync(fd);
      m = meretBufferbol(b);
    } catch {
      m = null; // hiányzó fájl: attribútum nélkül megy ki, nem törik el a build
    }
    meretGyorstar.set(webUt, m);
  }
  return meretGyorstar.get(webUt);
};

export default function (eleventyConfig) {
  // Statikus fájlok változatlanul átmásolva
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/.nojekyll");

  eleventyConfig.addPlugin(feedPlugin);

  // A Tailwindet az Eleventy build UTÁN futtatjuk, hogy a kész HTML-ből
  // olvassa ki a ténylegesen használt osztályokat. Így az `eleventy --serve`
  // is frissíti a stíluslapot, nem kell külön figyelő folyamat.
  eleventyConfig.on("eleventy.after", () => {
    // A CLI-t közvetlenül node-dal indítjuk. Az `npx`/`npx.cmd` Windowson
    // EINVAL-lal elszáll (a .cmd futtatásához shell kellene), ez a hívás
    // viszont Windowson és a CI Linuxán is egyformán működik.
    const cli = path.join(
      import.meta.dirname,
      "node_modules/@tailwindcss/cli/dist/index.mjs",
    );
    execFileSync(
      process.execPath,
      [
        cli,
        "-i", "src/css/input.css",
        "-o", "_site/assets/css/style.css",
        "--minify",
      ],
      { stdio: "inherit" },
    );
  });

  // --- Kimenet-utómunka ---

  /**
   * Minden helyi képre kiírja a valódi méretet és a `decoding="async"`-ot.
   *
   * Egy helyen, a kész HTML-en dolgozik, így a Markdownból jövő és a CMS-ből
   * cserélt képekre is hat — nem kell minden sablonban észben tartani.
   */
  eleventyConfig.addTransform("kepmeretek", function (tartalom) {
    if (!(this.page.outputPath || "").endsWith(".html")) return tartalom;
    return tartalom.replace(/<img\s[^>]*>/g, (cimke) => {
      const src = /\ssrc="(\/assets\/img\/[^"]+)"/.exec(cimke);
      if (!src) return cimke;
      let uj = cimke;
      if (!/\sdecoding=/.test(uj)) uj = uj.replace(/^<img\s/, '<img decoding="async" ');
      if (/\swidth=/.test(uj) || /\sheight=/.test(uj)) return uj;
      const m = kepMeret(src[1]);
      return m ? uj.replace(/^<img\s/, `<img width="${m.sz}" height="${m.ma}" `) : uj;
    });
  });

  // --- Szűrők ---

  /**
   * A kártyákon és a galéria-rácsban használt kicsinyített változat neve.
   * Ha nincs ilyen fájl (pl. frissen, CMS-ből feltöltött kép), az eredetit
   * adja vissza — így a kép sosem tűnik el, csak nehezebb marad.
   */
  eleventyConfig.addFilter("kicsi", (fajl) => {
    const nev = String(fajl || "");
    const sm = nev.replace(/\.webp$/i, "-sm.webp");
    return sm !== nev && fs.existsSync(path.join(KEP_KONYVTAR, sm)) ? sm : nev;
  });

  const HONAPOK = [
    "január", "február", "március", "április", "május", "június",
    "július", "augusztus", "szeptember", "október", "november", "december",
  ];

  /** "2026-08-10" -> Date (helyi idő szerint, hogy ne csússzon el egy napot) */
  const datumbol = (iso) => {
    if (iso instanceof Date) return iso;
    const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || "").trim());
    return r ? new Date(+r[1], +r[2] - 1, +r[3]) : null;
  };
  eleventyConfig.addFilter("datumbol", datumbol);

  /** 2026. augusztus 10. */
  eleventyConfig.addFilter("magyarDatum", (ertek) => {
    const d = datumbol(ertek);
    if (!d) return "";
    return `${d.getFullYear()}. ${HONAPOK[d.getMonth()]} ${d.getDate()}.`;
  });

  /** A hét hétfő–péntek időszaka: "2026. augusztus 10. – 14." */
  eleventyConfig.addFilter("hetIdoszak", (kezdes) => {
    const k = datumbol(kezdes);
    if (!k) return "";
    const v = new Date(k.getTime());
    v.setDate(v.getDate() + 4);
    const veg =
      k.getMonth() === v.getMonth()
        ? `${v.getDate()}.`
        : `${HONAPOK[v.getMonth()]} ${v.getDate()}.`;
    return `${k.getFullYear()}. ${HONAPOK[k.getMonth()]} ${k.getDate()}. – ${veg}`;
  });

  /** 2290 -> "2290 Ft" (magyar helyesírás: 4 jegyig nincs szóköz) */
  eleventyConfig.addFilter("forint", (n) => {
    const sz = Number(n || 0);
    return (sz >= 10000 ? sz.toLocaleString("hu-HU") : String(sz)) + " Ft";
  });

  /** ISO dátum a <time datetime="…">-hoz */
  eleventyConfig.addFilter("isoDatum", (ertek) => {
    const d = datumbol(ertek);
    if (!d) return "";
    const p = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });

  /** Egyszerű kivonat a bejegyzés szövegéből */
  eleventyConfig.addFilter("kivonat", (tartalom, hossz = 160) => {
    const t = String(tartalom || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return t.length > hossz ? t.slice(0, t.lastIndexOf(" ", hossz)) + "…" : t;
  });

  eleventyConfig.addFilter("abszolutUrl", (ut, alap) =>
    new URL(ut, alap).toString(),
  );

  /** Egy kép valódi szélessége — a `srcset` méret-leírásához. */
  eleventyConfig.addFilter("kepSzeles", (ut) => (kepMeret(String(ut || "")) || {}).sz || 0);

  /**
   * Ajánló a bejegyzés aljára: a listában utána következő N cikk, körbefordulva.
   *
   * ponytail: dátum szerinti szomszédok, nem téma-egyezés. A cikkeken nincs
   * címke; ha egyszer lesz, itt kell a rokonságot arra cserélni.
   */
  eleventyConfig.addFilter("kapcsolodo", (bejegyzesek, jelenlegiUrl, db = 3) => {
    const lista = bejegyzesek || [];
    const i = lista.findIndex((b) => b.url === jelenlegiUrl);
    if (i < 0) return lista.slice(0, db);
    return Array.from({ length: Math.min(db, lista.length - 1) }, (_, k) =>
      lista[(i + 1 + k) % lista.length],
    );
  });

  /** Tömb-szelet. (A Nunjucks beépített `slice`-a másra való: N részre oszt.) */
  eleventyConfig.addFilter("szelet", (tomb, kezd, veg) =>
    (tomb || []).slice(kezd, veg),
  );

  /** A hetek rendezve, régitől újig. */
  const rendezettHetek = (hetek) =>
    (hetek || [])
      .filter((h) => datumbol(h.kezdes))
      .sort((a, b) => datumbol(a.kezdes) - datumbol(b.kezdes));
  eleventyConfig.addFilter("rendezettHetek", rendezettHetek);

  /**
   * Az a hét, amelyikbe a mai nap beleesik; ha nincs ilyen, a legközelebbi
   * jövőbeli; ha az sincs, az utolsó ismert hét.
   *
   * FIGYELEM: ez BUILD időben dől el. A heti menü ezért csak akkor vált, ha
   * fut egy build — ezt a napi ütemezett GitHub Actions futás biztosítja
   * (lásd .github/workflows/deploy.yml), nem elég a CMS-mentés.
   */
  eleventyConfig.addFilter("aktualisHet", (hetek) => {
    const lista = rendezettHetek(hetek);
    if (!lista.length) return null;
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const veg = (k) => {
      const v = new Date(k.getTime());
      v.setDate(v.getDate() + 6);
      return v;
    };
    return (
      lista.find((h) => ma >= datumbol(h.kezdes) && ma <= veg(datumbol(h.kezdes))) ||
      lista.find((h) => datumbol(h.kezdes) > ma) ||
      lista[lista.length - 1]
    );
  });

  /** Csak a még aktuális (nem lejárt) hetek. */
  eleventyConfig.addFilter("jovobeliHetek", (hetek) => {
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const lista = rendezettHetek(hetek);
    const megElo = lista.filter((h) => {
      const v = new Date(datumbol(h.kezdes).getTime());
      v.setDate(v.getDate() + 6);
      return v >= ma;
    });
    return megElo.length ? megElo : lista.slice(-1);
  });

  /** A hét adott napjához tartozó dátum (0 = hétfő). */
  eleventyConfig.addFilter("napDatuma", (kezdes, eltolas) => {
    const k = datumbol(kezdes);
    if (!k) return "";
    const d = new Date(k.getTime());
    d.setDate(d.getDate() + Number(eltolas || 0));
    return `${d.getMonth() + 1}. ${d.getDate()}.`;
  });

  /**
   * A hét MAI napjának menüje (vagy null, ha ma nincs — hétvége).
   *
   * Build-időben dől el, mint minden „ma”-logika itt: a napi ütemezett
   * GitHub Actions futás lépteti (lásd deploy.yml) — CMS-mentés nem elég.
   */
  eleventyConfig.addFilter("maiNap", (het) => {
    const k = het && datumbol(het.kezdes);
    if (!k) return null;
    const ma = new Date();
    ma.setHours(0, 0, 0, 0);
    const eltolas = Math.round((ma - k) / 86400000);
    return (het.napok || [])[eltolas] || null; // hétvégén az index kifut → null
  });

  /** Ma van-e ez a nap? (0 = hétfő) */
  eleventyConfig.addFilter("maE", (kezdes, eltolas) => {
    const k = datumbol(kezdes);
    if (!k) return false;
    const d = new Date(k.getTime());
    d.setDate(d.getDate() + Number(eltolas || 0));
    const ma = new Date();
    return (
      d.getFullYear() === ma.getFullYear() &&
      d.getMonth() === ma.getMonth() &&
      d.getDate() === ma.getDate()
    );
  });

  // --- Gyűjtemények ---

  eleventyConfig.addCollection("bejegyzesek", (api) =>
    api
      .getFilteredByGlob("src/blog/*.md")
      .filter((b) => !b.data.piszkozat)
      .sort((a, b) => b.date - a.date),
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
