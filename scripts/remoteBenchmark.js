import {readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "csv-parse/sync";
import chalk from "chalk";
import Table from "cli-table3";
import CDP from "chrome-remote-interface";

import {dateHeader} from "./utils.js";

const cssPath = join(import.meta.dirname, "../dist/dev.css");
const outCsvPath = join(import.meta.dirname, "../benchmark.csv");
const benchScriptPath = join(import.meta.dirname, "./benchmark.js");

const css = readFileSync(cssPath, {encoding: "utf-8"});
const benchScript = readFileSync(benchScriptPath, {encoding: "utf-8"});

/**
 * Runs the benchmarking through a CDP connection specific to the target execution context.
 * @param {CDP.Client} client
 */
async function runBenchmark(client) {
	const {Runtime} = client;

	// Load benchmarking functions & disable optimization for them
	await Runtime.evaluate({
		returnByValue: false,
		expression: benchScript + `;
			%NeverOptimizeFunction($benchmarkSelector);
			%NeverOptimizeFunction($benchmarkSelectors);
			%DeoptimizeFunction($benchmarkSelector);
			%DeoptimizeFunction($benchmarkSelectors);
		`,
	});

	// Run benchmarking for our built css
	/** @type EvaluateResponse */
	const result = await Runtime.evaluate({
		expression: `$benchmarkSelectors(\`${css}\`)`,
	});

	/** @type string */
	const csv = result.result.value;

	// Dump csv to file
	writeFileSync(outCsvPath, csv);

	// Parse CSV results
	const lines = parse(csv, {
		skipEmptyLines: true,
	});

	// Make a table from the csv
	const table = new Table({
		head: lines.shift(),
		colWidths: [110, 11, 9],
	});
	table.push(...lines);

	console.log();
	console.log(table.toString());
}

async function run() {
	/** @type CDP.Client */
	let client;

	try {
		console.log();
		console.log(dateHeader() + " Finding debugging targets...");
		const targets = await CDP.List({port: 9222})
		const target = targets.find(t =>
			t.type === "page" && t.url !== t.title && t.url.startsWith("https://discord.com/"))

		if (!target) {
			console.log(dateHeader() + chalk.yellow(" Failed to find Discord page target! " +
				"Was Discord launched via the " +
				chalk.bold(chalk.underline("pnpm launchDiscord")) +
				" command?"));
			return;
		}
		console.log(dateHeader() +
			chalk.green(" Found debugging url: ") +
			chalk.dim(chalk.gray(target.webSocketDebuggerUrl)) +
			", title: " +
			chalk.dim(chalk.gray(target.title)));

		// Connect to the chrome debugging interface
		console.log(dateHeader() + " Connecting to the debugger interface...");
		client = await CDP({target: target.webSocketDebuggerUrl});
		console.log(dateHeader() + chalk.green(" Connected!"));

		console.log(dateHeader() + " Running benchmark...");
		await runBenchmark(client);

		console.log();
		console.log(dateHeader() + chalk.green(" Finished benchmark! Wrote to " +
			chalk.bold(chalk.underline("benchmark.csv"))));
		console.log(dateHeader() + chalk.yellow(" Note that these benchmark results are " +
			"specific to the current screen opened in Discord!"));
		console.log(dateHeader() + chalk.yellow(" Changes to the current layout " +
			"will produce different results."));
	} catch (err) {
		console.error(err);
		console.log();

		// CDP connection error
		if (err.message.includes("ECONNREFUSED")) {
			console.log(dateHeader() + chalk.yellow(" Failed to connect to the debugging " +
				"port! Was Discord launched via the " +
				chalk.bold(chalk.underline("pnpm launchDiscord")) +
				" command?"));
		}

		console.log(dateHeader() + chalk.red(" Failed to run benchmark!"));
	} finally {
		await client?.close();
	}
}

run().then(_ => _);
