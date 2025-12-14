import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

const COLLECTION_NAME = 'imis_data_entries';

export const DataEntryService = {
    // Fetch all entries
    getAllEntries: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const entries = [];
            querySnapshot.forEach((doc) => {
                entries.push({ id: doc.id, ...doc.data() });
            });
            return entries;
        } catch (error) {
            console.error("Error fetching entries:", error);
            throw error;
        }
    },

    // Add a new entry
    addEntry: async (entry) => {
        try {
            // Create a new document reference with an auto-generated ID if not provided, 
            // but we usually want a specific structure. 
            // Using doc() with collection ref generates a new ID.
            const newDocRef = doc(collection(db, COLLECTION_NAME));
            const entryWithId = { ...entry, id: newDocRef.id, createdAt: new Date().toISOString() };

            await setDoc(newDocRef, entryWithId);
            return entryWithId;
        } catch (error) {
            console.error("Error adding entry:", error);
            throw error;
        }
    },

    // Update an entry
    updateEntry: async (id, updatedData) => {
        try {
            const entryRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(entryRef, { ...updatedData, updatedAt: new Date().toISOString() });
            return { id, ...updatedData };
        } catch (error) {
            console.error("Error updating entry:", error);
            throw error;
        }
    },

    // Delete an entry
    deleteEntry: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            return id;
        } catch (error) {
            console.error("Error deleting entry:", error);
            throw error;
        }
    }
};
