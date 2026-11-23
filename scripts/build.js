#!/usr/bin/env node
/*
 * Generates the static, crawlable site:
 *   index.html          hub page listing every game
 *   games/<id>.html     one page per game (unique title, meta, JSON-LD)
 *   sitemap.xml         for search engines
 *   robots.txt
 *
 * Usage:  SITE_URL=https://your-domain.com node scripts/build.js
 * SITE_URL must be the public address of the site (no trailing slash).
 * Without it, canonical URLs use a placeholder and must be fixed before launch.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_NAME = "Mini Arcade";
const SITE_URL = (process.env.SITE_URL || "https://YOUR-DOMAIN.example").replace(/\/+$/, "");
const TODAY = new Date().toISOString().slice(0, 10);

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect fill='%23241c15' width='32' height='32' rx='7'/%3E%3Crect fill='%23e85d04' x='5' y='5' width='9' height='9' rx='2'/%3E%3Crect fill='%231f6f5b' x='18' y='5' width='9' height='9' rx='2'/%3E%3Crect fill='%23c43b5a' x='5' y='18' width='9' height='9' rx='2'/%3E%3Crect fill='%232c5aa0' x='18' y='18' width='9' height='9' rx='2'/%3E%3C/svg%3E";

// One entry per game. `file` is the script in js/ (and the page in games/).
const GAMES = [
  {
    id: "snake",
    file: "snake",
    title: "Snake",
    tag: "Arcade",
    accent: "#e85d04",
    blurb: "Eat, grow, and keep your head off the walls.",
    seoTitle: "Snake Game Online Free",
    seoDescription: "Play Snake free in your browser. Steer the snake, eat food, grow longer and beat your best score. No download or sign-up.",
    howTo: "Steer the snake with arrow keys or WASD, or swipe on the board on a phone. Eat the food to grow and gain a point. The game ends when you hit a wall or your own tail. The game speeds up as your score climbs."
  },
  {
    id: "reaction",
    file: "reaction",
    title: "Quick Tap",
    tag: "Reflex",
    accent: "#c43b5a",
    blurb: "Wait for green, then tap. Early taps don't count.",
    seoTitle: "Reaction Time Test Online Free",
    seoDescription: "Test your reaction time in milliseconds. Wait for the pad to turn green, tap as fast as you can and track your best time. Free, no sign-up.",
    howTo: "Tap the pad to start. It turns from grey to red while you wait. When it turns green, tap as fast as you can. Tapping too early does not count. Your reaction time in milliseconds is saved as your best if it beats the previous one."
  },
  {
    id: "tictactoe",
    file: "tictactoe",
    title: "Tic-Tac-Toe",
    tag: "Classic",
    accent: "#2c5aa0",
    blurb: "You go first. It grabs wins and blocks yours.",
    seoTitle: "Tic-Tac-Toe Against the Computer Free",
    seoDescription: "Play tic-tac-toe against the computer for free in your browser. You play X and go first. Can you beat the computer? No sign-up needed.",
    howTo: "You are X and move first. Click an empty square to place your mark. The computer plays O. It takes a win when it can and blocks yours when you are about to win. Get three in a row to win, or fill the board for a draw."
  },
  {
    id: "memory",
    file: "memory",
    title: "Memory",
    tag: "Pairs",
    accent: "#1f6f5b",
    blurb: "Flip the board and clear it in as few moves as you can.",
    seoTitle: "Memory Card Matching Game Free",
    seoDescription: "Play the memory matching game free in your browser. Flip cards to find pairs in as few moves as you can and beat your best score.",
    howTo: "Flip two cards per turn. If they match, they stay face up. If not, they flip back. Clear all eight pairs in as few moves as possible. Your fewest moves are saved as your best."
  },
  {
    id: "breakout",
    file: "breakout",
    title: "Breakout",
    tag: "Arcade",
    accent: "#4f6d2a",
    blurb: "Bounce the ball off your paddle and clear the wall of bricks.",
    seoTitle: "Breakout Brick Breaker Game Free",
    seoDescription: "Play Breakout free in your browser. Move the paddle, bounce the ball and break every brick. Works with mouse, touch or keyboard.",
    howTo: "Move the paddle with the mouse, your finger or the left and right arrow keys. Click, tap or press Space to launch the ball. Where the ball hits the paddle changes its angle. Break all the bricks to clear the board. You have three balls."
  },
  {
    id: "2048",
    file: "2048",
    title: "2048",
    tag: "Puzzle",
    accent: "#c9861a",
    blurb: "Slide and merge tiles until one reaches 2048.",
    seoTitle: "2048 Puzzle Game Online Free",
    seoDescription: "Play 2048 free in your browser. Slide and merge number tiles to reach 2048. Use arrow keys, WASD, swipes or the on-screen pad.",
    howTo: "Slide all tiles up, down, left or right with arrow keys, WASD, a swipe or the on-screen pad. Two tiles with the same number merge into one with double the value. After each move a new 2 or 4 appears. Reach the 2048 tile to win, then keep going for a higher score."
  },
  {
    id: "whackamole",
    file: "whackamole",
    title: "Whack-a-Mole",
    tag: "Reflex",
    accent: "#7a3e2b",
    blurb: "Thirty seconds to tap as many moles as you can.",
    seoTitle: "Whack-a-Mole Game Online Free",
    seoDescription: "Play Whack-a-Mole free in your browser. You have 30 seconds to tap as many popping moles as you can. Moles get faster as you score.",
    howTo: "Press Start and you have 30 seconds. Moles pop up from the holes. Tap a mole before it goes back down to score a hit. Moles appear faster and more often as your score climbs. Your best number of hits is saved on this device."
  }
];

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

function fontLinks() {
  return (
    '  <link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
    '  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,700&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />\n'
  );
}

function head(page) {
  const url = SITE_URL + page.pathname;
  const jsonld = page.jsonld.map(function (block) {
    return '  <script type="application/ld+json">' + JSON.stringify(block) + "</script>\n";
  }).join("");
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '  <meta name="theme-color" content="#efe6d6" />\n' +
    "  <title>" + esc(page.title) + "</title>\n" +
    '  <meta name="description" content="' + esc(page.description) + '" />\n' +
    '  <meta name="robots" content="index, follow, max-image-preview:large" />\n' +
    '  <link rel="canonical" href="' + esc(url) + '" />\n' +
    '  <meta property="og:type" content="website" />\n' +
    '  <meta property="og:site_name" content="' + SITE_NAME + '" />\n' +
    '  <meta property="og:title" content="' + esc(page.title) + '" />\n' +
    '  <meta property="og:description" content="' + esc(page.description) + '" />\n' +
    '  <meta property="og:url" content="' + esc(url) + '" />\n' +
    '  <meta name="twitter:card" content="summary" />\n' +
    '  <meta name="twitter:title" content="' + esc(page.title) + '" />\n' +
    '  <meta name="twitter:description" content="' + esc(page.description) + '" />\n' +
    '  <link rel="icon" href="' + FAVICON + '" />\n' +
    fontLinks() +
    '  <link rel="stylesheet" href="' + page.base + 'styles.css" />\n' +
    jsonld +
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

function gameCards(base) {
  return GAMES.map(function (game) {
    return (
      '<a class="card" href="' + base + "games/" + game.id + '.html" style="--accent:' + game.accent + '">' +
        '<span class="tag">' + esc(game.tag) + "</span>" +
        "<strong>" + esc(game.title) + "</strong>" +
        '<span class="blurb">' + esc(game.blurb) + "</span>" +
        '<span class="play-label">Play now</span>' +
      "</a>"
    );
  }).join("\n        ");
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
      url: SITE_URL + "/",
      description: description
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Mini Arcade games",
      itemListElement: GAMES.map(function (game, index) {
        return { "@type": "ListItem", position: index + 1, url: SITE_URL + "/games/" + game.id + ".html", name: game.title };
      })
    }
  ];

  return (
    head({ title: title, description: description, pathname: "/", base: "", jsonld: jsonld }) +
    "<body>\n" +
    '  <div class="app">\n' +
    header({ homeHref: "./", eyebrow: "In the browser", h1: SITE_NAME }) +
    "    <main>\n" +
    '      <p class="lede">Free browser games. No download, no account. Pick one and play.</p>\n' +
    '      <nav aria-label="Games"><div class="grid">\n        ' + gameCards("") + "\n      </div></nav>\n" +
    adSlot("hub-middle") + "\n" +
    '      <section class="about">\n' +
    "        <h2>Free online games you can play right now</h2>\n" +
    "        <p>Mini Arcade is a small collection of classic and original games that run in any modern browser. " +
    "Play Snake, Breakout, 2048, Whack-a-Mole, Memory, Tic-Tac-Toe and a reaction-time test on your phone, tablet or computer. " +
    "There is nothing to install and no account to create.</p>\n" +
    "        <p>Your best scores are saved on the device you play on. They stay private and are never uploaded.</p>\n" +
    "      </section>\n" +
    adSlot("hub-bottom") + "\n" +
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
  const others = GAMES.filter(function (other) { return other.id !== game.id; });
  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: game.title,
      description: description,
      url: SITE_URL + pathname,
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
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: game.title, item: SITE_URL + pathname }
      ]
    }
  ];

  return (
    head({ title: title, description: description, pathname: pathname, base: "../", jsonld: jsonld }) +
    '<body data-game="' + game.id + '">\n' +
    '  <div class="app">\n' +
    header({
      homeHref: "../",
      back: "../",
      eyebrow: game.tag,
      h1: game.title
    }) +
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
      others.map(function (other) {
        return (
          '<a class="card" href="' + other.id + '.html" style="--accent:' + other.accent + '">' +
            '<span class="tag">' + esc(other.tag) + "</span>" +
            "<strong>" + esc(other.title) + "</strong>" +
            '<span class="blurb">' + esc(other.blurb) + "</span>" +
          "</a>"
        );
      }).join("\n      ") +
    "\n    </div></nav>\n" +
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
      return "  <url><loc>" + esc(SITE_URL + u) + "</loc><lastmod>" + TODAY + "</lastmod></url>\n";
    }).join("") +
    "</urlset>\n"
  );
}

function buildRobots() {
  return "User-agent: *\nAllow: /\n\nSitemap: " + SITE_URL + "/sitemap.xml\n";
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

if (SITE_URL.indexOf("YOUR-DOMAIN") !== -1) {
  console.warn("\nSITE_URL is not set. Canonical, sitemap and og:url use a placeholder. Re-run with SITE_URL=https://your-domain.com");
}
