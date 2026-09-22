export function ramp_param(param, value, seconds, context) {
	const now = context.currentTime;
	param.cancelScheduledValues(now);
	if (seconds > 0) {
		param.setValueAtTime(param.value, now);
		param.linearRampToValueAtTime(value, now + seconds);
	} else {
		param.setValueAtTime(value, now);
	}
}
