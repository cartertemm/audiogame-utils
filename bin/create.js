#!/usr/bin/env node
// Patches an existing Tauri project to use audiogame-utils.
//
// Run it with
// npx audiogame-utils create [dir]
// deno run -A jsr:@cartertemm/audiogame-utils/create [dir]

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { getProjectCommands } from './create-commands.js';

const CSP = [
	"default-src 'self'",
	"media-src 'self' asset: http://asset.localhost blob: data:",
	"img-src 'self' asset: http://asset.localhost data:",
	"style-src 'self' 'unsafe-inline'",
].join('; ');

const GAME_ENTRY = `import { initRuntime } from 'audiogame-utils/runtime';
import { createStorage, createSpeech } from 'audiogame-utils';
import { setTitle } from 'audiogame-utils/window';

await initRuntime();

const storage = createStorage('my-game');
const speech = createSpeech({ storage });

speech.init();
setTitle('My game');

const plays = (storage.get('plays', 0)) + 1;
storage.set('plays', plays);
await storage.flush();

speech.speak(\`Welcome back. This is run number \${plays}.\`);
`;

const createWorkflow = commands => `# Builds unsigned installers. Signing and notarization are per platform and
# need your own certificates: https://tauri.app/distribute/sign/
name: build

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
          - platform: macos-latest
          - platform: ubuntu-22.04

    runs-on: \${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Linux dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

${commands.workflowSetup}
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
${commands.workflowTauriScript ? `          tauriScript: ${commands.workflowTauriScript}\n` : ''}          tagName: \${{ github.ref_name }}
          releaseName: \${{ github.ref_name }}
          releaseDraft: true
`;

function fail(message) {
	console.error(message);
	process.exit(1);
}

function parseArgs(argv) {
	const flags = new Set(argv.filter(a => a.startsWith('--')));
	const positional = argv.filter(a => !a.startsWith('--') && a !== 'create');
	return {
		dir: positional[0] ?? '.',
		yes: flags.has('--yes'),
		ci: flags.has('--ci') ? true : flags.has('--no-ci') ? false : null,
	};
}

function run(command, dir) {
	console.log(`> ${command}`);
	execSync(command, { cwd: dir, stdio: 'inherit' });
}

function writeIfAbsent(path, contents) {
	if (existsSync(path)) {
		console.log(`kept existing ${path}`);
		return false;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, contents);
	console.log(`wrote ${path}`);
	return true;
}

function patchConfig(configPath) {
	let config;
	try {
		config = JSON.parse(readFileSync(configPath, 'utf8'));
	} catch (err) {
		fail(`Could not read ${configPath}: ${err.message}`);
	}
	config.app ??= {};
	config.app.security ??= {};
	const security = config.app.security;
	if (!security.csp) security.csp = CSP;
	// An empty scope keeps the protocol available without granting access to any  path.
	security.assetProtocol ??= { enable: true, scope: [] };
	writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
	console.log(`patched ${configPath}`);
}

async function ask(question, fallback) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = (await rl.question(`${question} [y/n] `)).trim().toLowerCase();
		if (answer === '') return fallback;
		return answer.startsWith('y');
	} finally {
		rl.close();
	}
}

const { dir, yes, ci } = parseArgs(process.argv.slice(2));
const configPath = join(dir, 'src-tauri', 'tauri.conf.json');
if (!existsSync(configPath)) {
	fail(
		`No Tauri project found at ${configPath}.\n` +
		'Create one first, then run this again:\n' +
		'  npm create tauri-app@latest'
	);
}
const commands = getProjectCommands(dir);
run(commands.install, dir);
run(commands.addPlugin('store'), dir);
run(commands.addPlugin('opener'), dir);
patchConfig(configPath);
writeIfAbsent(join(dir, 'src', 'game.js'), GAME_ENTRY);
const addCi = ci ?? (yes ? true : await ask('Add a GitHub Actions workflow building Windows, macOS, and Linux?', true));
if (addCi) writeIfAbsent(join(dir, '.github', 'workflows', 'build.yml'), createWorkflow(commands));
console.log('\nDone. Next:');
console.log('  1. Load src/game.js from your index.html');
console.log(`  2. ${commands.dev}`);
