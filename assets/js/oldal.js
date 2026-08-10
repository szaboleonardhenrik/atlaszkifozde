/* Minden oldalon futó apróságok: mobil menü, évszám, galéria-nagyító. */
(function () {
  "use strict";

  // Mobil menü
  var gomb = document.getElementById("menu-gomb");
  var menu = document.getElementById("mobil-menu");
  if (gomb && menu) {
    gomb.addEventListener("click", function () {
      var nyitva = menu.classList.toggle("hidden") === false;
      gomb.setAttribute("aria-expanded", String(nyitva));
      gomb.setAttribute("aria-label", nyitva ? "Menü bezárása" : "Menü megnyitása");
    });
  }

  // Évszám a láblécben
  document.querySelectorAll("[data-ev]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Galéria-nagyító: a <dialog> natív, nem kell hozzá könyvtár.
  var parbeszed = document.getElementById("kep-nagyito");
  if (parbeszed) {
    var nagykep = parbeszed.querySelector("img");
    document.querySelectorAll("[data-nagyit]").forEach(function (kep) {
      kep.addEventListener("click", function () {
        nagykep.src = kep.dataset.nagyit || kep.src;
        nagykep.alt = kep.alt;
        parbeszed.showModal();
      });
    });
    parbeszed.addEventListener("click", function (e) {
      // Kattintás a képen kívülre = bezárás
      if (e.target === parbeszed) parbeszed.close();
    });
    var zaro = parbeszed.querySelector("[data-zar]");
    if (zaro) zaro.addEventListener("click", function () { parbeszed.close(); });
  }
})();
