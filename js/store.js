(function () {
  function get(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      /* Private browsing can block storage. Scores still work for the session. */
    }
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const hold = copy[i];
      copy[i] = copy[j];
      copy[j] = hold;
    }
    return copy;
  }

  window.Arcade = window.Arcade || { games: [] };
  window.Arcade.store = { get: get, set: set };
  window.Arcade.shuffle = shuffle;
})();
