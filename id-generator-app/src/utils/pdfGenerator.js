import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a PDF for a specific vendor's commitments.
 * @param {Array} data - The array of row objects for the selected vendor.
 * @param {string} vendorName - Name of the vendor.
 */
export const generateVendorPdf = (data, vendorName) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text(`Commitment Analysis: ${vendorName}`, 14, 20);

    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Generated on: ${dateStr}`, 14, 28);

    if (!data || data.length === 0) {
        doc.text("No data available.", 14, 40);
        doc.save(`${vendorName}_Report.pdf`);
        return;
    }

    // Prepare Table Columns
    // We want specific columns that are relevant for a report, not usually ALL 30+ columns
    // Based on user interest:
    const columns = [
        { header: 'Beneficiary', dataKey: 'Beneficiary Name' }, // Mapped below
        { header: 'CFMS ID', dataKey: 'CFMS ID' },
        { header: 'Aadhar', dataKey: 'AADHAR NUMBER' },
        { header: 'Account No', dataKey: 'ACCOUNT NUMBER' },
        { header: 'IFSC', dataKey: 'IFSC Code' },
        { header: 'Ind. Amt', dataKey: 'Proposed Payment Individual' },
        { header: 'My Share', dataKey: 'My Share' },
    ];

    // Map Data to match keys (handling the messy keys from Excel)
    const tableRows = data.map(row => {
        // Find keys loosely again or expect them from the processed output (which we know)
        const findVal = (key) => {
            const rowKey = Object.keys(row).find(k => k.trim() === key);
            return rowKey ? row[rowKey] : '';
        };

        return {
            'Beneficiary Name': findVal('NAME OF THE BENEFICIARY') || findVal('Beneficiary Name'),
            'CFMS ID': findVal('CFMS ID'),
            'AADHAR NUMBER': findVal('AADHAR NUMBER') || findVal('AADHAR'),
            'ACCOUNT NUMBER': findVal('ACCOUNT NUMBER'),
            'IFSC Code': findVal('IFSC Code') || findVal('IFSC'),
            'Proposed Payment Individual': findVal('Proposed Payment Individual'),
            'My Share': findVal('My Share') || '-'
        };
    });

    // Add Totals Row
    // Since we filtered by vendor, the Aggregates are likely on the FIRST row of 'data'.
    // Let's grab them.
    const firstRow = data[0];
    const totalAmount = firstRow['Proposed Payment Vendor'];
    const totalShare = firstRow['My Share'] !== '' ? firstRow['My Share'] :
        // If first row didn't have it (e.g. we passed non-raw data), we recalc or look for it.
        // But in our processor, we put it on the first row of the VENDOR block.
        // If 'data' passed here IS that block, row 0 has it.
        tableRows.reduce((sum, r) => sum + (parseFloat(r['My Share']) || 0), 0).toFixed(2);

    doc.autoTable({
        startY: 35,
        columns: columns,
        body: tableRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        foot: [[
            'TOTALS:', '', '', '', '',
            firstRow['Proposed Payment Vendor'] || '-',
            totalShare
        ]],
        footStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Save
    const safeName = vendorName.replace(/[^a-z0-9]/gi, '_');
    doc.save(`${safeName}_Commitment_Report.pdf`);
};
