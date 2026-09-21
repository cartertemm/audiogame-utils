const DELAY_LOAD_ENV = 'DEP_TAURI_PLUGIN_PRISM_DELAY_LOAD_DLLS';
const BUILD_CALL = /^([ \t]*)tauri_build::build\(\);?[ \t]*\r?$/m;

export function addDelayLoad(source) {
	if (source.includes(DELAY_LOAD_ENV)) return source;
	const match = source.match(BUILD_CALL);
	if (!match) return null;
	const indent = match[1];
	const step = indent.includes('\t') ? '\t' : '    ';
	const eol = source.includes('\r\n') ? '\r\n' : '\n';
	const lines = [
		`${indent}if let Ok(dlls) = std::env::var("${DELAY_LOAD_ENV}") {`,
		`${indent}${step}for dll in dlls.split(';') {`,
		`${indent}${step}${step}println!("cargo:rustc-link-arg=/DELAYLOAD:{dll}");`,
		`${indent}${step}}`,
		`${indent}}`,
	];
	return source.replace(BUILD_CALL, call => `${lines.join(eol)}${eol}${call}`);
}
