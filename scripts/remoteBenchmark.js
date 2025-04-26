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

/** @param {CDP.Client} client */
async function runBenchmark(client) {
	const {Runtime} = client;

	// Load benchmark function
	await Runtime.evaluate({
		expression: benchScript,
	});

	// Run benchmarking for our built css
	/** @type EvaluateResponse */
	const result = await Runtime.evaluate({
		expression: `benchmarkSelectors(\`${css}\`)`,
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

	console.log(table.toString());
}

async function run() {
	/** @type CDP.Client */
	let client;

	console.log();
	console.log(dateHeader() + chalk.yellow(" Please note that repeatedly benchmarking the " +
		"same selectors on a running instance of Discord will yield optimized numbers, " +
		"that are not really accurate."));
	console.log(dateHeader() + chalk.yellow(" You should restart Discord between multiple " +
		"benchmarks via " + chalk.bold(chalk.underline("pnpm launchDiscord"))));
	console.log();

	try {
		// Connect to chrome debugging interface
		console.log(dateHeader() + " Connecting to chrome debugging port at 9222...");
		client = await CDP();
		console.log(dateHeader() + chalk.green(" Connected!"));

		// Log info about the target page
		const targets = await client.Target.getTargets();
		const targetPage = targets.targetInfos.find(t => t.type === "page");
		console.log(dateHeader() + " Target browser page:");
		console.log(targetPage);

		console.log();
		console.log(dateHeader() + " Running benchmark...");

		await runBenchmark(client);

		console.log();
		console.log(dateHeader() + chalk.green(" Finished benchmark! Wrote to " +
			chalk.bold(chalk.underline("benchmark.csv"))));
		console.log(dateHeader() + chalk.yellow(" Note that these benchmark results are " +
			"specific to the current screen opened in Discord!"));
		console.log(dateHeader() + chalk.yellow(" Running the benchmark on other screens " +
			"will produce different results."));
	} catch (err) {
		console.error(err);
		console.log();

		// CDP connection error
		if (err.message.includes("ECONNREFUSED")) {
			console.log(dateHeader() + chalk.yellow(" Failed to connect to the debugging " +
				"port! Was Discord launched with the " +
				chalk.underline(chalk.bold("--remote-debugging-port=9222")) +
				" flag?"));
		}

		console.log(dateHeader() + chalk.red(" Failed to run benchmark!"));
	} finally {
		await client?.close();
	}
}

run().then(_ => _);
