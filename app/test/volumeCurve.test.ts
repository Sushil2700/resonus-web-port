import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gainToSlider, sliderToGain } from '@/lib/volumeCurve';

describe('browser volume audio taper', () => {
  it('has exact mute and unity endpoints and bounds invalid inputs', () => {
    for (const f of [sliderToGain, gainToSlider]) {
      assert.equal(f(0), 0);
      assert.equal(f(1), 1);
      assert.equal(f(-1), 0);
      assert.equal(f(2), 1);
      assert.equal(f(NaN), 0);
    }
  });
  it('provides substantially quieter gain halfway through the slider', () => {
    const db = 20 * Math.log10(sliderToGain(0.5));
    assert.ok(db > -31 && db < -30);
    assert.ok(sliderToGain(0.01) > 0 && sliderToGain(0.01) < 0.0001);
  });
  it('is strictly increasing throughout the usable range', () => {
    for (let i = 1; i <= 1000; i++) {
      assert.ok(sliderToGain(i / 1000) > sliderToGain((i - 1) / 1000));
    }
  });
  it('preserves existing saved gains when mapped to and from the slider', () => {
    for (const gain of [0, 0.00001, 0.01, 0.07, 0.2, 0.8, 1]) {
      assert.ok(Math.abs(sliderToGain(gainToSlider(gain)) - gain) < 1e-12);
    }
  });
});
