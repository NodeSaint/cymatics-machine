// Interactive smoke test via the Chrome DevTools Protocol — proves Tone-mode
// controls actually do something (audio can't be seen in a screenshot).
// Usage: node tools/drive.mjs http://localhost:5176/

const base = process.argv[2] ?? 'http://localhost:5176/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

import { spawn } from 'node:child_process';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=900,1300',
  base,
]);
chrome.on('error', (e) => { console.error('chrome failed', e); process.exit(1); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json`);
      const tabs = await res.json();
      const page = tabs.find(
        (t) => t.type === 'page' && t.webSocketDebuggerUrl && t.url.startsWith('http'),
      );
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error('CDP not reachable');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}) {
  const myId = ++id;
  return new Promise((resolve) => {
    pending.set(myId, resolve);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}

await send('Runtime.enable');
await send('Page.enable');
await sleep(2500); // let it boot + animate

const report = {};
report.bootState = await evaluate('window.__cym ? window.__cym.state : "no hook"');

// 1. Toggle sound on (click the ♪ button).
await evaluate(`document.querySelector('.rail__sound').click()`);
await sleep(400);
report.soundLabel = await evaluate(`document.querySelector('.rail__sound').textContent`);
report.audioOn = await evaluate('window.__cym.state.audioOn');
report.audioCtx = await evaluate('window.__cym.audioState');

// 2. Play a piano key — frequency should jump to that note.
const before = await evaluate('window.__cym.state.frequency');
await evaluate(`document.querySelectorAll('.kbd__key--white')[5].click()`); // A4 (440)
await sleep(250);
const after = await evaluate('window.__cym.state.frequency');
report.notePlayed = { before: Math.round(before), after: Math.round(after) };
report.readout = await evaluate(`document.querySelector('.rail__readout').textContent`);

// 3. Open the explainer.
await evaluate(`document.querySelector('.rail__icon[title^="What"], .rail__controls .rail__icon:last-child').click()`);
await sleep(200);
report.explainerOpen = await evaluate(`!!document.querySelector('dialog.explain')?.open`);
report.explainerHasEquation = await evaluate(
  `document.querySelector('dialog.explain')?.textContent.includes('ψₙₘ') ?? false`,
);

// 4. Switch to a not-yet-ready mode via the disabled button (should stay tone).
report.modeBefore = await evaluate('window.__cym.state.mode');

console.log(JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
process.exit(0);
