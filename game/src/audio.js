// Every sound in the game, synthesised with WebAudio: no audio files, no network.
// The kitchen hums while the grill is busy; everything else is a short cue.
export function createAudio() {
  let context = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freq, seconds, type, gainValue, when = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noiseBurst(seconds, gainValue, filterFreq) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.setSizzle(false);
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.12);
      tone(780, 0.07, 'sine', 0.08, 0.05);
    },
    place() {
      tone(220, 0.09, 'triangle', 0.14);
      noiseBurst(0.05, 0.06, 900);
    },
    chop() {
      noiseBurst(0.07, 0.22, 1400);
      tone(180, 0.06, 'square', 0.06);
    },
    chopDone() {
      tone(660, 0.09, 'sine', 0.12);
      tone(990, 0.1, 'sine', 0.1, 0.07);
    },
    grillOn() {
      noiseBurst(0.15, 0.1, 2400);
    },
    ready() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1174, 0.14, 'sine', 0.1, 0.09);
    },
    serve() {
      tone(523, 0.1, 'triangle', 0.16);
      tone(659, 0.1, 'triangle', 0.16, 0.09);
      tone(784, 0.18, 'triangle', 0.18, 0.18);
    },
    error() {
      tone(160, 0.16, 'sawtooth', 0.1);
      tone(120, 0.2, 'sawtooth', 0.08, 0.1);
    },
    expired() {
      tone(392, 0.14, 'triangle', 0.12);
      tone(311, 0.22, 'triangle', 0.12, 0.12);
    },
    tick() {
      tone(980, 0.05, 'square', 0.05);
    },
    fanfare() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.15, i * 0.11));
    },
    /** A looping grill hiss while any patty cooks; call every frame with true/false. */
    setSizzle(on) {
      const ctx = ensure();
      if (ctx === null) return;
      if (on && !sizzle) {
        const length = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 3200;
        const gain = ctx.createGain();
        gain.gain.value = muted ? 0 : 0.035;
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
        sizzle = { source, gain };
      } else if (!on && sizzle) {
        try {
          sizzle.source.stop();
        } catch {
          // Already stopped.
        }
        sizzle = null;
      } else if (sizzle) {
        sizzle.gain.gain.value = muted ? 0 : 0.035;
      }
    },
  };
}
