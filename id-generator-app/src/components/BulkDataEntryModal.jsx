import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { useDataEntry } from '../context/DataEntryContext';

const BulkDataEntryModal = ({ isOpen, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const { addEntry } = useDataEntry();
    const toast = useToast();

    if (!isOpen) return null;

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const wsData = [
                ['Vendor Name', 'Beneficiary Name', 'CFMS ID', 'Aadhar Number', 'Pan Card', 'IFSC Code', 'Account Number'],
                ['Example Vendor', 'Example Beneficiary', '123456', '123412341234', 'ABCDE1234F', 'SBIN0000300', '12345678901']
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            XLSX.writeFile(wb, "DataEntry_Template.xlsx");
            toast.success("Template downloaded successfully!");
        } catch (error) {
            console.error("Template download failed:", error);
            toast.error("Failed to download template.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                toast.error("File is empty or invalid format.");
                setIsProcessing(false);
                return;
            }

            let successCount = 0;
            let failureCount = 0;

            // Process each row
            const promises = jsonData.map(async (row) => {
                // Map columns to keys (Loose matching)
                const entry = {
                    vendorName: (row['Vendor Name'] || '').toString().trim().toUpperCase(),
                    beneficiaryName: (row['Beneficiary Name'] || '').toString().trim().toUpperCase(),
                    cfmsId: (row['CFMS ID'] || '').toString().trim().toUpperCase(),
                    aadharNumber: (row['Aadhar Number'] || '').toString().trim(),
                    panCard: (row['Pan Card'] || '').toString().trim().toUpperCase(),
                    ifscCode: (row['IFSC Code'] || '').toString().trim().toUpperCase(),
                    accountNumber: (row['Account Number'] || '').toString().trim()
                };

                // Basic Validation logic duplicated from DataEntryModal for safety
                if (!entry.vendorName || !entry.beneficiaryName || !entry.ifscCode || !entry.accountNumber) {
                    failureCount++;
                    return; // Skip invalid
                }

                // Strictly Validate Aadhar if present
                if (entry.aadharNumber && (!/^\d{12}$/.test(entry.aadharNumber))) {
                    failureCount++;
                    return;
                }

                // Strictly Validate IFSC format
                if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(entry.ifscCode)) {
                    failureCount++;
                    return;
                }

                // Strictly Validate Account Number (digits only)
                if (!/^\d{9,18}$/.test(entry.accountNumber)) {
                    failureCount++;
                    return;
                }


                const success = await addEntry(entry);
                if (success) successCount++;
                else failureCount++;
            });

            await Promise.all(promises);

            toast.success(`Bulk Upload Complete: ${successCount} Added, ${failureCount} Skipped.`);

            // Clear input
            e.target.value = '';

            // Close modal if at least one success
            if (successCount > 0) {
                onClose();
            }

        } catch (error) {
            console.error("Bulk upload error:", error);
            toast.error("Failed to process file.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1050, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '10px', right: '15px',
                        background: 'none', border: 'none', color: 'white',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}>
                    &times;
                </button>
                <h2 style={{ marginTop: 0 }}>Bulk Data Entry</h2>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 1rem 0' }}>Step 1: Download the template.</p>
                    <button onClick={handleDownloadTemplate} className="glass-button" style={{ width: '100%' }}>
                        📥 Download Excel Template
                    </button>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 1rem 0' }}>Step 2: Upload filled Excel file.</p>
                    {isProcessing ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>Processing...</div>
                    ) : (
                        <>
                            <input
                                type="file"
                                id="bulk-upload-input"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="bulk-upload-input" className="glass-button" style={{ display: 'block', textAlign: 'center', cursor: 'pointer', background: 'rgba(76, 175, 80, 0.4)' }}>
                                📤 Upload & Process
                            </label>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkDataEntryModal;
