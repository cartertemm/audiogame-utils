/**
 * Shared reverb bus with named presets.
 *
 * @module
 */

/** Tunable reverb parameters. */
export interface ReverbOptions {
	/** Reverberation time in seconds. */
	decayTime?: number;
	/** High frequency damping from `0` through `1`. */
	damping?: number;
	/** Delay before the wet signal in seconds. */
	preDelay?: number;
	/** Diffusion amount from `0` through `1`. */
	diffusion?: number;
}

/** Options for {@link Reverb.set}. */
export interface ReverbSetOptions {
	/** Ramp time in seconds. Defaults to `0.5`. `0` applies at once. */
	ramp?: number;
}

/** The engine's reverb bus. */
export interface Reverb {
	/** Named parameter sets the game fills in. */
	readonly presets: Record<string, ReverbOptions>;
	/** The bus input node, or `null` before the first `set` call builds it. */
	readonly input: any;
	/** Calls `listener` with the bus input node once it exists. */
	onInput(listener: (input: any) => void): void;
	/** Applies a preset by name or raw options. `null` fades the reverb out. */
	set(target: string | ReverbOptions | null, options?: ReverbSetOptions): Promise<void>;
}

/** Creates a reverb bus that builds itself on the first `set` call. */
export function createReverb(getCacophony: () => Promise<any>): Reverb;
