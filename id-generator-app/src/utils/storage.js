/**
 * ID Storage Utility
 * Uses LocalStorage to persist sets of generated IDs to prevent reuse.
 */

const STORAGE_KEYS = {
    TICKET: 'imis_history_ticket',
    FTR: 'imis_history_ftr',
    REG: 'imis_history_reg',
};

// Helper: Set-to-Array
const setToArr = (set) => [...set];
// Helper: Array-to-Set
const arrToSet = (arr) => new Set(arr);

export const IDStorage = {
    // Load all history into memory
    loadHistory: () => {
        try {
            const ticketRaw = localStorage.getItem(STORAGE_KEYS.TICKET);
            const ftrRaw = localStorage.getItem(STORAGE_KEYS.FTR);
            const regRaw = localStorage.getItem(STORAGE_KEYS.REG);

            return {
                ticket: ticketRaw ? arrToSet(JSON.parse(ticketRaw)) : new Set(),
                ftr: ftrRaw ? arrToSet(JSON.parse(ftrRaw)) : new Set(),
                reg: regRaw ? arrToSet(JSON.parse(regRaw)) : new Set(),
            };
        } catch (e) {
            console.error("Failed to load ID history:", e);
            return {
                ticket: new Set(),
                ftr: new Set(),
                reg: new Set(),
            };
        }
    },

    // Save specific new IDs (Append to existing storage)
    // Note: LocalStorage has a size limit (usually ~5MB). Storing millions of IDs might hit it.
    // For larger sets, IndexedDB is better, but this is a quick valid start.
    saveBatch: (newIds) => {
        try {
            const current = IDStorage.loadHistory(); // Reload to be safe/atomic-ish

            if (newIds.ticket.size > 0) {
                newIds.ticket.forEach(id => current.ticket.add(String(id)));
                localStorage.setItem(STORAGE_KEYS.TICKET, JSON.stringify(setToArr(current.ticket)));
            }
            if (newIds.ftr.size > 0) {
                newIds.ftr.forEach(id => current.ftr.add(String(id)));
                localStorage.setItem(STORAGE_KEYS.FTR, JSON.stringify(setToArr(current.ftr)));
            }
            if (newIds.reg.size > 0) {
                newIds.reg.forEach(id => current.reg.add(String(id)));
                localStorage.setItem(STORAGE_KEYS.REG, JSON.stringify(setToArr(current.reg)));
            }
        } catch (e) {
            console.error("Failed to save ID history:", e);
            if (e.name === 'QuotaExceededError') {
                alert("Warning: Browser storage is full. ID history may not be saved!");
            }
        }
    },

    // Export for Backup
    exportHistoryData: () => {
        const history = IDStorage.loadHistory();
        return {
            ticket: setToArr(history.ticket),
            ftr: setToArr(history.ftr),
            reg: setToArr(history.reg),
            timestamp: new Date().toISOString()
        };
    },

    // Import for Restore
    importHistoryData: (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            if (!data.ticket || !data.ftr || !data.reg) throw new Error("Invalid format");

            const ticketSet = new Set(data.ticket);
            const ftrSet = new Set(data.ftr);
            const regSet = new Set(data.reg);

            localStorage.setItem(STORAGE_KEYS.TICKET, JSON.stringify([...ticketSet]));
            localStorage.setItem(STORAGE_KEYS.FTR, JSON.stringify([...ftrSet]));
            localStorage.setItem(STORAGE_KEYS.REG, JSON.stringify([...regSet]));

            return { success: true, count: ticketSet.size + ftrSet.size + regSet.size };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    clearHistory: () => {
        localStorage.removeItem(STORAGE_KEYS.TICKET);
        localStorage.removeItem(STORAGE_KEYS.FTR);
        localStorage.removeItem(STORAGE_KEYS.REG);
    }
};
