import {readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "csv-parse/sync";
import CDP from "chrome-remote-interface";
import Table from "cli-table3";

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

	try {
		// Connect to chrome debugging interface
		client = await CDP();

		await runBenchmark(client);
	} catch (err) {
		console.error(err);
	} finally {
		await client?.close();
	}
}

run().then(_ => _);
