import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { getProjectCommands } from '../bin/create-commands.js';

const temporaryDirectories = [];

function createProject(files) {
	const directory = mkdtempSync(join(tmpdir(), 'audiogame-utils-create-'));
	temporaryDirectories.push(directory);
	for (const file of files) writeFileSync(join(directory, file), '');
	return directory;
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe('create command selection', () => {
	test('uses Deno commands for a Deno project', () => {
		const directory = createProject(['deno.json']);
		const commands = getProjectCommands(directory);

		expect(commands.install).toBe(
			'deno add npm:audiogame-utils npm:@tauri-apps/api npm:@tauri-apps/plugin-store npm:@tauri-apps/plugin-opener'
		);
		expect(commands.addPlugin('store')).toBe('deno task tauri add store');
		expect(commands.dev).toBe('deno task tauri dev');
		expect(typeof commands.workflowSetup).toBe('string');
		expect(commands.workflowSetup).toContain('uses: denoland/setup-deno@v2');
		expect(commands.workflowSetup).toContain('run: deno install');
		expect(commands.workflowSetup).not.toContain('npm ci');
		expect(commands.workflowTauriScript).toBe('deno task tauri');
	});
});
