/**
 * Supprime les scripts injectés par Replit dans le HTML buildé
 * (beacon cartographer + Tailwind CDN loader) avant déploiement sur Plesk.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, "../../artifacts/api-server/public/index.html");

let html = readFileSync(htmlPath, "utf8");
const before = html.length;

// 1. Supprimer le script beacon Replit (cartographer/modern-screenshot)
//    Pattern : <script type="module">"use strict";(()=>{var B="0.5.5"...
html = html.replace(/<script type="module">"use strict";\(.*?<\/script>\s*/gs, "");

// 2. Supprimer le loader Tailwind CDN Replit
//    Pattern : <script>(function() { ... loadTailwind ... })();</script>
html = html.replace(/<script>\(function\(\)[\s\S]*?loadTailwind[\s\S]*?\}\)\(\);<\/script>\s*/g, "");

writeFileSync(htmlPath, html, "utf8");
console.log(`✅ strip-replit-scripts: ${before} → ${html.length} bytes (supprimé ${before - html.length} bytes)`);
