(function () {
  const KEY = "mini-arcade:2048";
  const SIZE = 4;
  const TILE_COLORS = {
    2: "#f6e7cf",
    4: "#f2d9a6",
    8: "#f2b07a",
    16: "#eb8a4f",
    32: "#e7683c",
    64: "#d9472c",
    128: "#f2c14e",
    256: "#f2bb3c",
    512: "#f0b02a",
    1024: "#eda625",
    2048: "#e8a01f"
  };
  const DARK_TILES = [16, 32, 64];

  function bestLabel() {
    const saved = Arcade.store.get(KEY);
    return saved ? "Best " + saved : "No score yet";
  }

  function emptyGrid() {
    const rows = [];
    for (let r = 0; r < SIZE; r++) rows.push([0, 0, 0, 0]);
    return rows;
  }

  // Slide one line toward index 0 and merge equal neighbours once per move.
  function slideLine(values) {
    const tiles = values.filter(function (v) { return v; });
    const out = [];
    let gained = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === tiles[i + 1]) {
        out.push(tiles[i] * 2);
        gained += tiles[i] * 2;
        i++;
      } else {
        out.push(tiles[i]);
      }
    }
    while (out.length < SIZE) out.push(0);
    return { line: out, gained: gained };
  }

  function mount(root) {
    root.innerHTML =
      '<div class="panel">' +
        '<div class="hud"><span>Score <strong id="score">0</strong></span><span>Best <strong id="best">—</strong></span></div>' +
        '<div class="board-wrap">' +
          '<div class="g2048" id="board" role="grid" aria-label="2048 board"></div>' +
          '<div class="overlay" id="overlay" hidden>' +
            '<p class="over-title" id="over-title"></p>' +
            '<p id="over-note"></p>' +
            '<button type="button" class="primary" id="over-btn" data-action="restart">Play again</button>' +
          "</div>" +
        "</div>" +
        '<div class="dpad">' +
          '<button type="button" class="up" data-dir="up" aria-label="Up">↑</button>' +
          '<button type="button" class="left" data-dir="left" aria-label="Left">←</button>' +
          '<button type="button" class="down" data-dir="down" aria-label="Down">↓</button>' +
          '<button type="button" class="right" data-dir="right" aria-label="Right">→</button>' +
        "</div>" +
        '<p class="hint">Arrow keys or WASD. Swipe the board or use the pad. Slide tiles together to merge them.</p>' +
      "</div>";

    const board = root.querySelector("#board");
    const scoreEl = root.querySelector("#score");
    const bestEl = root.querySelector("#best");
    const overlay = root.querySelector("#overlay");
    const overTitle = root.querySelector("#over-title");
    const overNote = root.querySelector("#over-note");
    const overBtn = root.querySelector("#over-btn");

    let grid = emptyGrid();
    let score = 0;
    let won = false;
    let pointer = null;

    function savedBest() {
      return Number(Arcade.store.get(KEY) || 0);
    }

    function paint() {
      scoreEl.textContent = String(score);
      const best = savedBest();
      bestEl.textContent = best ? String(best) : "—";
      board.innerHTML = grid.map(function (row) {
        return row.map(function (value) {
          if (!value) return '<div class="slot" role="gridcell"></div>';
          const bg = TILE_COLORS[value] || "#2c5aa0";
          const ink = DARK_TILES.indexOf(value) !== -1 || value > 2048 ? "#fffaf3" : "#241c15";
          const size = String(value).length > 3 ? " big" : "";
          return '<div class="slot' + size + '" role="gridcell" style="background:' + bg + ";color:" + ink + '">' + value + "</div>";
        }).join("");
      }).join("");
    }

    function showOverlay(action, title, note, label) {
      overlay.hidden = false;
      overTitle.textContent = title;
      overNote.textContent = note;
      overBtn.textContent = label;
      overBtn.dataset.action = action;
    }

    function addTile() {
      const empty = [];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!grid[r][c]) empty.push([r, c]);
        }
      }
      if (!empty.length) return;
      const spot = empty[Math.floor(Math.random() * empty.length)];
      grid[spot[0]][spot[1]] = Math.random() < 0.9 ? 2 : 4;
    }

    function movesLeft() {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const v = grid[r][c];
          if (!v) return true;
          if (r < SIZE - 1 && grid[r + 1][c] === v) return true;
          if (c < SIZE - 1 && grid[r][c + 1] === v) return true;
        }
      }
      return false;
    }

    function newGame() {
      grid = emptyGrid();
      score = 0;
      won = false;
      overlay.hidden = true;
      addTile();
      addTile();
      paint();
    }

    function move(dir) {
      if (!overlay.hidden) return;
      const before = JSON.stringify(grid);
      let gained = 0;
      for (let k = 0; k < SIZE; k++) {
        const coords = [];
        for (let j = 0; j < SIZE; j++) {
          if (dir === "left") coords.push([k, j]);
          else if (dir === "right") coords.push([k, SIZE - 1 - j]);
          else if (dir === "up") coords.push([j, k]);
          else coords.push([SIZE - 1 - j, k]);
        }
        const result = slideLine(coords.map(function (p) { return grid[p[0]][p[1]]; }));
        result.line.forEach(function (value, j) {
          grid[coords[j][0]][coords[j][1]] = value;
        });
        gained += result.gained;
      }
      if (JSON.stringify(grid) === before) return;

      score += gained;
      if (score > savedBest()) Arcade.store.set(KEY, String(score));
      addTile();

      if (!movesLeft()) {
        showOverlay("restart", "No moves left", "Final score " + score + ".", "Play again");
      } else if (!won && grid.some(function (row) { return row.indexOf(2048) !== -1; })) {
        won = true;
        showOverlay("continue", "2048!", "You made it. Keep going for a higher score?", "Keep going");
      }
      paint();
    }

    function onClick(event) {
      const dirButton = event.target.closest("[data-dir]");
      if (dirButton) move(dirButton.dataset.dir);
      const action = event.target.closest("[data-action]");
      if (action) {
        if (action.dataset.action === "continue") overlay.hidden = true;
        else newGame();
      }
    }

    function onPointerDown(event) {
      pointer = { x: event.clientX, y: event.clientY };
    }

    function onPointerUp(event) {
      if (!pointer) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer = null;
      if (Math.hypot(dx, dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }

    const KEYS = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", a: "left", s: "down", d: "right",
      W: "up", A: "left", S: "down", D: "right"
    };

    function onKey(event) {
      const dir = KEYS[event.key];
      if (!dir) return;
      event.preventDefault();
      move(dir);
    }

    root.addEventListener("click", onClick);
    board.addEventListener("pointerdown", onPointerDown);
    board.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKey);

    newGame();

    return function cleanup() {
      window.removeEventListener("keydown", onKey);
    };
  }

  Arcade.games.push({
    id: "2048",
    title: "2048",
    tag: "Puzzle",
    blurb: "Slide and merge tiles until one reaches 2048.",
    accent: "#c9861a",
    bestLabel: bestLabel,
    mount: mount
  });
})();
