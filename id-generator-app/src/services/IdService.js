import { db } from '../firebase.config';
import { collection, doc, getDocs, writeBatch, runTransaction } from "firebase/firestore";

const COLLECTIONS = {
    TICKET: 'imis_history_ticket',
    FTR: 'imis_history_ftr',
    REG: 'imis_history_reg',
    AADHAR: 'imis_history_aadhar', // New Collection
};

export const IdService = {
    // Check and reserve a batch of IDs atomically
    // generatorFn: () => string (returns a single random ID)
    reserveIds: async (collectionName, count, generatorFn) => {
        const MAX_RETRIES = 5;
        let attempt = 0;

        while (attempt < MAX_RETRIES) {
            try {
                // 1. Generate Candidates
                const candidates = new Set();
                while (candidates.size < count) {
                    candidates.add(String(generatorFn()));
                }
                const candidateArray = Array.from(candidates);

                await runTransaction(db, async (transaction) => {
                    // 2. Read phase: Check all candidates
                    const refs = candidateArray.map(id => doc(db, collectionName, id));
                    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));

                    const existing = snapshots.filter(snap => snap.exists());
                    if (existing.length > 0) {
                        throw new Error("COLLISION"); // Trigger retry
                    }

                    // 3. Write phase: Create all
                    refs.forEach(ref => {
                        transaction.set(ref, { createdAt: new Date() });
                    });
                });

                // If we get here, transaction succeeded
                return { success: true, ids: candidateArray };

            } catch (error) {
                if (error.message === "COLLISION") {
                    console.warn(`Batch generation collision (Attempt ${attempt + 1}). Retrying...`);
                    attempt++;
                    continue;
                }
                // Real error
                console.error("Transaction failed:", error);
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: "Failed to generate unique IDs after multiple retries. System busy or saturated." };
    },

    // Legacy: Fetch all existing IDs (Keep for now if visuals need it, but warn)
    getAllIds: async () => {
        console.warn("Fetching ALL IDs is deprecated for generation logic. Use reserveIds instead.");
        try {
            const history = {
                ticket: new Set(),
                ftr: new Set(),
                reg: new Set(),
                aadhar: new Set()
            };

            const [ticketSnapshot, ftrSnapshot, regSnapshot, aadharSnapshot] = await Promise.all([
                getDocs(collection(db, COLLECTIONS.TICKET)),
                getDocs(collection(db, COLLECTIONS.FTR)),
                getDocs(collection(db, COLLECTIONS.REG)),
                getDocs(collection(db, COLLECTIONS.AADHAR))
            ]);

            ticketSnapshot.forEach(doc => history.ticket.add(doc.id));
            ftrSnapshot.forEach(doc => history.ftr.add(doc.id));
            regSnapshot.forEach(doc => history.reg.add(doc.id));
            aadharSnapshot.forEach(doc => history.aadhar.add(doc.id));

            return history;
        } catch (error) {
            console.error("ID Fetch Error:", error);
            return null; // Don't throw, just return null so app doesn't crash
        }
    },

    // Save batch helper (Direct write without check - Use reserveIds for safety)
    saveBatch: async (newIds) => {
        // ... Keeping for backward compatibility if needed, but reserveIds replaces the core use case
        try {
            const batch = writeBatch(db);

            newIds.ticket?.forEach(id => {
                const ref = doc(db, COLLECTIONS.TICKET, String(id));
                batch.set(ref, { createdAt: new Date() });
            });

            newIds.ftr?.forEach(id => {
                const ref = doc(db, COLLECTIONS.FTR, String(id));
                batch.set(ref, { createdAt: new Date() });
            });

            newIds.reg?.forEach(id => {
                const ref = doc(db, COLLECTIONS.REG, String(id));
                batch.set(ref, { createdAt: new Date() });
            });
            newIds.aadhar?.forEach(id => {
                const ref = doc(db, COLLECTIONS.AADHAR, String(id));
                batch.set(ref, { createdAt: new Date() });
            });

            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error("Error saving batch to Firebase:", error);
            return { success: false, error: error.message };
        }
    }
};
