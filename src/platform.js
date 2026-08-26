// @ts-self-types="./platform.d.ts"
export function isIOS() {
	const ua = navigator.userAgent || '';
	if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return true;
	// iPadOS 13 and later can report a Macintosh user agent with multiple
	// supported touch points.
	if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
	return false;
}

export function isIOSStandalone() {
	return isIOS() && window.navigator.standalone === true;
}
