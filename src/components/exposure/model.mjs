export const APERTURES = Object.freeze(['1.4', '2', '2.8', '4', '5.6', '8', '11', '16', '22']);
export const SHUTTERS = Object.freeze(['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/125', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1']);
export const ISOS = Object.freeze([100, 200, 400, 800, 1600, 3200, 6400, 12800]);
export const LIGHTING = Object.freeze({
  sunny: Object.freeze({ label: 'Sunny', stops: 0 }),
  overcast: Object.freeze({ label: 'Overcast', stops: -2 }),
  shade: Object.freeze({ label: 'Shade', stops: -4 }),
});
export const DEFAULT_SETTINGS = Object.freeze({ aperture: 5, shutter: 4, iso: 0, lighting: 'sunny' });

function validIndex(value, choices, fallback) {
  return Number.isInteger(value) && value >= 0 && value < choices.length ? value : fallback;
}

/** Scale linear light, then encode it for display using the sRGB transfer function. */
export function exposureTransferTable(stops) {
  const multiplier = 2 ** stops;
  return Array.from({ length: 256 }, (_, index) => {
    const encoded = index / 255;
    const linear = encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
    const exposed = Math.min(1, linear * multiplier);
    const display = exposed <= 0.0031308 ? exposed * 12.92 : 1.055 * exposed ** (1 / 2.4) - 0.055;
    return Number(display.toFixed(6));
  });
}

/** Whole-stop steps avoid drift from rounded camera labels such as f/5.6 and 1/60. */
export function calculateExposure(settings = DEFAULT_SETTINGS) {
  const aperture = validIndex(settings.aperture, APERTURES, DEFAULT_SETTINGS.aperture);
  const shutter = validIndex(settings.shutter, SHUTTERS, DEFAULT_SETTINGS.shutter);
  const iso = validIndex(settings.iso, ISOS, DEFAULT_SETTINGS.iso);
  const lighting = Object.hasOwn(LIGHTING, settings.lighting) ? settings.lighting : DEFAULT_SETTINGS.lighting;
  const contributions = {
    aperture: DEFAULT_SETTINGS.aperture - aperture,
    shutter: shutter - DEFAULT_SETTINGS.shutter,
    iso,
    lighting: LIGHTING[lighting].stops,
  };
  const capturedLight = 2 ** (contributions.aperture + contributions.shutter + contributions.lighting);
  const isoGain = ISOS[iso] / 100;
  const stops = contributions.aperture + contributions.shutter + contributions.iso + contributions.lighting;
  const status = stops === 0 ? 'Balanced' : stops < 0 ? 'Underexposed' : 'Overexposed';
  // Fixed 100 mm lens, 36 mm sensor width, focus at 8 m; blur diameters use the thin-lens equation.
  const fNumber = 2 ** ((aperture + 1) / 2);
  const defocus = (distance) => (100 ** 2 * Math.abs(distance - 8000)) / (fNumber * distance * (8000 - 100)) * (800 / 36) / 4;
  const backgroundBlur = defocus(1000000);
  const foregroundBlur = defocus(2000);
  // A horizontal subject speed of 720 scene pixels/s, approximated by a Gaussian with equal variance.
  const motionBlur = (720 / Math.sqrt(12)) * 2 ** (shutter - 13);
  return {
    aperture, shutter, iso, lighting, stops, contributions, capturedLight, isoGain,
    sceneEV: 15 + contributions.lighting,
    brightness: 2 ** stops,
    backgroundBlur, foregroundBlur, motionBlur,
    meterPosition: (Math.min(3, Math.max(-3, stops)) + 3) / 6 * 100,
    meterLabel: `${formatStops(stops)} · ${status}`,
    apertureEffect: aperture < 4 ? 'Shallow depth of field' : aperture < 7 ? 'Moderate depth of field' : 'Deep depth of field',
    shutterEffect: shutter < 5 ? 'Motion frozen' : shutter < 8 ? 'Some motion blur' : 'Strong motion blur',
    isoEffect: stops >= 3 ? 'Reduce exposure to compare noise' : iso < 2 ? 'Little visible grain' : iso < 5 ? 'Some visible grain' : 'Strong visible grain',
  };
}

export function formatStops(stops) {
  return `${stops > 0 ? '+' : ''}${stops} ${Math.abs(stops) === 1 ? 'stop' : 'stops'}`;
}
