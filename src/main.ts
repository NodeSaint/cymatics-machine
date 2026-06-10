// Boot, resize, and the render loop. Wires modes → field → grains → renderer,
// driven by the central store. Silent in Step 1.

import './style.css';
import { buildModes, resonanceFrequencies, F_MIN, F_MAX } from './physics/modes';
import { Field } from './physics/field';
import { Grains } from './grains/grains';
import { type Renderer } from './render/renderer';
import { WebGLRenderer } from './render/webgl';
import { Canvas2DRenderer } from './render/canvas2d';
import { getState, setState, setFrequency } from './store';
import { buildRail } from './ui/rail';

function boot(): void {
  const canvas = document.getElementById('plate') as HTMLCanvasElement;
  const railRoot = document.getElementById('rail') as HTMLElement;

  // ── Physics ───────────────────────────────────────────────────────────
  const modes = buildModes();
  const field = new Field(modes);

  // Optional ?f= deep link sets the initial frequency (handy for sharing a figure).
  const initialF = Number(new URLSearchParams(location.search).get('f'));
  if (Number.isFinite(initialF) && initialF > 0) setFrequency(initialF);
  field.setFrequency(getState().frequency);

  // ── Renderer (WebGL preferred, Canvas 2D fallback) ────────────────────
  let renderer: Renderer;
  try {
    renderer = new WebGLRenderer(canvas);
  } catch {
    renderer = new Canvas2DRenderer(canvas);
  }
  setState({ renderer: renderer.kind });

  const grains = new Grains(renderer.capacity);

  // ── UI ────────────────────────────────────────────────────────────────
  buildRail(railRoot, resonanceFrequencies(modes));
  installKeyboard();

  // ── Resize ────────────────────────────────────────────────────────────
  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.resize(rect.width, rect.height, dpr);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ── Render loop ───────────────────────────────────────────────────────
  let last = performance.now();
  let fpsAccum = 0;
  let fpsFrames = 0;

  function frame(now: number): void {
    const dtMs = now - last;
    last = now;
    const dtScale = dtMs / (1000 / 60);

    const s = getState();
    field.setFrequency(s.frequency);
    if (field.dominant) {
      const d = s.dominant;
      if (!d || d.n !== field.dominant.n || d.m !== field.dominant.m) {
        setState({ dominant: { n: field.dominant.n, m: field.dominant.m } });
      }
    }

    const motion = s.reducedMotion ? 0.45 : 1;
    grains.update(field, dtScale, motion);
    renderer.draw(grains.pos, grains.speed, grains.count, !s.reducedMotion);

    // Smoothed fps, updated a few times a second.
    fpsAccum += dtMs;
    fpsFrames++;
    if (fpsAccum >= 400) {
      setState({ fps: (fpsFrames * 1000) / fpsAccum });
      fpsAccum = 0;
      fpsFrames = 0;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // React to reduced-motion changes live.
  if (typeof matchMedia !== 'undefined') {
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      setState({ reducedMotion: e.matches });
    });
  }
}

/** Arrows nudge frequency; Home/End jump to the ends. (Mode digits land in Step 2+.) */
function installKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    const f = getState().frequency;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        setFrequency(f + (e.shiftKey ? 20 : 4));
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        setFrequency(f - (e.shiftKey ? 20 : 4));
        e.preventDefault();
        break;
      case 'Home':
        setFrequency(F_MIN);
        e.preventDefault();
        break;
      case 'End':
        setFrequency(F_MAX);
        e.preventDefault();
        break;
    }
  });
}

boot();
