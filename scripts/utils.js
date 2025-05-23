import chalk from "chalk";

export function dateHeader() {
	const date = new Date().toLocaleString()
		.replace(",", "");

	return chalk.gray(`[${date}]`);
}

export function clamp(num, min, max) {
	return Math.min(Math.max(num, min), max);
}
