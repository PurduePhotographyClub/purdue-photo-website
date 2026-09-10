import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  APERTURES, SHUTTERS, ISOS, LIGHTING, DEFAULT_SETTINGS, calculateExposure, exposureTransferTable,
} from '../src/components/exposure/model.mjs';

test('the selected scene light stays readable on hover', () => {
  const component = readFileSync(new URL('../src/components/exposure/ExposureSimulator.astro', import.meta.url), 'utf8');
  assert.match(component, /peer-checked:hover:text-black/);
});

test('the starting settings match the scene light', () => {
  const result = calculateExposure(DEFAULT_SETTINGS);
  assert.equal(result.stops, 0);
  assert.equal(result.brightness, 1);
  assert.equal(result.meterLabel, '0 stops · Balanced');
});

test('each full stop doubles or halves brightness in the correct direction', () => {
  for (const [setting, direction] of [['aperture', -1], ['shutter', 1], ['iso', 1]]) {
    const result = calculateExposure({ ...DEFAULT_SETTINGS, [setting]: DEFAULT_SETTINGS[setting] + 1 });
    assert.equal(result.stops, direction);
    assert.equal(result.brightness, 2 ** direction);
  }
});

test('reciprocal changes keep brightness while changing creative effects', () => {
  const initial = calculateExposure(DEFAULT_SETTINGS);
  const longer = calculateExposure({ ...DEFAULT_SETTINGS, aperture: 7, shutter: DEFAULT_SETTINGS.shutter + 2 });
  const sensitive = calculateExposure({ ...DEFAULT_SETTINGS, aperture: 7, iso: 2 });
  assert.equal(longer.stops, 0);
  assert.equal(sensitive.stops, 0);
  assert.ok(longer.backgroundBlur < initial.backgroundBlur);
  assert.ok(longer.motionBlur > initial.motionBlur);
  assert.ok(sensitive.capturedLight < initial.capturedLight);
});

test('all aperture and shutter pairs compensate by exactly one stop', () => {
  for (let aperture = 0; aperture < APERTURES.length - 1; aperture += 1) {
    for (let shutter = 0; shutter < SHUTTERS.length - 1; shutter += 1) {
      const before = calculateExposure({ ...DEFAULT_SETTINGS, aperture, shutter });
      const after = calculateExposure({ ...DEFAULT_SETTINGS, aperture: aperture + 1, shutter: shutter + 1 });
      assert.equal(after.stops, before.stops);
    }
  }
});

test('the equivalent settings in the Basics lesson have equal brightness', () => {
  const examples = [
    { aperture: 2, shutter: 3, iso: 1 },
    { aperture: 3, shutter: 4, iso: 1 },
    { aperture: 6, shutter: 3, iso: 5 },
  ].map((settings) => calculateExposure({ ...DEFAULT_SETTINGS, ...settings }));
  assert.equal(examples[0].brightness, examples[1].brightness);
  assert.equal(examples[0].brightness, examples[2].brightness);
});

test('less scene light darkens the result without changing camera settings', () => {
  assert.equal(calculateExposure({ ...DEFAULT_SETTINGS, lighting: 'overcast' }).stops, -2);
  assert.equal(calculateExposure({ ...DEFAULT_SETTINGS, lighting: 'shade' }).stops, -4);
  const corrected = calculateExposure({ ...DEFAULT_SETTINGS, lighting: 'shade', iso: 4 });
  assert.equal(corrected.stops, 0);
});

test('the meter clamps its pointer but reports the actual exposure difference', () => {
  const dark = calculateExposure({ aperture: 8, shutter: 0, iso: 0, lighting: 'shade' });
  const bright = calculateExposure({ aperture: 0, shutter: 13, iso: 7, lighting: 'sunny' });
  assert.equal(dark.meterPosition, 0);
  assert.match(dark.meterLabel, /^-\d+ stops · Underexposed$/);
  assert.equal(bright.meterPosition, 100);
  assert.match(bright.meterLabel, /^\+\d+ stops · Overexposed$/);
  assert.ok(Number.isFinite(dark.brightness));
  assert.ok(Number.isFinite(bright.brightness));
});

test('every supported setting has finite, bounded visual effects', () => {
  for (const lighting of Object.keys(LIGHTING)) {
    for (let aperture = 0; aperture < APERTURES.length; aperture += 1) {
      for (let shutter = 0; shutter < SHUTTERS.length; shutter += 1) {
        for (let iso = 0; iso < ISOS.length; iso += 1) {
          const result = calculateExposure({ aperture, shutter, iso, lighting });
          for (const key of ['brightness', 'backgroundBlur', 'motionBlur', 'foregroundBlur', 'meterPosition']) {
            assert.ok(Number.isFinite(result[key]), key);
            assert.ok(result[key] >= 0, key);
          }
          assert.ok(result.meterPosition <= 100);
        }
      }
    }
  }
});

