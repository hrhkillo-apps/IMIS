import React, { useState } from 'react';

const CommitmentsModal = ({ isOpen, onClose }) => {
    const [commitmentFile, setCommitmentFile] = useState(null);
    const [cfmsFile, setCfmsFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (type === 'commitment') setCommitmentFile(file);
        if (type === 'cfms') setCfmsFile(file);
    };

    const handleProcess = async () => {
        if (!commitmentFile || !cfmsFile) {
            alert("Please upload both files.");
            return;
        }

        setIsProcessing(true);

        try {
            // Dynamic imports
            const XLSX = await import('xlsx');
            const { processCommitments } = await import('../utils/commitmentsProcessor.js');

            // Helper to read Excel
            const readExcel = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[firstSheetName];
                        const json = XLSX.utils.sheet_to_json(sheet);
                        resolve(json);
                    } catch (err) { reject(err); }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });

            // 1. Read Files
            console.log("Reading Commitment File...");
            const commitmentData = await readExcel(commitmentFile);

            console.log("Reading CFMS File...");
            const cfmsData = await readExcel(cfmsFile);

            if (commitmentData.length === 0 || cfmsData.length === 0) {
                throw new Error("One or both files are empty.");
            }

            // 2. Process
            console.log("Processing Commitments...");
            const resultData = processCommitments(commitmentData, cfmsData);

            // 3. Download Result
            const ws = XLSX.utils.json_to_sheet(resultData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Commitment Analysis");

            const now = new Date();
            const timestamp = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
            const filename = `commitment_analysis_${timestamp}.xlsx`;

            XLSX.writeFile(wb, filename);

            // alert("Analysis Complete! File downloaded.");
            onClose();

        } catch (error) {
            console.error("Processing Error:", error);
            alert("Error: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '600px', position: 'relative', padding: '2rem' }}>
                <button
                    onClick={onClose}
                    disabled={isProcessing}
                    style={{
                        position: 'absolute', top: '10px', right: '15px',
                        background: 'none', border: 'none', color: 'white',
                        fontSize: '1.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}>
                    &times;
                </button>
                <h2 style={{ marginBottom: '1.5rem', marginTop: 0, textAlign: 'center' }}>Show the Commitments</h2>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Commitment Accounts Upload */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', opacity: 0.9 }}>Upload Commitment Accounts Excel</label>
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                            borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                            background: commitmentFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={(e) => handleFileChange(e, 'commitment')}
                                style={{ display: 'none' }}
                                id="commitment-upload"
                            />
                            <label htmlFor="commitment-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                                {commitmentFile ? (
                                    <span style={{ color: '#4caf50' }}>{commitmentFile.name}</span>
                                ) : (
                                    <span style={{ opacity: 0.7 }}>Click to Browse</span>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* CFMS Upload */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', opacity: 0.9 }}>Upload CFMS Excel</label>
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                            borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                            background: cfmsFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            <input
                                type="file"
                                accept=".xlsx"
                                onChange={(e) => handleFileChange(e, 'cfms')}
                                style={{ display: 'none' }}
                                id="cfms-commit-upload"
                            />
                            <label htmlFor="cfms-commit-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                                {cfmsFile ? (
                                    <span style={{ color: '#4caf50' }}>{cfmsFile.name}</span>
                                ) : (
                                    <span style={{ opacity: 0.7 }}>Click to Browse</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        className="glass-button"
                        style={{ padding: '0.8rem 2rem', background: 'rgba(33, 150, 243, 0.3)' }}
                        onClick={handleProcess}
                    >
                        Process Files
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommitmentsModal;
