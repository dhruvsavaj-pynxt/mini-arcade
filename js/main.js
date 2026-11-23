// Mounts the game for the current page. Each game has its own static page
// (games/<id>.html) with data-game on <body>; the menu lives in index.html.
(function () {
  const id = document.body.dataset.game;
  const stage = document.getElementById("stage");
  if (!id || !stage) return;

  const game = Arcade.games.filter(function (item) { return item.id === id; })[0];
  if (!game) return;

  const panel = document.createElement("div");
  stage.innerHTML = "";
  stage.appendChild(panel);
  try {
    game.mount(panel);
  } catch (err) {
    panel.innerHTML = '<div class="panel"><p>This game hit a problem. Reload the page or try another game.</p></div>';
    console.error(err);
  }
})();
