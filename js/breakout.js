(function () {
  const KEY = "mini-arcade:breakout";
  const W = 440;
  const H = 500;
  const COLS = 8;
  const ROWS = 5;
  const BRICK_H = 16;
  const GAP = 6;
  const TOP = 56;
  const BRICK_W = (W - GAP * (COLS + 1)) / COLS;
  const PADDLE_W = 88;
  const PADDLE_H = 12;
  const PADDLE_Y = H - 36;
  const BALL_R = 7;
  const SPEED = 320;
  const COLORS = ["#c43b5a", "#e85d04", "#f2c14e", "#1f6f5b", "#2c5aa0"];

  function bestLabel() {
    const best = Arcade.store.getBest(KEY);
    return best !== null ? "Best " + best : "No score yet";
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function mount(root) {
    root.innerHTML =
      '<div class="panel">' +
        '<div class="hud"><span>Score <strong id="score">0</strong></span><span>Balls <strong id="lives">3</strong></span><span>Best <strong id="best">—</strong></span></div>' +
        '<div class="board-wrap">' +
          '<canvas id="board" role="img" aria-label="Breakout board"></canvas>' +
          '<div class="overlay" id="overlay" hidden>' +
            '<p class="over-title" id="over-title">Breakout</p>' +
            '<p id="over-note"></p>' +
            '<button type="button" class="primary" data-restart id="over-btn">Start</button>' +
          "</div>" +
        "</div>" +
        '<p class="hint" id="hint">Move the paddle, then launch the ball.</p>' +
      "</div>";

    const canvas = root.querySelector("#board");
    const ctx = canvas.getContext("2d");
    const scoreEl = root.querySelector("#score");
    const livesEl = root.querySelector("#lives");
    const bestEl = root.querySelector("#best");
    const overlay = root.querySelector("#overlay");
    const overTitle = root.querySelector("#over-title");
    const overNote = root.querySelector("#over-note");
    const actionBtn = root.querySelector("#over-btn");
    const hint = root.querySelector("#hint");

    let state = "start";
    let bricks = [];
    let paddleX = (W - PADDLE_W) / 2;
    let ball = { x: 0, y: 0, vx: 0, vy: 0 };
    let score = 0;
    let lives = 3;
    let scale = 1;
    let last = 0;
    let raf = 0;
    let looping = true;
    let keyDir = 0;

    function savedBest() {
      return Arcade.store.getBest(KEY) || 0;
    }

    function paintHud() {
      scoreEl.textContent = String(score);
      livesEl.textContent = String(lives);
      const best = savedBest();
      bestEl.textContent = best ? String(best) : "—";
    }

    function sizeCanvas() {
      const cssW = Math.max(240, Math.min(canvas.parentElement.clientWidth, W));
      const cssH = Math.round(cssW * H / W);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      scale = canvas.width / W;
    }

    function buildBricks() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          bricks.push({
            x: GAP + c * (BRICK_W + GAP),
            y: TOP + r * (BRICK_H + GAP),
            color: COLORS[r],
            alive: true
          });
        }
      }
    }

    function resetBall() {
      ball = { x: paddleX + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 };
    }

    function setState(next, title, note) {
      state = next;
      const idle = next === "start" || next === "over" || next === "won";
      overlay.hidden = !idle;
      if (idle) {
        overTitle.textContent = title;
        overNote.textContent = note;
        actionBtn.textContent = next === "start" ? "Start" : "Play again";
      }
      if (next === "stuck") hint.textContent = "Click, tap or press Space to launch the ball.";
      else hint.textContent = "Move with the mouse, touch, or ← →. Clear every brick.";
    }

    function newGame() {
      score = 0;
      lives = 3;
      buildBricks();
      paddleX = (W - PADDLE_W) / 2;
      resetBall();
      paintHud();
      setState("stuck");
    }

    function launch() {
      if (state !== "stuck") return;
      const vx = (Math.random() < 0.5 ? -1 : 1) * SPEED * 0.3;
      ball.vx = vx;
      ball.vy = -Math.sqrt(SPEED * SPEED - vx * vx);
      setState("play");
    }

    function finish(kind) {
      Arcade.store.saveBest(KEY, score, false);
      paintHud();
      if (kind === "won") setState("won", "Board cleared", "Score " + score + ". Well played.");
      else setState("over", "Out of balls", "Score " + score + ".");
    }

    function update(dt) {
      if (keyDir) paddleX = clamp(paddleX + keyDir * 420 * dt, 0, W - PADDLE_W);
      if (state === "stuck") {
        resetBall();
        return;
      }
      if (state !== "play") return;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

      // Paddle: the angle depends on where the ball hits it.
      if (
        ball.vy > 0 &&
        ball.y + BALL_R >= PADDLE_Y &&
        ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 8 &&
        ball.x >= paddleX - BALL_R &&
        ball.x <= paddleX + PADDLE_W + BALL_R
      ) {
        const rel = clamp((ball.x - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2), -1, 1);
        ball.vx = rel * SPEED * 0.75;
        ball.vy = -Math.sqrt(Math.max(1, SPEED * SPEED - ball.vx * ball.vx));
        ball.y = PADDLE_Y - BALL_R;
      }

      // Bricks: one hit per frame, bounce on the side the ball came from.
      for (let i = 0; i < bricks.length; i++) {
        const brick = bricks[i];
        if (!brick.alive) continue;
        if (
          ball.x + BALL_R < brick.x ||
          ball.x - BALL_R > brick.x + BRICK_W ||
          ball.y + BALL_R < brick.y ||
          ball.y - BALL_R > brick.y + BRICK_H
        ) continue;
        brick.alive = false;
        score += 10;
        if (ball.x < brick.x || ball.x > brick.x + BRICK_W) ball.vx = -ball.vx;
        else ball.vy = -ball.vy;
        paintHud();
        break;
      }

      if (bricks.every(function (brick) { return !brick.alive; })) {
        finish("won");
        return;
      }

      if (ball.y - BALL_R > H) {
        lives -= 1;
        paintHud();
        if (lives <= 0) {
          finish("over");
          return;
        }
        resetBall();
        setState("stuck");
      }
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
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = "#1a1410";
      ctx.fillRect(0, 0, W, H);

      bricks.forEach(function (brick) {
        if (!brick.alive) return;
        ctx.fillStyle = brick.color;
        roundRect(brick.x, brick.y, BRICK_W, BRICK_H, 4);
        ctx.fill();
      });

      ctx.fillStyle = "#f6efe4";
      roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
      ctx.fill();

      ctx.fillStyle = "#ffe0a3";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop(now) {
      if (!looping) return;
      const dt = last ? Math.min(0.032, (now - last) / 1000) : 0;
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function toLogicalX(clientX) {
      const rect = canvas.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * W;
    }

    function onPointerMove(event) {
      paddleX = clamp(toLogicalX(event.clientX) - PADDLE_W / 2, 0, W - PADDLE_W);
    }

    function onPointerDown(event) {
      onPointerMove(event);
      launch();
    }

    function onKeyDown(event) {
      if (event.key === "ArrowLeft") {
        keyDir = -1;
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        keyDir = 1;
        event.preventDefault();
      } else if (event.key === " " && state === "stuck") {
        event.preventDefault();
        launch();
      }
    }

    function onKeyUp(event) {
      if (event.key === "ArrowLeft" && keyDir === -1) keyDir = 0;
      if (event.key === "ArrowRight" && keyDir === 1) keyDir = 0;
    }

    function onClick(event) {
      if (event.target.closest("[data-restart]")) newGame();
    }

    function onResize() {
      sizeCanvas();
      draw();
    }

    root.addEventListener("click", onClick);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    sizeCanvas();
    buildBricks();
    resetBall();
    paintHud();
    setState("start", "Breakout", "Steer the paddle and keep the ball in play.");
    draw();
    raf = requestAnimationFrame(loop);

    return function cleanup() {
      looping = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
    };
  }

  Arcade.games.push({
    id: "breakout",
    title: "Breakout",
    tag: "Arcade",
    blurb: "Bounce the ball off your paddle and clear the wall of bricks.",
    accent: "#4f6d2a",
    bestLabel: bestLabel,
    mount: mount
  });
})();
