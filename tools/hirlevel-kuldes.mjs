/**
 * Heti menü hírlevél kiküldése MailerLite-on keresztül.
 *
 * Futtatás:  node tools/hirlevel-kuldes.mjs [--proba]
 *
 * Környezeti változók:
 *   MAILERLITE_API_KEY   – kötelező (GitHub secret)
 *   HIRLEVEL_FELADO      – a feladó e-mail címe (MailerLite-ban IGAZOLT cím!)
 *   HIRLEVEL_CSOPORT     – a feliratkozói csoport neve (alap: "Heti menü")
 *
 * VÉDŐKORLÁTOK — ezek incidensek megelőzésére vannak, ne vedd ki őket:
 *   1. Kulcs nélkül nem küld, csak kilép.
 *   2. Csak a LEGÚJABB hetet küldi ki, és csak egyszer: a kiküldött hét
 *      dátumát a .hirlevel-allapot.json tárolja. Ugyanannak a hétnek a
 *      javítgatása NEM indít újabb levelet.
 *   3. Üres vagy hiányos hét esetén nem küld.
 *   4. A --proba kapcsolóval minden lefut, csak a tényleges küldés marad el.
 */
import fs from "node:fs";
import path from "node:path";

const GYOKER = path.join(import.meta.dirname, "..");
const MENU_UT = path.join(GYOKER, "src/_data/menu.json");
const BEALLITAS_UT = path.join(GYOKER, "src/_data/beallitasok.json");
const ALLAPOT_UT = path.join(GYOKER, ".hirlevel-allapot.json");
const API = "https://connect.mailerlite.com/api";

const proba = process.argv.includes("--proba");
const kulcs = process.env.MAILERLITE_API_KEY;
const csoportNev = process.env.HIRLEVEL_CSOPORT || "Heti menü";

const HONAPOK = [
  "január", "február", "március", "április", "május", "június",
  "július", "augusztus", "szeptember", "október", "november", "december",
];

function kilep(uzenet, kod = 0) {
  console.log(uzenet);
  process.exit(kod);
}

function datumbol(iso) {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || "").trim());
  return r ? new Date(+r[1], +r[2] - 1, +r[3]) : null;
}

function idoszak(kezdes) {
  const k = datumbol(kezdes);
  const v = new Date(k.getTime());
  v.setDate(v.getDate() + 4);
  const veg = k.getMonth() === v.getMonth()
    ? `${v.getDate()}.`
    : `${HONAPOK[v.getMonth()]} ${v.getDate()}.`;
  return `${k.getFullYear()}. ${HONAPOK[k.getMonth()]} ${k.getDate()}. – ${veg}`;
}

