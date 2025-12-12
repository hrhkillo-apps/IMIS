import * as pdfjsLib from 'pdfjs-dist';

// Setting worker source for Vite
// Note: We need to point to the worker script correctly. 
// In dev, usually the import works if optimized deps handle it, or we point to the CDN/node_modules file.
// For Vite, explicit worker import is often cleaner.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const parseCfmsPdf = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let extractedData = [];

        // Loop through all pages - STARTING FROM PAGE 2 as per user request
        for (let i = 2; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // const textItems = textContent.items.map(item => item.str).join(' '); // Simple join for regex search

            // Regex patterns based on typical CFMS formats (Generalized for now)
            // Assumed format: Account Number: XXXXX, Code: XXX, etc. from unstructured text
            // User requirement: "pull the code, account number, ifsc code, amount, aadhar number"

            // We need a strategy to identify *records*. 
            // If the PDF is a list of beneficiaries, we need to split by record.
            // Assumption: Rows in a table or distinct blocks. 
            // Since we don't have the exact format, we'll try to find clumps of data or use a global regex if text is linear.

            // Heuristic: Capture sequences that look like:
            // "Account Number" proximity "Code" proximity "IFSC"

            // Let's assume a simpler approach first: Extract all occurrences of these patterns and try to zip them if they appear in order,
            // or if the text is line-by-line (which getTextContent usually preserves roughly).

            // BETTER APPROACH for general "text dump":
            // Look for the *specific values* using regex.

            // Sample patterns (Need adjustment based on real file):
            // Account No: \d{9,18}
            // IFSC: [A-Z]{4}0[A-Z0-9]{6}
            // Code: \d+ (Maybe generic)
            // Aadhar: \d{12}

            // Let's try to extract lines and parse row-by-row if possible.
            // Re-constructing lines from items:
            let lines = [];
            let currentLineY = -1;
            let currentLineText = [];

            textContent.items.forEach(item => {
                // Using transform[5] as Y coordinate
                const y = Math.round(item.transform[5]);
                if (currentLineY === -1) currentLineY = y;

                if (Math.abs(y - currentLineY) > 5) { // New line threshold
                    lines.push(currentLineText.join(' '));
                    currentLineText = [];
                    currentLineY = y;
                }
                currentLineText.push(item.str);
            });
            if (currentLineText.length > 0) lines.push(currentLineText.join(' '));

            // --- FIX: Logic to merge split numbers (Text Wrapping) ---
            // Issue: Numbers like 1000029540 might be split as "100002" on one line and "9540" on next.
            // Heuristic: If a line ends with digits and the next line starts with digits, and they form a likely Account No, merge them.

            for (let j = 0; j < lines.length - 1; j++) {
                const currentLine = lines[j];
                const nextLine = lines[j + 1];

                // Check if current line ends with a number part (e.g. 5+ digits to be safe, or just any digits?)
                // User example: 100002 (6 digits) + 9540 (4 digits).
                // Let's look for: ... <digits> $
                const endDigitsMatch = currentLine.match(/(\d{4,})$/); // matches last 4+ digits
                // Check if next line starts with digits
                const startDigitsMatch = nextLine.match(/^(\d{4,})/); // matches first 4+ digits of next line

                if (endDigitsMatch && startDigitsMatch) {
                    const part1 = endDigitsMatch[1];
                    const part2 = startDigitsMatch[1];
                    const merged = part1 + part2;

                    // If merged looks like a valid Account Number (9-18 digits)
                    if (merged.length >= 9 && merged.length <= 18) {
                        // MERGE: Remove the wrapped part from next line and append to current
                        // Strategy: Modify lines[j] to include the merged part, and remove it from lines[j+1]

                        // We simply join the lines with NO space in between the split point, 
                        // but we need to be careful not to merge other text if it's a table row.
                        // Ideally, we just "heal" the number.

                        // Heuristic: Append the start digits of next line to current line
                        lines[j] = currentLine + part2;

                        // Remove the start digits from next line
                        lines[j + 1] = nextLine.substring(part2.length).trim();

                        // If next line becomes empty, we might ignore it later, but our main loop handles regex matching per line.
                        // Note: This modifies 'lines' in place, so the next iteration (j+1) will see the chopped line.
                    }
                }
            }
            // ---------------------------------------------------------

            // LOGIC CHANGE: Identify "Record Blocks"
            // A record starts with a line containing an Account Number.
            // It continues until the start of the next Account Number line.

            let i_line = 0;
            while (i_line < lines.length) {
                const line = lines[i_line];
                const accountMatch = line.match(/\b\d{9,18}\b/);

                if (accountMatch) {
                    // Found a record start
                    let recordText = line;
                    let j = i_line + 1;

                    // Look ahead for wrapped lines
                    while (j < lines.length) {
                        const nextLine = lines[j];
                        const nextAccountMatch = nextLine.match(/\b\d{9,18}\b/);
                        if (nextAccountMatch) {
                            // Stop, this is a new record
                            break;
                        } else {
                            // This is likely wrapped text for current record
                            recordText += " " + nextLine;
                            j++;
                        }
                    }

                    // Advance main loop index
                    i_line = j;

                    // Process the FULL extracted record text
                    const accountNumber = accountMatch[0];
                    let remainingText = recordText;

                    const extract = (regex) => {
                        const match = remainingText.match(regex);
                        if (match) {
                            remainingText = remainingText.replace(match[0], '').trim();
                            return match[0];
                        }
                        return null;
                    };

                    const aadhar = extract(/\b\d{12}\b/);
                    const ifsc = extract(/[A-Z]{4}0[A-Z0-9]{6}/);
                    const pan = extract(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
                    // Amount: careful not to match partial numbers too aggressively if they look like ref nos
                    // Usually amount has commas or dot: 1,234.00 or 500.00
                    const amount = extract(/\b\d{1,3}(,\d{3})*(\.\d{2})?\b/);

                    // Remove Account Number
                    remainingText = remainingText.replace(accountNumber, '').trim();

                    // Bene Code: Short digits (3-9 typically) at start
                    // But wait, Ref No might be long digits?
                    // Let's assume Bene Code is distinct if it's small.
                    // If we have "12345678" it could be ref no or bene code?
                    // User list: Bene Code ... Reference No.

                    let beneCode = null;
                    const beneCodeMatch = remainingText.match(/^\b\d{3,9}\b/);
                    if (beneCodeMatch) {
                        beneCode = beneCodeMatch[0];
                        remainingText = remainingText.replace(beneCode, '').trim();
                    }

                    // Reference No: Often longer digits remaining?
                    let refNo = null;
                    // Look for any remaining long number sequence
                    const refMatch = remainingText.match(/\b\d{6,}\b/);
                    if (refMatch) {
                        refNo = refMatch[0];
                        remainingText = remainingText.replace(refNo, '').trim();
                    }

                    // Remaining text is Name + Bank
                    // Clean up extra spaces
                    let nameAndBank = remainingText.replace(/\s+/g, ' ').trim();

                    // Try to split Name / Bank? Hard without delimiters.
                    // Returning combined for now as requested "Name/Bank" in previous step,
                    // but user asked for "Name, Bank" columns.
                    // We'll put the full string in 'Name' and leave 'Bank' empty or duplicate?
                    // Better: 'Name & Bank' column or just 'Name' column with all text.
                    // Let's fill 'Name' with the text. 

                    extractedData.push({
                        'Bene Code': beneCode || '',
                        'Account No': accountNumber,
                        'Name': nameAndBank || '',
                        'Bank': '', // Cannot reliably separate from Name without specific separators
                        'Pan No': pan || '',
                        'Amount': amount || '',
                        'Aadhar No': aadhar || '',
                        'Reference No': refNo || ''
                    });
                } else {
                    // Line without account number and not consumed by previous record loop
                    // Just skip or log?
                    i_line++;
                }
            }
        }

        return extractedData;
    } catch (error) {
        console.error("PDF Parse Error:", error);
        throw new Error("Failed to parse PDF: " + error.message);
    }
};
