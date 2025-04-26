import {copyFileSync, existsSync} from "node:fs";
import {basename, join} from "node:path";
import {execSync, spawn} from "node:child_process";
import chalk from "chalk";
import dotenv from "dotenv";
import * as os from "node:os";

import {dateHeader} from "./utils.js";

const dotenvResult = dotenv.config();
const electronPath = dotenvResult.parsed?.DISCORD_EXE;

if (dotenvResult.error || !electronPath) {
	const envPath = join(import.meta.dirname, "../.env");
	const envExamplePath = join(import.meta.dirname, "../.env.example");

	console.log(chalk.red("In order to launch discord with the debugging flag, set the "
		+ chalk.underline("DISCORD_EXE") +
		" variable in .env to either Discord's or Vesktop's executable!"));

	console.log();

	if (!existsSync(envPath)) {
		copyFileSync(envExamplePath, envPath);
	}

	process.exit(1);
}

if (!existsSync(electronPath)) {
	console.log(chalk.red("Specified Discord executable by the "
		+ chalk.underline("DISCORD_EXE") + " variable in .env does not exist! "
		+ chalk.white("(")
		+ chalk.gray(chalk.dim(electronPath))
		+ chalk.white(")")));
	console.log();

	process.exit(1);
}

// Check that the path is not the Squirrel updater
if (basename(electronPath).startsWith("Update")) {
	console.log(chalk.red("Specified Discord executable is not Electron, " +
		"but a Squirrel updater! Make sure to specify the "
		+ chalk.bold("Discord*.exe") +
		" located in one of the "
		+ chalk.bold("app-1.0.*") +
		" directories!"));
	console.log();

	process.exit(1);
}

console.log(dateHeader() + " Targeting " + chalk.dim(chalk.bold(electronPath)));

try {
	// Kill any running instances
	console.log(dateHeader() + " Killing any existing instances...");
	for (const pid of await getPidsByExecutablePath(electronPath)) {
		try {
			console.log(dateHeader() + ` Killing pid ${pid}`);
			process.kill(parseInt(pid));
		} catch (e) {
			console.log(dateHeader() + chalk.yellow(` Failed to kill pid ${pid}`));
		}
	}

	console.log(dateHeader() + " Launching Discord...");

	// Spawn new process and detach it
	const proc = spawn(electronPath, ["--remote-debugging-port=9222"], {
		detached: true,
		stdio: ["ignore", "ignore", "ignore",]
	});
	proc.unref();

	console.log(dateHeader() + chalk.green(" Successfully launched Discord with " +
		chalk.bold("--remote-debugging-port=9222")));
} catch (e) {
	console.log(e);
	console.log();
	console.log(dateHeader() + chalk.red(" Failed to launch Discord!"));
}

/**
 * Get a list of PIDs for processes matching a specific executable path.
 * Works on Windows and Linux..
 *
 * @param {string} execPath - Full path to the executable
 * @returns {Promise<string[]>} - Array of matching process IDs
 */
async function getPidsByExecutablePath(execPath) {
	const platform = os.platform();

	let command;
	if (platform === 'win32') {
		command = `powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq '${execPath}' } | Select-Object -ExpandProperty ProcessId"`;
	} else if (platform === 'darwin') {
		throw "macOS support is unimplemented!";
	} else {
		const escaped = execPath.replace(/(["'$`\\])/g, '\\$1');
		command = `pidof '${escaped}' | sed 's/ /\\n/'`;
	}

	const stdout = execSync(command, {
		stdio: ["ignore", null, "inherit"], // stdin, stdout, stderr
	}).toString();

	return stdout
		.trim()
		.split('\n')
		.map(pid => pid.trim())
		.filter(Boolean);
}
