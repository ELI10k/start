// The end of a rest interval, made noticeable.
//
// The rest timer counted down on screen and did nothing else. In a gym the phone
// is in a pocket or face-down on a bench, so a timer you have to be looking at
// to know it finished is not a timer - the client goes back to counting in their
// head, which is the thing the feature existed to replace.
//
// Two channels, because neither is reliable alone: vibration is unsupported on
// iOS Safari, and sound is useless with the ringer off. Both are best-effort and
// neither failing is worth surfacing.

/** A short double buzz. Silently absent where the API is not implemented. */
function vibrate() {
  try {
    navigator.vibrate?.([120, 80, 120]);
  } catch {
    /* unsupported, or blocked by the platform */
  }
}

/**
 * A two-note chime, synthesised rather than fetched.
 *
 * An audio file would be a network request and an asset to ship; two oscillator
 * notes are a few lines and cannot 404. Browsers refuse to start an AudioContext
 * before a user gesture, and starting a workout is one, so by the time a rest
 * interval ends the page has been interacted with.
 */
function chime() {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const play = (frequency: number, at: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      // A flat tone clips audibly; the ramp is what makes it a note.
      gain.gain.setValueAtTime(0.0001, context.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + at + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + at);
      oscillator.stop(context.currentTime + at + 0.3);
    };
    play(880, 0);
    play(1174, 0.16);
    window.setTimeout(() => void context.close().catch(() => {}), 900);
  } catch {
    /* no audio output, or a context the browser refused to create */
  }
}

export function signalRestOver() {
  vibrate();
  chime();
}
