#!/usr/bin/env node
/*
 * Generates the static, crawlable site:
 *   index.html          hub page listing every game
 *   games/<id>.html     one page per game (unique title, meta, JSON-LD)
 *   sitemap.xml         for search engines
 *   robots.txt
 *
 * Usage:  SITE_URL=https://your-custom-domain.com node scripts/build.js
 * SITE_URL is the public address of the site (no trailing slash).
 * Defaults to the GitHub Pages address of this repository.
 * Games are defined in scripts/games.js.
 */
const fs = require("fs");
const path = require("path");
const GAMES = require("./games");

const ROOT = path.join(__dirname, "..");
const SITE_NAME = "Mini Arcade";
const DEFAULT_SITE_URL = "https://dhruvsavaj-pynxt.github.io/mini-arcade";
const SITE_URL = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
const TODAY = new Date().toISOString().slice(0, 10);

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect fill='%23241c15' width='32' height='32' rx='7'/%3E%3Crect fill='%23e85d04' x='5' y='5' width='9' height='9' rx='2'/%3E%3Crect fill='%231f6f5b' x='18' y='5' width='9' height='9' rx='2'/%3E%3Crect fill='%23c43b5a' x='5' y='18' width='9' height='9' rx='2'/%3E%3Crect fill='%232c5aa0' x='18' y='18' width='9' height='9' rx='2'/%3E%3C/svg%3E";

const FONT_LINKS =
  '  <link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
  '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
  '  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,700&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />\n';

// ---------- helpers ----------

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Reserved, empty ad containers. :empty hides them until an ad fills them,
// so there is no layout gap now and no layout shift later.
function adSlot(name) {
  return '<aside class="ad-slot" data-ad-slot="' + name + '" aria-label="Advertisement"></aside>';
}

function jsonLd(block) {
  return '  <script type="application/ld+json">' + JSON.stringify(block) + "</script>\n";
}

// <!doctype>…</head> for any page. `base` is the relative path back to the site root.
function head(page) {
  const url = SITE_URL + page.pathname;
  const meta = [
    '<meta name="description" content="' + esc(page.description) + '" />',
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<link rel="canonical" href="' + esc(url) + '" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="' + SITE_NAME + '" />',
    '<meta property="og:title" content="' + esc(page.title) + '" />',
    '<meta property="og:description" content="' + esc(page.description) + '" />',
    '<meta property="og:url" content="' + esc(url) + '" />',
    '<meta name="twitter:card" content="summary" />',
    '<meta name="twitter:title" content="' + esc(page.title) + '" />',
    '<meta name="twitter:description" content="' + esc(page.description) + '" />'
  ].map(function (line) { return "  " + line + "\n"; }).join("");

  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '  <meta name="theme-color" content="#efe6d6" />\n' +
    "  <title>" + esc(page.title) + "</title>\n" +
    meta +
    '  <link rel="icon" href="' + FAVICON + '" />\n' +
    FONT_LINKS +
    '  <link rel="stylesheet" href="' + page.base + 'styles.css" />\n' +
    page.jsonld.map(jsonLd).join("") +
    "</head>\n"
  );
}

function header(page) {
  return (
    '    <header class="top">\n' +
    (page.back ? '      <a class="text-btn" href="' + page.back + '">← All games</a>\n' : "") +
    '      <div class="brand-row">\n' +
    '        <a class="logo-link" href="' + page.homeHref + '" aria-label="' + SITE_NAME + ' home"><span class="logo" aria-hidden="true"></span></a>\n' +
    "        <div>\n" +
    '          <p class="eyebrow">' + esc(page.eyebrow) + "</p>\n" +
    "          <h1>" + esc(page.h1) + "</h1>\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </header>\n"
  );
}

// One game card. `href` is relative to the page it appears on.
function gameCard(game, href, withPlayLabel) {
  return (
    '<a class="card" href="' + href + '" style="--accent:' + game.accent + '">' +
      '<span class="tag">' + esc(game.tag) + "</span>" +
      "<strong>" + esc(game.title) + "</strong>" +
      '<span class="blurb">' + esc(game.blurb) + "</span>" +
      (withPlayLabel ? '<span class="play-label">Play now</span>' : "") +
    "</a>"
  );
}

function cardList(cards) {
  return cards.join("\n      ");
}

function pageUrl(pathname) {
  return SITE_URL + pathname;
}

// ---------- pages ----------

