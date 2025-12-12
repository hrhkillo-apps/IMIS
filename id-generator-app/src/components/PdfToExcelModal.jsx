import React, { useState } from 'react';

const PdfToExcelModal = ({ isOpen, onClose }) => {
    const [pdfFile, setPdfFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        setPdfFile(e.target.files[0]);
    };

    const handleConvert = async () => {
        if (!pdfFile) {
            alert("Please upload a PDF file.");
            return;
        }

        setIsProcessing(true);

        try {
            // dynamic imports
            const XLSX = await import('xlsx');
            const { parseCfmsPdf } = await import('../utils/pdfParser.js'); // Reuse existing parser

            console.log("Parsing PDF...");
            // Reuse the parsing logic we built for matching
            const extractedData = await parseCfmsPdf(pdfFile);
            console.log("Extracted Data:", extractedData);

            if (!extractedData || extractedData.length === 0) {
                alert("No data found in PDF. Please check the file format.");
                setIsProcessing(false);
                return;
            }

            // Convert to Excel
            const ws = XLSX.utils.json_to_sheet(extractedData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "PDF Data");

            const now = new Date();
            const timestamp = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
            const filename = `converted_pdf_data_${timestamp}.xlsx`;

            XLSX.writeFile(wb, filename);

            alert("Conversion Complete! File downloaded.");
            onClose();

        } catch (error) {
            console.error("Conversion Error:", error);
            alert("Error converting file: " + error.message);
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
            <div className="glass-panel" style={{ width: '500px', position: 'relative', padding: '2rem' }}>
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
                <h2 style={{ marginBottom: '1.5rem', marginTop: 0, textAlign: 'center' }}>Convert .pdf to .xlsx</h2>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', opacity: 0.9 }}>Upload PDF file</label>
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.2)', padding: '2rem',
                            borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                            background: pdfFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                id="pdf-convert-upload"
                                disabled={isProcessing}
                            />
                            <label htmlFor="pdf-convert-upload" style={{ cursor: isProcessing ? 'wait' : 'pointer', width: '100%', display: 'block' }}>
                                {pdfFile ? (
                                    <span style={{ color: '#4caf50', fontSize: '1.1rem' }}>{pdfFile.name}</span>
                                ) : (
                                    <span style={{ opacity: 0.7, fontSize: '1.1rem' }}>Click to Browse PDF</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    {isProcessing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffeb3b', fontWeight: 'bold' }}>
                            <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: '#ffeb3b', animation: 'spin 1s ease-in-out infinite' }}></div>
                            <span>Converting...</span>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    <button
                        className="glass-button"
                        style={{ padding: '0.8rem 2rem', background: isProcessing ? 'grey' : 'rgba(33, 150, 243, 0.3)', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                        onClick={handleConvert}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Converting...' : 'Convert & Download'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfToExcelModal;
