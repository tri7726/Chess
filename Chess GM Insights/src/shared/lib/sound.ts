let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function playChessSound(
  type:
    | "move"
    | "capture"
    | "check"
    | "victory"
    | "brilliant"
    | "blunder"
    | "castle"
    | "promote"
    | "game-over"
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;

  switch (type) {
    case "move": {
      // Synthesized Wood Tap (exponential decay sine wave)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
      break;
    }
    case "capture": {
      // Wood Clack (Triangle click + Noise burst)
      // 1. Transient click
      const osc = ctx.createOscillator();
      const clickGain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);

      clickGain.gain.setValueAtTime(0.4, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(clickGain);
      clickGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);

      // 2. High pass noise burst
      try {
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1200;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.04);
      } catch {
        // Fallback if buffer creation fails
      }
      break;
    }
    case "check": {
      // High alarm double chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(440, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(554.37, now); // C#5 harmonizing with A4

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.23);
      osc2.stop(now + 0.23);
      break;
    }
    case "victory": {
      // Arpeggio C Major (C4 -> E4 -> G4 -> C5)
      const freqs = [261.63, 329.63, 392.0, 523.25];
      freqs.forEach((f, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + index * 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.06 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.06);
        osc.stop(now + index * 0.06 + 0.28);
      });
      break;
    }
    case "brilliant": {
      // Sparkling arpeggio chime (high sine waves with delay)
      const notes = [880, 1100, 1320, 1760];
      notes.forEach((f, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + index * 0.05);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.05);
        osc.stop(now + index * 0.05 + 0.45);
      });
      break;
    }
    case "blunder": {
      // Alarm detuned saw waves for severe error
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.linearRampToValueAtTime(80, now + 0.25);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(122, now);
      osc2.frequency.linearRampToValueAtTime(82, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.26);
      osc2.stop(now + 0.26);
      break;
    }
    case "castle": {
      // King + Rook two wood taps in quick succession
      [0, 0.08].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(320, now + delay);
        osc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.06);

        gain.gain.setValueAtTime(0.4, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.07);
      });
      break;
    }
    case "promote": {
      // Sine sweep upwards
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
      break;
    }
    case "game-over": {
      // Three sad descending minor chords
      const notes = [311.13, 261.63, 196.0];
      notes.forEach((f, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + index * 0.1);
        osc.frequency.linearRampToValueAtTime(f * 0.9, now + index * 0.1 + 0.3);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.5);
      });
      break;
    }
  }
}
