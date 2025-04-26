import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import chalk from "chalk";
import * as sass from "sass";

import {dateHeader} from "./utils.js";

const srcPath = join(import.meta.dirname, "../src/main.scss");
const distPath = join(import.meta.dirname, "../dist");
const outCssPath = join(distPath, "main.css");
const outMapPath = join(distPath, "main.css.map");

try {
	let output = `
/**
 * @name dracula
 * @description cute dracula theme for discord~
 * @author rushii
 * @website https://github.com/rushiiMachine/discord-dracula
 */
/* This file is not versioned and is not linked to an update URL! */
`.trimStart();

	const result = sass.compile(srcPath, {
			sourceMap: true,
			style: "compressed",
			verbose: true,
		}
	);

	output += result.css;
	output += "\n/*# sourceMappingURL=main.css.map */";

	mkdirSync(distPath, {recursive: true});
	writeFileSync(outCssPath, output);
	writeFileSync(outMapPath, JSON.stringify(result.sourceMap));

	console.log(dateHeader() + chalk.green(" Successfully compiled theme."));
} catch (e) {
	console.log(dateHeader() + chalk.red(" Failed to compile theme"));
	console.log(e.sassMessage ? e.message : e);
}
