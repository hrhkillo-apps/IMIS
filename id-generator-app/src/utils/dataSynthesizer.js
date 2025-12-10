import { generateTicketNumber, generateFTRNumber, generateBeneficiaryRegId, generateName } from './idGenerator.js';

// Helper to pick random item from array
const pickRandom = (arr) => {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
};

// Helper for generating random mobile number (10 digit, starts 6-9)
const generateMobile = () => {
    const prefix = Math.floor(Math.random() * 4) + 6; // 6,7,8,9
    const suffix = Math.floor(Math.random() * 1000000000); // 9 digits
    return `${prefix}${String(suffix).padStart(9, '0')}`;
};

// Helper for random Ration Card (WAP + 12 digits roughly)
const generateRationCard = () => {
    const prefix = "WAP";
    const num = Math.floor(Math.random() * 1000000000000);
    return `${prefix}${String(num).padStart(12, '0')}`;
};

export const synthesizeRows = (count, context, headers, existingIds, currentMaxIds) => {
    const newRows = [];

    // Mutable max trackers
    let ticketMax = currentMaxIds.ticket;
    let ftrMax = currentMaxIds.ftr;
    let regMax = currentMaxIds.reg;

    const ticketIdx = headers.indexOf('Ticket Number');
    const ftrIdx = headers.indexOf('FTR Number');
    const regIdx = headers.indexOf('Benificiary Registration Id');
    const nameIdx = headers.indexOf('Benificiary Name');
    const mobileIdx = headers.indexOf('Benificiary Mobile Number'); // User specific spelling might vary, checking standard
    const mobileIdx2 = headers.indexOf('Beneficiary Mobile Number'); // Check both
    const rationIdx = headers.indexOf('Ration Card Number');
    const distIdx = headers.indexOf('District');
    const mandalIdx = headers.indexOf('Mandal');

    // Create N rows
    for (let i = 0; i < count; i++) {
        const row = [];

        headers.forEach((header, colIndex) => {
            // 1. Handle IDs
            if (colIndex === ticketIdx) {
                const newId = generateTicketNumber(existingIds.ticket, ticketMax);
                existingIds.ticket.add(String(newId));
                ticketMax = newId;
                row.push(newId);
                return;
            }
            if (colIndex === ftrIdx) {
                const newId = generateFTRNumber(existingIds.ftr, ftrMax);
                existingIds.ftr.add(String(newId));
                ftrMax = newId;
                row.push(newId);
                return;
            }
            if (colIndex === regIdx) {
                const newId = generateBeneficiaryRegId(existingIds.reg, regMax);
                existingIds.reg.add(String(newId));
                regMax = newId;
                row.push(newId);
                return;
            }

            // 2. Handle Name
            if (colIndex === nameIdx) {
                row.push(generateName(context.namePool));
                return;
            }

            // 3. Handle Mobile
            if (colIndex === mobileIdx || colIndex === mobileIdx2) {
                row.push(generateMobile());
                return;
            }

            // 4. Handle Ration Card
            if (colIndex === rationIdx) {
                row.push(generateRationCard());
                return;
            }

            // 5. Handle Location (Random from file's locations)
            if (colIndex === distIdx && context.locationPool && context.locationPool.districts.length > 0) {
                row.push(pickRandom(context.locationPool.districts));
                return;
            }
            if (colIndex === mandalIdx && context.locationPool && context.locationPool.mandals.length > 0) {
                row.push(pickRandom(context.locationPool.mandals));
                return;
            }

            // 6. Default: Pick from existing column options
            if (context.columnOptions[header]) {
                row.push(pickRandom(context.columnOptions[header]));
                return;
            }

            row.push(''); // Fallback empty
        });

        newRows.push(row);
    }

    return newRows;
};
