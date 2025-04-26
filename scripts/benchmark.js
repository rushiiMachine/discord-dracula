// Based on https://github.com/refact0r/system24/blob/main/benchmark/benchmark.js
// MIT License Copyright (c) 2024 refact0r

// The $benchmarkSelectors(css) function should be used within a DOM environment.

function $extractSelectors(css) {
	// Remove comments
	css = css.replace(/\/\*[\s\S]*?\*\//g, '');

	// Remove nested brackets
	let result = '';
	let depth = 0;
	for (let char of css) {
		if (char === '{') depth++;
		else if (char === '}') depth--;
		else if (depth === 0) result += char;
	}
	css = result;

	return css
		// Split by commas or newline
		.split(/,(?![^(]*\))|[\n\r]+/)
		// Trim pseudo-elements
		.map((s) => s.trim().replace(/::(?:before|after)/, ''))
		// Remove empty strings
		.filter(Boolean)
		// Remove non-selectors
		.filter(s => !["@charset", "@import", "@keyframes",].find(i => s.startsWith(i)));
}

function $benchmarkSelector(selector) {
	// Going higher doesn't mean more accurate results, just that
	// chromium has optimized for that specific selector making it seem faster.
	const runCount = 100;

	const start = performance.now();
	let matches = 0;

	for (let i = 0; i < runCount; i++)
		matches = document.querySelectorAll(selector).length;

	return [(performance.now() - start) / runCount, matches];
}

function $benchmarkSelectors(css) {
	return $extractSelectors(css)
		.map((selector) => {
			try {
				const [time, matches] = $benchmarkSelector(selector);
				return {selector, time, matches};
			} catch (error) {
				console.error(`Error benchmarking "${selector}": ${error.message}`);
				return null;
			}
		})
		.filter(Boolean) // Remove failed benchmarks
		.sort((a, b) => b.time - a.time) // Sort by time descending
		.map(({selector, time, matches}) =>
			`"${selector.replaceAll('"', '""')}",${time.toFixed(4)},${matches}`)
		.join('\n')
		.replace(/^/, 'Selector,Time (ms),Matches\n'); // Add CSV headers
}
