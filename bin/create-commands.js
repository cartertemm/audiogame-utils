import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DEPENDENCIES = [
	'audiogame-utils',
	'@tauri-apps/api',
	'@tauri-apps/plugin-store',
	'@tauri-apps/plugin-opener',
];

const DENO_WORKFLOW_SETUP = `      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - run: deno install`;

const NODE_WORKFLOW_SETUP = `      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci`;

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
			workflowSetup: DENO_WORKFLOW_SETUP,
			workflowTauriScript: 'deno task tauri',
		};
	}
	const install = manager === 'npm' ? 'npm install' : `${manager} add`;
	return {
		install: `${install} ${DEPENDENCIES.join(' ')}`,
		addPlugin: name => `npx --yes tauri add ${name}`,
		dev: manager === 'npm' ? 'npm run tauri dev' : `${manager} tauri dev`,
		workflowSetup: NODE_WORKFLOW_SETUP,
		workflowTauriScript: null,
	};
}
