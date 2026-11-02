(function (root) {
  'use strict';
  const GOAL = 50000;
  const FINISH_ODDS = 5000000;
  // (1 - p)^GOAL = 1 / FINISH_ODDS. expm1 avoids cancellation.
  const EXPLOSION_CHANCE = -Math.expm1(-Math.log(FINISH_ODDS) / GOAL);
  function restore(raw) {
    const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
    const data = raw && typeof raw === 'object' ? raw : {};
    const run = Math.min(integer(data.run), GOAL);
    return { run, best: Math.max(run, integer(data.best)), lifetime: Math.max(run, integer(data.lifetime)), deaths: integer(data.deaths), status: run === GOAL ? 'won' : data.status === 'dead' ? 'dead' : 'alive' };
  }
  function tap(state, random = Math.random) {
    if (state.status !== 'alive') return { state, event: 'ignored' };
    const next = { ...state, lifetime: state.lifetime + 1 };
    if (random() < EXPLOSION_CHANCE) {
      next.run = 0;
      next.deaths++;
      next.status = 'dead';
      return { state: next, event: 'boom', lost: state.run };
    }
    next.run++;
    next.best = Math.max(next.best, next.run);
    next.status = next.run >= GOAL ? 'won' : 'alive';
    return { state: next, event: next.status === 'won' ? 'win' : 'tap' };
  }
  function restart(state) { return { ...state, run: 0, status: 'alive' }; }
  const api = { GOAL, FINISH_ODDS, EXPLOSION_CHANCE, restore, tap, restart };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BlobGame = api;
})(globalThis);
