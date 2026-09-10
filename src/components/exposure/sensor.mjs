// Virtual sensor: fixed full-well capacity and input-referred read noise, without denoising.
// Photon variance equals signal; read-noise variance adds independently before ISO gain.
// https://graphics.stanford.edu/courses/cs178/lectures/noise-29apr14.pdf
const FULL_WELL = 12000;
const READ_NOISE = 3;

export function decodeSRGB(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function encodeSRGB(value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

const LINEAR = Array.from({ length: 256 }, (_, index) => decodeSRGB(index / 255));
const DISPLAY = Uint8ClampedArray.from({ length: 65536 }, (_, index) => encodeSRGB(index / 65535) * 255);

export function sensorStatistics(linear, { capturedLight, isoGain }) {
  const electrons = linear * capturedLight * FULL_WELL;
  return {
    signal: electrons * isoGain / FULL_WELL,
    deviation: Math.sqrt(electrons + READ_NOISE ** 2) * isoGain / FULL_WELL,
  };
}

// Box-Muller samples give repeatable Gaussian noise without flicker while dragging controls.
// This approximates photon counts; it is not a measured noise profile for a particular camera.
export function createNoiseSamples(length) {
  let state = 12;
  const uniform = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state + 1) / 4294967297;
  };
  return Float32Array.from({ length }, () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform()));
}

export function renderSensorPixels(source, settings, noise) {
  const lookup = LINEAR.map((linear) => sensorStatistics(linear, settings));
  const output = new Uint8ClampedArray(source.length);
  for (let index = 0; index < source.length; index += 1) {
    if (index % 4 === 3) { output[index] = source[index]; continue; }
    const { signal, deviation } = lookup[source[index]];
    const linear = Math.min(1, Math.max(0, signal + deviation * noise[index]));
    output[index] = DISPLAY[Math.round(linear * 65535)];
  }
  return output;
}
