import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a PDF for a specific vendor's commitments.
 * @param {Array} data - The array of row objects for the selected vendor.
 * @param {string} vendorName - Name of the vendor.
 * @param {string} reportMode - 'sac', 'cfms', or 'both' (determines columns/titles).
 */
export const generateVendorPdf = (data, vendorName, reportMode) => {
    // Helper: Clean currency for calculation
    const parseCurrency = (val) => {
        if (!val) return 0;
        // Remove 'Rs.', '₹', commas, spaces, and handle '-'
        const clean = String(val).replace(/[^0-9.-]+/g, "");
        // If result is empty or just '-', return 0
        if (clean === "" || clean === "-") return 0;
        return parseFloat(clean) || 0;
    };

    // Helper: Format INR for PDF
    const formatINR = (num) => {
        if (isNaN(num)) return "Rs. 0.00";
        const str = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
        return `Rs. ${str}`;
    };

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // 1. Dynamic Title
    let title = `Commitment Analysis: ${vendorName}`;
    if (reportMode === 'sac') title = `Proposed Payments: ${vendorName}`;
    else if (reportMode === 'cfms') title = `Credited Payments: ${vendorName}`;
    else if (reportMode === 'both') title = `Commitment Status Report: ${vendorName}`;

    doc.setFontSize(16);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Generated on: ${dateStr}`, 14, 28);

    if (!data || data.length === 0) {
        doc.text("No data available.", 14, 40);
        doc.save(`${vendorName}_Report.pdf`);
        return;
    }

    // 2. Prepare Columns & Totals Calculation
    const columns = [
        { header: 'S.No', dataKey: 'S.No' },
        { header: 'Beneficiary', dataKey: 'Beneficiary Name' },
        { header: 'IFSC Code', dataKey: 'IFSC Code' },
        { header: 'Account Number', dataKey: 'ACCOUNT NUMBER' },
    ];

    // Dynamic Payment Columns
    if (reportMode === 'sac' || reportMode === 'both') {
        columns.push({ header: reportMode === 'both' ? 'Proposed' : 'Proposed Payment', dataKey: 'Proposed Payment Individual' });
    }
    if (reportMode === 'cfms' || reportMode === 'both') {
        columns.push({ header: reportMode === 'both' ? 'Credited' : 'Credited Payment', dataKey: 'Credited Payment Individual' });
    }

    let totalProposed = 0;
    let totalCredited = 0;

    // 3. Map Data and Calculate Totals on the fly
    const tableRows = data.map(row => {
        const findVal = (key) => {
            const rowKey = Object.keys(row).find(k => k.trim() === key);
            return rowKey ? row[rowKey] : '';
        };

        const rawProposed = findVal('Proposed Payment Individual');
        const rawCredited = findVal('Credited Payment Individual');

        // Accumulate Raw Values (Safest)
        totalProposed += parseCurrency(rawProposed);
        totalCredited += parseCurrency(rawCredited);

        const formatCell = (val) => {
            if (!val) return '-';
            // Replace ₹ symbol with Rs. if present
            return String(val).replace(/₹/g, 'Rs.').trim();
        };

        return {
            'S.No': row['S.No'] || '-',
            'Beneficiary Name': findVal('NAME OF THE BENEFICIARY') || findVal('Beneficiary Name'),
            'IFSC Code': findVal('IFSC Code') || findVal('IFSC'),
            'ACCOUNT NUMBER': findVal('ACCOUNT NUMBER'),
            'Proposed Payment Individual': formatCell(rawProposed),
            'Credited Payment Individual': formatCell(rawCredited)
        };
    });

    // Footer Row
    const footerRow = ['', 'TOTAL:', '', '']; // S.No, Ben, IFSC, Acc
    if (reportMode === 'sac' || reportMode === 'both') footerRow.push(formatINR(totalProposed));
    if (reportMode === 'cfms' || reportMode === 'both') footerRow.push(formatINR(totalCredited));

    // Shared Table Options for A4 Portrait Autofit (No Wrap)
    const tableOptions = {
        startY: 35,
        columns: columns,
        body: tableRows,
        theme: 'grid', // 'grid' has borders, better for data
        styles: {
            fontSize: 7, // Smaller font to fit more
            overflow: 'ellipsize', // PREVENT WRAPPING
            cellPadding: 2,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            halign: 'center',
            fontStyle: 'bold'
        },
        // Auto-arrange columns. Only anchor specific small columns if needed.
        columnStyles: {
            'S.No': { halign: 'center', cellWidth: 10 },
            // Let others autofit based on content and page width.
            // Alignment tweaks:
            'Proposed Payment Individual': { halign: 'right' },
            'Credited Payment Individual': { halign: 'right' },
            'Beneficiary Name': { halign: 'left' }
        },
        margin: { top: 35, left: 10, right: 10, bottom: 20 },
        foot: [footerRow],
        footStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'right'
            // Note: autoTable footer aligns match body columns usually, but let's leave it automatic.
        },
        // Force Total label to match Beneficiary alignment or stick to column
        didParseCell: (data) => {
            if (data.section === 'foot' && data.column.dataKey === 'Beneficiary Name') {
                data.cell.styles.halign = 'right';
            }
        }
    };

    if (typeof autoTable === 'function') {
        autoTable(doc, tableOptions);
    } else if (typeof doc.autoTable === 'function') {
        doc.autoTable(tableOptions);
    } else {
        throw new Error("PDF Table plugin (autoTable) failed to load.");
    }

    const safeName = vendorName.replace(/[^a-z0-9]/gi, '_');
    doc.save(`${safeName}_Report.pdf`);
};
