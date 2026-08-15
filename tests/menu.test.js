import { describe, test, expect } from 'vitest';
import { createMenuSounds } from '../src/ui/menuSounds.js';

// Records what the menu asked the audio instance to build and play.
function fakeAudio() {
	const built = [];
	const played = [];
	return {
		built,
		played,
		sfx(source) {
			built.push(source);
			return { play: () => played.push(source) };
		},
	};
}

describe('menuSounds', () => {
	test('applies the prefix and suffix to a string source', () => {
		const audio = fakeAudio();
		const sounds = createMenuSounds({
			audio,
			prefix: 'sounds/',
			suffix: '.ogg',
			sources: { click: 'click' },
		});
		sounds.play('click');
		expect(audio.built).toEqual(['sounds/click.ogg']);
		expect(audio.played).toEqual(['sounds/click.ogg']);
	});

	test('builds each handle once', () => {
		const audio = fakeAudio();
		const sounds = createMenuSounds({ audio, sources: { click: 'a.ogg' } });
		sounds.play('click');
		sounds.play('click');
		expect(audio.built).toEqual(['a.ogg']);
		expect(audio.played).toEqual(['a.ogg', 'a.ogg']);
	});

	test('passes a loader function through untouched', () => {
		const audio = fakeAudio();
		const loader = () => 'ignored';
		const sounds = createMenuSounds({
			audio,
			prefix: 'sounds/',
			suffix: '.ogg',
			sources: { click: loader },
		});
		sounds.play('click');
		expect(audio.built).toEqual([loader]);
	});

	test('uses an existing handle directly and never rebuilds it', () => {
		const audio = fakeAudio();
		const plays = [];
		const handle = { play: () => plays.push(1) };
		const sounds = createMenuSounds({ audio, sources: { click: handle } });
		sounds.play('click');
		expect(audio.built).toEqual([]);
		expect(plays.length).toBe(1);
	});

	test('is silent without an audio instance', () => {
		const sounds = createMenuSounds({ audio: null, sources: { click: 'click.ogg' } });
		expect(() => sounds.play('click')).not.toThrow();
	});

	test('is silent for an unset or unknown sound', () => {
		const audio = fakeAudio();
		const sounds = createMenuSounds({ audio, sources: { click: '' } });
		sounds.play('click');
		sounds.play('nosuchsound');
		expect(audio.built).toEqual([]);
	});
});
