// Verifies Voice mode using Chrome's fake microphone fed a known-pitch WAV.
// Proves: permission flow, autocorrelation tracks the pitch, the plate follows,
// and silence freezes (clarity drops, silent flag). No real mic, no sound out.
//
// Usage: node tools/voice.mjs http://localhost:5173/ /tmp/tone220.wav 220

const base = process.argv[2] ?? 'http://localhost:5173/';
const wav = process.argv[3] ?? '/tmp/tone220.wav';
const expected = Number(process.argv[4] ?? 220);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
import { spawn } from 'node:child_process';

const c = spawn(CHROME, [
  '--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9388', '--remote-allow-origins=*', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream', // auto-grant permission
  `--use-file-for-fake-audio-capture=${wav}%noloop`.replace('%noloop', ''), // loops by default
  '--window-size=900,1300', base,
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsurl() {
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch('http://localhost:9388/json')).json();
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
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text); return r.result?.result?.value; };

await send('Runtime.enable');
await sleep(2500);

// Open Voice mode (index 2) → requests the (auto-granted) fake mic.
await ev(`document.querySelectorAll('.rail__mode')[2].click()`);
await sleep(2500); // let detection settle + frequency glide

const v = await ev('window.__cym.voice');
const micStatus = await ev('window.__cym.state.micStatus');
const plateFreq = Math.round(await ev('window.__cym.state.frequency'));

const detected = v ? Math.round(v.freq) : -1;
const centsErr = v && v.freq > 0 ? Math.round(1200 * Math.log2(v.freq / expected)) : 9999;

const result = {
  expectedHz: expected,
  micStatus,
  detectedHz: detected,
  plateHz: plateFreq,
  clarity: v ? +v.clarity.toFixed(2) : 0,
  level: v ? +v.level.toFixed(2) : 0,
  silent: v ? v.silent : null,
  centsError: centsErr,
  PASS: micStatus === 'granted' && Math.abs(centsErr) < 60 && Math.abs(plateFreq - expected) < 25,
};
console.log(JSON.stringify(result, null, 2));
ws.close(); c.kill();
process.exit(result.PASS ? 0 : 1);
