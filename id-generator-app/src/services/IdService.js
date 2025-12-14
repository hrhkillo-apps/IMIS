import { db } from '../firebase.config';
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

const COLLECTIONS = {
    TICKET: 'imis_history_ticket',
    FTR: 'imis_history_ftr',
    REG: 'imis_history_reg',
    AADHAR: 'imis_history_aadhar', // New Collection
};

export const IdService = {
    // Fetch all existing IDs to prime the generator cache
    getAllIds: async () => {
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
            // With persistence enabled, this usually only throws if permission denied or critical failure.
            // If offline, getDocs should return cached data or wait.
            // We'll re-throw for the UI to decide whether to block or warn.
            throw new Error("Could not fetch ID history. Ensure you are online for first run or have cached data.");
        }
    },

    // Save a batch of IDs (Transaction/Batch write)
    saveBatch: async (newIds) => {
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
