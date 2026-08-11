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

  // Hírlevél-feliratkozás: a MailerLite végpontja CORS-nyitott, így az űrlap
  // helyben, oldalváltás nélkül küldhető. JS nélkül az űrlap sima POST-tal
  // is működik (a válasz egy nyers JSON lesz új lapon) — ez a tartalék út.
  document.querySelectorAll("form[data-hirlevel]").forEach(function (urlap) {
    urlap.addEventListener("submit", function (e) {
      e.preventDefault();
      var gombE = urlap.querySelector("button[type=submit]");
      var uzenet = urlap.querySelector("[data-uzenet]");
      gombE.disabled = true;
      gombE.textContent = "Küldés…";
      fetch(urlap.action, { method: "POST", body: new FormData(urlap) })
        .then(function (v) { return v.json(); })
        .then(function (adat) {
          if (!adat.success) throw new Error("sikertelen");
          urlap.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
          gombE.textContent = "Elküldve ✓";
          uzenet.textContent =
            "Már csak egy lépés: küldtünk egy megerősítő levelet – kattints benne a gombra, és kész.";
          uzenet.className = "mt-4 rounded-xl bg-bronz-100 px-4 py-3 font-semibold text-petrol-800";
        })
        .catch(function () {
          gombE.disabled = false;
          gombE.textContent = "Kérem a heti menüt";
          uzenet.textContent =
            "Hoppá, nem sikerült elküldeni. Próbáld újra egy perc múlva!";
          uzenet.className = "mt-4 rounded-xl bg-paradicsom-100 px-4 py-3 font-semibold text-paradicsom-700";
        });
    });
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
