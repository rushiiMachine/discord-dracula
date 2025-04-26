import chalk from "chalk";

export function dateHeader() {
	const date = new Date().toLocaleString()
		.replace(",", "");

	return chalk.gray(`[${date}]`);
}
