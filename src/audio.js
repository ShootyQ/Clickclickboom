(function (root) {
  'use strict';
  class BlobAudio {
    constructor(files, enabled = true, settings = {}, tracks = [], deathTrack = null) {
      this.enabled = enabled;
      const volume = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
      this.sfxVolume = volume(settings.sfxVolume, 0.65);
      this.musicVolume = volume(settings.musicVolume, 0.35);
      this.tracks = tracks;
      this.trackIndex = 0;
      this.musicMode = 'main';
      this.backgrounded = false;
      this.musicStarted = false;
      this.sources = new Set();
      this.generation = 0;
      this.buffers = {};
      this.ready = Promise.resolve();
      try {
        const Context = root.AudioContext || root.webkitAudioContext;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = enabled ? this.sfxVolume : 0;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 8;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
        this.musicGain = this.context.createGain();
        this.musicGain.gain.value = enabled ? this.musicVolume : 0;
        this.musicGain.connect(this.context.destination);
        if (tracks.length) {
          this.music = new Audio();
          this.music.preload = 'none';
          this.music.src = tracks[0].src;
          this.musicSource = this.context.createMediaElementSource(this.music);
          this.musicSource.connect(this.musicGain);
          this.music.addEventListener('ended', () => {
            this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
            this.music.src = this.tracks[this.trackIndex].src;
            this.resumeMusic();
          });
        }
        if (deathTrack && deathTrack.src) {
          this.deathMusic = new Audio();
          // Prepare the short loop before an explosion, without decoding long songs into PCM buffers.
          this.deathMusic.preload = 'auto';
          this.deathMusic.src = deathTrack.src;
          this.deathMusic.loop = true;
          this.deathSource = this.context.createMediaElementSource(this.deathMusic);
          this.deathSource.connect(this.musicGain);
        }
        this.ready = Promise.all(Object.entries(files).map(async ([name, encoded]) => {
          let data;
          if (encoded.startsWith('assets/')) {
            const response = await fetch(encoded);
            if (!response.ok) throw new Error('Sound asset could not load');
            data = await response.arrayBuffer();
          } else {
            data = Uint8Array.from(atob(encoded), character => character.charCodeAt(0)).buffer;
          }
          this.buffers[name] = await this.context.decodeAudioData(data);
        })).catch(() => { this.stop(); this.failed = true; });
      } catch (_) { this.context = null; }
    }
    unlock() {
      if (this.enabled && this.context) this.context.resume().catch(() => {});
      if (this.enabled && !this.backgrounded) {
        this.musicStarted = true;
        this.resumeMusic();
      }
    }
    resumeMusic() {
      const active = this.musicMode === 'death' ? this.deathMusic : this.music;
      if (active && this.musicStarted && this.enabled && !this.backgrounded && this.musicVolume > 0) {
        active.play().catch(() => {});
      }
    }
    pauseMusic() {
      if (this.music) this.music.pause();
      if (this.deathMusic) this.deathMusic.pause();
    }
    startDeathMusic() {
      if (!this.deathMusic) return;
      this.pauseMusic();
      this.musicMode = 'death';
      this.musicStarted = true;
      this.deathMusic.currentTime = 0;
      this.resumeMusic();
    }
    endDeathMusic() {
      if (this.musicMode !== 'death') return;
      if (this.deathMusic) { this.deathMusic.pause(); this.deathMusic.currentTime = 0; }
      this.musicMode = 'main';
      // The regular playlist resumes at its previous position, rather than starting over.
      this.resumeMusic();
    }
    setBackground(hidden) {
      this.backgrounded = hidden;
      if (hidden) {
        this.stop();
        this.pauseMusic();
      } else if (this.musicStarted && this.enabled) {
        if (this.context) this.context.resume().catch(() => {});
        this.resumeMusic();
      }
    }
    setVolume(channel, value) {
      if (!Number.isFinite(value)) return;
      value = Math.max(0, Math.min(1, value));
      if (channel === 'sfx') {
        this.sfxVolume = value;
        if (this.master) this.master.gain.value = this.enabled ? value : 0;
        if (!value) this.stop();
      } else if (channel === 'music') {
        this.musicVolume = value;
        if (this.musicGain) this.musicGain.gain.value = this.enabled ? value : 0;
        if (!value) this.pauseMusic();
      }
      this.unlock();
    }
    setEnabled(enabled) {
      this.enabled = enabled;
      if (!enabled) this.stop();
      if (this.master) this.master.gain.value = enabled ? this.sfxVolume : 0;
      if (this.musicGain) this.musicGain.gain.value = enabled ? this.musicVolume : 0;
      if (!enabled) this.pauseMusic();
      if (enabled) this.unlock();
    }
    play(name, delay = 0) {
      if (!this.enabled || !this.context || this.failed || !this.sfxVolume || this.backgrounded) return;
      const generation = this.generation;
      const when = this.context.currentTime + delay;
      this.ready.then(() => {
        if (!this.enabled || this.backgrounded || !this.sfxVolume || generation !== this.generation || this.failed || !this.buffers[name] || this.context.state !== 'running') return;
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
