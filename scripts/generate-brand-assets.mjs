import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const waves =
  '<g fill="none" stroke="#d3eb87" stroke-width="7" stroke-linecap="round"><path d="M25 38c15-14 35 14 50 0M25 52c15-14 35 14 50 0M25 66c15-14 35 14 50 0"/></g>';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="28" fill="#202a22"/>${waves}</svg>`;
await writeFile("public/favicon.svg", icon + "\n");
await sharp(Buffer.from(icon))
  .resize(180, 180)
  .png()
  .toFile("app/apple-icon.png");
await sharp(Buffer.from(icon)).resize(32, 32).png().toFile("app/icon.png");
const rings = [86, 104, 122, 140, 158, 176, 194]
  .map(
    (r) =>
      `<circle cx="952" cy="305" r="${r}" fill="none" stroke="#465047" stroke-width="1.5"/>`,
  )
  .join("");
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#dfe3d6" stroke-width="1"/></pattern></defs>
<rect width="1200" height="630" fill="#f7f7ef"/>
<rect x="720" width="480" height="630" fill="#e8eddb"/>
<rect x="720" width="480" height="630" fill="url(#grid)"/>
<g transform="translate(64 55) scale(.58)"><rect width="100" height="100" rx="28" fill="#202a22"/>${waves}</g>
<g font-family="Helvetica, Arial, sans-serif" fill="#202a22">
<text x="137" y="99" font-size="40" font-weight="700" letter-spacing="-2">Sortify<tspan fill="#64893c">.</tspan></text>
<text x="64" y="215" font-size="13" font-weight="700" letter-spacing="3">YOUR LIBRARY. YOUR KIND OF ORDER.</text>
<text x="60" y="302" font-size="66" font-weight="700" letter-spacing="-3">A little order</text>
<text x="60" y="378" font-size="66" font-weight="700" letter-spacing="-3">for your music<tspan fill="#64893c">.</tspan></text>
<text x="64" y="440" font-size="23" fill="#667066">Turn your Spotify library into playlists</text>
<text x="64" y="472" font-size="23" fill="#667066">that feel like you.</text>
<path d="M64 551H659" stroke="#dadfd1"/>
<text x="64" y="583" font-size="14" font-weight="700" letter-spacing="1">LESS SCROLLING. MORE LISTENING.</text>
</g>
<circle cx="952" cy="316" r="211" fill="#cad2b8"/>
<circle cx="952" cy="305" r="211" fill="#202a22"/>${rings}
<circle cx="952" cy="305" r="69" fill="#d3eb87"/>
<g transform="translate(917 269) scale(.7)"><g fill="none" stroke="#202a22" stroke-width="6" stroke-linecap="round"><path d="M25 30c15-14 35 14 50 0M25 50c15-14 35 14 50 0M25 70c15-14 35 14 50 0"/></g></g>
<g transform="translate(798 482) rotate(-8)"><rect width="235" height="60" rx="12" fill="#d3eb87"/><text x="25" y="38" font-family="Helvetica, Arial, sans-serif" font-size="19" font-weight="700" fill="#202a22">Made for your mood</text></g>
<g transform="translate(1093 88)" stroke="#64893c" stroke-width="3" stroke-linecap="round"><path d="M0-18V18M-18 0H18M-12-12L12 12M12-12L-12 12"/></g>
</svg>`;
await writeFile("public/share-preview.svg", card + "\n");
const png = await sharp(Buffer.from(card)).png().toBuffer();
await writeFile("app/opengraph-image.png", png);
await writeFile("app/twitter-image.png", png);
const alt =
  "Sortify — A little order for your music. Turn your Spotify library into playlists that feel like you.\n";
await writeFile("app/opengraph-image.alt.txt", alt);
await writeFile("app/twitter-image.alt.txt", alt);
