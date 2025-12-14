import { useContext } from 'react';
import { DataEntryContext } from '../context/DataEntryContextDefinition';

export const useDataEntry = () => {
    const context = useContext(DataEntryContext);
    if (!context) {
        throw new Error('useDataEntry must be used within a DataEntryProvider');
    }
    return context;
};
