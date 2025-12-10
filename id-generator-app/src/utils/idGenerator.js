/**
 * ID Generation Utilities
 * Implementation: Persistent Sequential Logic & Context-Aware Name Generation
 */

// --- Name Generation ---
export const generateName = (namePool) => {
  const { firstNames, surnames } = namePool;
  if (!firstNames.length) return "Beneficiary GivenName"; // Fallback

  // 70% chance to use a surname if available
  const useSurname = surnames.length > 0 && Math.random() > 0.3;

  const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];

  if (useSurname) {
    const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];
    return `${randomSurname} ${randomName}`; // Format: Surname Name
  }
  return randomName;
};

// --- Random Unique ID Generation ---

/**
 * Generates a random unique ID within a range.
 * Checks against existingSet to prevent collisions.
 */
const generateUniqueRandomId = (min, max, existingSet) => {
  let id;
  let attempts = 0;
  const maxAttempts = 1000; // prevent infinite loop

  do {
    id = Math.floor(Math.random() * (max - min + 1)) + min;
    attempts++;
    if (attempts > maxAttempts) {
      // Should rarely happen with 10-digit space
      throw new Error("Unable to generate unique ID (keyspace exhausted?)");
    }
  } while (existingSet.has(String(id)) || existingSet.has(id)); // Check both string/number

  return id;
};

// Ticket: Random 10-digit starting with 2
// Range: 2000000000 - 2999999999
export const generateTicketNumber = (existingIds) => {
  return generateUniqueRandomId(2000000000, 2999999999, existingIds);
};

// FTR: Random 10-digit starting with 2 (same pool logic as ticket usually, or separate?)
// Keeping same range logic for now.
export const generateFTRNumber = (existingIds) => {
  return generateUniqueRandomId(2000000000, 2999999999, existingIds);
};

// IMIS (Reg): Random 10-digit starting with 1
// Range: 1000000000 - 1999999999
export const generateBeneficiaryRegId = (existingIds) => {
  return generateUniqueRandomId(1000000000, 1999999999, existingIds);
};

export const validateRow = (row) => {
  if (!row || row.length === 0) return { valid: false, reason: "Empty row" };
  const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
  if (!hasData) return { valid: false, reason: "Row contains no data" };
  return { valid: true };
};
