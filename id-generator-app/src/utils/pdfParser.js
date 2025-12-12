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

        // Loop through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str).join(' '); // Simple join for regex search

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

            // Now Iterate lines to find records.
            // Assumption: A record might span one or multiple lines, but crucial info is presumably in a row.

            lines.forEach(line => {
                // We attempt to extract fields from each line if it looks like a data row.
                // Regex for Account Number (9-18 digits typically)
                const accountMatch = line.match(/\b\d{9,18}\b/);
                // Regex for Aadhar (12 digits, often Verhoeff/UIDAI)
                const aadharMatch = line.match(/\b\d{12}\b/);
                // Regex for IFSC (4 chars + 0 + 6 chars)
                const ifscMatch = line.match(/[A-Z]{4}0[A-Z0-9]{6}/);
                // Regex for Amount (Numbers with commas/decimals)
                const amountMatch = line.match(/\b\d{1,3}(,\d{3})*(\.\d{2})?\b/);

                // "Code" is ambiguous. Looking for generic short number? 
                // Let's assume it's near the start or specifically labelled?
                // Using a fallback "first number that isn't the others" or simply skipping if undefined for now.

                if (accountMatch) {
                    // Start a record
                    let record = {
                        accountNumber: accountMatch[0],
                        aadhar: aadharMatch ? aadharMatch[0] : null,
                        ifsc: ifscMatch ? ifscMatch[0] : null,
                        amount: amountMatch ? amountMatch[0] : null,
                        code: null // flexible
                    };

                    // Simple heuristic to differentiate numbers if multiples exist
                    // This is rough without the specific PDF layout.

                    extractedData.push(record);
                }
            });
        }

        return extractedData;
    } catch (error) {
        console.error("PDF Parse Error:", error);
        throw new Error("Failed to parse PDF: " + error.message);
    }
};
