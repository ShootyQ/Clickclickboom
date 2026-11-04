(function(root) {
  'use strict';
  const CHANCE = 1 / 500;
  const MAX_PER_RUN = 2;
  const CLICK_COOLDOWN = 500;
  function restart(previous = {}) {
    return {count:0, lastStart:null, active:null, lastId:typeof previous.lastId==='string'?previous.lastId:null};
  }
  function restore(catalog, raw) {
    const state = restart();
    if (!raw || typeof raw !== 'object') return state;
    const known = id => catalog.some(rant => rant.id === id);
    state.lastId = known(raw.lastId) ? raw.lastId : null;
    state.count = Number.isInteger(raw.count) && raw.count >= 0 && raw.count <= MAX_PER_RUN ? raw.count : 0;
    state.lastStart = state.count ? (Number.isSafeInteger(raw.lastStart) && raw.lastStart >= 0 ? raw.lastStart : 0) : null;
    const rant = catalog.find(item => item.id === raw.active?.id);
    if (state.count && rant && Number.isInteger(raw.active.line) && raw.active.line >= 0 && raw.active.line < rant.lines.length) {
      state.active = {id:rant.id, line:raw.active.line};
      state.lastId = rant.id;
    }
    return state;
  }
  function eligible(state, run) {
    return !state.active && state.count < MAX_PER_RUN &&
      (state.lastStart === null || run - state.lastStart >= CLICK_COOLDOWN);
  }
  function tryStart(catalog, state, run, random = Math.random) {
    if (!catalog.length || !eligible(state, run) || random() >= CHANCE) return state;
    const different = catalog.filter(rant => rant.id !== state.lastId);
    const choices = different.length ? different : catalog;
    const selected = choices[Math.floor(random() * choices.length)];
    return {count:state.count+1, lastStart:run, lastId:selected.id, active:{id:selected.id, line:0}};
  }
  function current(catalog, state) {
    const rant = catalog.find(item => item.id === state.active?.id);
    return rant ? {text:rant.lines[state.active.line], line:state.active.line+1, total:rant.lines.length} : null;
  }
  function advance(catalog, state) {
    const rant = catalog.find(item => item.id === state.active?.id);
    if (!rant) return state;
    const line = state.active.line + 1;
    return {...state, active:line < rant.lines.length ? {id:rant.id, line} : null};
  }
  function cancel(state) { return {...state, active:null}; }
  const api = {CHANCE, MAX_PER_RUN, CLICK_COOLDOWN, restart, restore, eligible, tryStart, current, advance, cancel};
  if (typeof module !== 'undefined') module.exports = api;
  else root.BlobHappy = api;
})(globalThis);
