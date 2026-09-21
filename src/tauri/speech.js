// @ts-self-types="./speech.d.ts"

const PREFIX = 'audiogame-utils: native speech is unavailable.';

export async function createTauriSpeech() {
	let api;
	try {
		api = await import('tauri-plugin-prism-api');
	} catch (err) {
		console.warn(`${PREFIX} Install it with: npm install tauri-plugin-prism-api. Cause: ${err?.message ?? err}`);
		return null;
	}
	let info;
	try {
		info = await api.info();
	} catch (err) {
		console.warn(`${PREFIX} Register tauri_plugin_prism::init() in src-tauri/src/lib.rs and add prism:default to the capability file. Cause: ${err?.message ?? err}`);
		return null;
	}
	if (!info.available) {
		console.warn(`${PREFIX} Prism found no speech backend on this system.`);
		return null;
	}
	return {
		speak: api.speak,
		stop: api.stop,
		voices: async () => (await api.voices()).map(v => ({ id: String(v.id), name: v.name, language: v.language })),
		setVoice: id => api.setVoice(Number(id)),
		setRate: api.setRate,
		setPitch: api.setPitch,
		setVolume: api.setVolume,
		backendName: info.backend,
		features: info.features,
	};
}
