(function (root) {
  'use strict';
  const animations = {
    idle: {frames: [0, 1, 2, 3, 4, 5], ms: 150},
    tap: {duration: 390},
    boom: {frames: [18, 19, 20, 21, 22, 23], ms: 130}
  };
  function elapsed(now, started) {
    // rAF timestamps can precede the performance.now() recorded by a recent tap.
    return Number.isFinite(now) && Number.isFinite(started) ? Math.max(0, now - started) : 0;
  }
  function sample(mode, now, started, rest = 'idle', reduced = false) {
    if (!animations[mode]) mode = 'idle';
    // Every living pose stays cheerful, including legacy mood requests.
    rest = 'idle';
    if (mode === 'tap' && elapsed(now, started) >= animations.tap.duration) {
      started += animations.tap.duration;
      mode = rest;
    }
    if (mode === 'boom') {
      const frame = animations.boom.frames[Math.min(5, Math.floor(elapsed(now, started) / 130))];
      return {mode, started, frame};
    }
    // The face's resting cadence never restarts on a tap. Squash is continuous
    // geometry below, so there is no tap/idle image swap or crossfaded ghost face.
    const mood = mode === 'tap' ? rest : mode;
    const animation = animations[mood];
    const clock = Number.isFinite(now) ? Math.max(0, now) : 0;
    const index = reduced ? 0 : Math.floor(clock / animation.ms) % animation.frames.length;
    if (reduced && mode === 'tap') mode = rest;
    return {mode, started, frame: animation.frames[index]};
  }
  class Squish {
    constructor() { this.reset(); }
    reset(now = null) { this.amount = 0; this.velocity = 0; this.time = now; }
    advance(now) {
      if (!Number.isFinite(now)) return;
      if (this.time === null) { this.time = now; return; }
      const delta = elapsed(now, this.time);
      if (!delta) return;
      this.time = now;
      // A hidden/backgrounded WebView should return settled, without a huge jump.
      if (delta > 250) { this.reset(now); return; }
      const steps = Math.ceil(delta / 4), dt = delta / steps / 1000;
      for (let i = 0; i < steps; i++) {
        this.velocity += (-220 * this.amount - 19 * this.velocity) * dt;
        this.amount += this.velocity * dt;
        if (this.amount > 0.9) { this.amount = 0.9; this.velocity = Math.min(0, this.velocity); }
        if (this.amount < -0.13) { this.amount = -0.13; this.velocity = Math.max(0, this.velocity); }
      }
      if (Math.abs(this.amount) < 0.0005 && Math.abs(this.velocity) < 0.01) this.reset(now);
    }
    tap(now) { this.advance(now); this.velocity = Math.min(24, Math.max(0, this.velocity) + 18); }
    scale() {
      const y = 1 - this.amount * 0.28;
      return {x: Math.min(1.12, 1 / Math.sqrt(y)), y};
    }
  }
  class Renderer {
    constructor(canvas, sheet) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
      this.sheet = sheet;
      this.buffer = root.document.createElement('canvas');
      this.buffer.width = canvas.width;
      this.buffer.height = canvas.height;
      this.bufferContext = this.buffer.getContext('2d');
      this.squish = new Squish();
      this.hasFrame = false;
    }
    tap(now) { this.squish.tap(now); }
    reset(now) { this.squish.reset(now); }
    draw(pose, now, reduced = false) {
      if (!this.sheet.complete || !this.sheet.naturalWidth
          || !Number.isInteger(pose.frame) || pose.frame < 0 || pose.frame > 23) return false;
      if (reduced || pose.mode === 'boom') this.squish.reset(now);
      else this.squish.advance(now);
      const c = this.bufferContext, width = this.sheet.naturalWidth / 6, height = this.sheet.naturalHeight / 4;
      const scale = this.squish.scale(), anchorX = this.canvas.width / 2, anchorY = this.canvas.height * 0.9;
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.save();
      c.translate(anchorX, anchorY);
      c.scale(scale.x, scale.y);
      c.translate(-anchorX, -anchorY);
      c.drawImage(this.sheet, (pose.frame % 6) * width, Math.floor(pose.frame / 6) * height,
        width, height, 0, 0, this.canvas.width, this.canvas.height);
      c.restore();
      // Present the complete, fully colored image in one operation. A bad frame
      // never clears the visible canvas and no overlapping poses fade its edges.
      this.context.globalCompositeOperation = 'copy';
      this.context.drawImage(this.buffer, 0, 0);
      this.context.globalCompositeOperation = 'source-over';
      this.hasFrame = true;
      return true;
    }
  }
  const api = {animations, elapsed, sample, Squish, Renderer};
  if (typeof module !== 'undefined') module.exports = api;
  else root.BlobAnimation = api;
})(globalThis);
