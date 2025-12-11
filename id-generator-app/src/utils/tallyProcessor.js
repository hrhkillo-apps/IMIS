
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
 * Identification is based STRICTLY on the 'Ticket Number' column.
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

        const headers = newData[0];

        // Find "Ticket Number" index
        const ticketIndex = headers.findIndex(h => h && h.toString().trim() === 'Ticket Number');

        if (ticketIndex === -1) {
            throw new Error("Column 'Ticket Number' not found in the latest file. Please ensure both files have this column.");
        }

        // Create a Set of Ticket Numbers from oldData
        const oldTicketSet = new Set();

        // Skip header (index 0)
        oldData.slice(1).forEach(row => {
            const ticket = row[ticketIndex];
            if (ticket) {
                oldTicketSet.add(String(ticket).trim());
            }
        });

        const newRows = [];

        // Check new data
        newData.slice(1).forEach(row => {
            const ticket = row[ticketIndex];
            // If ticket is present and NOT in old set, it's a new row
            if (ticket && !oldTicketSet.has(String(ticket).trim())) {
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
    // Force .xlsx extension and type
    XLSX.writeFile(wb, `tally_differences_${timestamp}.xlsx`, { bookType: 'xlsx', type: 'array' });
};
