// Loads nerva-v11-core.jsx (plain JS that expects React and window globals)
// into node for testing. Returns the object the file assigns onto window:
// { v11_evaluate, V11_SCENARIOS, v11_effectiveRisk, ... }.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CORE_PATH = path.join(REPO_ROOT, 'nerva-v11-core.jsx');
export const GATE_PATH = path.join(REPO_ROOT, 'nerva-v11-gate.js');

export function loadV11CoreFromSource(src) {
  const win = {};
  const noop = () => {};
  const React = {
    createContext: () => ({ Provider: {} }),
    useContext: noop, useState: noop, useMemo: noop, useEffect: noop, useCallback: noop, useRef: noop,
    createElement: noop,
  };
  const fn = new Function('React', 'window', 'fetch', src + '\nreturn window;');
  return fn(React, win, undefined);
}

export function loadV11Core(p = CORE_PATH) {
  return loadV11CoreFromSource(fs.readFileSync(p, 'utf8'));
}

export async function loadGate(p = GATE_PATH) {
  const mod = await import(path.resolve(p));
  return mod.default;
}
