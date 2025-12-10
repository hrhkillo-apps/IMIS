/* eslint-env node */
// Mock localStorage
/* eslint-disable no-undef */
global.localStorage = {
    getItem: () => "0",
    setItem: () => { }
};

import { analyzeContext } from '../src/utils/dataAnalyzer.js';
import { synthesizeRows } from '../src/utils/dataSynthesizer.js';

// Mock Data
const headers = ["ID", "Name", "District", "Mandal", "Category", "Ticket Number"];
const data = [
    ["1", "John Doe", "DistA", "MandalX", "SC", "2001"],
    ["2", "Jane Smith", "DistA", "MandalX", "ST", "2002"]
];

console.log("=== Starting Diagnostic Test ===");

// 1. Analyze
console.log("Analyzing mock data...");
const context = analyzeContext(data, headers);
console.log("Context Analysis Result:");
console.log("- District Mode:", context.districtMode);
console.log("- Category Options:", context.columnOptions['Category']);
console.log("- Max Ticket:", context.maxIds.ticket);

// 2. Synthesize
console.log("\nSynthesizing 5 rows...");
const existingIds = {
    ticket: new Set(["2001", "2002"]),
    ftr: new Set(),
    reg: new Set()
};

const currentMaxIds = {
    ticket: 2002,
    ftr: 0,
    reg: 0
};

const newRows = synthesizeRows(5, context, headers, existingIds, currentMaxIds);

console.log(`\nGenerated ${newRows.length} rows.`);
newRows.forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row));
});

if (newRows.length === 5 && newRows[0].length === headers.length) {
    console.log("\nSUCCESS: Logic is functional.");
} else {
    console.log("\nFAILURE: Logic produced incorrect output.");
}
