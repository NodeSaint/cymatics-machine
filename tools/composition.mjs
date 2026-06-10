// Verifies Composition: scheduler fires note + kick events, the plate retunes,
// and every event lands within one frame of its scheduled audio time.
// Headless Chrome uses a null audio sink — no sound leaves the machine.

const base = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
import { spawn } from 'node:child_process';

const c = spawn(CHROME, [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9366', '--remote-allow-origins=*', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=900,1300', base,
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsurl() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch('http://localhost:9366/json')).json();
      const p = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl && x.url.startsWith('http'));
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error('no CDP');
}
const ws = new WebSocket(await wsurl());
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (m) => { const o = JSON.parse(m.data); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' / ' + JSON.stringify(r.result.exceptionDetails.exception)); return r.result?.result?.value; };

await send('Runtime.enable');
await sleep(2500);

// Switch to Composition and turn sound on.
await ev(`window.__cym && (document.querySelectorAll('.rail__mode')[1].click())`);
await sleep(150);
await ev(`document.querySelector('.rail__sound').click()`);

// Sample frequency over ~6 s to confirm the plate retunes on the melody.
const freqs = [];
for (let i = 0; i < 12; i++) {
  await sleep(500);
  freqs.push(Math.round(await ev('window.__cym.state.frequency')));
}

const lags = await ev('window.__cym.compLags');
const audioState = await ev('window.__cym.audioState');

const notes = lags.filter((l) => l.kind === 'note');
const kicks = lags.filter((l) => l.kind === 'kick');
const within = lags.filter((l) => l.lagMs <= l.frameMs + 1).length;
const maxLag = lags.reduce((m, l) => Math.max(m, l.lagMs), 0);
const maxFrame = lags.reduce((m, l) => Math.max(m, l.frameMs), 0);
const distinctFreqs = new Set(freqs).size;

console.log(JSON.stringify({
  audioState,
  events: lags.length,
  noteEvents: notes.length,
  kickEvents: kicks.length,
  withinOneFrame: `${within}/${lags.length}`,
  maxLagMs: +maxLag.toFixed(1),
  maxFrameMs: +maxFrame.toFixed(1),
  freqSamples: freqs,
  distinctFreqs,
  PASS: within === lags.length && notes.length > 0 && kicks.length > 0 && distinctFreqs >= 3,
}, null, 2));

ws.close(); c.kill(); process.exit(0);