const forint = (n) => (Number(n) >= 10000 ? Number(n).toLocaleString("hu-HU") : String(n)) + " Ft";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function hivas(ut, opciok = {}) {
  const valasz = await fetch(API + ut, {
    ...opciok,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${kulcs}`,
      ...opciok.headers,
    },
  });
  const szoveg = await valasz.text();
  if (!valasz.ok) {
    throw new Error(`MailerLite ${opciok.method || "GET"} ${ut} → ${valasz.status}: ${szoveg.slice(0, 400)}`);
  }
  return szoveg ? JSON.parse(szoveg) : {};
}

/** A levél HTML-je. Táblázatos, mert a levelezőkliensek a flexboxot nem ismerik. */
function levelHtml(het, arak, be) {
  const sorok = het.napok.map((n) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e6d4ae;">
        <div style="font-family:Georgia,serif;font-size:17px;font-weight:bold;color:#1e4245;">${esc(n.nap)}</div>
        ${n.leves ? `<div style="font-size:15px;color:#4c7f82;margin-top:4px;">${esc(n.leves)}</div>` : ""}
        <div style="font-size:16px;color:#14201f;margin-top:2px;"><strong>${esc(n.foetel)}</strong></div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #e6d4ae;text-align:right;vertical-align:top;white-space:nowrap;">
        <span style="font-family:Georgia,serif;font-size:16px;font-weight:bold;color:#8c6f3c;">${forint(n.ar)}</span>
      </td>
    </tr>`).join("");

  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Heti menü – ${esc(be.nev)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f0df;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f0df;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #ddd5b4;border-radius:12px;">
      <tr><td style="padding:28px 28px 8px 28px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#8c6f3c;">${esc(be.nev)}</div>
        <h1 style="font-family:Georgia,serif;font-size:26px;color:#1e4245;margin:12px 0 4px 0;">Heti menü</h1>
        <div style="font-size:15px;color:#4c7f82;">${idoszak(het.kezdes)}</div>
      </td></tr>
      <tr><td style="padding:8px 28px 0 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sorok}</table>
      </td></tr>
      <tr><td style="padding:20px 28px;text-align:center;font-size:15px;color:#4c7f82;">
        Napi menü <strong style="color:#1e4245;">${forint(arak.napi_menu)}</strong> ·
        egész hetes befizetéssel <strong style="color:#8c6f3c;">${forint(arak.heti_befizetes)}/nap</strong>
      </td></tr>
      <tr><td style="padding:0 28px 28px 28px;text-align:center;">
        <a href="${be.url}/heti-menu/" style="display:inline-block;background-color:#f4ecd9;border:1px solid #bf9f5e;color:#1e4245;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;">Teljes heti menü</a>
      </td></tr>
      <tr><td style="padding:20px 28px;background-color:#1e4245;border-radius:0 0 12px 12px;color:#f3f0df;font-size:14px;text-align:center;">
        ${esc(be.cim.iranyitoszam)} ${esc(be.cim.varos)}, ${esc(be.cim.utca)}<br>
        <a href="tel:${esc(be.telefon_link)}" style="color:#d4b97f;">${esc(be.telefon)}</a> ·
        ${esc(be.nyitvatartas[0].nap)}: ${esc(be.nyitvatartas[0].ido)}
        <div style="margin-top:14px;font-size:12px;color:#adc8c9;">
          Ezt a levelet azért kapod, mert feliratkoztál a heti menüre.
          <a href="{$unsubscribe}" style="color:#d4b97f;">Leiratkozás</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ---------------------------------------------------------------- futtatás ---

const menu = JSON.parse(fs.readFileSync(MENU_UT, "utf8"));
const be = JSON.parse(fs.readFileSync(BEALLITAS_UT, "utf8"));

const hetek = (menu.hetek || [])
  .filter((h) => datumbol(h.kezdes) && (h.napok || []).length)
  .sort((a, b) => datumbol(b.kezdes) - datumbol(a.kezdes));

if (!hetek.length) kilep("Nincs kiküldhető hét a menüben – nem küldök levelet.");

const het = hetek[0]; // a legfrissebben felvett hét
if (het.napok.some((n) => !n.foetel)) {
  kilep(`A(z) ${het.kezdes} hét hiányos (van főétel nélküli nap) – nem küldök levelet.`);
}

const allapot = fs.existsSync(ALLAPOT_UT)
  ? JSON.parse(fs.readFileSync(ALLAPOT_UT, "utf8"))
  : {};
if (allapot.utolso_kikuldott_het === het.kezdes) {
  kilep(`A(z) ${het.kezdes} kezdetű hét már ki lett küldve – nem küldök újra.`);
}

const html = levelHtml(het, menu.arak, be);
const targy = `Heti menü – ${idoszak(het.kezdes)}`;
console.log(`Hét: ${het.kezdes} | tárgy: ${targy} | levél: ${html.length} bájt`);

if (proba) kilep("PRÓBA mód – a levél NEM megy ki.");
if (!kulcs) kilep("Nincs MAILERLITE_API_KEY – a küldés kimarad. (Ez nem hiba.)");

const felado = process.env.HIRLEVEL_FELADO;
if (!felado) kilep("Nincs HIRLEVEL_FELADO beállítva – a küldés kimarad.", 1);

// 1. csoport megkeresése (vagy létrehozása)
const csoportok = await hivas(`/groups?filter[name]=${encodeURIComponent(csoportNev)}&limit=50`);
let csoport = (csoportok.data || []).find((cs) => cs.name === csoportNev);
if (!csoport) {
  console.log(`„${csoportNev}” csoport nem létezik, létrehozom.`);
  csoport = (await hivas("/groups", { method: "POST", body: JSON.stringify({ name: csoportNev }) })).data;
}
console.log(`Csoport: ${csoport.name} (${csoport.id}), feliratkozók: ${csoport.active_count ?? "?"}`);

if (Number(csoport.active_count) === 0) {
  kilep("A csoportban nincs egyetlen feliratkozó sem – nem hozok létre kampányt.");
}

// 2. kampány létrehozása
const kampany = (await hivas("/campaigns", {
  method: "POST",
  body: JSON.stringify({
    name: targy,
    type: "regular",
    groups: [String(csoport.id)],
    emails: [{ subject: targy, from_name: be.nev, from: felado, content: html }],
  }),
})).data;
console.log(`Kampány létrehozva: ${kampany.id}`);

// 3. azonnali küldés
await hivas(`/campaigns/${kampany.id}/schedule`, {
  method: "POST",
  body: JSON.stringify({ delivery: "instant" }),
});
console.log("Kiküldve.");

// 4. jelöljük, hogy ez a hét megvolt
fs.writeFileSync(
  ALLAPOT_UT,
  JSON.stringify(
    { utolso_kikuldott_het: het.kezdes, kampany_id: kampany.id, targy },
    null,
    2,
  ) + "\n",
);
console.log("Állapot frissítve:", het.kezdes);
