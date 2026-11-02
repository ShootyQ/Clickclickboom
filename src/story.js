(function (root) {
  'use strict';
  function choose(catalog, previousId, random = Math.random) {
    const choices = catalog.filter(story => story.id !== previousId);
    const pool = choices.length ? choices : catalog;
    return { storyId: pool[Math.floor(random() * pool.length)].id, beat: 0 };
  }
  function restore(catalog, bookmark, random = Math.random) {
    const story = catalog.find(item => item.id === bookmark?.storyId);
    return story && Number.isInteger(bookmark.beat) && bookmark.beat >= 0 && bookmark.beat < story.beats.length
      ? { storyId: story.id, beat: bookmark.beat }
      : choose(catalog, null, random);
  }
  function current(catalog, bookmark) {
    return catalog.find(story => story.id === bookmark.storyId).beats[bookmark.beat];
  }
  function advance(catalog, bookmark, random = Math.random) {
    const story = catalog.find(item => item.id === bookmark.storyId);
    return bookmark.beat + 1 < story.beats.length
      ? { ...bookmark, beat: bookmark.beat + 1 }
      : choose(catalog, bookmark.storyId, random);
  }
  const api = { choose, restore, current, advance };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BlobStory = api;
})(globalThis);
