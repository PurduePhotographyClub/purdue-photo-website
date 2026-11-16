interface Snowflake {
  x: number;
  y: number;
  depth: number;
  phase: number;
}

function scatter(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function createSnowflakes(count: number): Snowflake[] {
  return Array.from({ length: count }, (_, index) => ({
    x: scatter(index, 1),
    y: scatter(index, 2),
    depth: .15 + Math.pow(scatter(index, 3), 2.7) * .85,
    phase: scatter(index, 4) * Math.PI * 2,
  }));
}

export function getSantaPosition(elapsed: number, width: number, santaWidth: number) {
  const duration = Math.max(24, width / 60 + 8);
  const phase = (elapsed / duration) % 1;
  return {
    x: -santaWidth - 24 + phase * (width + santaWidth + 48),
    y: -24 * Math.sin(Math.PI * phase) + 6 * Math.sin(phase * Math.PI * 2) + 2.5 * Math.sin(elapsed * 2.4),
    tilt: -4 + 3 * Math.cos(phase * Math.PI) + Math.sin(elapsed * 1.5),
  };
}

export function initializeHolidayMotion(page: HTMLElement) {
  const hero = page.querySelector<HTMLElement>('.holiday-hero');
  const canvas = page.querySelector<HTMLCanvasElement>('.holiday-snow');
  const santa = page.querySelector<HTMLElement>('.holiday-santa');
  const context = canvas?.getContext('2d');
  if (!hero || !canvas || !context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let height = 0;
  let santaWidth = 0;
  let flakes: Snowflake[] = [];
  let elapsed = 12;
  let frame = 0;
  let previousTime = 0;
  let sceneVisible = true;
  let running = false;

  const paintSnow = () => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#fffaf0';
    const breeze = elapsed * 6 - Math.cos(elapsed * .08) * 45;
    for (const flake of flakes) {
      const speed = 15 + flake.depth * flake.depth * 48;
      const y = (flake.y * (height + 24) + elapsed * speed) % (height + 24) - 12;
      const flutter = Math.sin(elapsed * (.4 + flake.depth * .3) + flake.phase);
      const x = (flake.x * (width + 80) + breeze * (.4 + flake.depth) + flutter * (6 + flake.depth * 16)) % (width + 80) - 40;
      const edgeFade = Math.max(0, Math.min(1, (y + 8) / 24, (height - y) / 18));
      context.globalAlpha = (.22 + flake.depth * .65) * edgeFade;
      context.beginPath();
      context.ellipse(x, y, .5 + flake.depth * 2.1, .6 + flake.depth * 2.4, flutter * .35, 0, Math.PI * 2);
      context.fill();
    }
  };

  const flySanta = () => {
    if (!santa) return;
    const { x, y, tilt } = getSantaPosition(elapsed, width, santaWidth);
    santa.style.setProperty('--santa-x', `${x}px`);
    santa.style.setProperty('--santa-y', `${y}px`);
    santa.style.setProperty('--santa-tilt', `${tilt}deg`);
  };

  const resize = () => {
    width = hero.clientWidth;
    height = hero.clientHeight;
    santaWidth = santa?.offsetWidth ?? 0;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    flakes = createSnowflakes(Math.min(260, Math.max(100, Math.round(width * height / 6500))));
    if (running) paintSnow();
    flySanta();
  };

  const tick = (now: number) => {
    if (!running) return;
    if (previousTime) elapsed += Math.min((now - previousTime) / 1000, .05);
    previousTime = now;
    paintSnow();
    flySanta();
    frame = requestAnimationFrame(tick);
  };

  const syncMotion = () => {
    const shouldRun = !document.hidden && !reducedMotion.matches && sceneVisible;
    page.dataset.motion = shouldRun ? 'on' : 'off';
    if (shouldRun === running) return;
    running = shouldRun;
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (running) frame = requestAnimationFrame(tick);
    else context.clearRect(0, 0, width, height);
  };

  const sizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver((entries) => {
    sceneVisible = entries[entries.length - 1].isIntersecting;
    syncMotion();
  });
  resize();
  sizeObserver.observe(hero);
  visibilityObserver.observe(hero);
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pageshow', syncMotion);
  syncMotion();

  window.addEventListener('pagehide', (event) => {
    running = false;
    cancelAnimationFrame(frame);
    if (event.persisted) return;
    sizeObserver.disconnect();
    visibilityObserver.disconnect();
    reducedMotion.removeEventListener('change', syncMotion);
    document.removeEventListener('visibilitychange', syncMotion);
    window.removeEventListener('pageshow', syncMotion);
  });
}
