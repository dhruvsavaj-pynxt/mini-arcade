(function () {
  const KEY = "mini-arcade:reaction";

  function bestLabel() {
    const best = Arcade.store.getBest(KEY);
    return best !== null ? "Best " + best + " ms" : "No score yet";
  }

  function mount(root) {
    root.innerHTML =
      '<div class="panel">' +
        '<div class="hud"><span>Last <strong id="last">—</strong></span><span>Best <strong id="best">—</strong></span></div>' +
        '<button type="button" class="pad" id="pad" data-state="idle">Tap to start</button>' +
        '<p class="hint" id="hint">Wait until the pad turns green, then tap as fast as you can.</p>' +
      "</div>";

    const pad = root.querySelector("#pad");
    const hint = root.querySelector("#hint");
    const lastEl = root.querySelector("#last");
    const bestEl = root.querySelector("#best");
    let state = "idle";
    let timer = 0;
    let started = 0;

    function showBest() {
      const best = Arcade.store.getBest(KEY);
      bestEl.textContent = best !== null ? best + " ms" : "—";
    }

    function render() {
      pad.dataset.state = state;
      if (state === "idle") pad.textContent = "Tap to start";
      if (state === "wait") pad.textContent = "Wait…";
      if (state === "go") pad.textContent = "Tap";
      if (state === "early") pad.textContent = "Too soon";
      if (state === "result") pad.textContent = Math.round(started) + " ms";
    }

    function arm() {
      clearTimeout(timer);
      state = "wait";
      hint.textContent = "Stay ready. Green means go.";
      render();
      const delay = 1100 + Math.random() * 2800;
      timer = setTimeout(function () {
        state = "go";
        started = performance.now();
        hint.textContent = "Now.";
        render();
      }, delay);
    }

    function tooSoon() {
      clearTimeout(timer);
      state = "early";
      hint.textContent = "That one doesn't count. Tap to try again.";
      render();
    }

    function finish() {
      const ms = performance.now() - started;
      started = ms;
      state = "result";
      lastEl.textContent = Math.round(ms) + " ms";
      Arcade.store.saveBest(KEY, Math.round(ms), true);
      showBest();
      hint.textContent = "Tap the pad to go again.";
      render();
    }

    pad.addEventListener("click", function () {
      if (state === "wait") tooSoon();
      else if (state === "go") finish();
      else arm();
    });

    showBest();
    render();

    return function cleanup() {
      clearTimeout(timer);
    };
  }

  Arcade.games.push({
    id: "reaction",
    title: "Quick Tap",
    tag: "Reflex",
    blurb: "Wait for green, then tap. Early taps don't count.",
    accent: "#c43b5a",
    bestLabel: bestLabel,
    mount: mount
  });
})();
