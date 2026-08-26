/**
 * Conversions between NVGT audio units and Web Audio units.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/audio.md | audio guide}.
 *
 * @module
 */
/** Converts decibels from `-100` through `0` to linear volume. */
export function db_to_volume(db: number): number;
/** Converts linear volume to decibels from `-100` through `0`. */
export function volume_to_db(volume: number): number;
/** Converts NVGT pan from `-100` through `100` to stereo pan from `-1` through `1`. */
export function pan_to_stereo(pan: number): number;
/** Converts stereo pan from `-1` through `1` to NVGT pan from `-100` through `100`. */
export function stereo_to_pan(stereo: number): number;
/** Converts NVGT pitch percentage to a playback rate multiplier. */
export function pitch_to_rate(pitch: number): number;
/** Converts a playback rate multiplier to NVGT pitch percentage. */
export function rate_to_pitch(rate: number): number;
/** Returns gain for Web Audio's inverse distance model. */
export function inverse_gain(distance: number, ref_distance?: number, rolloff?: number): number;
