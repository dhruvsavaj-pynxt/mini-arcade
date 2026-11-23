(function () {
  const KEY = "mini-arcade:memory";
  const ICONS = ["🍎", "🍋", "🍇", "🍉", "🍒", "🥝", "🍑", "🍍"];

  function bestLabel() {
    const saved = Arcade.store.get(KEY);
    return saved ? "Best " + saved + " moves" : "No score yet";
  }

  function mount(root) {
    root.innerHTML =
      '<div class="panel">' +
        '<div class="hud"><span>Moves <strong id="moves">0</strong></span><span>Best <strong id="best">—</strong></span></div>' +
        '<div class="mem-grid" id="grid"></div>' +
        '<div class="win-note" id="overlay" hidden>' +
          '<p class="over-title">All pairs found</p>' +
          '<button type="button" class="primary" data-restart>Play again</button>' +
        "</div>" +
        '<p class="hint">Flip two cards. Matching pairs stay face up.</p>' +
      "</div>";

    const grid = root.querySelector("#grid");
    const movesEl = root.querySelector("#moves");
    const bestEl = root.querySelector("#best");
    const overlay = root.querySelector("#overlay");
    let deck = [];
    let matched = [];
    let open = [];
    let moves = 0;
    let lock = false;
    let timer = 0;

    function showBest() {
      const saved = Arcade.store.get(KEY);
      bestEl.textContent = saved ? saved : "—";
    }

    function paint() {
      Array.prototype.forEach.call(grid.children, function (button, index) {
        const faceUp = open.indexOf(index) !== -1 || matched[index];
        button.classList.toggle("up", faceUp);
        button.classList.toggle("matched", matched[index]);
        button.disabled = matched[index];
        button.setAttribute("aria-label", faceUp ? deck[index] : "Hidden card");
      });
      movesEl.textContent = String(moves);
    }

    function win() {
      const saved = Arcade.store.get(KEY);
      if (!saved || moves < Number(saved)) Arcade.store.set(KEY, String(moves));
      showBest();
      overlay.hidden = false;
    }

    function deal() {
      clearTimeout(timer);
      deck = Arcade.shuffle(ICONS.concat(ICONS));
      matched = deck.map(function () { return false; });
      open = [];
      moves = 0;
      lock = false;
      overlay.hidden = true;
      grid.innerHTML = deck.map(function (_icon, index) {
        return (
          '<button type="button" class="tile" data-i="' + index + '" aria-label="Hidden card">' +
            '<span class="tile-inner"><span class="face back"></span><span class="face front">' + deck[index] + "</span></span>" +
          "</button>"
        );
      }).join("");
      showBest();
      paint();
    }

    function choose(index) {
      if (lock || matched[index] || open.indexOf(index) !== -1) return;
      open.push(index);
      if (open.length === 2) {
        moves += 1;
        const first = open[0];
        const second = open[1];
        if (deck[first] === deck[second]) {
          matched[first] = true;
          matched[second] = true;
          open = [];
          paint();
          if (matched.every(Boolean)) win();
          return;
        }
        lock = true;
        timer = setTimeout(function () {
          open = [];
          lock = false;
          paint();
        }, 700);
      }
      paint();
    }

    root.addEventListener("click", function (event) {
      const tile = event.target.closest("[data-i]");
      if (tile) choose(Number(tile.dataset.i));
      if (event.target.closest("[data-restart]")) deal();
    });

    deal();

    return function cleanup() {
      clearTimeout(timer);
    };
  }

  Arcade.games.push({
    id: "memory",
    title: "Memory",
    tag: "Pairs",
    blurb: "Flip the board and clear it in as few moves as you can.",
    accent: "#1f6f5b",
    bestLabel: bestLabel,
    mount: mount
  });
})();
