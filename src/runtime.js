// @ts-self-types="./runtime.d.ts"
// The dynamic import below is the only reference to Tauri outside `src/tauri/`.
// It lives in its own module because bundlers statically analyze dynamic imports
// and try to resolve their target. A web only game never imports this file, so a
// web only build never has to resolve `@tauri-apps/api`.

import { runtime } from './platform.js';

let started = null;

export function initRuntime(options = {}) {
	if (started) return started;

	if (runtime() !== 'tauri') {
		started = Promise.resolve('web');
		return started;
	}

	started = import('./tauri/index.js')
		.then(mod => mod.setup(options))
		.then(() => 'tauri')
		.catch(err => {
			started = null;
			throw new Error(
				'audiogame-utils: running under Tauri but the native adapters failed to load. ' +
				'Install the peer dependencies with npm: npm install @tauri-apps/api @tauri-apps/plugin-store. ' +
				'Or with Deno: deno add npm:@tauri-apps/api npm:@tauri-apps/plugin-store. ' +
				`Cause: ${err?.message ?? err}`
			);
		});

	return started;
}
