/**
 * AuthService
 * Centralized service for handling authentication and session management.
 */

// Production Hash (SHA-256 of the access code 112730)
// In a real server-backed app, this would be validated on the server.
const AUTH_HASH = "e978ad50fe4a49ba104ecd5bae8130a3921c56ceb615e4b27018ffd2f2675508";
const SALT = "IMIS_SECURE_LAYER_V1";
const SESSION_KEY = "imis_auth";

// Session Storage Wrapper (to handle potential errors in restricted environments)
const storage = {
    getItem: (key) => {
        try {
            return sessionStorage.getItem(key);
        } catch (e) {
            console.warn("SessionStorage access denied", e);
            return null;
        }
    },
    setItem: (key, val) => {
        try {
            sessionStorage.setItem(key, val);
        } catch (e) {
            console.warn("SessionStorage access denied", e);
        }
    },
    removeItem: (key) => {
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn("SessionStorage access denied", e);
        }
    }
};

class AuthService {
    constructor() {
        this.isAuthenticated = false;
        // Initialize state from storage
        this.isAuthenticated = storage.getItem(SESSION_KEY) === 'true';
    }

    /**
     * Verifies the input code against the stored hash.
     * @param {string} inputCode 
     * @returns {Promise<boolean>}
     */
    async verifyCode(inputCode) {
        if (!inputCode) return false;

        try {
            // Salt the input
            const saltedInput = inputCode + SALT;
            const encoder = new TextEncoder();
            const data = encoder.encode(saltedInput);

            // Hash using Web Crypto API
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);

            // Convert to hex
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const isValid = hashHex === AUTH_HASH;

            if (isValid) {
                this.login();
            }

            return isValid;
        } catch (error) {
            console.error("Auth Error:", error);
            return false;
        }
    }

    login() {
        this.isAuthenticated = true;
        storage.setItem(SESSION_KEY, 'true');
    }

    logout() {
        this.isAuthenticated = false;
        storage.removeItem(SESSION_KEY);
        // Optional: Trigger a window reload or callback if needed
        window.location.reload();
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}

// Export singleton
export const authService = new AuthService();
