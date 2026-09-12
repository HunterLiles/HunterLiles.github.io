import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

// Optional development check. Requires the local server and Chromium's CDP port.
const endpoint = 'http://127.0.0.1:9226';
const target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
});
function call(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function navigate() {
  await call('Page.navigate', { url: 'http://127.0.0.1:8000/' });
  await delay(500);
  assert(await evaluate('document.readyState === "complete"'));
}
try {
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.rendererDraws = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      window.rendererDraws++;
      return clear.apply(this, args);
    };
  ` });
  for (const width of [320, 375, 480, 600, 768, 900, 1024, 1440]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await navigate();
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `Overflow at ${width}`);
    assert.equal(await evaluate('window.rendererDraws'), 0, 'Renderer initialized above viewport');
    const imageResults = await evaluate(`Promise.all([...document.images].map(async image => {
      const response = await fetch(image.src);
      return response.ok;
    }))`);
    assert(imageResults.every(Boolean), 'Broken image URL');
    await evaluate(`Promise.all([...document.images].filter(i => i.offsetParent !== null).map(async image => {
      image.loading = 'eager';
      await image.decode();
    }))`);
    await evaluate('window.scrollTo(0, 0)');
    await delay(100);
    if (width === 375 || width === 1440) {
      const metrics = await call('Page.getLayoutMetrics');
      const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
      await writeFile(`.agents/check-output/layout-${width}.png`, Buffer.from(data, 'base64'));
    }
  }
  console.log('PASS: eight viewport widths, no overflow or broken visible images; renderer deferred.');
  await evaluate(await readFile('.agents/check-output/axe.min.js', 'utf8'));
  const audit = await evaluate('axe.run(document, {runOnly: {type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"]}})');
  await writeFile('.agents/check-output/accessibility.json', JSON.stringify(audit, null, 2));
  assert.equal(audit.violations.length, 0, JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))));
  console.log('PASS: axe WCAG A/AA audit, zero violations.');
  await evaluate('document.querySelector("#renderer").scrollIntoView()');
  await delay(200);
  const active = await evaluate('window.rendererDraws');
  await delay(150);
  assert(await evaluate('window.rendererDraws') > active, 'Renderer not animating');
  const latency = await evaluate(`new Promise(resolve => {
    const start = performance.now();
    document.querySelector('#renderer-toggle').click();
    requestAnimationFrame(() => resolve(performance.now() - start));
  })`);
  const paused = await evaluate('window.rendererDraws');
  await delay(150);
  assert.equal(await evaluate('window.rendererDraws'), paused);
  await evaluate('document.querySelector("#renderer-toggle").focus()');
  await call('Page.bringToFront');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'char', text: '\r', unmodifiedText: '\r', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await delay(120);
  assert(await evaluate('window.rendererDraws') > paused, 'Keyboard resume failed: ' + JSON.stringify(await evaluate('({active: document.activeElement.id, hidden: document.hidden, label: document.querySelector("#renderer-toggle").textContent, draws: window.rendererDraws})')));
  await evaluate('window.scrollTo(0, 0)');
  await delay(150);
  const offscreen = await evaluate('window.rendererDraws');
  await delay(150);
  assert.equal(await evaluate('window.rendererDraws'), offscreen);
  await evaluate('document.querySelector("#renderer").scrollIntoView()');
  await delay(150);
  const other = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
  await fetch(`${endpoint}/json/activate/${other.id}`);
  await delay(150);
  assert(await evaluate('document.hidden'), 'Tab did not become hidden');
  const hidden = await evaluate('window.rendererDraws');
  await delay(150);
  assert.equal(await evaluate('window.rendererDraws'), hidden);
  await fetch(`${endpoint}/json/close/${other.id}`);
  await fetch(`${endpoint}/json/activate/${target.id}`);
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await delay(100);
  const reduced = await evaluate('window.rendererDraws');
  await delay(150);
  assert.equal(await evaluate('window.rendererDraws'), reduced);
  assert.equal(await evaluate('document.querySelector("#renderer-toggle").textContent'), 'Resume animation');
  console.log(`PASS: pause, keyboard resume, offscreen/hidden pause, reduced motion. Synthetic click-to-frame: ${latency.toFixed(1)} ms.`);
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await call('Emulation.setTouchEmulationEnabled', { enabled: true });
  await navigate();
  assert(await evaluate('getComputedStyle(document.querySelector(".portrait-ascii")).display === "none"'), 'Touch portrait hidden');
  await evaluate('document.querySelector("#renderer").scrollIntoView()');
  await delay(200);
  const touchPoint = await evaluate('(() => { const r = document.querySelector("#renderer-toggle").getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()');
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] });
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await delay(150);
  assert.equal(await evaluate('document.querySelector("#renderer-toggle").textContent'), 'Resume animation');
  console.log('PASS: touch portrait and touch pause.');
  await call('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate();
  assert(await evaluate('!document.querySelector("#renderer-fallback").hidden && document.querySelector("#renderer-canvas").hidden'));
  assert.equal(await evaluate('document.querySelectorAll("#work article").length'), 3);
  assert(await evaluate('document.querySelector("a[href^=mailto]") !== null'));
  console.log('PASS: essential content and static fallback without JavaScript.');
  await call('Emulation.setScriptExecutionDisabled', { value: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: 'HTMLCanvasElement.prototype.getContext = () => null;' });
  await navigate();
  await evaluate('document.querySelector("#renderer").scrollIntoView()');
  await delay(150);
  assert(await evaluate('!document.querySelector("#renderer-fallback").hidden && document.querySelector("#renderer-toggle").hidden'));
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: canvas failure fallback; zero uncaught browser errors.');
  console.log(await call('Browser.getVersion'));
} finally {
  socket.close();
  await fetch(`${endpoint}/json/close/${target.id}`);
}
