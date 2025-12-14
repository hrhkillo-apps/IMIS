import React, { createContext, useContext, useState, useEffect } from 'react';
import { DataEntryService } from '../services/DataEntryService';
import { useToast } from '../hooks/useToast';

const DataEntryContext = createContext();

export const useDataEntry = () => {
    const context = useContext(DataEntryContext);
    if (!context) {
        throw new Error('useDataEntry must be used within a DataEntryProvider');
    }
    return context;
};

export const DataEntryProvider = ({ children }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        setLoading(true);
        try {
            const data = await DataEntryService.getAllEntries();
            setEntries(data);
        } catch (error) {
            console.error("Failed to load entries:", error);
            toast.error(`Error loading data: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const addEntry = async (entry) => {
        try {
            const newEntry = await DataEntryService.addEntry(entry);
            setEntries(prev => [...prev, newEntry]);
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
            setEntries(prev => prev.map(item => item.id === id ? { ...item, ...updatedData } : item));
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
            setEntries(prev => prev.filter(item => item.id !== id));
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
