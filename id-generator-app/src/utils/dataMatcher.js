/**
 * Matches SAC Excel Data with CFMS PDF Data
 * Key: Account Number
 */
export const matchAndMerge = (sacData, cfmsData) => {
    // 1. Index CFMS data for O(1) lookup
    // Normalizing Account Number (trim, string conversion) to ensure matches
    const cfmsMap = new Map();

    cfmsData.forEach(record => {
        if (record.accountNumber) {
            // Key cleaning: remove spaces, ensure string
            const key = String(record.accountNumber).trim();
            // Store the whole record, or handle duplicates (last wins, or merge?)
            // Assuming 1:1 or 1:Many where we just need *a* match
            cfmsMap.set(key, record);
        }
    });

    // 2. Iterate SAC Data and Merge
    // We assume sacData is an array of objects (from XLSX.utils.sheet_to_json)

    const mergedData = sacData.map(row => {
        // Find Account Number in SAC row
        // Keys might vary ("Account Number", "Acc No", etc.) - standardized in App logic usually?
        // Let's assume standard "Bank Account Number" based on constants, or "Account Number"

        let accKey = null;
        for (const k of Object.keys(row)) {
            // Flexible matching for column header
            if (k.toLowerCase().includes('account') && k.toLowerCase().includes('number')) {
                accKey = k;
                break;
            }
        }

        if (accKey && row[accKey]) {
            const sacAcc = String(row[accKey]).trim();

            if (cfmsMap.has(sacAcc)) {
                const match = cfmsMap.get(sacAcc);

                // Merge Logic: "arrange them in the excel side matching to it"
                return {
                    ...row,
                    'Matched (CFMS)': 'YES',
                    'CFMS Code': match.code || '',
                    'CFMS IFSC': match.ifsc || '',
                    'CFMS Amount': match.amount || '',
                    'CFMS Aadhar': match.aadhar || '',
                };
            }
        }

        // No match found
        return {
            ...row,
            'Matched (CFMS)': 'NO',
            'CFMS Code': '',
            'CFMS IFSC': '',
            'CFMS Amount': '',
            'CFMS Aadhar': ''
        };
    });

    return mergedData;
};
