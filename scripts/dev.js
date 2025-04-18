import {copyFileSync, existsSync, mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {watch} from "chokidar";
import chalk from "chalk";
import dotenv from "dotenv";
import * as sass from "sass";

const dotenvResult = dotenv.config();
const themesDir = dotenvResult.parsed?.THEMES_DIR;

const srcDir = join(import.meta.dirname, "../src");
const srcPath = join(srcDir, "main.scss");
const distPath = join(import.meta.dirname, "../dist");
const devCssPath = join(distPath, "dev.css");

if (dotenvResult.error || !themesDir) {
	const envPath = join(import.meta.dirname, "../.env");
	const envExamplePath = join(import.meta.dirname, "../.env.example");

	console.log(chalk.red("In order to test this theme, set the "
		+ chalk.underline("THEMES_DIR") + " variable in .env to your client mod's "
		+ chalk.underline("themes") + " directory!"));
	console.log();

	if (!existsSync(envPath)) {
		copyFileSync(envExamplePath, envPath);
	}

	process.exit(1);
}

if (!existsSync(themesDir)) {
	console.log(chalk.red("Specified theme directory "
		+ chalk.underline("THEMES_DIR") + " in .env does not exist! "
		+ chalk.white("(")
		+ chalk.gray(chalk.dim(themesDir))
		+ chalk.white(")")));
	console.log();

	process.exit(1);
}

function dateHeader() {
	const date = new Date().toLocaleString()
		.replace(",", "");

	return chalk.gray(`[${date}]`);
}

function compile() {
	const remoteCssPath = join(themesDir, "dracula.theme.css");

	try {
		const result = sass.compile(srcPath, {
				sourceMap: false,
				style: "expanded",
				verbose: true,
			}
		);

		let header = `
/**
 * @name dracula
 * @description cute dracula theme for discord~
 * @author rushii
 * @version 1.0.0
 * @website https://github.com/rushiiMachine/discord-dracula
 */
`.trimStart();

		mkdirSync(distPath, {recursive: true});
		writeFileSync(devCssPath, header + result.css);
		writeFileSync(remoteCssPath, header + result.css);
		return true;
	} catch (e) {
		console.log(dateHeader() + chalk.red(" Failed to compile theme"));
		console.log(e.sassMessage ? e.message : e);
		return false;
	}
}

console.log(chalk.dim("Writing to theme directory " + chalk.gray(chalk.dim(themesDir))));
console.log();

if (process.argv.includes("--watch")) {
	console.log(dateHeader() + chalk.green(" Watching for changes..."));

	watch(srcDir).on("change", () => {
		if (compile()) {
			console.log(dateHeader() + chalk.green(" Successfully recompiled theme."));
		}
	});
}

if (compile()) {
	console.log(dateHeader() + chalk.green(" Successfully compiled theme."));
}
