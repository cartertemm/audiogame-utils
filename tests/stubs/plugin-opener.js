// Stands in for `@tauri-apps/plugin-opener` under test.

export const opened = [];

export function reset() {
	opened.length = 0;
}

export async function openUrl(url) {
	opened.push(url);
}
