const XLSX = require('xlsx');
const fs = require('fs');

const filename = '08.12.2025.xlsx';

try {
    if (!fs.existsSync(filename)) {
        console.error(`File ${filename} not found!`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Get headers (first row)
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = { c: C, r: range.s.r };
        const cellRef = XLSX.utils.encode_cell(cellAddress);
        const cell = worksheet[cellRef];
        headers.push(cell ? cell.v : `UNKNOWN_${C}`);
    }

    // Get first 5 rows of data
    const data = XLSX.utils.sheet_to_json(worksheet, { header: headers, range: 1, defval: null });

    const output = {
        sheetName,
        range: worksheet['!ref'],
        headers,
        sampleData: data.slice(0, 5)
    };

    fs.writeFileSync('analysis_result.json', JSON.stringify(output, null, 2));
    console.log('Analysis written to analysis_result.json');

} catch (error) {
    console.error('Error reading excel file:', error);
}
