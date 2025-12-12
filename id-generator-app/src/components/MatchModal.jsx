import React, { useState } from 'react';

const MatchModal = ({ isOpen, onClose }) => {
    const [cfmsFile, setCfmsFile] = useState(null);
    const [sacFile, setSacFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (type === 'cfms') setCfmsFile(file);
        if (type === 'sac') setSacFile(file);
    };

    const handleMatch = async () => {
        if (!cfmsFile || !sacFile) {
            alert("Please upload both files.");
            return;
        }

        setIsProcessing(true);

        try {
            // dynamic imports
            const XLSX = await import('xlsx');
            const { parseCfmsPdf } = await import('../utils/pdfParser.js');
            const { matchAndMerge } = await import('../utils/dataMatcher.js');

            // 1. Process CFMS PDF
            console.log("Parsing PDF...");
            const cfmsData = await parseCfmsPdf(cfmsFile);
            console.log("CFMS Data:", cfmsData);

            if (!cfmsData || cfmsData.length === 0) {
                alert("No data found in PDF. Please check the file format.");
                setIsProcessing(false);
                return;
            }

            // 2. Process SAC Excel
            console.log("Reading Excel...");
            const sacData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[firstSheetName];
                        const json = XLSX.utils.sheet_to_json(sheet);
                        resolve(json);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(sacFile);
            });
            console.log("SAC Data:", sacData);

            // 3. Match and Merge
            console.log("Matching...");
            const mergedData = matchAndMerge(sacData, cfmsData);
            console.log("Merged Data:", mergedData);

            // 4. Download Result
            const ws = XLSX.utils.json_to_sheet(mergedData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Matched Data");

            // Use simple safe filename with underscore timestamp
            const now = new Date();
            const timestamp = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
            const filename = `matched_result_${timestamp}.xlsx`;

            XLSX.writeFile(wb, filename);

            alert("Matching Complete! File downloaded.");
            onClose();

        } catch (error) {
            console.error("Match Error:", error);
            alert("Error matching files: " + error.message);
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
                <h2 style={{ marginBottom: '1.5rem', marginTop: 0, textAlign: 'center' }}>Match CFMS with SAC</h2>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                    {/* CFMS Upload */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', opacity: 0.9 }}>Upload CFMS .pdf file</label>
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                            borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                            background: cfmsFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => handleFileChange(e, 'cfms')}
                                style={{ display: 'none' }}
                                id="cfms-upload"
                                disabled={isProcessing}
                            />
                            <label htmlFor="cfms-upload" style={{ cursor: isProcessing ? 'wait' : 'pointer', width: '100%', display: 'block' }}>
                                {cfmsFile ? (
                                    <span style={{ color: '#4caf50' }}>{cfmsFile.name}</span>
                                ) : (
                                    <span style={{ opacity: 0.7 }}>Click to Browse</span>
                                )}
                            </label>
                        </div>
                    </div>

                    {/* SAC Upload */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', opacity: 0.9 }}>Upload SAC .xlsx file</label>
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                            borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                            background: sacFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => handleFileChange(e, 'sac')}
                                style={{ display: 'none' }}
                                id="sac-upload"
                                disabled={isProcessing}
                            />
                            <label htmlFor="sac-upload" style={{ cursor: isProcessing ? 'wait' : 'pointer', width: '100%', display: 'block' }}>
                                {sacFile ? (
                                    <span style={{ color: '#4caf50' }}>{sacFile.name}</span>
                                ) : (
                                    <span style={{ opacity: 0.7 }}>Click to Browse</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

                    {isProcessing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffeb3b', fontWeight: 'bold' }}>
                            <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: '#ffeb3b', animation: 'spin 1s ease-in-out infinite' }}></div>
                            <span>Processing... This may take a moment.</span>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    <button
                        className="glass-button"
                        style={{ padding: '0.8rem 2rem', background: isProcessing ? 'grey' : 'rgba(33, 150, 243, 0.3)', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                        onClick={handleMatch}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Matching...' : 'Match Data'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchModal;
