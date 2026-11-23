(function () {
  const KEY = "mini-arcade:whackamole";
  const HOLES = 9;
  const ROUND_SECONDS = 30;

  function bestLabel() {
    const saved = Arcade.store.get(KEY);
    return saved ? "Best " + saved + " hits" : "No score yet";
  }

  function mount(root) {
    let holeHtml = "";
    for (let i = 0; i < HOLES; i++) {
      holeHtml +=
        '<button type="button" class="hole" data-i="' + i + '" aria-label="Hole ' + (i + 1) + '">' +
          '<span class="mole" aria-hidden="true">🐹</span>' +
        "</button>";
    }

    root.innerHTML =
      '<div class="panel">' +
        '<div class="hud"><span>Time <strong id="time">' + ROUND_SECONDS + '</strong></span><span>Hits <strong id="score">0</strong></span><span>Best <strong id="best">—</strong></span></div>' +
        '<div class="board-wrap">' +
          '<div class="whack-grid" id="grid">' + holeHtml + "</div>" +
          '<div class="overlay" id="overlay">' +
            '<p class="over-title" id="over-title">Whack-a-Mole</p>' +
            '<p id="over-note">' + ROUND_SECONDS + " seconds. Tap each mole as it pops up.</p>" +
            '<button type="button" class="primary" data-restart id="over-btn">Start</button>' +
          "</div>" +
        "</div>" +
        '<p class="hint">Moles get faster and more numerous as your hits climb.</p>' +
      "</div>";

    const holes = Array.prototype.slice.call(root.querySelectorAll(".hole"));
    const timeEl = root.querySelector("#time");
    const scoreEl = root.querySelector("#score");
    const bestEl = root.querySelector("#best");
    const overlay = root.querySelector("#overlay");
    const overTitle = root.querySelector("#over-title");
    const overNote = root.querySelector("#over-note");
    const overBtn = root.querySelector("#over-btn");

    let score = 0;
    let timeLeft = ROUND_SECONDS;
    let running = false;
    let spawnTimer = 0;
    let tickTimer = 0;
    const up = new Map(); // hole index -> escape timeout id

    function savedBest() {
      return Number(Arcade.store.get(KEY) || 0);
    }

    function maxUp() {
      if (score >= 12) return 3;
      if (score >= 5) return 2;
      return 1;
    }

    function spawnGap() {
      const base = Math.max(260, 650 - score * 14);
      return base * (0.6 + Math.random() * 0.8);
    }

    function lifeMs() {
      return Math.max(520, 1100 - score * 22);
    }

    function paint() {
      timeEl.textContent = String(timeLeft);
      scoreEl.textContent = String(score);
      const best = savedBest();
      bestEl.textContent = best ? String(best) : "—";
      holes.forEach(function (hole, i) {
        hole.classList.toggle("up", up.has(i));
      });
    }

    function trySpawn() {
      if (!running || up.size >= maxUp()) return;
      const free = [];
      for (let i = 0; i < HOLES; i++) if (!up.has(i)) free.push(i);
      if (!free.length) return;
      const i = free[Math.floor(Math.random() * free.length)];
      const escape = setTimeout(function () {
        up.delete(i);
        paint();
      }, lifeMs());
      up.set(i, escape);
      paint();
    }

    function scheduleSpawn() {
      spawnTimer = setTimeout(function () {
        trySpawn();
        if (running) scheduleSpawn();
      }, spawnGap());
    }

    function whack(i) {
      if (!running || !up.has(i)) return;
      clearTimeout(up.get(i));
      up.delete(i);
      score += 1;
      paint();
    }

    function clearTimers() {
      clearTimeout(spawnTimer);
      clearInterval(tickTimer);
      up.forEach(function (timer) { clearTimeout(timer); });
      up.clear();
    }

    function endRound() {
      running = false;
      clearTimers();
      if (score > savedBest()) Arcade.store.set(KEY, String(score));
      paint();
      overTitle.textContent = "Time's up";
      overNote.textContent = "You whacked " + score + (score === 1 ? " mole." : " moles.");
      overBtn.textContent = "Play again";
      overlay.hidden = false;
    }

    function startRound() {
      clearTimers();
      score = 0;
      timeLeft = ROUND_SECONDS;
      running = true;
      overlay.hidden = true;
      paint();
      tickTimer = setInterval(function () {
        timeLeft -= 1;
        paint();
        if (timeLeft <= 0) endRound();
      }, 1000);
      scheduleSpawn();
    }

    root.addEventListener("click", function (event) {
      const hole = event.target.closest("[data-i]");
      if (hole) whack(Number(hole.dataset.i));
      if (event.target.closest("[data-restart]")) startRound();
    });

    paint();

    return function cleanup() {
      running = false;
      clearTimers();
    };
  }

  Arcade.games.push({
    id: "whackamole",
    title: "Whack-a-Mole",
    tag: "Reflex",
    blurb: "Thirty seconds to tap as many moles as you can.",
    accent: "#7a3e2b",
    bestLabel: bestLabel,
    mount: mount
  });
})();
