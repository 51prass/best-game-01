// Every sound is synthesized with WebAudio — no audio files, no network. The context is
// created lazily on the first user gesture (browsers forbid sound before one), every call
// is guarded, and M toggles a master mute. In a headless screenshot run there is no gesture,
// so the game simply stays silent and never crashes.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let lastShardAt = 0;
  let lastZapAt = 0;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context !== null;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      context = new AC();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  /** A short oscillator blip that slides from `from` to `to` hertz. */
  function blip(type, from, to, seconds, volume, when = 0) {
    if (!ensure()) return;
    try {
      const t0 = context.currentTime + when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, from), t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  /** A short burst of filtered noise, for impacts and bursts. */
  function noise(seconds, volume, frequency) {
    if (!ensure()) return;
    try {
      const t0 = context.currentTime;
      const length = Math.max(1, Math.floor(context.sampleRate * seconds));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(t0);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Call from any user gesture so the browser unlocks sound. */
    unlock() {
      ensure();
    },
    get isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** The beam's tick while it burns, throttled so it stays a hum, not a stutter. */
    zap(now) {
      if (now - lastZapAt < 0.14) return;
      lastZapAt = now;
      blip('sawtooth', 920, 420, 0.07, 0.05);
    },
    kill() {
      blip('sine', 320, 80, 0.14, 0.22);
      noise(0.1, 0.14, 900);
    },
    shard(now) {
      if (now - lastShardAt < 0.09) return;
      lastShardAt = now;
      blip('sine', 1320, 1760, 0.06, 0.08);
    },
    breach() {
      blip('square', 170, 110, 0.35, 0.2);
      blip('square', 120, 80, 0.4, 0.16, 0.12);
      noise(0.25, 0.18, 500);
    },
    horn() {
      blip('sawtooth', 110, 110, 0.8, 0.14);
      blip('sawtooth', 165, 165, 0.8, 0.1);
      blip('sawtooth', 220, 220, 0.7, 0.07);
    },
    buy() {
      blip('sine', 660, 660, 0.09, 0.16);
      blip('sine', 990, 990, 0.14, 0.16, 0.09);
    },
    denied() {
      blip('square', 220, 180, 0.1, 0.1);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => blip('sine', freq, freq, 0.3, 0.18, i * 0.14));
    },
    lose() {
      [392, 330, 262, 196].forEach((freq, i) => blip('triangle', freq, freq * 0.94, 0.34, 0.16, i * 0.17));
    },
  };
}
