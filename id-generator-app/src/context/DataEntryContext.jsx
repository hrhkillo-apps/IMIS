import React, { useState, useEffect } from 'react';
import { DataEntryService } from '../services/DataEntryService';
import { useToast } from '../hooks/useToast';
import { DataEntryContext } from './DataEntryContextDefinition';

export const DataEntryProvider = ({ children }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true); // Start loading immediately
    const toast = useToast();

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubscribe = DataEntryService.subscribeToEntries((data) => {
            setEntries(data);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const addEntry = async (entry) => {
        try {
            await DataEntryService.addEntry(entry);
            // No need to update local state, subscription will handle it
            return true;
        } catch (error) {
            console.error("Failed to add entry:", error);
            toast.error(`Failed to save: ${error.message}`);
            return false;
        }
    };

    const updateEntry = async (id, updatedData) => {
        try {
            await DataEntryService.updateEntry(id, updatedData);
            return true;
        } catch (error) {
            console.error("Failed to update entry:", error);
            toast.error("Failed to update entry.");
            return false;
        }
    };

    const deleteEntry = async (id) => {
        try {
            await DataEntryService.deleteEntry(id);
            return true;
        } catch (error) {
            console.error("Failed to delete entry:", error);
            toast.error("Failed to delete entry.");
            return false;
        }
    };

    return (
        <DataEntryContext.Provider value={{ entries, addEntry, updateEntry, deleteEntry, loading }}>
            {children}
        </DataEntryContext.Provider>
    );
};
