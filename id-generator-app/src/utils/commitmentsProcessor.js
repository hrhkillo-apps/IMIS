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

    // 3. Process Commitment Rows
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
            // If user uploaded ONLY CFMS, we keep CFMS matches.
            // If user uploaded ONLY SAC, we keep SAC matches.
            // If user uploaded BOTH, we keep if matched EITHER.
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

    // 4. Sort Matches by Vendor (Critical for grouping)
    matches.sort((a, b) => (a.vendorName || "").localeCompare(b.vendorName || ""));

    // 5. Construct Final Output
    const processedRows = [];
    const seenVendors = new Set();

    matches.forEach(({ commRow, vendorName, proposedAmt, creditedAmt }) => {
        const stats = vendorStats[vendorName];

        const isFirstVendorRow = !seenVendors.has(vendorName);
        if (isFirstVendorRow) {
            seenVendors.add(vendorName);
        }

        // Calculate Share
        // Priority: Share of Credited. If 0 (e.g. SAC only), Share of Proposed.
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
            setCol("Proposed Payment Vendor", stats.proposedTotal);

            // CFMS -> Credited Stats
            setCol("Total Accounts count", stats.creditedCount || stats.proposedCount); // Fallback? or just credited logic? "Total" is ambiguous. Let's use Credited (actual) or Proposed (plan). 
            // User requested: "Total Accounts count... based on the vendor name". 
            // Often Total means "The list size". Here, let's sum distinct matches? Or just use one.
            // Let's defer to "Proposed Count" if Credited is 0.
            setCol("Total Accounts count", stats.creditedCount > 0 ? stats.creditedCount : stats.proposedCount);

            setCol("Credited Accounts count", stats.creditedCount);
            setCol("Credited Payment Vendor", stats.creditedTotal);

            // Share
            setCol("My Share", myShareTotal.toFixed(2));
        } else {
            // Blank out for subsequent rows
            setCol("Total Accounts count", "");
            setCol("Proposed Accounts count", "");
            setCol("Credited Accounts count", "");
            setCol("Proposed Payment Vendor", "");
            setCol("Credited Payment Vendor", "");
            setCol("My Share", "");
        }

        // --- INDIVIDUAL AMOUNTS (Every Row where applicable) ---
        // Only overwrite if we actually had a match (value not null) OR we want to clear it?
        // User said "Fetch data... in [section] only".
        // Implies: If matched in SAC, fill Proposed. If not matched, leave blank or 0.
        // If matched in CFMS, fill Credited.

        setCol("Proposed Payment Individual", proposedAmt !== null ? proposedAmt : "");
        setCol("Credited Payment Individual", creditedAmt !== null ? creditedAmt : "");

        processedRows.push(newRow);
    });

    return processedRows;
};