test('invalid settings fall back to defaults without mutating caller data', () => {
  const invalid = Object.freeze({ aperture: NaN, shutter: -1, iso: 900, lighting: 'unknown' });
  assert.deepEqual(calculateExposure(invalid), calculateExposure(DEFAULT_SETTINGS));
  for (const invalidValue of [undefined, null, Infinity, '2', 2.5]) {
    assert.deepEqual(calculateExposure({ ...DEFAULT_SETTINGS, aperture: invalidValue }), calculateExposure(DEFAULT_SETTINGS));
  }
  assert.deepEqual(calculateExposure(), calculateExposure(DEFAULT_SETTINGS));
});

test('a balanced preview preserves every display channel value', () => {
  const table = exposureTransferTable(0);
  assert.equal(table.length, 256);
  table.forEach((value, index) => assert.ok(Math.abs(value - index / 255) < 0.000001));
});

test('one stop doubles linear light instead of doubling encoded display values', () => {
  const brighter = exposureTransferTable(1);
  const darker = exposureTransferTable(-1);
  assert.equal(Math.round(brighter[128] * 255), 176);
  assert.equal(Math.round(darker[128] * 255), 92);
  assert.equal(Math.round(brighter[64] * 255), 90);
  assert.equal(Math.round(brighter[4] * 255), 8);
  assert.equal(Math.round(brighter[8] * 255), 15);
  assert.equal(brighter[0], 0);
  assert.equal(brighter[255], 1);
});

test('exposure rendering clips only after scaling linear light', () => {
  assert.ok(exposureTransferTable(1)[180] < 1);
  assert.equal(exposureTransferTable(1)[200], 1);
  assert.ok(exposureTransferTable(2)[128] < 1);
  assert.equal(exposureTransferTable(3)[128], 1);
});

test('exposure curves remain ordered and finite across the full camera range', () => {
  for (let stops = -12; stops <= 20; stops += 1) {
    const table = exposureTransferTable(stops);
    table.forEach((value, index) => {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
      if (index > 0) assert.ok(value >= table[index - 1]);
    });
  }
});

test('bright sun uses the nominal EV 15 daylight reference', () => {
  const sunny16 = calculateExposure({ aperture: 7, shutter: 6, iso: 0, lighting: 'sunny' });
  assert.equal(sunny16.stops, 0);
  assert.equal(sunny16.sceneEV, 15);
  assert.equal(calculateExposure({ ...DEFAULT_SETTINGS, lighting: 'overcast' }).sceneEV, 13);
  assert.equal(calculateExposure({ ...DEFAULT_SETTINGS, lighting: 'shade' }).sceneEV, 11);
});

test('triangle contributions add up to the rendered exposure for every combination', () => {
  for (let aperture = 0; aperture < APERTURES.length; aperture += 1) {
    for (let shutter = 0; shutter < SHUTTERS.length; shutter += 1) {
      for (let iso = 0; iso < ISOS.length; iso += 1) {
        for (const lighting of Object.keys(LIGHTING)) {
          const result = calculateExposure({ aperture, shutter, iso, lighting });
          assert.equal(Object.values(result.contributions).reduce((sum, stops) => sum + stops, 0), result.stops);
          assert.equal(result.capturedLight * result.isoGain, result.brightness);
          assert.equal(result.contributions.iso, Math.log2(ISOS[iso] / 100));
        }
      }
    }
  }
});

test('every slower shutter step doubles the motion trail, including long exposures', () => {
  for (let shutter = 0; shutter < SHUTTERS.length - 1; shutter += 1) {
    const before = calculateExposure({ ...DEFAULT_SETTINGS, shutter });
    const after = calculateExposure({ ...DEFAULT_SETTINGS, shutter: shutter + 1 });
    assert.equal(after.motionBlur, before.motionBlur * 2);
  }
});

test('opening the lens defocuses both foreground and background consistently', () => {
  for (let aperture = 0; aperture < APERTURES.length - 1; aperture += 1) {
    const wide = calculateExposure({ ...DEFAULT_SETTINGS, aperture });
    const narrow = calculateExposure({ ...DEFAULT_SETTINGS, aperture: aperture + 1 });
    assert.ok(wide.foregroundBlur > narrow.foregroundBlur);
    assert.ok(Math.abs(wide.backgroundBlur / narrow.backgroundBlur - Math.SQRT2) < 1e-10);
  }
});
