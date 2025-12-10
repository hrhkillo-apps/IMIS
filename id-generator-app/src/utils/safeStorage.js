/**
 * Safe Storage Utility
 * Provides a fallback mechanism when browser storage is disabled or blocked.
 */

class MemoryStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.get(key) || null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

const memStorage = new MemoryStorage();

const createSafeStorage = (type) => {
    const isSupported = () => {
        try {
            const storage = window[type];
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch {
            return false;
        }
    };

    const supported = isSupported();

    return {
        getItem: (key) => {
            if (supported) {
                try {
                    return window[type].getItem(key);
                } catch {
                    // Fallback if sudden persistence failure
                    return memStorage.getItem(key);
                }
            }
            return memStorage.getItem(key);
        },
        setItem: (key, value) => {
            if (supported) {
                try {
                    window[type].setItem(key, value);
                } catch {
                    memStorage.setItem(key, value);
                }
            } else {
                memStorage.setItem(key, value);
            }
        },
        removeItem: (key) => {
            if (supported) {
                try {
                    window[type].removeItem(key);
                } catch {
                    memStorage.removeItem(key);
                }
            } else {
                memStorage.removeItem(key);
            }
        },
        clear: () => {
            if (supported) {
                try {
                    window[type].clear();
                } catch {
                    memStorage.clear();
                }
            } else {
                memStorage.clear();
            }
        }
    };
};

export const safeLocal = createSafeStorage('localStorage');
export const safeSession = createSafeStorage('sessionStorage');
