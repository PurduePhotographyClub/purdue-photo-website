import assert from 'node:assert/strict';
import test from 'node:test';
import { sensorStatistics, createNoiseSamples, renderSensorPixels } from '../src/components/exposure/sensor.mjs';
import { calculateExposure, DEFAULT_SETTINGS, exposureTransferTable } from '../src/components/exposure/model.mjs';

const balanced = calculateExposure(DEFAULT_SETTINGS);
const highISO = calculateExposure({ ...DEFAULT_SETTINGS, aperture: 8, shutter: 0, iso: 7 });
const statistics = (values) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { mean, variance: values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length };
};

test('raising ISO amplifies the existing signal and noise without adding captured light', () => {
  const raised = calculateExposure({ ...DEFAULT_SETTINGS, iso: 1 });
  const low = sensorStatistics(0.18, balanced);
  const high = sensorStatistics(0.18, raised);
  assert.equal(raised.capturedLight, balanced.capturedLight);
  assert.equal(high.signal, low.signal * 2);
  assert.equal(high.deviation, low.deviation * 2);
});

test('equal-brightness high ISO has more noise because fewer photons were collected', () => {
  assert.equal(highISO.stops, 0);
  const low = sensorStatistics(0.18, balanced);
  const high = sensorStatistics(0.18, highISO);
  assert.equal(high.signal, low.signal);
  assert.ok(high.deviation > low.deviation * Math.sqrt(128));
  const shadow = sensorStatistics(0.01, highISO);
  assert.ok(shadow.deviation / shadow.signal > high.deviation / high.signal);
});

test('deterministic noise has a near-zero mean, unit variance, and finite samples', () => {
  const noise = createNoiseSamples(120000);
  assert.deepEqual(noise, createNoiseSamples(120000));
  assert.ok(noise.every(Number.isFinite));
  const stats = statistics(noise);
  assert.ok(Math.abs(stats.mean) < 0.01);
  assert.ok(Math.abs(stats.variance - 1) < 0.02);
});

test('rendered high ISO pixels visibly vary while preserving average brightness', () => {
  const pixels = Uint8ClampedArray.from({ length: 120000 }, (_, i) => i % 4 === 3 ? 255 : 128);
  const original = pixels.slice();
  const noise = createNoiseSamples(pixels.length);
  const low = renderSensorPixels(pixels, balanced, noise);
  const high = renderSensorPixels(pixels, highISO, noise);
  const lowStats = statistics(low.filter((_, i) => i % 4 !== 3));
  const highStats = statistics(high.filter((_, i) => i % 4 !== 3));
  assert.ok(highStats.variance > lowStats.variance * 50);
  assert.ok(Math.sqrt(highStats.variance) > 10);
  assert.ok(Math.abs(highStats.mean - 128) < 4);
  assert.deepEqual(pixels, original);
  assert.ok(high.filter((_, i) => i % 4 === 3).every((alpha) => alpha === 255));
});

test('the sensor uses the same linear-light exposure curve as the SVG fallback', () => {
  const pixels = Uint8ClampedArray.from({ length: 256 * 4 }, (_, i) => i % 4 === 3 ? 255 : Math.floor(i / 4));
  for (const stops of [-8, -1, 0, 1, 8]) {
    const result = { ...balanced, capturedLight: 2 ** stops, brightness: 2 ** stops };
    const rendered = renderSensorPixels(pixels, result, new Float32Array(pixels.length));
    const table = exposureTransferTable(stops);
    for (let value = 0; value < 256; value += 1) {
      assert.ok(Math.abs(rendered[value * 4] - Math.round(table[value] * 255)) <= 1);
    }
  }
});

test('noise clips with the signal and does not add a gray veil over blown highlights', () => {
  const overexposed = calculateExposure({ ...DEFAULT_SETTINGS, iso: 7 });
  const pixels = new Uint8ClampedArray(4000).fill(255);
  const result = renderSensorPixels(pixels, overexposed, createNoiseSamples(pixels.length));
  assert.ok(result.every((value) => value === 255));
});
