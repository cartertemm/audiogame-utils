export function db_to_volume(db: number): number;
export function volume_to_db(volume: number): number;
export function pan_to_stereo(pan: number): number;
export function stereo_to_pan(stereo: number): number;
export function pitch_to_rate(pitch: number): number;
export function rate_to_pitch(rate: number): number;
// The gain a PannerNode would apply with distanceModel "inverse".
export function inverse_gain(distance: number, ref_distance?: number, rolloff?: number): number;
