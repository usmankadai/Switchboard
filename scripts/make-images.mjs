// Builds Switchboard's icons and link preview image from app/icon.svg:
//
//   app/favicon.ico           16, 32 and 48 px, for tools that only ask for /favicon.ico
//   app/apple-icon.png        180 px, for iPhone and iPad home screens (square: iOS rounds it)
//   app/opengraph-image.png   1200 x 630, the picture shown when a link is shared
//
// Next.js finds these files in /app and adds the right tags to <head>.
// Run after changing the icon or the wording:
//
//   node scripts/make-images.mjs
//
// Drawn in Playwright's Chromium, in Geist (the site's font), because a real
// browser lays text out properly. next/og's renderer left uneven gaps
// between words.
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const app = (file) => new URL(`../app/${file}`, import.meta.url);

const BRAND = {
  teal: "#0b4f4a",
  amber: "#f2b134",
  page: "#fbfaf6",
  text: "#14201f",
  muted: "#45524f",
  border: "#c9cfcc",
};

const icon = await readFile(app("icon.svg"), "utf8");
const iconSrc = `data:image/svg+xml,${encodeURIComponent(icon)}`;
// The same shapes on a square tile, for the iPhone icon.
const squareIconSrc = `data:image/svg+xml,${encodeURIComponent(icon.replace('rx="7"', 'rx="0"'))}`;
// Geist Regular, as shipped with Next.js.
const geist = await readFile(require.resolve("next/dist/compiled/@vercel/og/Geist-Regular.ttf"));

const page = await (await chromium.launch()).newPage();

async function render(html, width, height) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>
      @font-face { font-family: Geist; src: url(data:font/ttf;base64,${geist.toString("base64")}); }
      html, body { margin: 0; background: transparent; font-family: Geist; }
    </style>${html}`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width, height } });
}

// favicon.ico: PNG images inside an ICO container (a 6 byte header, then a
// 16 byte entry per image, then the images).
const SIZES = [16, 32, 48];
const pngs = [];
for (const size of SIZES) pngs.push(await render(`<img src="${iconSrc}" width="${size}" height="${size}">`, size, size));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((png, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(SIZES[index], 0); // width
  entry.writeUInt8(SIZES[index], 1); // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += png.length;
  return entry;
});
await writeFile(app("favicon.ico"), Buffer.concat([header, ...entries, ...pngs]));

await writeFile(app("apple-icon.png"), await render(`<img src="${squareIconSrc}" width="180" height="180">`, 180, 180));

const HIGHLIGHTS = ["Live tariff prices", "WCAG 2.2 AA", "Fast on slow phones", "Private by design"];
const NOTICE =
  "Independent concept. Tariff data from the public Octopus Energy API. Not affiliated with Octopus Energy.";

const preview = `
<style>
  .card { box-sizing: border-box; width: 1200px; height: 630px; display: flex; flex-direction: column;
    justify-content: space-between; padding: 60px 72px 52px; background: ${BRAND.page}; color: ${BRAND.text};
    border-top: 16px solid ${BRAND.teal}; }
  .brand { display: flex; align-items: center; gap: 24px; }
  .name { font-size: 56px; color: ${BRAND.teal}; letter-spacing: -1px; }
  .tag { font-size: 24px; padding: 6px 16px; border-radius: 999px; background: ${BRAND.amber}; }
  h1 { margin: 0 0 28px; font-weight: 400; font-size: 76px; line-height: 1.08; letter-spacing: -2px; max-width: 1000px; }
  ul { display: flex; gap: 16px; margin: 0; padding: 0; list-style: none; }
  li { font-size: 26px; padding: 12px 22px; border-radius: 999px; border: 2px solid ${BRAND.teal};
    color: ${BRAND.teal}; white-space: nowrap; }
  .notice { font-size: 22px; color: ${BRAND.muted}; padding-top: 22px; border-top: 2px solid ${BRAND.border}; }
</style>
<div class="card">
  <div class="brand"><img src="${iconSrc}" width="84" height="84"><span class="name">Switchboard</span><span class="tag">Concept</span></div>
  <div>
    <h1>Compare real electricity tariffs in two minutes</h1>
    <ul>${HIGHLIGHTS.map((highlight) => `<li>${highlight}</li>`).join("")}</ul>
  </div>
  <div class="notice">${NOTICE}</div>
</div>`;
await writeFile(app("opengraph-image.png"), await render(preview, 1200, 630));
await writeFile(
  app("opengraph-image.alt.txt"),
  "Switchboard: compare real electricity tariffs in two minutes. An independent concept, not affiliated with Octopus Energy.",
);

await page.context().browser().close();
console.log("Wrote app/favicon.ico, app/apple-icon.png, app/opengraph-image.png and its alt text");
