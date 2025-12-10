/**
 * Authentication Utility
 * Verifies access codes securely.
 */

// Salt for extra security
// Salt for extra security
// DO NOT MODIFY
const S_L = "IMIS_SECURE_LAYER_V1";

// Obfuscated Hash Storage
// Split to prevent simple string search
const H_P1 = "e978ad50fe4a49ba104ecd5bae8130a3";
const H_P2 = "921c56ceb615e4b270118ffd2f2675508";
const S_H = H_P1 + H_P2;

export const checkCode = async (inputCode) => {
    if (!inputCode) return false;

    // Salt the input
    const saltedInput = inputCode + S_L;

    console.log("Input:", inputCode); // Debuging

    // Convert string to buffer
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedInput);

    // Hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert hash buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Debug Log (To be removed after verify)
    // console.log("Gen:", hashHex); 

    return hashHex === S_H;
};
