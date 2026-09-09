import { createNoiseSamples, renderSensorPixels } from './sensor.mjs';
/** @typedef {ReturnType<typeof import('./model.mjs').calculateExposure>} Exposure */

export class ExposureRenderer {
  revision = 0;
  cachedKey = '';
  cachedPixels = new Uint8ClampedArray();
  noise = new Float32Array();

  /** @param {SVGSVGElement} scene @param {HTMLCanvasElement} canvas */
  constructor(scene, canvas) {
    this.scene = scene;
    this.canvas = canvas;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas rendering is unavailable.');
    this.context = context;
  }

  /** @param {Exposure} settings */
  async render(settings) {
    const revision = ++this.revision;
    const width = Math.min(800, Math.max(240, Math.round(this.scene.getBoundingClientRect().width)));
    const height = Math.round(width * 5 / 8);
    const key = `${width}:${settings.aperture}:${settings.shutter}`;
    if (this.cachedKey !== key) {
      const clone = /** @type {SVGSVGElement} */ (this.scene.cloneNode(true));
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));
      clone.querySelector('[data-sensor-source]')?.removeAttribute('filter');
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      try { await image.decode(); }
      catch (cause) {
        if (revision !== this.revision) return false;
        throw cause;
      }
      if (revision !== this.revision) return false;
      this.canvas.width = width;
      this.canvas.height = height;
      this.context.drawImage(image, 0, 0, width, height);
      this.cachedPixels = this.context.getImageData(0, 0, width, height).data;
      this.cachedKey = key;
    }
    const pixels = this.cachedPixels;
    if (this.noise.length !== pixels.length) this.noise = createNoiseSamples(pixels.length);
    const exposed = renderSensorPixels(pixels, settings, this.noise);
    this.context.putImageData(new ImageData(exposed, width, height), 0, 0);
    this.canvas.hidden = false;
    return true;
  }

  invalidate() {
    this.revision += 1;
    this.canvas.hidden = true;
  }
}
