(function (root) {
  'use strict';
  class BlobAudio {
    constructor(files, enabled = true) {
      this.enabled = enabled;
      this.sources = new Set();
      this.generation = 0;
      this.buffers = {};
      this.ready = Promise.resolve();
      try {
        const Context = root.AudioContext || root.webkitAudioContext;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = enabled ? 1 : 0;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 8;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
        this.ready = Promise.all(Object.entries(files).map(async ([name, encoded]) => {
          const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
          this.buffers[name] = await this.context.decodeAudioData(bytes.buffer);
        })).catch(() => { this.stop(); this.failed = true; });
      } catch (_) { this.context = null; }
    }
    unlock() {
      if (this.enabled && this.context) this.context.resume().catch(() => {});
    }
    setEnabled(enabled) {
      this.enabled = enabled;
      if (!enabled) this.stop();
      if (this.master) this.master.gain.value = enabled ? 1 : 0;
      if (enabled) this.unlock();
    }
    play(name, delay = 0) {
      if (!this.enabled || !this.context || this.failed) return;
      const generation = this.generation;
      const when = this.context.currentTime + delay;
      this.ready.then(() => {
        if (!this.enabled || generation !== this.generation || this.failed || !this.buffers[name] || this.context.state !== 'running') return;
        // Bound rapid-tap overlap; scheduled explosion sounds are also cancellable.
        if (this.sources.size >= 6) {
          const oldest = this.sources.values().next().value;
          oldest.stop();
          this.sources.delete(oldest);
        }
        const source = this.context.createBufferSource();
        source.buffer = this.buffers[name];
        source.connect(this.master);
        source.onended = () => { this.sources.delete(source); source.disconnect(); };
        this.sources.add(source);
        source.start(Math.max(this.context.currentTime, when));
      });
    }
    stop() {
      this.generation++;
      for (const source of this.sources) { try { source.stop(); } catch (_) {} }
      this.sources.clear();
    }
  }
  root.BlobAudio = BlobAudio;
})(globalThis);
