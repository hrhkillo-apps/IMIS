import * as XLSX from 'xlsx';

/**
 * Expected columns in the Commitment Excel file (based on user image).
 */
const EXPECTED_COMMITMENT_COLUMNS = [
    "NAME OF THE VENDOR",
    "NAME OF THE BENEFICIARY",
    "CFMS ID",
    "Original Name",
    "Original Aadhar Number",
    "AADHAR NUMBER",
    "IFSC Code",
    "ACCOUNT NUMBER",
    "Total Accounts count",
    "Proposed Accounts count",
    "Proposed Payment Individual",
    "Proposed Payment Vendor",
    "Credited Accounts count",
    "Credited Payment Individual",
    "Credited Payment Vendor",
    "My Share"
];

/**
 * Processes the Commitment and CFMS data.
 * Merges relevant commitment info into CFMS data for analysis.
 * 
 * @param {Array} commitmentData - JSON array of commitment excel rows
 * @param {Array} cfmsData - JSON array of cfms excel rows
 */
export const processCommitments = (commitmentData, cfmsData) => {
    // 1. Validate Commitment Headers
    if (!commitmentData || commitmentData.length === 0) {
        throw new Error("Commitment file is empty.");
    }

    const commitmentHeaders = Object.keys(commitmentData[0]);

    // Identify "new" columns or simply ensure critical data exists.
    // For now, checks if we have at least one common key to join, e.g., CFMS ID
    const hasCfmsId = commitmentHeaders.some(h => h.toUpperCase().includes("CFMS ID"));

    // 2. Index Commitment Data by CFMS ID (or Account Number if CFMS ID missing)
    // We'll normalize keys to be safe.
    const commitmentMap = new Map();

    commitmentData.forEach(row => {
        // Find the actual key that corresponds to CFMS ID
        const cfmsIdKey = Object.keys(row).find(k => k.toUpperCase().includes("CFMS ID"));
        const id = cfmsIdKey ? String(row[cfmsIdKey]).trim() : null;

        if (id) {
            commitmentMap.set(id, row);
        }
    });

    // 3. Deep Investigation / Merge
    // Iterate over CFMS data and append Commitment info if found
    const mergedResults = cfmsData.map(row => {
        // Assume CFMS file also has a "CFMS ID" or similar identifier. 
        // If strict column names aren't known for CFMS file, we try standard ones.
        const cfmsIdKey = Object.keys(row).find(k => k.toUpperCase().includes("CFMS ID") || k.toUpperCase() === "ID");
        const id = cfmsIdKey ? String(row[cfmsIdKey]).trim() : null;

        const commitmentRow = id ? commitmentMap.get(id) : null;

        if (commitmentRow) {
            return {
                ...row,
                ...commitmentRow, // Merge all columns from commitment
                _Status: "Matched in Commitments"
            };
        } else {
            return {
                ...row,
                _Status: "Not Found in Commitments"
            };
        }
    });

    return mergedResults;
};
