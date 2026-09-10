import assert from 'node:assert/strict';
import test from 'node:test';
import { ExposureRenderer } from '../src/components/exposure/renderer.mjs';
import { calculateExposure, DEFAULT_SETTINGS } from '../src/components/exposure/model.mjs';

const pending = [];
globalThis.Image = class {
  decode() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); }
};
globalThis.XMLSerializer = class { serializeToString() { return '<svg />'; } };
globalThis.ImageData = class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };

function fixture() {
  const frames = [];
  const scene = {
    getBoundingClientRect: () => ({ width: 320 }),
    cloneNode: () => ({ setAttribute() {}, querySelector: () => ({ removeAttribute() {} }) }),
  };
  const context = {
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(320 * 200 * 4).fill(128) }),
    putImageData: (frame) => frames.push(frame),
  };
  const canvas = { hidden: true, getContext: () => context };
  return { renderer: new ExposureRenderer(scene, canvas), canvas, frames };
}

const initial = calculateExposure();
const changed = calculateExposure({ ...DEFAULT_SETTINGS, aperture: 1 });

test('only the newest decoded scene can become the visible preview', async () => {
  const { renderer, canvas, frames } = fixture();
  const old = renderer.render(initial);
  const first = pending.shift();
  renderer.invalidate();
  const newest = renderer.render(changed);
  const second = pending.shift();
  second.resolve();
  assert.equal(await newest, true);
  first.resolve();
  assert.equal(await old, false);
  assert.equal(canvas.hidden, false);
  assert.equal(frames.length, 1);
});

test('a stale decoding failure cannot erase a newer successful preview', async () => {
  const { renderer, canvas, frames } = fixture();
  const old = renderer.render(initial);
  const first = pending.shift();
  const newest = renderer.render(changed);
  pending.shift().resolve();
  assert.equal(await newest, true);
  first.reject(new Error('Old decode failed'));
  assert.equal(await old, false);
  assert.equal(canvas.hidden, false);
  assert.equal(frames.length, 1);
});

test('current failures are reported and disconnect cancels pending rendering', async () => {
  const { renderer, canvas } = fixture();
  const failed = renderer.render(initial);
  pending.shift().reject(new Error('Decode failed'));
  await assert.rejects(failed, /Decode failed/);
  const removed = renderer.render(initial);
  renderer.invalidate();
  pending.shift().resolve();
  assert.equal(await removed, false);
  assert.equal(canvas.hidden, true);
});

test('ISO and lighting changes reuse source pixels but render a different image', async () => {
  const { renderer, frames } = fixture();
  const first = renderer.render(initial);
  pending.shift().resolve();
  await first;
  await renderer.render(calculateExposure({ ...DEFAULT_SETTINGS, iso: 2 }));
  assert.equal(pending.length, 0);
  assert.equal(frames.length, 2);
  assert.notDeepEqual(frames[0].data, frames[1].data);
});

test('an unavailable canvas fails explicitly', () => {
  assert.throws(() => new ExposureRenderer({}, { getContext: () => null }), /unavailable/);
});
