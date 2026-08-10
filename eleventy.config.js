import { execFileSync } from "node:child_process";
import path from "node:path";
import feedPlugin from "@11ty/eleventy-plugin-rss";

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

  // --- Szűrők ---

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