function buildHub() {
  const title = "Mini Arcade: Free Browser Games, No Download";
  const description = "Free browser games with no download and no sign-up. Play Snake, Breakout, 2048, Whack-a-Mole, Memory, Tic-Tac-Toe and a reaction test.";
  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: pageUrl("/"),
      description: description
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Mini Arcade games",
      itemListElement: GAMES.map(function (game, index) {
        return { "@type": "ListItem", position: index + 1, url: pageUrl("/games/" + game.id + ".html"), name: game.title };
      })
    }
  ];

  const cards = GAMES.map(function (game) {
    return gameCard(game, "games/" + game.id + ".html", true);
  });

  return (
    head({ title: title, description: description, pathname: "/", base: "", jsonld: jsonld }) +
    "<body>\n" +
    '  <div class="app">\n' +
    header({ homeHref: "./", eyebrow: "In the browser", h1: SITE_NAME }) +
    "    <main>\n" +
    '      <p class="lede">Free browser games. No download, no account. Pick one and play.</p>\n' +
    '      <nav aria-label="Games"><div class="grid">\n      ' + cardList(cards) + "\n      </div></nav>\n" +
    "      " + adSlot("hub-middle") + "\n" +
    '      <section class="about">\n' +
    "        <h2>Free online games you can play right now</h2>\n" +
    "        <p>Mini Arcade is a small collection of classic and original games that run in any modern browser. " +
    "Play Snake, Breakout, 2048, Whack-a-Mole, Memory, Tic-Tac-Toe and a reaction-time test on your phone, tablet or computer. " +
    "There is nothing to install and no account to create.</p>\n" +
    "        <p>Your best scores are saved on the device you play on. They stay private and are never uploaded.</p>\n" +
    "      </section>\n" +
    "      " + adSlot("hub-bottom") + "\n" +
    "    </main>\n" +
    '    <p class="footnote">Nothing to install. Best scores stay on this device.</p>\n' +
    "  </div>\n" +
    "</body>\n</html>\n"
  );
}

function buildGame(game) {
  const pathname = "/games/" + game.id + ".html";
  const title = game.seoTitle + " | " + SITE_NAME;
  const description = game.seoDescription;
  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: game.title,
      description: description,
      url: pageUrl(pathname),
      genre: game.tag,
      gamePlatform: "Web Browser",
      applicationCategory: "Game",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: pageUrl("/") },
        { "@type": "ListItem", position: 2, name: game.title, item: pageUrl(pathname) }
      ]
    }
  ];

  const others = GAMES.filter(function (other) { return other.id !== game.id; })
    .map(function (other) { return gameCard(other, other.id + ".html", false); });

  return (
    head({ title: title, description: description, pathname: pathname, base: "../", jsonld: jsonld }) +
    '<body data-game="' + game.id + '">\n' +
    '  <div class="app">\n' +
    header({ homeHref: "../", back: "../", eyebrow: game.tag, h1: game.title }) +
    "    " + adSlot("game-top") + "\n" +
    '    <main id="stage">\n' +
    '      <noscript><p class="lede">This game needs JavaScript. <a href="../">Back to all games</a>.</p></noscript>\n' +
    "    </main>\n" +
    "    " + adSlot("game-bottom") + "\n" +
    '    <section class="about">\n' +
    "      <h2>About " + esc(game.title) + "</h2>\n" +
    "      <p>" + esc(description) + "</p>\n" +
    "      <h3>How to play</h3>\n" +
    "      <p>" + esc(game.howTo) + "</p>\n" +
    "    </section>\n" +
    '    <nav class="more" aria-label="More games"><h2>More games</h2><div class="grid">\n      ' +
      cardList(others) + "\n    </div></nav>\n" +
    '    <p class="footnote">Nothing to install. Best scores stay on this device.</p>\n' +
    "  </div>\n" +
    '  <script src="../js/store.js"></script>\n' +
    '  <script src="../js/' + game.file + '.js"></script>\n' +
    '  <script src="../js/main.js"></script>\n' +
    "</body>\n</html>\n"
  );
}

function buildSitemap() {
  const urls = ["/"].concat(GAMES.map(function (game) { return "/games/" + game.id + ".html"; }));
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(function (u) {
      return "  <url><loc>" + esc(pageUrl(u)) + "</loc><lastmod>" + TODAY + "</lastmod></url>\n";
    }).join("") +
    "</urlset>\n"
  );
}

function buildRobots() {
  return "User-agent: *\nAllow: /\n\nSitemap: " + pageUrl("/sitemap.xml") + "\n";
}

// ---------- write ----------

function write(relative, content) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  console.log("wrote " + relative);
}

write("index.html", buildHub());
GAMES.forEach(function (game) {
  write(path.join("games", game.id + ".html"), buildGame(game));
});
write("sitemap.xml", buildSitemap());
write("robots.txt", buildRobots());
