(function () {
  const GRID = 16;
  const KEY = "mini-arcade:snake";
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const KEYS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right"
  };

  function bestLabel() {
    const saved = Arcade.store.get(KEY);
    return saved ? "Best " + saved : "No score yet";
  }

  function mount(root) {
    root.innerHTML =
      '<div class="panel">' +
        '<div class="hud"><span>Score <strong id="score">0</strong></span><span>Best <strong id="best">—</strong></span></div>' +
        '<div class="board-wrap">' +
          '<canvas id="board" role="img" aria-label="Snake board"></canvas>' +
          '<div class="overlay" id="overlay" hidden>' +
            '<p class="over-title">That\'s the run</p>' +
            '<p>Score <strong id="final">0</strong></p>' +
            '<button type="button" class="primary" data-restart>Play again</button>' +
          "</div>" +
        "</div>" +
        '<div class="dpad">' +
          '<button type="button" class="up" data-dir="up" aria-label="Up">↑</button>' +
          '<button type="button" class="left" data-dir="left" aria-label="Left">←</button>' +
          '<button type="button" class="down" data-dir="down" aria-label="Down">↓</button>' +
          '<button type="button" class="right" data-dir="right" aria-label="Right">→</button>' +
        "</div>" +
        '<p class="hint">Arrow keys or WASD. On a phone, swipe the board or use the pad.</p>' +
      "</div>";

    const canvas = root.querySelector("#board");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#score");
    const bestEl = root.querySelector("#best");
    const overlay = root.querySelector("#overlay");
    const finalEl = root.querySelector("#final");

    let view = 440;
    let snake = [];
    let dir = DIRS.right;
    let next = DIRS.right;
    let food = null;
    let score = 0;
    let alive = true;
    let looping = true;
    let acc = 0;
    let last = 0;
    let raf = 0;
    let pointer = null;

    function savedBest() {
      return Number(Arcade.store.get(KEY) || 0);
    }

    function paintHud() {
      scoreEl.textContent = String(score);
      const best = savedBest();
      bestEl.textContent = best ? String(best) : "—";
    }

    function sizeCanvas() {
      const css = Math.max(240, Math.min(canvas.parentElement.clientWidth, 440));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = css + "px";
      canvas.style.height = css + "px";
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      view = css;
    }

    function placeFood() {
      const open = [];
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          if (!snake.some(function (part) { return part.x === x && part.y === y; })) {
            open.push({ x: x, y: y });
          }
        }
      }
      food = open.length ? open[Math.floor(Math.random() * open.length)] : null;
    }

    function reset() {
      snake = [{ x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }];
      dir = DIRS.right;
      next = DIRS.right;
      score = 0;
      alive = true;
      acc = 0;
      last = 0;
      overlay.hidden = true;
      placeFood();
      paintHud();
      if (!looping) {
        looping = true;
        raf = requestAnimationFrame(loop);
      }
    }

    function setDir(name) {
      const incoming = DIRS[name];
      if (!incoming) return;
      if (incoming.x === -dir.x && incoming.y === -dir.y) return;
      next = incoming;
    }

    function stepMs() {
      return Math.max(70, 150 - Math.floor(score / 4) * 8);
    }

    function finish() {
      alive = false;
      const best = savedBest();
      if (score > best) Arcade.store.set(KEY, String(score));
      finalEl.textContent = String(score);
      paintHud();
      overlay.hidden = false;
    }

    function step() {
      dir = next;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
        finish();
        return;
      }
      const willEat = food && head.x === food.x && head.y === food.y;
      const body = willEat ? snake : snake.slice(0, -1);
      if (body.some(function (part) { return part.x === head.x && part.y === head.y; })) {
        finish();
        return;
      }
      snake.unshift(head);
      if (willEat) {
        score += 1;
        paintHud();
        placeFood();
        if (!food) finish();
      } else {
        snake.pop();
      }
    }

    function cell(n) {
      return (view / GRID) * n;
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function draw() {
      const gap = Math.max(2, view / GRID * 0.12);
      ctx.fillStyle = "#1a1410";
      ctx.fillRect(0, 0, view, view);
      ctx.fillStyle = "rgba(246, 239, 228, 0.05)";
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          if ((i + j) % 2 === 0) ctx.fillRect(cell(i), cell(j), cell(1), cell(1));
        }
      }
      if (food) {
        ctx.fillStyle = "#ff5a36";
        ctx.beginPath();
        ctx.arc(cell(food.x) + cell(1) / 2, cell(food.y) + cell(1) / 2, cell(1) * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      snake.forEach(function (part, index) {
        ctx.fillStyle = index === 0 ? "#ffe0a3" : "#f2c14e";
        roundRect(cell(part.x) + gap, cell(part.y) + gap, cell(1) - gap * 2, cell(1) - gap * 2, 6);
        ctx.fill();
      });
    }

    function loop(now) {
      if (!looping) return;
      if (!last) last = now;
      acc += now - last;
      last = now;
      if (acc > 500) acc = 500;
      const pace = stepMs();
      while (alive && acc >= pace) {
        acc -= pace;
        step();
      }
      draw();
      if (alive) raf = requestAnimationFrame(loop);
      else looping = false;
    }

    function onKey(event) {
      const name = KEYS[event.key];
      if (!name) return;
      event.preventDefault();
      setDir(name);
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
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "right" : "left");
      else setDir(dy > 0 ? "down" : "up");
    }

    function onClick(event) {
      const dirButton = event.target.closest("[data-dir]");
      if (dirButton) setDir(dirButton.dataset.dir);
      if (event.target.closest("[data-restart]")) reset();
    }

    function onResize() {
      sizeCanvas();
      draw();
    }

    root.addEventListener("click", onClick);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    sizeCanvas();
    reset();
    raf = requestAnimationFrame(loop);

    return function cleanup() {
      looping = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }

  Arcade.games.push({
    id: "snake",
    title: "Snake",
    tag: "Arcade",
    blurb: "Eat, grow, and keep your head off the walls.",
    accent: "#e85d04",
    bestLabel: bestLabel,
    mount: mount
  });
})();
