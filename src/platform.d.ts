/**
 * Browser platform and installed application detection.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/platform.md | platform guide}.
 *
 * @module
 */
/** Returns whether the current browser identifies as iOS or iPadOS. */
export function isIOS(): boolean;
/** Returns whether the page runs as an installed standalone app on iOS or iPadOS. */
export function isIOSStandalone(): boolean;
