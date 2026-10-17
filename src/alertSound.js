export function playStrongAlert() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    [880, 660, 880, 990, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.7, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      osc.connect(gain); gain.connect(master);
      osc.start(start); osc.stop(start + 0.16);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch {}
  if (navigator.vibrate) navigator.vibrate([500,120,500,120,1000,150,700]);
}
