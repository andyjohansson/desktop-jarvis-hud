// Builds every page in templates/ into wallpapers/, with the hologram engine
// copied from the Jarvis HUD FX plugin in obsidian-jarvis-hud. The wallpapers
// and the plugin share one engine, so a change there reaches the desktop
// with one rebuild:  node build.mjs
//
// The plugin repo is expected next to this one (../obsidian-jarvis-hud).
// Set JARVIS_ENGINE to the path of its plugin/main.js to use another copy.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.env.JARVIS_ENGINE ?? join(here, "..", "obsidian-jarvis-hud", "plugin", "main.js"));

let plugin;
try {
  plugin = readFileSync(source, "utf8");
} catch {
  throw new Error(`Engine not found at ${source}. Clone obsidian-jarvis-hud next to this repo, or set JARVIS_ENGINE.`);
}

const start = plugin.indexOf("// @mind-engine:start");
const end = plugin.indexOf("// @mind-engine:end");
if (start < 0 || end < 0) throw new Error(`mind-engine markers not found in ${source}`);
const engine = plugin.slice(start, end).trimEnd();

// The engine reads a few constants from the top of main.js.
const constants = plugin.split("\n").filter((line) => /^const (MIND_[A-Z_]+|NO_MOTION_CLASS) = /.test(line));
for (const name of ["MIND_SIZE", "MIND_NODES", "MIND_PACE", "MIND_CLASS", "NO_MOTION_CLASS"]) {
  if (!constants.some((line) => line.startsWith(`const ${name} `))) throw new Error(`${name} not found in ${source}`);
}
const block = `${constants.join("\n")}\n\n${engine}`;

for (const file of readdirSync(join(here, "templates")).filter((f) => f.endsWith(".html"))) {
  const template = readFileSync(join(here, "templates", file), "utf8");
  if (!template.includes("/*@MIND_ENGINE@*/")) throw new Error(`placeholder not found in templates/${file}`);
  writeFileSync(join(here, "wallpapers", file), template.replace("/*@MIND_ENGINE@*/", () => block));
  console.log(`Wrote wallpapers/${file}`);
}
