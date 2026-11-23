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

  // Stored best score as a number, or null when nothing is saved yet.
  function getBest(key) {
    const saved = get(key);
    return saved === null || saved === "" ? null : Number(saved);
  }

  // Saves value when it beats the stored best. Returns true if a new best was set.
  function saveBest(key, value, lowerIsBetter) {
    const best = getBest(key);
    const beats = best === null || (lowerIsBetter ? value < best : value > best);
    if (beats) set(key, String(value));
    return beats;
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
  window.Arcade.store = { get: get, set: set, getBest: getBest, saveBest: saveBest };
  window.Arcade.shuffle = shuffle;
})();
