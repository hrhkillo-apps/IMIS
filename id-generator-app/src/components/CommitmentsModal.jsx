import React, { useState } from 'react';

const CommitmentsModal = ({ isOpen, onClose }) => {
    const [commitmentFile, setCommitmentFile] = useState(null);
    const [cfmsFile, setCfmsFile] = useState(null);
    const [sacFile, setSacFile] = useState(null); // New SAC State
    const [isProcessing, setIsProcessing] = useState(false);

    // Results State
    const [processedData, setProcessedData] = useState(null);
    const [viewMode, setViewMode] = useState('upload'); // 'upload' | 'results'
    const [vendorFilter, setVendorFilter] = useState('All');
    const [uniqueVendors, setUniqueVendors] = useState([]);

    if (!isOpen) return null;

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (type === 'commitment') setCommitmentFile(file);
        if (type === 'cfms') setCfmsFile(file);
        if (type === 'sac') setSacFile(file);
    };

    const handleProcess = async () => {
        // Validation: Commitment is MANDATORY.
        if (!commitmentFile) {
            alert("Upload Commitment Accounts Excel is mandatory.");
            return;
        }
        // At least one secondary file?
        if (!cfmsFile && !sacFile) {
            alert("Please upload at least one secondary file (CFMS or SAC) to process.");
            return;
        }

        setIsProcessing(true);

        setTimeout(async () => {
            try {
                // Dynamic imports
                const XLSX = await import('xlsx');
                const { processCommitments } = await import('../utils/commitmentsProcessor.js');

                // Read Files Helper
                const readExcel = (file) => new Promise((resolve, reject) => {
                    if (!file) return resolve([]); // Handle optional files safely

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const sheet = workbook.Sheets[workbook.SheetNames[0]];
                            resolve(XLSX.utils.sheet_to_json(sheet));
                        } catch (err) { reject(err); }
                    };
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });

                // Read Commitment (Verified strict existence above)
                const commData = await readExcel(commitmentFile);

                // Read Optionals
                const cfmsData = await readExcel(cfmsFile);
                const sacData = await readExcel(sacFile);

                if (!commData.length) throw new Error("Commitment file is empty.");
                if (!cfmsData.length && !sacData.length) throw new Error("Secondary files are empty.");

                console.log("Processing...");
                // Pass data (callbacks will resolve to [] if file was null)
                const result = processCommitments(commData, cfmsData, sacData);

                // Extract Vendors for Filter
                const vendors = [...new Set(result.map(r => r["NAME OF THE VENDOR"] || "Unknown"))].sort();

                setProcessedData(result);
                setUniqueVendors(['All', ...vendors]);
                setVendorFilter('All');
                setViewMode('results');

                alert(`Analysis Complete! Found ${result.length} matches.`);

            } catch (error) {
                console.error(error);
                alert("Error: " + error.message);
            } finally {
                setIsProcessing(false);
            }
        }, 100);
    };

    const handleDownload = async () => {
        if (!processedData) return;

        let dataToExport = vendorFilter === 'All'
            ? processedData
            : processedData.filter(r => r["NAME OF THE VENDOR"] === vendorFilter);

        // Add Dynamic S.No
        // We create a new array of objects where "S.No" is the very first key.
        dataToExport = dataToExport.map((row, index) => ({
            "S.No": index + 1,
            ...row
        }));

        if (vendorFilter !== 'All') {
            try {
                // Determine Report Mode
                let reportMode = 'both';
                if (sacFile && !cfmsFile) reportMode = 'sac';
                else if (!sacFile && cfmsFile) reportMode = 'cfms';
                // else 'both'

                const { generateVendorPdf } = await import('../utils/pdfGenerator.js');
                generateVendorPdf(dataToExport, vendorFilter, reportMode);
            } catch (err) {
                console.error(err);
                alert("Error generating PDF: " + err.message);
            }
        } else {
            try {
                // Add Grand Total Row for Excel
                const totals = calculateTotals(dataToExport);
                const totalRow = {
                    "S.No": "",
                    "NAME OF THE VENDOR": "GRAND TOTAL",
                    "Proposed Payment Individual": formatINR(totals.proposed),
                    "Credited Payment Individual": formatINR(totals.credited),
                    "My Share": formatINR(totals.share)
                };
                dataToExport.push(totalRow);

                const XLSX = await import('xlsx');
                const ws = XLSX.utils.json_to_sheet(dataToExport);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Commitments");
                const timestamp = new Date().toISOString().slice(0, 10);
                XLSX.writeFile(wb, `commitments_${timestamp}.xlsx`);
            } catch (err) {
                console.error(err);
                alert("Error generating Excel");
            }
        }
    };

    const reset = () => {
        setViewMode('upload');
        setProcessedData(null);
        setCommitmentFile(null);
        setCfmsFile(null);
        setSacFile(null);
        setVendorFilter('All');
    };

    // Helper: Parse Currency String to Float
    const parseCurrency = (val) => {
        if (!val) return 0;
        const clean = String(val).replace(/[^0-9.-]+/g, "");
        return parseFloat(clean) || 0;
    };

    // Helper: Format Float to INR String
    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(val);
    };

    // Calculate Totals for current view
    const currentData = processedData
        ? (vendorFilter === 'All' ? processedData : processedData.filter(r => r["NAME OF THE VENDOR"] === vendorFilter))
        : [];

    const calculateTotals = (data) => {
        let proposed = 0;
        let credited = 0;
        let share = 0;
        data.forEach(row => {
            proposed += parseCurrency(row["Proposed Payment Individual"]);
            credited += parseCurrency(row["Credited Payment Individual"]);
            share += parseCurrency(row["My Share"]);
        });
        return { proposed, credited, share };
    };

    const totals = calculateTotals(currentData);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel" style={{
                width: viewMode === 'results' ? '90%' : '800px', // Wider View
                height: viewMode === 'results' ? '90%' : 'auto',
                position: 'relative', padding: '2rem',
                display: 'flex', flexDirection: 'column'
            }}>
                <button
                    onClick={() => { onClose(); reset(); }}
                    style={{ position: 'absolute', top: 10, right: 15, background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    &times;
                </button>

                <h2 style={{ textAlign: 'center', marginTop: 0 }}>
                    {viewMode === 'results' ? 'Analysis Results' : 'Show the Commitments'}
                </h2>

                {viewMode === 'upload' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* File Inputs Row */}
                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'space-between' }}>

                            {/* 1. Commitment Upload */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>Commitment Excel</label>
                                <div style={{
                                    border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                                    borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                                    background: commitmentFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                                }}>
                                    <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'commitment')} style={{ display: 'none' }} id="comm-upload" />
                                    <label htmlFor="comm-upload" style={{ cursor: 'pointer', width: '100%', display: 'block', fontSize: '0.8rem' }}>
                                        {commitmentFile ? <span style={{ color: '#4caf50' }}>{commitmentFile.name}</span> : <span>Click to Browse</span>}
                                    </label>
                                </div>
                            </div>

                            {/* 2. CFMS Upload */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>CFMS Excel</label>
                                <div style={{
                                    border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                                    borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                                    background: cfmsFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                                }}>
                                    <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'cfms')} style={{ display: 'none' }} id="cfms-upload" />
                                    <label htmlFor="cfms-upload" style={{ cursor: 'pointer', width: '100%', display: 'block', fontSize: '0.8rem' }}>
                                        {cfmsFile ? <span style={{ color: '#4caf50' }}>{cfmsFile.name}</span> : <span>Click to Browse</span>}
                                    </label>
                                </div>
                            </div>

                            {/* 3. SAC Upload (NEW) */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', opacity: 0.9 }}>SAC Excel</label>
                                <div style={{
                                    border: '2px dashed rgba(255,255,255,0.2)', padding: '1rem',
                                    borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                                    background: sacFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                                }}>
                                    <input type="file" accept=".xlsx" onChange={(e) => handleFileChange(e, 'sac')} style={{ display: 'none' }} id="sac-upload" />
                                    <label htmlFor="sac-upload" style={{ cursor: 'pointer', width: '100%', display: 'block', fontSize: '0.8rem' }}>
                                        {sacFile ? <span style={{ color: '#4caf50' }}>{sacFile.name}</span> : <span>Click to Browse</span>}
                                    </label>
                                </div>
                            </div>

                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                className="glass-button"
                                style={{ padding: '0.8rem 2rem', background: isProcessing ? 'grey' : 'rgba(33, 150, 243, 0.3)' }}
                                onClick={handleProcess}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing 3 Files...' : 'Process All Files'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Toolbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <label>Filter by Vendor:</label>
                                <select
                                    value={vendorFilter}
                                    onChange={(e) => setVendorFilter(e.target.value)}
                                    style={{ padding: '5px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                                >
                                    {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="glass-button" onClick={reset}>Back to Upload</button>
                                <button
                                    className="glass-button"
                                    onClick={handleDownload}
                                    style={{ background: 'rgba(76, 175, 80, 0.3)' }}
                                >
                                    {vendorFilter === 'All' ? 'Download Excel' : 'Download PDF'}
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ flex: 1, overflow: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#2c3e50', zIndex: 1 }}>
                                    <tr>
                                        {/* Dynamic S.No Header */}
                                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>S.No</th>

                                        {processedData && processedData.length > 0 && Object.keys(processedData[0]).map(header => (
                                            <th key={header} style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.map((row, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                            {/* Dynamic S.No Cell (1-based index) */}
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{i + 1}</td>

                                            {Object.values(row).map((val, j) => (
                                                <td key={j} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ position: 'sticky', bottom: 0, background: '#34495e', fontWeight: 'bold' }}>
                                    <tr>
                                        <td style={{ padding: '10px' }}></td>
                                        {/* Matches mapping of Processed Rows usually. 
                                            We need to align totals to specific columns: 
                                            "Proposed Payment Individual", "Credited Payment Individual", "My Share"
                                        */}
                                        {processedData && processedData.length > 0 && Object.keys(processedData[0]).map((header, idx) => {
                                            if (header === "Proposed Payment Individual") return <td key={idx} style={{ padding: '10px' }}>{formatINR(totals.proposed)}</td>;
                                            if (header === "Credited Payment Individual") return <td key={idx} style={{ padding: '10px' }}>{formatINR(totals.credited)}</td>;
                                            if (header === "My Share") return <td key={idx} style={{ padding: '10px' }}>{formatINR(totals.share)}</td>;
                                            if (header === "NAME OF THE VENDOR") return <td key={idx} style={{ padding: '10px' }}>GRAND TOTAL</td>;
                                            return <td key={idx}></td>;
                                        })}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommitmentsModal;
