/**
 * Authentication Utility
 * Verifies the admin code against a stored SHA-256 hash.
 */

// Stored Hash for "112730"
const STORED_HASH = "d69a7774383e721cd13a0f74802539d4e6f5e0ac36c8689ee4dd651a12d11e9c8";

export const checkCode = async (inputCode) => {
    if (!inputCode) return false;

    // Convert string to buffer
    const encoder = new TextEncoder();
    const data = encoder.encode(inputCode);

    // Hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert hash buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === STORED_HASH;
};
