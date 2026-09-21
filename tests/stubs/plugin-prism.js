export const state = {
	info: { available: true, backend: 'NVDA', features: { voice: true, rate: true, pitch: true, volume: true } },
	infoError: null,
	voices: [{ id: 0, name: 'Zira', language: 'en-US' }],
	calls: [],
};

export function reset(overrides = {}) {
	state.info = { available: true, backend: 'NVDA', features: { voice: true, rate: true, pitch: true, volume: true } };
	state.infoError = null;
	state.voices = [{ id: 0, name: 'Zira', language: 'en-US' }];
	state.calls = [];
	Object.assign(state, overrides);
}

function record(name, ...args) {
	state.calls.push([name, ...args]);
	return Promise.resolve();
}

export async function info() {
	if (state.infoError) throw state.infoError;
	return state.info;
}

export const speak = (text, interrupt = false) => record('speak', text, interrupt);
export const stop = () => record('stop');
export const voices = async () => state.voices;
export const setVoice = id => record('setVoice', id);
export const setRate = value => record('setRate', value);
export const setPitch = value => record('setPitch', value);
export const setVolume = value => record('setVolume', value);
