import { auth } from '../firebase.config';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

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
        this.user = null;
        this.confirmationResult = null; // Store OTP confirmation result

        // Initialize state from storage/firebase listener
        // Note: onAuthStateChanged is async, so initial state might delay slightly.
        this.initAuth();
    }

    initAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.isAuthenticated = true;
                this.user = user;
                storage.setItem(SESSION_KEY, 'true');
            } else {
                this.isAuthenticated = false;
                this.user = null;
                storage.removeItem(SESSION_KEY);
            }
        });
    }

    /**
     * Initializes the ReCaptcha verifier.
     * Must be called after the DOM element is available.
     * @param {string} elementId - DOM ID of the container for invisible recaptcha
     */
    initRecaptcha(elementId) {
        // Clear existing instance to ensure we bind to the new DOM element on re-renders
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch (e) {
                console.warn("Failed to clear old recaptcha", e);
            }
            window.recaptchaVerifier = null;
        }

        window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
            'size': 'invisible',
            'callback': () => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
                // console.log("Recaptcha verified");
            },
            'expired-callback': () => {
                // Response expired. Ask user to solve reCAPTCHA again.
                console.warn("Recaptcha expired");
            }
        });
    }

    /**
     * Sends OTP to the provided phone number.
     * @param {string} phoneNumber - Format +91XXXXXXXXXX
     * @returns {Promise<boolean>}
     */
    async sendOtp(phoneNumber) {
        try {
            const appVerifier = window.recaptchaVerifier;
            this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            return true;
        } catch (error) {
            console.error("SMS Error:", error);
            // Reset recaptcha if error occurs so user can try again
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
            throw error;
        }
    }

    /**
     * Verifies the OTP entered by the user.
     * @param {string} code - The 6 digit SMS code
     * @returns {Promise<boolean>}
     */
    async verifyOtp(code) {
        if (!this.confirmationResult) throw new Error("No OTP request found.");

        try {
            const result = await this.confirmationResult.confirm(code);
            this.user = result.user;
            this.isAuthenticated = true;
            storage.setItem(SESSION_KEY, 'true');
            return true;
        } catch (error) {
            console.error("OTP Verification Error:", error);
            return false;
        }
    }

    async logout() {
        try {
            await signOut(auth);
            this.isAuthenticated = false;
            this.user = null;
            storage.removeItem(SESSION_KEY);
            window.location.reload();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }

    isLoggedIn() {
        // Double check session storage for synchronous UI blocking before async auth loads
        return this.isAuthenticated || storage.getItem(SESSION_KEY) === 'true';
    }

    getExpiryTime() {
        // Feature not yet fully implemented or relying on Firebase Token
        // For now, return null to disable local session timer warnings
        return null;
    }
}

// Export singleton
export const authService = new AuthService();
