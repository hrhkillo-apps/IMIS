/**
 * Data Analysis Utilities
 * Analyzes the dataset to find context (Location Modes) and Name Patterns.
 */

// Helper to find the most frequent item in an array
const getMode = (arr) => {
    if (arr.length === 0) return null;
    const frequency = {};
    let maxFreq = 0;
    let mode = arr[0];

    for (const item of arr) {
        if (!item) continue;
        const val = String(item).trim();
        if (!val) continue;

        frequency[val] = (frequency[val] || 0) + 1;
        if (frequency[val] > maxFreq) {
            maxFreq = frequency[val];
            mode = val;
        }
    }
    return mode;
};

// Analyzes the dataset to extract context
export const analyzeContext = (data, headers) => {
    const context = {
        districtMode: null,
        mandalMode: null,
        namePool: {
            firstNames: new Set(),
            surnames: new Set()
        },
        maxIds: {
            ticket: 0,
            ftr: 0,
            reg: 0
        },
        columnOptions: {},
        // specialized pools for locations
        locationPool: {
            districts: new Set(),
            mandals: new Set()
        }
    };

    const distIdx = headers.indexOf('District');
    const mandalIdx = headers.indexOf('Mandal');
    const nameIdx = headers.indexOf('Benificiary Name');
    const ticketIdx = headers.indexOf('Ticket Number');
    const ftrIdx = headers.indexOf('FTR Number');
    const regIdx = headers.indexOf('Benificiary Registration Id');

    // Initialize column options sets
    headers.forEach((h, i) => {
        if (!h) return;
        // Skip ID/Name/Location columns for generic option collection
        if (i === ticketIdx || i === ftrIdx || i === regIdx || i === nameIdx || i === distIdx || i === mandalIdx) return;
        context.columnOptions[h] = new Set();
    });

    const districts = []; // for mode calculation
    const mandals = [];

    data.forEach(row => {
        // Collect Options for generic columns
        row.forEach((cell, i) => {
            const header = headers[i];
            if (context.columnOptions[header] && cell) {
                context.columnOptions[header].add(cell);
            }
        });

        // Location Analysis
        if (distIdx !== -1 && row[distIdx]) {
            districts.push(row[distIdx]);
            context.locationPool.districts.add(row[distIdx]);
        }
        if (mandalIdx !== -1 && row[mandalIdx]) {
            mandals.push(row[mandalIdx]);
            context.locationPool.mandals.add(row[mandalIdx]);
        }

        // Name Analysis
        if (nameIdx !== -1 && row[nameIdx]) {
            const fullName = String(row[nameIdx]).trim();
            const parts = fullName.split(/\s+/);
            if (parts.length > 0) {
                // Heuristic: Last part is often surname in some formats, or First part.
                // Let's collect all parts to be flexible, or try to distinguish.
                // Common Telugu/South Indian naming: Surname First or Last. 
                // We'll treat the longest part as a "Name" and others as "Surnames/Initials" mix
                // for simpler generation, or just split into two pools: 
                // 1. Surnames (usually 1-2 chars or specific patterns) -> Let's just dump all parts into pools
                // actually, let's keep it simple: First word = Surname (often), Rest = Name.
                if (parts.length > 1) {
                    context.namePool.surnames.add(parts[0]);
                    context.namePool.firstNames.add(parts.slice(1).join(' '));
                } else {
                    context.namePool.firstNames.add(parts[0]);
                }
            }
        }

        // Max ID Analysis (Local file max)
        if (ticketIdx !== -1 && row[ticketIdx]) {
            const num = Number(row[ticketIdx]);
            if (!isNaN(num) && num > context.maxIds.ticket) context.maxIds.ticket = num;
        }
        if (ftrIdx !== -1 && row[ftrIdx]) {
            const num = Number(row[ftrIdx]);
            if (!isNaN(num) && num > context.maxIds.ftr) context.maxIds.ftr = num;
        }
        if (regIdx !== -1 && row[regIdx]) {
            const num = Number(row[regIdx]);
            if (!isNaN(num) && num > context.maxIds.reg) context.maxIds.reg = num;
        }
    });

    context.districtMode = getMode(districts);
    context.mandalMode = getMode(mandals);

    // Convert Sets to Arrays for random picking
    context.namePool.firstNames = Array.from(context.namePool.firstNames);
    context.namePool.surnames = Array.from(context.namePool.surnames);
    context.locationPool.districts = Array.from(context.locationPool.districts);
    context.locationPool.mandals = Array.from(context.locationPool.mandals);

    // Convert Option Sets to Arrays
    Object.keys(context.columnOptions).forEach(key => {
        context.columnOptions[key] = Array.from(context.columnOptions[key]);
    });

    return context;
};
