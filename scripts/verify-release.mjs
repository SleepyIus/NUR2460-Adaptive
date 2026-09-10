import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length !== 1 || /<script[^>]+src=|<link[^>]+rel=["']stylesheet|@import\s/i.test(html))
  throw Error("Standalone HTML has unexpected external dependencies");
new vm.Script(scripts[0]);
if (html.includes("/Users/") || html.includes("localhost:3000"))
  throw Error("Local paths leaked into release");
if (html !== fs.readFileSync(path.join(root, "dist/index.html"), "utf8"))
  throw Error("Standalone copies differ");
const bank = JSON.parse(fs.readFileSync(path.join(root, "data/bank.json"), "utf8"));
if (bank.questions.length !== 252 || bank.archive?.length !== 240)
  throw Error("Incorrect bank or preserved archive size");
for (const q of bank.questions) {
  if (q.refs.some((r) => r.label.includes("undefined") || r.label.includes("/Users/")))
    throw Error("Invalid source " + q.id);
  if (q.options.some((o) => /\ball of the above\b|\bboth [A-F] and [A-F]\b/i.test(o.text)))
    throw Error("Letter-dependent answer " + q.id);
  if (!q.revision || !q.difficultyReason || q.clue === q.rationale)
    throw Error("Missing item quality fields " + q.id);
}
const stats = {
  questions: bank.questions.length,
  optionRationales: bank.questions.reduce((n, q) => n + q.options.length, 0),
  formats: Object.fromEntries(
    ["MC", "SATA"].map((k) => [k, bank.questions.filter((q) => q.kind === k).length]),
  ),
  difficulty: Object.fromEntries(
    [1, 2, 3].map((k) => [k, bank.questions.filter((q) => q.difficulty === k).length]),
  ),
  htmlBytes: Buffer.byteLength(html),
  sha256: crypto.createHash("sha256").update(html).digest("hex"),
};
console.log(JSON.stringify(stats, null, 2));
