export function playStrongAlert() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.38;
    master.connect(ctx.destination);

    const pattern = [
      [980, 0.00, 0.20], [760, 0.23, 0.20], [980, 0.46, 0.20],
      [1180, 0.72, 0.26], [760, 1.02, 0.22], [980, 1.28, 0.28]
    ];

    pattern.forEach(([freq, offset, duration]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.95, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.03);
    });

    setTimeout(() => ctx.close().catch(() => {}), 2600);
  } catch {}

  if (navigator.vibrate) {
    navigator.vibrate([700,140,700,140,1300,180,900,160,700]);
  }
}
