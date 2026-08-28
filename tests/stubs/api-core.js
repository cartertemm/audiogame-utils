// Stands in for `@tauri-apps/api/core` under test.

export function convertFileSrc(path) {
	return `asset://localhost/${encodeURIComponent(path)}`;
}
