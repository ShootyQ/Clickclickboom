(function (root) {
  'use strict';
  function choose(catalog, previousId, random = Math.random) {
    const choices = catalog.filter(story => story.id !== previousId);
    const pool = choices.length ? choices : catalog;
    return { storyId: pool[Math.floor(random() * pool.length)].id, beat: 0 };
  }
  function transitionAt(transitions, bookmark) {
    const saved = bookmark?.transition;
    const entry = transitions.find(item => item.id === saved?.id);
    return entry && Number.isInteger(saved.beat) && saved.beat >= 0 && saved.beat < entry.lines.length ? entry : null;
  }
  function restore(catalog, bookmark, random = Math.random, transitions = []) {
    const story = catalog.find(item => item.id === bookmark?.storyId);
    const restored = story && Number.isInteger(bookmark.beat) && bookmark.beat >= 0 && bookmark.beat < story.beats.length
      ? { storyId: story.id, beat: bookmark.beat }
      : choose(catalog, null, random);
    if (story && bookmark.beat === 0 && transitionAt(transitions, bookmark)) {
      restored.transition = { id: bookmark.transition.id, beat: bookmark.transition.beat };
    }
    return restored;
  }
  function current(catalog, bookmark, transitions = []) {
    const entry = transitionAt(transitions, bookmark);
    if (entry) {
      const text = entry.lines[bookmark.transition.beat];
      return { text, pauseAfterMs: Math.max(1500, 600 + text.split(/\s+/).length * 300) };
    }
    return catalog.find(story => story.id === bookmark.storyId).beats[bookmark.beat];
  }
  function advance(catalog, bookmark, random = Math.random, transitions = []) {
    if (bookmark.transition) {
      const entry = transitionAt(transitions, bookmark);
      if (entry && bookmark.transition.beat + 1 < entry.lines.length) {
        return { ...bookmark, transition: { id: entry.id, beat: bookmark.transition.beat + 1 } };
      }
      return { storyId: bookmark.storyId, beat: bookmark.beat };
    }
    const story = catalog.find(item => item.id === bookmark.storyId);
    if (bookmark.beat + 1 < story.beats.length) return { ...bookmark, beat: bookmark.beat + 1 };
    const next = choose(catalog, bookmark.storyId, random);
    if (transitions.length) next.transition = { id: transitions[Math.floor(random() * transitions.length)].id, beat: 0 };
    return next;
  }
  const api = { choose, restore, current, advance };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BlobStory = api;
})(globalThis);
