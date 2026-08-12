/**
 * Egyszeri körlevél a hírlevél-feliratkozóknak MailerLite-on keresztül.
 * (A heti menüt NEM ez küldi — azt a hirlevel-kuldes.mjs, automatikusan.)
 *
 * Futtatás:  node tools/korlevel-kuldes.mjs [--proba]
 *
 * Környezeti változók:
 *   MAILERLITE_API_KEY   – kötelező (GitHub secret)
 *   HIRLEVEL_FELADO      – a feladó e-mail címe (MailerLite-ban IGAZOLT cím!)
 *   HIRLEVEL_CSOPORT     – a feliratkozói csoport neve (alap: "Heti menü")
 *   KORLEVEL_TARGY       – a levél tárgya
 *   KORLEVEL_SZOVEG      – a levél szövege; a sortörés új bekezdést kezd
 *
 * VÉDŐKORLÁTOK — a hirlevel-kuldes.mjs mintájára, ne vedd ki őket:
 *   1. Kulcs, tárgy vagy szöveg nélkül nem küld, csak kilép.
 *   2. Csak MEGLÉVŐ csoportnak küld (elgépelt csoportnév ne hozzon létre
 *      üres csoportot), és csak ha van benne feliratkozó.
 *   3. A --proba kapcsolóval minden lefut, csak a tényleges küldés marad el.
 */
import fs from "node:fs";
import path from "node:path";

const GYOKER = path.join(import.meta.dirname, "..");
const BEALLITAS_UT = path.join(GYOKER, "src/_data/beallitasok.json");
const API = "https://connect.mailerlite.com/api";

const proba = process.argv.includes("--proba");
const kulcs = process.env.MAILERLITE_API_KEY;
const csoportNev = process.env.HIRLEVEL_CSOPORT || "Heti menü";
const targy = (process.env.KORLEVEL_TARGY || "").trim();
const szoveg = (process.env.KORLEVEL_SZOVEG || "").trim();

function kilep(uzenet, kod = 0) {
  console.log(uzenet);
  process.exit(kod);
}

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

/** A levél HTML-je — ugyanaz a keret, mint a heti menü levélé. */
function levelHtml(be) {
  const bekezdesek = szoveg
    .split(/\r?\n+/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p style="font-size:16px;line-height:1.6;color:#14201f;margin:0 0 14px 0;">${esc(b)}</p>`)
    .join("");

  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(targy)} – ${esc(be.nev)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f0df;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f0df;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #ddd5b4;border-radius:12px;">
      <tr><td style="padding:28px 28px 8px 28px;text-align:center;">
        <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#8c6f3c;">${esc(be.nev)}</div>
        <h1 style="font-family:Georgia,serif;font-size:26px;color:#1e4245;margin:12px 0 4px 0;">${esc(targy)}</h1>
      </td></tr>
      <tr><td style="padding:16px 28px 4px 28px;">${bekezdesek}</td></tr>
      <tr><td style="padding:8px 28px 28px 28px;text-align:center;">
        <a href="${be.url}/" style="display:inline-block;background-color:#f4ecd9;border:1px solid #bf9f5e;color:#1e4245;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px;">atlaszkifozde.hu</a>
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

if (!targy || !szoveg) kilep("Nincs KORLEVEL_TARGY vagy KORLEVEL_SZOVEG – nincs mit küldeni.", 1);

const be = JSON.parse(fs.readFileSync(BEALLITAS_UT, "utf8"));
const html = levelHtml(be);
console.log(`Tárgy: ${targy} | levél: ${html.length} bájt`);
console.log(`Szöveg:\n${szoveg}`);

if (proba) kilep("PRÓBA mód – a levél NEM megy ki.");
if (!kulcs) kilep("Nincs MAILERLITE_API_KEY – a küldés kimarad. (Ez nem hiba.)");

const felado = process.env.HIRLEVEL_FELADO;
if (!felado) kilep("Nincs HIRLEVEL_FELADO beállítva – a küldés kimarad.", 1);

// 1. csoport megkeresése — körlevélnél NEM hozunk létre újat
const csoportok = await hivas(`/groups?filter[name]=${encodeURIComponent(csoportNev)}&limit=50`);
const csoport = (csoportok.data || []).find((cs) => cs.name === csoportNev);
if (!csoport) kilep(`Nincs „${csoportNev}” nevű csoport – nem küldök.`, 1);
console.log(`Csoport: ${csoport.name} (${csoport.id}), feliratkozók: ${csoport.active_count ?? "?"}`);

if (Number(csoport.active_count) === 0) {
  kilep("A csoportban nincs egyetlen feliratkozó sem – nem hozok létre kampányt.");
}

// 2. kampány létrehozása
const kampany = (await hivas("/campaigns", {
  method: "POST",
  body: JSON.stringify({
    name: `Körlevél: ${targy}`,
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
