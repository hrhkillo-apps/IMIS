/**
 * ID Generation Utilities
 * Implementation: Persistent Sequential Logic & Context-Aware Name Generation
 */

import { ID_RANGES } from '../constants';

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

// --- Random Unique ID Generation ---

/**
 * Generates a random number within a range.
 * Pure function - collision checks handled by IdService.
 */
const generateRandomId = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Ticket: Random 10-digit starting with 2
export const generateTicketNumberString = () => {
  return String(generateRandomId(ID_RANGES.TICKET.MIN, ID_RANGES.TICKET.MAX));
};

// FTR: Random 10-digit starting with 2
export const generateFTRNumberString = () => {
  return String(generateRandomId(ID_RANGES.FTR.MIN, ID_RANGES.FTR.MAX));
};

// IMIS (Reg): Random 10-digit starting with 1
export const generateBeneficiaryRegIdString = () => {
  return String(generateRandomId(ID_RANGES.REG.MIN, ID_RANGES.REG.MAX));
};

// Legacy wrappers for backward compatibility (if needed by other components not yet refactored)
// These effectively do one attempt.
export const generateTicketNumber = (existingIds) => generateTicketNumberString();
export const generateFTRNumber = (existingIds) => generateFTRNumberString();
export const generateBeneficiaryRegId = (existingIds) => generateBeneficiaryRegIdString();

export const validateRow = (row) => {
  if (!row || row.length === 0) return { valid: false, reason: "Empty row" };
  const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
  if (!hasData) return { valid: false, reason: "Row contains no data" };
  return { valid: true };
};
