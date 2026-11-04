(function (root) {
  'use strict';
  const LOW_NUMBER_CHANCE = 1 / 10;
  const LOW_NUMBER_MAX = 1000;
  const COOLDOWN_MS = 4500;
  function restore(catalog, raw) {
    const recent = {};
    if (!raw || typeof raw !== 'object') return recent;
    for (const number of Object.keys(catalog)) {
      const index = raw[number];
      if (Number.isInteger(index) && index >= 0 && index < catalog[number].length) recent[number] = index;
    }
    return recent;
  }
  function select(catalog, number, recent = {}, random = Math.random) {
    if (!Object.hasOwn(catalog, number)) return null;
    if (number <= LOW_NUMBER_MAX && random() >= LOW_NUMBER_CHANCE) return null;
    const lines = catalog[number];
    const choices = lines.map((_, index) => index).filter(index => index !== recent[number]);
    const index = choices[Math.floor(random() * choices.length)];
    return { number, index, text: lines[index] };
  }
  const api = { LOW_NUMBER_CHANCE, LOW_NUMBER_MAX, COOLDOWN_MS, restore, select };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BlobMilestones = api;
})(globalThis);
