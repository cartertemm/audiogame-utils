import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DEPENDENCIES = [
	'audiogame-utils',
	'@tauri-apps/api',
	'@tauri-apps/plugin-store',
	'@tauri-apps/plugin-opener',
];

function packageManager(directory) {
	if (existsSync(join(directory, 'pnpm-lock.yaml'))) return 'pnpm';
	if (existsSync(join(directory, 'yarn.lock'))) return 'yarn';
	if (
		existsSync(join(directory, 'deno.lock')) ||
		existsSync(join(directory, 'deno.json')) ||
		existsSync(join(directory, 'deno.jsonc'))
	) return 'deno';
	return 'npm';
}

export function getProjectCommands(directory) {
	const manager = packageManager(directory);
	if (manager === 'deno') {
		return {
			install: `deno add ${DEPENDENCIES.map(name => `npm:${name}`).join(' ')}`,
			addPlugin: name => `deno task tauri add ${name}`,
			dev: 'deno task tauri dev',
		};
	}

	const install = manager === 'npm' ? 'npm install' : `${manager} add`;
	return {
		install: `${install} ${DEPENDENCIES.join(' ')}`,
		addPlugin: name => `npx --yes tauri add ${name}`,
		dev: manager === 'npm' ? 'npm run tauri dev' : `${manager} tauri dev`,
	};
}
