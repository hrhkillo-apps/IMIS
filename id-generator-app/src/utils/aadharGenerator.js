/**
 * Aadhar Generation Utility using Verhoeff Algorithm
 * Aadhar numbers are 12 digits. The last digit is a checksum.
 */

// Verhoeff Algorithm Tables
const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a number string using Verhoeff algorithm.
 */
export const validateVerhoeff = (num) => {
    let c = 0;
    let myArray = String(num).split("").map(Number).reverse();
    for (let i = 0; i < myArray.length; i++) {
        c = d[c][p[i % 8][myArray[i]]];
    }
    return c === 0;
};

/**
 * Generates the Verhoeff checksum digit for a given number string.
 */
export const generateVerhoeff = (num) => {
    let c = 0;
    let myArray = String(num).split("").map(Number).reverse();
    for (let i = 0; i < myArray.length; i++) {
        c = d[c][p[(i + 1) % 8][myArray[i]]];
    }
    return inv[c];
};

/**
 * Generates a single valid Aadhar number (String).
 * Pure function - collision checks handled by IdService.
 */
export const generateValidAadharString = () => {
    const firstObj = Math.floor(Math.random() * 8) + 2; // 2-9
    const rest = Math.floor(Math.random() * 10000000000); // 10 digits
    const base = `${firstObj}${String(rest).padStart(10, '0')}`;
    const checksum = generateVerhoeff(base);
    return `${base}${checksum}`;
};

/**
 * Generates N valid Aadhar numbers, ensuring they don't exist in the provided history.
 * (Legacy Wrapper - Used if strictly local generation is needed, but we prefer IdService.reserveIds now)
 */
export const generateValidAadhar = (count, existingIds = new Set()) => {
    const list = [];
    const maxAttempts = 5000;

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let generated = null;

        do {
            const candidate = generateValidAadharString();

            if (!existingIds.has(candidate)) {
                generated = candidate;
            }
            attempts++;
        } while (!generated && attempts < maxAttempts);

        if (generated) {
            list.push(generated);
            existingIds.add(generated); // Prevent duplicates within same batch
        } else {
            throw new Error("Unable to generate unique Aadhar Number. Space exhausted?");
        }
    }
    return list;
};

/**
 * Generates N INVALID Aadhar numbers.
 */
export const generateInvalidAadhar = (count) => {
    const list = [];
    while (list.length < count) {
        // Generate 12 random digits
        const firstObj = Math.floor(Math.random() * 8) + 2;
        const rest = Math.floor(Math.random() * 100000000000); // 11 digits
        const candidate = `${firstObj}${String(rest).padStart(11, '0')}`;

        // Check if by chance it is valid
        if (!validateVerhoeff(candidate)) {
            list.push(candidate);
        }
    }
    return list;
};
