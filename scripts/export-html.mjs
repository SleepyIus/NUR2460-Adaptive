import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "dist-html");
const js = fs.readFileSync(path.join(dir, "quiz.js"), "utf8").replace(/<\/script/gi, "<\\/script");
const css = fs
  .readdirSync(dir)
  .filter((n) => n.endsWith(".css"))
  .map((n) => fs.readFileSync(path.join(dir, n), "utf8"))
  .join("\n");
const notices = fs
  .readFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const questionCount = JSON.parse(fs.readFileSync(path.join(root, "data/bank.json"), "utf8"))
  .questions.length;
if (!css || !js) throw Error("Missing standalone assets");
if (/@import\s|url\(https?:\/\//i.test(css))
  throw Error("Standalone CSS contains external resources");
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${questionCount} original nursing practice questions for NUR2460 Exam 2. Adaptive study and an 80-question blueprint exam with rationales."><title>NUR2460 · Exam 2 Adaptive Study</title><style>${css}</style></head><body><noscript>This quiz needs JavaScript enabled. Open this HTML file in a full browser such as Chrome, Edge, Firefox, or Safari.</noscript><div id="quiz-root"></div><script>${js}</script><template id="third-party-notices"><pre>${notices}</pre></template></body></html>`;
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), html);
const output = path.join(root, "index.html");
fs.writeFileSync(output, html);
console.log(`Standalone HTML: ${output} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
