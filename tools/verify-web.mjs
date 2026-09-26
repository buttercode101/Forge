import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const required = [
  'name="viewport"',
  'localStorage',
  'crypto.randomUUID',
  'function esc(',
  'function normalizeOpportunity(',
  'function changeStage(',
  'validation gate failed',
  'No fabricated proof'
];
const forbidden = [
  'eval(',
  'new Function(',
  'document.write('
];
for (const marker of required) if (!html.includes(marker)) throw new Error("Missing web contract marker: "+marker);
for (const marker of forbidden) if (html.includes(marker)) throw new Error("Forbidden web primitive: "+marker);
if (!html.includes('Math.max(0,Math.min(1,n))')) throw new Error("Confidence bounds missing");
if (!html.includes('slice(0,MAX_OPPORTUNITIES)')) throw new Error("State bounds missing");
if (!html.includes('e.state==="VERIFIED"')) throw new Error("Verified-evidence gate missing");
console.log(JSON.stringify({ok:true,checks:required.length+forbidden.length+3}));
