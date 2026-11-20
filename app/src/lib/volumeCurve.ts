/** Audio taper: exponential gain for linear slider travel (roughly 60 dB).
 * The offset gives exact silence at zero without a discontinuity near mute.
 * The player and saved preferences still use linear gain, so changing this
 * presentation does not change an existing listening level or ReplayGain.
 */
const RANGE = 1000;
const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export function sliderToGain(position: number): number {
  const x = clamp(position);
  if (x === 0 || x === 1) return x;
  return Math.expm1(Math.log(RANGE) * x) / (RANGE - 1);
}

export function gainToSlider(gain: number): number {
  const x = clamp(gain);
  if (x === 0 || x === 1) return x;
  return Math.log1p((RANGE - 1) * x) / Math.log(RANGE);
}
