// Conversions between NVGT audio units and Web Audio units.
// NVGT volume is decibels (0 is full, -100 is silence), pan is -100 to 100, and
// pitch is a percentage where 100 is normal speed.

export function db_to_volume(db) {
	if (db <= -100) return 0;
	return Math.pow(10, db / 20);
}

export function volume_to_db(volume) {
	if (volume <= 0) return -100;
	return 20 * Math.log10(volume);
}

export function pan_to_stereo(pan) {
	return Math.min(Math.max(pan / 100, -1), 1);
}

export function stereo_to_pan(stereo) {
	return stereo * 100;
}

export function pitch_to_rate(pitch) {
	return pitch / 100;
}

export function rate_to_pitch(rate) {
	return rate * 100;
}

// The gain a PannerNode would apply with distanceModel "inverse". Use this when
// panning in stereo, where the browser does no distance attenuation.
export function inverse_gain(distance, ref_distance = 1, rolloff = 1) {
	if (distance <= ref_distance) return 1;
	return ref_distance / (ref_distance + rolloff * (distance - ref_distance));
}
