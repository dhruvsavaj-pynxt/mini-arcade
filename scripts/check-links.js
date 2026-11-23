#!/usr/bin/env node
/*
 * Validates the generated site:
 *   - every local src/href resolves to a file
 *   - every JSON-LD block parses
 *   - every page has a title, meta description and canonical link
 *   - every game in the build list has a page and a script
 * With --strict, also fails if the placeholder domain is still in the output.
 * Run `node scripts/build.js` first.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const strict = process.argv.indexOf("--strict") !== -1;
const errors = [];

function listPages() {
  const pages = ["index.html"];
  const gamesDir = path.join(ROOT, "games");
  if (fs.existsSync(gamesDir)) {
    fs.readdirSync(gamesDir).filter(function (f) { return f.endsWith(".html"); }).forEach(function (f) {
      pages.push(path.join("games", f));
    });
  }
  return pages;
}

function checkPage(page) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const dir = path.dirname(page);

  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(page + ": missing <title>");
  if (!/name="description" content="[^"]+"/.test(html)) errors.push(page + ": missing meta description");
  if (!/rel="canonical" href="[^"]+"/.test(html)) errors.push(page + ": missing canonical link");

  const refs = [];
  const attr = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = attr.exec(html))) refs.push(m[1]);
  refs.forEach(function (ref) {
    if (/^(https?:|data:|#|mailto:)/.test(ref)) return;
    const target = path.join(ROOT, dir, ref.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) errors.push(page + ": broken reference " + ref);
  });

  const ld = /<script type="application\/ld\+json">(.*?)<\/script>/g;
  while ((m = ld.exec(html))) {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      errors.push(page + ": invalid JSON-LD (" + err.message + ")");
    }
  }

  if (strict && html.indexOf("YOUR-DOMAIN") !== -1) {
    errors.push(page + ": still contains placeholder domain; set SITE_URL before deploying");
  }
}

function checkGames() {
  const games = require("./games");
  games.forEach(function (game) {
    const page = path.join("games", game.id + ".html");
    const script = path.join("js", game.file + ".js");
    if (!fs.existsSync(path.join(ROOT, page))) errors.push("missing page for game " + game.id + " (run build)");
    if (!fs.existsSync(path.join(ROOT, script))) errors.push("missing script " + script);
  });
  if (!games.length) errors.push("no games defined in scripts/games.js");
  return games.length;
}

const pages = listPages();
if (!fs.existsSync(path.join(ROOT, "index.html"))) {
  errors.push("index.html not found; run `node scripts/build.js` first");
} else {
  pages.forEach(checkPage);
  const gameCount = checkGames();
  console.log("checked " + pages.length + " pages, " + gameCount + " games");
}

if (errors.length) {
  console.error(errors.map(function (e) { return "ERROR " + e; }).join("\n"));
  process.exit(1);
}
console.log("ok");
