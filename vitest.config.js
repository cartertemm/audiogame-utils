import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The Tauri packages are optional peer dependencies, so tests resolve them to
// stubs instead of requiring an install.
const stub = name => fileURLToPath(new URL(`./tests/stubs/${name}.js`, import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@tauri-apps/plugin-store': stub('plugin-store'),
			'@tauri-apps/plugin-opener': stub('plugin-opener'),
			'@tauri-apps/api/window': stub('api-window'),
			'@tauri-apps/api/core': stub('api-core'),
		},
	},
	test: {
		environment: 'happy-dom',
		setupFiles: ['./tests/setup.js'],
		globals: false,
	},
});
