import {writeFileSync} from "node:fs";
import {join} from "node:path";
import chalk from "chalk";
import * as sass from "sass";

const srcPath = join(import.meta.dirname, "../src/main.scss");
const outCssPath = join(import.meta.dirname, "../dist/main.css");
const outMapPath = join(import.meta.dirname, "../dist/main.css.map");

function dateHeader() {
	const date = new Date().toLocaleString()
		.replace(",", "");

	return chalk.gray(`[${date}]`);
}

try {
	let output = `
/**
 * @name dracula
 * @description cute dracula theme for discord~
 * @author rushii
 * @version 1.0.0
 * @website https://github.com/rushiiMachine/discord-dracula
 * @source https://dracula.rushii.dev/main.css
 */
`.trimStart();

	const result = sass.compile(srcPath, {
			sourceMap: true,
			style: "compressed",
			verbose: true,
		}
	);

	output += result.css;
	output += "\n/*# sourceMappingURL=main.css.map */";

	writeFileSync(outCssPath, output)
	writeFileSync(outMapPath, JSON.stringify(result.sourceMap));

	console.log(dateHeader() + chalk.green(" Successfully compiled theme."));
} catch (e) {
	console.log(dateHeader() + chalk.red(" Failed to compile theme"));
	console.log(e.sassMessage ? e.message : e);
}
