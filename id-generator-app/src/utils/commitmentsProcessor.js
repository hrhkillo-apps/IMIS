/**
 * Processes the Commitment, CFMS, and SAC data.
 * 
 * LOGIC RULES:
 * 1. Commitment File is MANDATORY and acts as the master list.
 * 2. If SAC File is uploaded: Matches fill 'Proposed' columns.
 * 3. If CFMS File is uploaded: Matches fill 'Credited' columns.
 * 4. Output contains Commitment rows that matched AT LEAST ONE of the uploaded secondary files.
 * 5. Aggregates (Counts/Totals) are calculated per file type (Proposed vs Credited).
 * 6. 'My Share' (55%) is calculated on Credited Vendor Total (if available), else Proposed.
 * 7. Aggregates/Share shown ONLY on the first row of each Vendor group.
 * 8. 'Total Accounts Count' is based on the MASTER Commitment file counts for that vendor.
 */
export const processCommitments = (commitmentData, cfmsData, sacData) => {
    // 1. Validate Mandatory Commitment File
    if (!commitmentData || commitmentData.length === 0) {
        throw new Error("Commitment Accounts file is mandatory and cannot be empty.");
    }

    // Helper to normalize keys and safely get values
    const cleanKey = (k) => String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // keyMap cache
    const getKey = (row, targetStr) => {
        const target = cleanKey(targetStr);
        return Object.keys(row).find(k => cleanKey(k).includes(target));
    };

    const getValue = (row, targetStr) => {
        const key = getKey(row, targetStr);
        return key ? row[key] : undefined;
    };

    const getAmount = (row) => {
        const val = getValue(row, "Bill Amount") || getValue(row, "Net Amount") || getValue(row, "Amount") || getValue(row, "Payable") || 0;
        return parseFloat(val) || 0;
    };

    // 2. Index Secondary Files (if they exist)
    const cfmsMap = new Map();
    if (cfmsData && cfmsData.length > 0) {
        cfmsData.forEach(row => {
            let acc = getValue(row, "Account Number") || getValue(row, "Beneficiary Account") || getValue(row, "Account");
            if (acc) cfmsMap.set(String(acc).trim(), row);
        });
    }

    const sacMap = new Map();
    if (sacData && sacData.length > 0) {
        sacData.forEach(row => {
            let acc = getValue(row, "Account Number") || getValue(row, "Beneficiary Account") || getValue(row, "Account");
            if (acc) sacMap.set(String(acc).trim(), row);
        });
    }

    // 3. Pre-calculate Master Counts per Vendor
    // We want "Total Accounts count" to represent the TOTAL rows in the Commitment File for that vendor,
    // regardless of whether they matched SAC or CFMS.
    const masterVendorCounts = {};
    commitmentData.forEach(row => {
        const vName = getValue(row, "NAME OF THE VENDOR") || "Unknown Vendor";
        masterVendorCounts[vName] = (masterVendorCounts[vName] || 0) + 1;
    });

    // 4. Process Commitment Rows (Filtering & Matching)
    const matches = [];
    const vendorStats = {}; // { VendorName: { proposedCount: 0, proposedTotal: 0, creditedCount: 0, creditedTotal: 0 } }

    commitmentData.forEach(commRow => {
        let acc = getValue(commRow, "Account Number") || getValue(commRow, "Account") || getValue(commRow, "Acc No");

        if (acc) {
            const accStr = String(acc).trim();

            // Check Matches
            const cfmsMatch = cfmsMap.get(accStr);
            const sacMatch = sacMap.get(accStr);

            // We only keep row if it matched SOMETHING relevant to the uploaded files.
            const hasRelevantMatch = (cfmsData?.length && cfmsMatch) || (sacData?.length && sacMatch);

            if (hasRelevantMatch) {
                const vendorName = getValue(commRow, "NAME OF THE VENDOR") || "Unknown Vendor";

                // Initialize Stats
                if (!vendorStats[vendorName]) {
                    vendorStats[vendorName] = {
                        proposedCount: 0, proposedTotal: 0,
                        creditedCount: 0, creditedTotal: 0
                    };
                }

                // Extract Amounts & Update Stats
                let proposedAmt = 0;
                let creditedAmt = 0;

                if (sacMatch) {
                    proposedAmt = getAmount(sacMatch);
                    vendorStats[vendorName].proposedCount += 1;
                    vendorStats[vendorName].proposedTotal += proposedAmt;
                }

                if (cfmsMatch) {
                    creditedAmt = getAmount(cfmsMatch);
                    vendorStats[vendorName].creditedCount += 1;
                    vendorStats[vendorName].creditedTotal += creditedAmt;
                }

                matches.push({
                    commRow,
                    vendorName,
                    proposedAmt: sacMatch ? proposedAmt : null, // null means "not matched/applicable"
                    creditedAmt: cfmsMatch ? creditedAmt : null
                });
            }
        }
    });

    if (matches.length === 0) {
        throw new Error("No matches found. Check 'Account Number' columns.");
    }

    // 5. Sort Matches by Vendor (Critical for grouping)
    matches.sort((a, b) => (a.vendorName || "").localeCompare(b.vendorName || ""));

    // Helper: Indian Currency Formatter
    const formatINR = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(num);
    };

    // 6. Construct Final Output
    const processedRows = [];
    const seenVendors = new Set();

    // If output is grouped, we need to map via sorted matches
    matches.forEach(({ commRow, vendorName, proposedAmt, creditedAmt }) => {
        const stats = vendorStats[vendorName];

        const isFirstVendorRow = !seenVendors.has(vendorName);
        if (isFirstVendorRow) {
            seenVendors.add(vendorName);
        }

        // Calculate Share
        const baseTotal = stats.creditedTotal > 0 ? stats.creditedTotal : stats.proposedTotal;
        const myShareTotal = baseTotal * 0.55;

        // Create new row
        const newRow = { ...commRow };

        const setCol = (name, val) => {
            const existingKey = getKey(commRow, name);
            if (existingKey) {
                newRow[existingKey] = val;
            } else {
                newRow[name] = val;
            }
        };

        // --- AGGREGATES (First Row Only) ---
        if (isFirstVendorRow) {
            // SAC -> Proposed Stats
            setCol("Proposed Accounts count", stats.proposedCount);
            setCol("Proposed Payment Vendor", formatINR(stats.proposedTotal));

            // CFMS -> Credited Stats
            // For Total Accounts, use the MASTER count from the commitment file
            setCol("Total Accounts count", masterVendorCounts[vendorName] || 0);

            setCol("Credited Accounts count", stats.creditedCount);
            setCol("Credited Payment Vendor", formatINR(stats.creditedTotal));

            // Share
            setCol("My Share", formatINR(myShareTotal));
        } else {
            // Blank out for subsequent rows
            setCol("Total Accounts count", "");
            setCol("Proposed Accounts count", "");
            setCol("Credited Accounts count", "");
            setCol("Proposed Payment Vendor", "");
            setCol("Credited Payment Vendor", "");
            setCol("My Share", "");
        }

        // --- INDIVIDUAL AMOUNTS ---
        setCol("Proposed Payment Individual", proposedAmt !== null ? formatINR(proposedAmt) : "");
        setCol("Credited Payment Individual", creditedAmt !== null ? formatINR(creditedAmt) : "");

        // --- REORDER COLUMNS ---
        // User requested: "after ACCOUNT NUMBER, Total Accounts count to be shown accordingly"
        // We reconstruct the object to enforce this order.

        const orderedRow = {};
        const originalKeys = Object.keys(commRow); // Keys from original file order
        const accKey = getKey(commRow, "ACCOUNT NUMBER") || getKey(commRow, "Account") || getKey(commRow, "Acc No");

        // The block of calculated columns we want to inject
        const calculatedKeys = [
            "Total Accounts count",
            "Proposed Accounts count",
            "Proposed Payment Individual",
            "Proposed Payment Vendor",
            "Credited Accounts count",
            "Credited Payment Individual",
            "Credited Payment Vendor",
            "My Share"
        ];

        let accFound = false;

        // 1. Add keys from original file, inserting block after Account Number
        originalKeys.forEach(k => {
            // If the original file ALREADY had these columns (e.g. as empty headers), skip them here 
            // so we don't duplicate or place them in old position. We want them strictly after Account No.
            // However, our `setCol` might have updated `newRow[k]`. 
            // We use `newRow[k]` for value, but decide order based on `originalKeys`.

            // Check if k is one of our calculated keys (fuzzy match?)
            // Ideally exact match since we used specific strings in setCol.
            if (calculatedKeys.includes(k)) return;

            orderedRow[k] = newRow[k];

            if (k === accKey) {
                accFound = true;
                // Inject the block
                calculatedKeys.forEach(chk => {
                    orderedRow[chk] = newRow[chk];
                });
            }
        });

        // 2. If Account Number wasn't found in loop (unlikely given matches), or if calculated keys weren't inserted:
        if (!accFound) {
            // Just append them at the end
            calculatedKeys.forEach(chk => {
                if (orderedRow[chk] === undefined) {
                    orderedRow[chk] = newRow[chk];
                }
            });
        }

        // 3. Catch-all: If original file didn't have Account Number key in standard iteration (maybe added later?), ensure we didn't drop data.
        // (The logic above covers original keys. `newRow` might have extra keys if we added them via setCol and they weren't in calcBlock or original. 
        //  But `setCol` currently only adds the calcBlock keys.)

        processedRows.push(orderedRow);
    });

    return processedRows;
};
