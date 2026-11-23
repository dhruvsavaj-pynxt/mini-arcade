(function () {
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function winnerOf(board) {
    for (let i = 0; i < LINES.length; i++) {
      const line = LINES[i];
      const mark = board[line[0]];
      if (mark && mark === board[line[1]] && mark === board[line[2]]) return { mark: mark, line: line };
    }
    if (board.every(Boolean)) return { mark: "draw", line: [] };
    return null;
  }

  function findWinningMove(board, player) {
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = player;
      const won = winnerOf(board) && winnerOf(board).mark === player;
      board[i] = "";
      if (won) return i;
    }
    return null;
  }

  function aiMove(board) {
    const win = findWinningMove(board, "O");
    if (win !== null) return win;
    const block = findWinningMove(board, "X");
    if (block !== null) return block;
    if (!board[4]) return 4;
    const corners = [0, 2, 6, 8].filter(function (index) { return !board[index]; });
    const pool = corners.length ? corners : board.map(function (cell, index) { return cell ? null : index; }).filter(function (index) { return index !== null; });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function mount(root) {
    root.innerHTML =
      '<div class="panel">' +
        '<p class="status" id="status" aria-live="polite"></p>' +
        '<div class="ttt-grid" id="grid"></div>' +
        '<div class="actions"><button type="button" class="primary" data-restart>New game</button></div>' +
        '<p class="hint">You are X. The computer takes a win when it sees one, and blocks yours.</p>' +
      "</div>";

    const grid = root.querySelector("#grid");
    const status = root.querySelector("#status");
    let board = [];
    let over = false;
    let locked = false;
    let line = [];
    let timer = 0;

    function paint(message) {
      status.textContent = message;
      Array.prototype.forEach.call(grid.children, function (button, index) {
        button.textContent = board[index];
        button.disabled = Boolean(board[index]) || over || locked;
        button.classList.toggle("x", board[index] === "X");
        button.classList.toggle("o", board[index] === "O");
        button.classList.toggle("win", line.indexOf(index) !== -1);
      });
    }

    function fresh() {
      clearTimeout(timer);
      board = ["", "", "", "", "", "", "", "", ""];
      over = false;
      locked = false;
      line = [];
      paint("Your turn. You are X.");
    }

    function settle() {
      const result = winnerOf(board);
      if (!result) return false;
      over = true;
      locked = false;
      line = result.line;
      if (result.mark === "X") paint("You win.");
      else if (result.mark === "O") paint("Computer wins.");
      else paint("Draw.");
      return true;
    }

    function choose(index) {
      if (locked || over || board[index]) return;
      board[index] = "X";
      if (settle()) return;
      locked = true;
      paint("Thinking…");
      timer = setTimeout(function () {
        const move = aiMove(board);
        if (move === undefined || move === null) {
          locked = false;
          paint("Draw.");
          over = true;
          return;
        }
        board[move] = "O";
        locked = false;
        if (!settle()) paint("Your turn.");
      }, 320);
    }

    grid.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.i = String(i);
      button.setAttribute("aria-label", "Square " + (i + 1));
      grid.appendChild(button);
    }

    root.addEventListener("click", function (event) {
      const square = event.target.closest("[data-i]");
      if (square) choose(Number(square.dataset.i));
      if (event.target.closest("[data-restart]")) fresh();
    });

    fresh();

    return function cleanup() {
      clearTimeout(timer);
    };
  }

  Arcade.games.push({
    id: "tictactoe",
    title: "Tic-Tac-Toe",
    tag: "Classic",
    blurb: "You go first. It grabs wins and blocks yours.",
    accent: "#2c5aa0",
    bestLabel: function () { return "You play X"; },
    mount: mount
  });
})();
