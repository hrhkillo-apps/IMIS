
import * as XLSX from 'xlsx';

/**
 * Reads an Excel file and returns its data as an array of JSON objects.
 * @param {File} file 
 * @returns {Promise<Array<Object>>}
 */
const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays to preserve order
                resolve(jsonData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Compares two arrays of data (rows) and returns rows present in newFile but not in oldFile.
 * Assumes first row is header.
 * Uses strict row content comparison (all columns must match).
 * @param {File} oldFile 
 * @param {File} newFile 
 * @returns {Promise<Object>} { newRows: Array, error: String }
 */
export const compareExcelFiles = async (oldFile, newFile) => {
    try {
        const [oldData, newData] = await Promise.all([
            readExcelFile(oldFile),
            readExcelFile(newFile)
        ]);

        if (!oldData || oldData.length === 0) throw new Error("Old file is empty");
        if (!newData || newData.length === 0) throw new Error("New file is empty");

        // Headers should match roughly, but we process based on row content equality
        // We'll treat the first row of newFile as the header for the output
        const headers = newData[0];

        // Create a Set of stringified rows from oldData for O(1) lookup
        // robust stringify: join columns with a separator that is unlikely to be in data, or JSON.stringify
        const oldSet = new Set();

        // Skip header (index 0) for value comparison
        oldData.slice(1).forEach(row => {
            // Normalize row: trim strings, handle data types if needed. 
            // For now, JSON.stringify is a good enough signature for exact row match.
            oldSet.add(JSON.stringify(row));
        });

        const newRows = [];

        // Check new data
        newData.slice(1).forEach(row => {
            if (!oldSet.has(JSON.stringify(row))) {
                newRows.push(row);
            }
        });

        return { headers, newRows, count: newRows.length };

    } catch (err) {
        console.error("Comparison Error:", err);
        return { error: err.message };
    }
};

/**
 * Generates an Excel file from headers and rows.
 */
export const generateDifferenceExcel = (headers, rows) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NewEntries");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    XLSX.writeFile(wb, `tally_differences_${timestamp}.xlsx`);
};
