/**
 * A jogi oldalak (impresszum, adatkezelési tájékoztató) CSAK akkor jönnek
 * létre, ha a Beállításokban ki van töltve a cég adószáma.
 *
 * Miért: egy hiányos impresszum rosszabb, mint a nincs — a látogatónak azt
 * ígéri, hogy megtalálja benne a szolgáltató adatait. Amíg az adatok nincsenek
 * meg, az oldal nem generálódik, és a láblécben sem jelenik meg rá link.
 * Amint a cégadatok bekerülnek a CMS-be, a következő build kiteszi őket.
 */
export default {
  layout: "base.njk",
  eleventyExcludeFromCollections: true,
  eleventyComputed: {
    permalink: (data) =>
      data.beallitasok?.ceg?.adoszam ? data.celUtvonal : false,
  },
};
