import React, { useState, useMemo } from 'react';

const ViewDataEntryModal = ({ isOpen, onClose, entries = [], onEdit, onDelete }) => {
    const [filterVendor, setFilterVendor] = useState('');
    const [filterIfsc, setFilterIfsc] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'vendorName', direction: 'asc' });

    // Get unique vendor names for the dropdown
    const uniqueVendors = useMemo(() => {
        const vendors = [...new Set(entries.map(e => e.vendorName))];
        return vendors.sort();
    }, [entries]);

    if (!isOpen) return null;

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedEntries = [...entries].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const filteredEntries = sortedEntries.filter(entry => {
        const vendorMatch = filterVendor === '' || entry.vendorName === filterVendor;
        const ifscMatch = entry.ifscCode.toLowerCase().includes(filterIfsc.toLowerCase());
        return vendorMatch && ifscMatch;
    });

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
        }
        return '';
    };

    const handleExportExcel = async () => {
        try {
            const XLSX = await import('xlsx');

            // Prepare data for export
            const exportData = filteredEntries.map((entry, index) => ({
                'S.No': index + 1,
                'Vendor Name': entry.vendorName,
                'Beneficiary Name': entry.beneficiaryName,
                'CFMS ID': entry.cfmsId || '-',
                'Aadhar Number': entry.aadharNumber || '-',
                'PAN Card': entry.panCard || '-',
                'IFSC Code': entry.ifscCode,
                'Account Number': entry.accountNumber
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data Entries");
            XLSX.writeFile(wb, `Data_Entries_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export Excel");
        }
    };

    const handleExportPDF = async () => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();

            const tableColumn = ["S.No", "Vendor Name", "Beneficiary Name", "IFSC Code", "Account Number"];
            const tableRows = filteredEntries.map((entry, index) => [
                index + 1,
                entry.vendorName,
                entry.beneficiaryName,
                entry.ifscCode,
                entry.accountNumber
            ]);

            // doc.text("Data Entries List", 14, 15);

            // Add System Generated Date
            doc.setFontSize(10);
            const dateStr = new Date().toLocaleDateString();
            doc.text(`System Generated on: ${dateStr}`, 14, 15);

            // Use autoTable as a function passing the doc instance
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 20,
                theme: 'grid',
                styles: {
                    overflow: 'linebreak',
                    fontSize: 10,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 15 }, // S.No
                    1: { cellWidth: 'auto' }, // Vendor
                    2: { cellWidth: 'auto' }, // Beneficiary
                    3: { cellWidth: 30 }, // IFSC
                    4: { cellWidth: 40 } // Account
                }
            });

            doc.save(`Data_Entries_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert(`Failed to export PDF: ${error.message}`);
        }
    };

    const inputStyle = {
        padding: '0.5rem',
        borderRadius: '4px',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.1)',
        color: 'white',
        width: '200px'
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>View Data Entries ({filteredEntries.length})</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: 'white',
                            fontSize: '1.5rem', cursor: 'pointer'
                        }}>
                        &times;
                    </button>
                </div>

                {/* Filters and Actions Bar */}
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <select
                        value={filterVendor}
                        onChange={(e) => setFilterVendor(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="" style={{ color: 'black' }}>All Vendors</option>
                        {uniqueVendors.map(vendor => (
                            <option key={vendor} value={vendor} style={{ color: 'black' }}>{vendor}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Filter by IFSC..."
                        value={filterIfsc}
                        onChange={(e) => setFilterIfsc(e.target.value)}
                        style={inputStyle}
                    />

                    <div style={{ flex: 1 }}></div>

                    <button className="glass-button" onClick={handleExportExcel} style={{ background: 'rgba(76, 175, 80, 0.3)' }}>
                        Export Excel
                    </button>
                    <button className="glass-button" onClick={handleExportPDF} style={{ background: 'rgba(255, 152, 0, 0.3)' }}>
                        Export PDF
                    </button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                    {filteredEntries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)' }}>
                            {entries.length === 0 ? "No entries found. Please add some data." : "No matches found."}
                        </div>
                    ) : (
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>S.No</th>
                                    <th onClick={() => handleSort('vendorName')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        Vendor Name {getSortIndicator('vendorName')}
                                    </th>
                                    <th onClick={() => handleSort('beneficiaryName')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        Beneficiary Name {getSortIndicator('beneficiaryName')}
                                    </th>
                                    <th onClick={() => handleSort('cfmsId')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        CFMS ID {getSortIndicator('cfmsId')}
                                    </th>
                                    <th onClick={() => handleSort('aadharNumber')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        Aadhar Number {getSortIndicator('aadharNumber')}
                                    </th>
                                    <th onClick={() => handleSort('panCard')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        Pan Card {getSortIndicator('panCard')}
                                    </th>
                                    <th onClick={() => handleSort('ifscCode')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        IFSC Code {getSortIndicator('ifscCode')}
                                    </th>
                                    <th onClick={() => handleSort('accountNumber')} style={{ cursor: 'pointer', textAlign: 'left', padding: '0.75rem' }}>
                                        Account Number {getSortIndicator('accountNumber')}
                                    </th>
                                    <th style={{ textAlign: 'center', padding: '0.75rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((entry, index) => (
                                    <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{index + 1}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.vendorName}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.beneficiaryName}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.cfmsId || '-'}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.aadharNumber || '-'}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.panCard || '-'}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.ifscCode}</td>
                                        <td style={{ textAlign: 'left', padding: '0.75rem' }}>{entry.accountNumber}</td>
                                        <td style={{ textAlign: 'center', padding: '0.75rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => onEdit(entry)}
                                                    className="glass-button"
                                                    style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'rgba(33, 150, 243, 0.3)' }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to delete this entry?')) {
                                                            onDelete(entry.id);
                                                        }
                                                    }}
                                                    className="glass-button"
                                                    style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'rgba(244, 67, 54, 0.3)' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewDataEntryModal;
