/* A heti menü megjelenítése a data/menu.json fájlból.
 *
 * Két felületet szolgál ki:
 *   [data-menu="aktualis"]  – a főoldal kiemelt, aktuális heti doboza
 *   [data-menu="osszes"]    – a heti-menu.html teljes listája
 *
 * ponytail: kliensoldali renderelés, mert így nincs build-lánc — a CMS csak a
 * JSON-t írja, és az oldal azonnal frissül. Ha a menü SEO-ból fontossá válik
 * (pl. „napi menü Óbuda” keresésre akarunk jönni), akkor kell egy statikus
 * generátor (Eleventy/Astro), ami build időben HTML-be süti a menüt.
 */
(function () {
  "use strict";

  var NAPOK = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
  var HONAPOK = [
    "január", "február", "március", "április", "május", "június",
    "július", "augusztus", "szeptember", "október", "november", "december",
  ];

  function datumbol(iso) {
    var r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
    if (!r) return null;
    // Helyi idő szerinti dátum – az UTC-s Date(iso) nyáron egy napot csúszhat.
    return new Date(+r[1], +r[2] - 1, +r[3]);
  }

  function napokkal(d, n) {
    var uj = new Date(d.getTime());
    uj.setDate(uj.getDate() + n);
    return uj;
  }

  function maNulla() {
    var m = new Date();
    m.setHours(0, 0, 0, 0);
    return m;
  }

  function rovidDatum(d) {
    return d.getMonth() + 1 + ". " + d.getDate() + ".";
  }

  function idoszak(kezdes) {
    var veg = napokkal(kezdes, 4); // hétfőtől péntekig
    return (
      kezdes.getFullYear() +
      ". " + HONAPOK[kezdes.getMonth()] + " " + kezdes.getDate() + ". – " +
      (kezdes.getMonth() === veg.getMonth()
        ? veg.getDate() + "."
        : HONAPOK[veg.getMonth()] + " " + veg.getDate() + ".")
    );
  }

  function forint(n) {
    return Number(n || 0).toLocaleString("hu-HU") + " Ft";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /** A hetek rendezése és az aktuális hét megkeresése. */
  function rendez(hetek) {
    return (hetek || [])
      .filter(function (h) { return datumbol(h.kezdes); })
      .sort(function (a, b) { return datumbol(a.kezdes) - datumbol(b.kezdes); });
  }

  function aktualisHet(hetek) {
    var ma = maNulla();
    // Az a hét, amelyikbe a mai nap beleesik (hétfő + 6 nap).
    for (var i = 0; i < hetek.length; i++) {
      var k = datumbol(hetek[i].kezdes);
      if (ma >= k && ma <= napokkal(k, 6)) return hetek[i];
    }
    // Különben a legközelebbi jövőbeli hét…
    for (var j = 0; j < hetek.length; j++) {
      if (datumbol(hetek[j].kezdes) > ma) return hetek[j];
    }
    // …ha nincs, a legutolsó ismert hét.
    return hetek[hetek.length - 1] || null;
  }

  function maiNapIndex() {
    var d = new Date().getDay(); // 0 = vasárnap
    return d === 0 ? 6 : d - 1;
  }

  /** Egy hét kártyája. `kiemeltMa` esetén a mai nap sora ki van emelve. */
  function hetKartya(het, opts) {
    opts = opts || {};
    var kezdes = datumbol(het.kezdes);
    var maIdx = opts.kiemeltMa ? maiNapIndex() : -1;
    var maHete =
      opts.kiemeltMa && maNulla() >= kezdes && maNulla() <= napokkal(kezdes, 6);

    var sorok = (het.napok || [])
      .map(function (n, i) {
        var mai = maHete && i === maIdx;
        var napDatum = rovidDatum(napokkal(kezdes, i));
        return (
          '<li class="flex flex-col gap-1 border-b border-krem-300 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-6' +
          (mai ? ' bg-terrakotta-50' : "") +
          '">' +
          '<div class="flex w-full items-baseline gap-3 sm:w-44 sm:shrink-0">' +
          '<span class="font-display text-lg font-bold ' +
          (mai ? "text-terrakotta-600" : "text-barna-700") +
          '">' + esc(n.nap || NAPOK[i] || "") + "</span>" +
          '<span class="text-sm text-barna-400">' + napDatum + "</span>" +
          (mai ? '<span class="cimke ml-auto sm:ml-0">Ma</span>' : "") +
          "</div>" +
          '<div class="min-w-0 flex-1">' +
          (n.leves ? '<p class="text-barna-500">' + esc(n.leves) + "</p>" : "") +
          '<p class="font-semibold text-barna-800">' + esc(n.foetel || "") + "</p>" +
          "</div>" +
          (n.ar
            ? '<div class="shrink-0 font-display text-lg font-bold text-terrakotta-600">' +
              forint(n.ar) + "</div>"
            : "") +
          "</li>"
        );
      })
      .join("");

    return (
      '<div class="overflow-hidden rounded-2xl border border-krem-300 bg-white shadow-sm">' +
      '<div class="flex flex-wrap items-center justify-between gap-2 bg-barna-700 px-5 py-4 text-krem-100">' +
      '<h3 class="font-display text-xl font-bold text-krem-100">' +
      esc(opts.cim || "Heti menü") + "</h3>" +
      '<p class="text-sm text-krem-200">' + idoszak(kezdes) + "</p>" +
      "</div>" +
      '<ul class="divide-y-0">' + sorok + "</ul>" +
      "</div>"
    );
  }

  function hiba(elem, uzenet) {
    elem.innerHTML =
      '<div class="rounded-2xl border border-krem-300 bg-white p-8 text-center">' +
      '<p class="text-barna-500">' + esc(uzenet) + "</p>" +
      '<p class="mt-2 text-barna-400">A heti menüért hívjon minket: ' +
      '<a class="font-semibold text-terrakotta-600 underline" href="tel:+36204269836">+36 20 426 9836</a></p>' +
      "</div>";
  }

  function arSav(arak) {
    if (!arak) return "";
    return (
      '<p class="mt-4 text-center text-barna-500">Napi menü <strong class="text-barna-700">' +
      forint(arak.napi_menu) +
      "</strong>" +
      (arak.heti_befizetes
        ? ' · egész hetes befizetéssel <strong class="text-terrakotta-600">' +
          forint(arak.heti_befizetes) + "/nap</strong>"
        : "") +
      "</p>"
    );
  }

  function rendered(adat) {
    var hetek = rendez(adat.hetek);

    var akt = document.querySelector('[data-menu="aktualis"]');
    if (akt) {
      var het = aktualisHet(hetek);
      akt.innerHTML = het
        ? hetKartya(het, { kiemeltMa: true, cim: "E heti menü" }) + arSav(adat.arak)
        : "";
      if (!het) hiba(akt, "A heti menü hamarosan frissül.");
    }

    var osszes = document.querySelector('[data-menu="osszes"]');
    if (osszes) {
      var ma = maNulla();
      // A múltbeli heteket nem mutatjuk, kivéve a most futót.
      var lathato = hetek.filter(function (h) {
        return napokkal(datumbol(h.kezdes), 6) >= ma;
      });
      if (!lathato.length) lathato = hetek.slice(-1);
      var mostani = aktualisHet(hetek);
      osszes.innerHTML = lathato
        .map(function (h, i) {
          return hetKartya(h, {
            kiemeltMa: h === mostani,
            cim: h === mostani ? "E heti menü" : (i === 0 ? "Heti menü" : "Következő hét"),
          });
        })
        .join('<div class="h-8"></div>');
      if (!lathato.length) hiba(osszes, "A heti menü hamarosan frissül.");
    }
  }

  function indit() {
    var kell = document.querySelector("[data-menu]");
    if (!kell) return;
    // Relatív út: a repó-alnév alatti előnézet (…github.io/atlaszkifozde/) is működjön.
    // A gyorsítótár megkerülése, hogy a CMS-ből mentett menü azonnal látszódjon.
    fetch("data/menu.json", { cache: "no-cache" })
      .then(function (v) {
        if (!v.ok) throw new Error("HTTP " + v.status);
        return v.json();
      })
      .then(rendered)
      .catch(function () {
        document.querySelectorAll("[data-menu]").forEach(function (el) {
          hiba(el, "A heti menüt most nem sikerült betölteni.");
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", indit);
  } else {
    indit();
  }
})();
