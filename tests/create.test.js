import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { getProjectCommands } from '../bin/create-commands.js';
import { addDelayLoad } from '../bin/create-patches.js';

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
	test('uses npx for an npm project without a package script', () => {
		const directory = createProject([]);

		expect(getProjectCommands(directory).dev).toBe('npx tauri dev');
	});

	test('uses Deno commands for a Deno project', () => {
		const directory = createProject(['deno.json']);
		const commands = getProjectCommands(directory);

		expect(commands.install).toBe(
			'deno add npm:audiogame-utils npm:@tauri-apps/api npm:@tauri-apps/plugin-store npm:@tauri-apps/plugin-opener npm:tauri-plugin-prism-api'
		);
		expect(commands.addPlugin('store')).toBe('deno task tauri add store');
		expect(commands.dev).toBe('deno task tauri dev');
		expect(typeof commands.workflowSetup).toBe('string');
		expect(commands.workflowSetup).toContain('uses: denoland/setup-deno@v2');
		expect(commands.workflowSetup).toContain('run: deno install');
		expect(commands.workflowSetup).not.toContain('npm ci');
		expect(commands.workflowTauriScript).toBe('deno task tauri');
	});

	test('generated workflows can create draft releases', () => {
		// Normalized so the assertion holds on Windows checkouts, where git hands
		// the file back with CRLF line endings.
		const source = readFileSync(join(process.cwd(), 'bin', 'create.js'), 'utf8').replace(/\r\n/g, '\n');

		expect(source).toContain('permissions:\n  contents: write');
	});
});

describe('build script delay loading', () => {
	const TEMPLATE = 'fn main() {\n    tauri_build::build()\n}\n';
	const PATCHED = [
		'fn main() {',
		'    if let Ok(dlls) = std::env::var("DEP_TAURI_PLUGIN_PRISM_DELAY_LOAD_DLLS") {',
		"        for dll in dlls.split(';') {",
		'            println!("cargo:rustc-link-arg=/DELAYLOAD:{dll}");',
		'        }',
		'    }',
		'    tauri_build::build()',
		'}',
		'',
	].join('\n');

	test('inserts the delay-load lines before the Tauri build call', () => {
		expect(addDelayLoad(TEMPLATE)).toBe(PATCHED);
	});

	test('leaves an already patched script unchanged', () => {
		expect(addDelayLoad(PATCHED)).toBe(PATCHED);
	});

	test('follows tab indentation and a trailing semicolon', () => {
		const patched = addDelayLoad('fn main() {\n\ttauri_build::build();\n}\n');
		expect(patched).toContain('\n\tif let Ok(dlls)');
		expect(patched).toContain('\n\t\t\tprintln!');
		expect(patched).toContain('\n\ttauri_build::build();\n');
	});

	test('keeps CRLF line endings', () => {
		const patched = addDelayLoad(TEMPLATE.replace(/\n/g, '\r\n'));
		expect(patched).toBe(PATCHED.replace(/\n/g, '\r\n'));
	});

	test('returns null when the build call is not found', () => {
		expect(addDelayLoad('fn main() {\n    custom::build()\n}\n')).toBe(null);
	});
});
