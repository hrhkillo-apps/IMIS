import { useState } from 'react';
import './index.css';
import * as XLSX from 'xlsx';

const Header = () => (
  <header style={{ marginBottom: '2rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
      IMIS Data & ID Manager
    </h1>
    <p style={{ opacity: 0.8 }}>Upload any Excel file with the required format to generate missing IDs.</p>
  </header>
);

const PREDEFINED_LINKS = [
  { label: 'CFMS Bill Status', url: 'https://prdcfms.apcfss.in:44300/sap/bc/ui5_ui5/sap/zexp_billstatus/index.html?sap-client=%27%27' },
  { label: 'Create Multiple Beneficiary Requests', url: 'https://prdcfms.apcfss.in:44300/sap/bc/ui5_ui5/sap/zexp_bf_mul_req/index.html' },
  { label: 'SBM IMIS', url: 'https://sbm.gov.in/SBMPhase2/Secure/Entry/UserMenu.aspx' },
  { label: 'SAC', url: 'https://sac.ap.gov.in/internal' }
];



const ExternalLinks = ({ onAadharClick }) => (
  <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Quick Links</h3>
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {PREDEFINED_LINKS.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-button"
          style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          🔗 {link.label}
        </a>
      ))}
      <button
        onClick={onAadharClick}
        className="glass-button"
        style={{ textDecoration: 'none', fontSize: '0.9rem', cursor: 'pointer', background: 'rgba(255, 100, 100, 0.2)', border: '1px solid rgba(255, 100, 100, 0.4)' }}
      >
        🆔 Aadhar Generator
      </button>
    </div>
  </div>
);

function App() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Aadhar Modal States
  const [isAadharModalOpen, setIsAadharModalOpen] = useState(false);
  const [validAadharCount, setValidAadharCount] = useState('');
  const [invalidAadharCount, setInvalidAadharCount] = useState('');

  const [investigationReport, setInvestigationReport] = useState(null);
  const [generationContext, setGenerationContext] = useState(null);
  const [synthesisCount, setSynthesisCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const REQUIRED_COLUMNS = [
    "District", "Mandal", "Grampanchayat", "Benificiary Name",
    "IMIS Id", "Beneficiary Category", "Beneficiary Type",
    "Beneficiary Mobile Number", "Ration Card Number", "Ticket Number",
    "Stage Level", "FTR Status", "FTR Number"
  ];

  // Columns to clear
  const CLEAR_COLUMNS = ["Bank Account Number", "Bank Branch", "IFSC Code"]; // "Nank" accounted for if user fixes source, but likely user meant Bank

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Start loading UI immediately
    setIsUploading(true);
    setFileName(file.name);

    // Reset states
    setInvestigationReport(null);
    setGenerationContext(null);
    setSynthesisCount(0);
    setIsVerifying(false);
    setProgress(0);

    // Use timeout to allow UI to render the loading state before heavy parsing
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          let rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

          if (!rawData || rawData.length === 0) {
            throw new Error("File is empty");
          }

          let oldHeaders = rawData[0];

          // 1. Rename Logic (in place for old headers map)
          const regIdxOld = oldHeaders.indexOf("Benificiary Registration Id");
          if (regIdxOld !== -1) oldHeaders[regIdxOld] = "IMIS Id";

          // 2. Define New Header Order
          let newHeaders = [...oldHeaders];

          // Remove generic new columns if they somehow exist already to re-insert them correctly
          newHeaders = newHeaders.filter(h => h !== "CFMS Id" && h !== "Aadhar Number" && h !== "Amount");

          // Find insertion point
          const bankIdx = newHeaders.findIndex(h => h && h.trim() === "Bank Account Number");

          // Columns to add
          const colsToAdd = ["CFMS Id", "Aadhar Number"];

          if (bankIdx !== -1) {
            newHeaders.splice(bankIdx, 0, ...colsToAdd);
          } else {
            newHeaders.push(...colsToAdd);
          }

          // Ensure Amount exists (append if missing)
          if (!newHeaders.includes("Amount")) newHeaders.push("Amount");

          // 3. Reconstruct Data to match New Headers
          const oldHeaderMap = {};
          oldHeaders.forEach((h, i) => oldHeaderMap[h] = i);

          const restructuredData = rawData.slice(1).map(row => {
            return newHeaders.map(header => {
              const oldIdx = oldHeaderMap[header];
              if (oldIdx !== undefined && row[oldIdx] !== undefined) {
                return row[oldIdx];
              }
              return ''; // New column or missing data
            });
          });

          setHeaders(newHeaders);
          setData(restructuredData);
        } catch (err) {
          console.error(err);
          alert("Error reading file: " + err.message);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        alert("Failed to read file");
        setIsUploading(false);
      };
      reader.readAsBinaryString(file);
    }, 100);
  };

  const analyzeAndVerify = async () => {
    try {
      setIsVerifying(true);
      setProgress(0);

      // Simulate detailed investigation with progress
      const { validateRow } = await import('./utils/idGenerator.js');
      const { analyzeContext } = await import('./utils/dataAnalyzer.js');

      // 1. Schema Validation
      const headerSet = new Set(headers.map(h => h && h.trim()));
      const missingColumns = [];
      REQUIRED_COLUMNS.forEach(col => {
        if (!headerSet.has(col)) missingColumns.push(col);
      });

      if (missingColumns.length > 0) {
        setIsVerifying(false);
        alert(`CRITICAL ERROR: Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // 2. Context Analysis
      const context = analyzeContext(data, headers);
      setGenerationContext(context);

      let validCount = 0;
      let invalidCount = 0;
      const missingStats = { ticket: 0, ftr: 0, reg: 0, name: 0 };

      const ticketIdx = headers.indexOf('Ticket Number');
      const ftrIdx = headers.indexOf('FTR Number');
      const regIdx = headers.indexOf('Benificiary Registration Id');
      const nameIdx = headers.indexOf('Benificiary Name');

      const total = data.length;

      // Simulation loop
      for (let i = 0; i < total; i++) {
        const row = data[i];

        const validation = validateRow(row);
        if (validation.valid) {
          validCount++;
          if (ticketIdx !== -1 && !row[ticketIdx]) missingStats.ticket++;
          if (ftrIdx !== -1 && !row[ftrIdx]) missingStats.ftr++;
          if (regIdx !== -1 && !row[regIdx]) missingStats.reg++;
          if (nameIdx !== -1 && !row[nameIdx]) missingStats.name++;
        } else {
          invalidCount++;
        }

        // Progress update (every 10%)
        if (total > 100 && i % (Math.ceil(total / 10)) === 0) {
          setProgress(Math.round((i / total) * 100));
        }
      }
      setProgress(100);

      setInvestigationReport({
        total,
        validCount,
        invalidCount,
        missingStats,
        context // store analysis for display
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("An error occurred during verification. Please check your file format.");
    } finally {
      setIsVerifying(false);
    }
  };

  const generateIds = async () => {
    try {
      const { generateTicketNumber, generateFTRNumber, generateBeneficiaryRegId, generateName, validateRow } = await import('./utils/idGenerator.js');
      const { synthesizeRows } = await import('./utils/dataSynthesizer.js');

      const ticketIdx = headers.indexOf('Ticket Number');
      const ftrIdx = headers.indexOf('FTR Number');
      const regIdx = headers.indexOf('IMIS Id'); // Renamed from Benificiary Registration Id
      const nameIdx = headers.indexOf('Benificiary Name');
      const distIdx = headers.indexOf('District');
      const mandalIdx = headers.indexOf('Mandal');

      // Feature Indices
      const stageIdx = headers.indexOf('Stage Level');
      const amountIdx = headers.indexOf('Amount');
      const bankAccIdx = headers.indexOf('Bank Account Number');
      const bankBranchIdx = headers.indexOf('Bank Branch');
      const ifscIdx = headers.indexOf('IFSC Code');
      // Handle user typo 'Nank' just in case
      const nankAccIdx = headers.indexOf('Nank Account Number');

      // Collect existing IDs to avoid duplicates (local check + persistent global check)
      // Structure needed for synthesizer: object of sets
      const existingIds = {
        ticket: new Set(),
        ftr: new Set(),
        reg: new Set()
      };

      // Also track generated ones in this batch to prevent internal collision
      data.forEach(row => {
        if (ticketIdx !== -1 && row[ticketIdx]) existingIds.ticket.add(String(row[ticketIdx]));
        if (ftrIdx !== -1 && row[ftrIdx]) existingIds.ftr.add(String(row[ftrIdx]));
        if (regIdx !== -1 && row[regIdx]) existingIds.reg.add(String(row[regIdx]));
      });

      // Use current Max Ids from contextual analysis as starting point
      // We treat these as mutable for the duration of the generation process
      let currentTicketMax = generationContext.maxIds.ticket;
      let currentFtrMax = generationContext.maxIds.ftr;
      let currentRegMax = generationContext.maxIds.reg;

      // 1. Process Existing Data (Fill gaps)
      let updatedData = data.map(row => {
        // Keep validation check? If user wants to generate new rows despite bad old rows, 
        // maybe we should just keep old rows as is? 
        // "validateRow" skips invalid rows in the map which creates "undefined" holes or shorter array if filtered?
        // map returns same length. If we return "row" it keeps it.
        if (!validateRow(row).valid) return row;

        let newRow = [...row];

        // Auto-fill District/Mandal if missing
        if (distIdx !== -1 && !newRow[distIdx] && generationContext.districtMode) {
          newRow[distIdx] = generationContext.districtMode;
        }
        if (mandalIdx !== -1 && !newRow[mandalIdx] && generationContext.mandalMode) {
          newRow[mandalIdx] = generationContext.mandalMode;
        }

        // Auto-fill Name if missing
        if (nameIdx !== -1 && !newRow[nameIdx] && generationContext.namePool) {
          newRow[nameIdx] = generateName(generationContext.namePool);
        }

        // Generate IDs using persistent logic
        if (ticketIdx !== -1 && !newRow[ticketIdx]) {
          const newId = generateTicketNumber(existingIds.ticket, currentTicketMax);
          newRow[ticketIdx] = newId;
          existingIds.ticket.add(String(newId));
          currentTicketMax = newId;
        }

        if (ftrIdx !== -1 && !newRow[ftrIdx]) {
          const newId = generateFTRNumber(existingIds.ftr, currentFtrMax);
          newRow[ftrIdx] = newId;
          existingIds.ftr.add(String(newId));
          currentFtrMax = newId;
        }

        if (regIdx !== -1 && !newRow[regIdx]) {
          const newId = generateBeneficiaryRegId(existingIds.reg, currentRegMax);
          newRow[regIdx] = newId;
          existingIds.reg.add(String(newId));
          currentRegMax = newId;
        }

        return newRow;
      });

      // 2. Synthesize New Rows
      const countToAdd = parseInt(synthesisCount, 10) || 0;
      let newRowsCount = 0;
      let finalData = [];

      if (countToAdd > 0) {
        // SYNTHESIS MODE: Output ONLY new rows
        const newRows = synthesizeRows(
          countToAdd,
          generationContext,
          headers,
          existingIds,
          { ticket: currentTicketMax, ftr: currentFtrMax, reg: currentRegMax }
        );
        newRowsCount = newRows.length;
        finalData = newRows; // Discard existing rows from output

      } else {
        // CORRECTION MODE: Output corrected existing rows
        finalData = updatedData; // 'updatedData' here implies the gap-filled valid rows from Step 1
      }

      // 3. Apply Business Rules (Amount, Bank Clearing, Serial Numbers) to Final Output
      const slNoIdx = headers.findIndex(h => {
        const lower = String(h).toLowerCase().replace('.', '').replace(/\s/g, '');
        return ['sno', 'slno', 'serialno', 'serialnumber'].includes(lower);
      });

      finalData = finalData.map((row, index) => {
        // Ensure row has enough cells for all headers (especially new ones)
        while (row.length < headers.length) row.push('');

        let modifiedRow = [...row];

        // Serial Number Sequence
        if (slNoIdx !== -1) {
          modifiedRow[slNoIdx] = index + 1;
        }

        // Clear Banks
        if (bankAccIdx !== -1) modifiedRow[bankAccIdx] = '';
        if (nankAccIdx !== -1) modifiedRow[nankAccIdx] = '';
        if (bankBranchIdx !== -1) modifiedRow[bankBranchIdx] = '';
        if (ifscIdx !== -1) modifiedRow[ifscIdx] = '';

        // Logic: Stage Level -> Amount
        if (stageIdx !== -1 && amountIdx !== -1) {
          const stage = String(modifiedRow[stageIdx] || '').toLowerCase();
          if (stage.includes('after basement') || stage.includes('afterbasement')) {
            modifiedRow[amountIdx] = 6000;
          } else if (stage.includes('final completion') || stage.includes('finalcompletion')) {
            modifiedRow[amountIdx] = 9000;
          }
        }

        return modifiedRow;
      });

      setData(finalData);
      setInvestigationReport(null);

      // Auto-Export immediately
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const datePrefix = `${day}.${month}.${year}`;

      const ws = XLSX.utils.aoa_to_sheet([headers, ...finalData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const outName = `${datePrefix}_${fileName || 'data.xlsx'}`;
      XLSX.writeFile(wb, outName);

      // Final Success Alert
      if (countToAdd > 0) {
        alert(`SUCCESS!\n\nGenerated ${newRowsCount} NEW rows.\n\nFile saved as: ${outName}\n\n(Note: Output contains ONLY the new rows)`);
      } else {
        alert(`SUCCESS!\n\nProcessed ${finalData.length} existing rows.\n\nFile saved as: ${outName}`);
      }

    } catch (err) {
      console.error(err);
      alert("Error generating IDs: " + err.message);
    }
  };

  const generateAadharExcel = async (type) => {
    const count = type === 'valid' ? Number(validAadharCount) : Number(invalidAadharCount);
    if (!count || count <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    try {
      const { generateValidAadhar, generateInvalidAadhar } = await import('./utils/aadharGenerator.js');

      let dataList = [];
      if (type === 'valid') {
        dataList = generateValidAadhar(count);
      } else {
        dataList = generateInvalidAadhar(count);
      }

      // Create Sheet
      // Format: Header "Aadhar Number"
      const wsData = [["Aadhar Number"], ...dataList.map(n => [n])];

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const timestamp = `${day}.${month}.${year}`;

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Aadhar");

      const filename = `${type}_aadhar_${timestamp}.xlsx`;
      XLSX.writeFile(wb, filename);

      alert(`Generated ${count} ${type} Aadhar numbers!\nSaved as ${filename}`);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const exportData = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `processed_${fileName || 'data.xlsx'}`);
  };

  return (
    <div className="App">
      {/* Aadhar Modal */}
      {isAadharModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{ width: '500px', position: 'relative' }}>
            <button onClick={() => setIsAadharModalOpen(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            <h2 style={{ marginBottom: '2rem', marginTop: 0 }}>Aadhar Generator</h2>

            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'space-between' }}>
              {/* Valid Section */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ borderBottom: '2px solid #4caf50', paddingBottom: '0.5rem' }}>Valid Aadhar</h3>
                <label style={{ fontSize: '0.9rem', textAlign: 'left' }}>How many?</label>
                <input
                  type="number"
                  className="glass-input"
                  placeholder="Count..."
                  value={validAadharCount}
                  onChange={(e) => setValidAadharCount(e.target.value)}
                />
                <button className="glass-button" style={{ background: 'rgba(76, 175, 80, 0.4)' }} onClick={() => generateAadharExcel('valid')}>
                  Download .xlsx
                </button>
              </div>

              {/* Invalid Section */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ borderBottom: '2px solid #f44336', paddingBottom: '0.5rem' }}>Invalid Aadhar</h3>
                <label style={{ fontSize: '0.9rem', textAlign: 'left' }}>How many?</label>
                <input
                  type="number"
                  className="glass-input"
                  placeholder="Count..."
                  value={invalidAadharCount}
                  onChange={(e) => setInvalidAadharCount(e.target.value)}
                />
                <button className="glass-button" style={{ background: 'rgba(244, 67, 54, 0.4)' }} onClick={() => generateAadharExcel('invalid')}>
                  Download .xlsx
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Header />

      {!data.length ? (
        <div className="glass-panel" style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}>
          {isUploading ? (
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid #fff', borderRadius: '50%', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ fontSize: '1.2rem' }}>Processing File... Please wait</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Drag & Drop Excel File Here</p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="glass-button">
                Browse Files
              </label>
            </>
          )}
        </div>
      ) : (
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Preview: {data.length} Rows</h2>
            <div style={{ gap: '1rem', display: 'flex' }}>
              <button className="glass-button" style={{ background: 'rgba(255,0,0,0.2)' }} onClick={() => { setData([]); setInvestigationReport(null); }}>Clear</button>
            </div>
          </div>

          {/* Action Area */}
          <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>

            {!investigationReport && !isVerifying && (
              <div>
                <p style={{ marginBottom: '1rem', color: '#ccc' }}>Step 1: Analyze file for missing data and consistency.</p>
                <button className="glass-button" onClick={analyzeAndVerify} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>
                  🔍 Analyze & Verify Data
                </button>
              </div>
            )}

            {isVerifying && (
              <div style={{ width: '100%' }}>
                <p style={{ marginBottom: '0.5rem' }}>Investigating Data Integrity...</p>
                <div style={{ width: '100%', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#007bff', transition: 'width 0.2s' }}></div>
                </div>
              </div>
            )}

            {investigationReport && (
              <div className="fade-in">
                <h3 style={{ color: '#4caf50', marginBottom: '1rem' }}>✅ Data Verified</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Valid Rows</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{investigationReport.validCount}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Missing IDs</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {investigationReport.missingStats.ticket + investigationReport.missingStats.ftr + investigationReport.missingStats.reg}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Action Needed</div>
                    <div style={{ fontSize: '1.2rem', color: '#ffc107' }}>Generate New IDs</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,123,255,0.1)', borderRadius: '8px', border: '1px solid rgba(0,123,255,0.2)' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Generate New Records (Append to file)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={synthesisCount}
                      onChange={(e) => setSynthesisCount(e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        background: '#222',
                        color: 'white',
                        width: '100px',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>rows</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="glass-button" onClick={generateIds} style={{ background: '#28a745', fontSize: '1.1rem', padding: '12px 24px', border: 'none' }}>
                    ✨ Generate Smart IDs
                  </button>
                  <button className="glass-button" onClick={exportData}>📥 Export Excel</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} style={{ padding: '10px', textAlign: 'left', background: 'rgba(255,255,255,0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rI) => (
                  <tr key={rI} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {headers.map((h, cI) => (
                      <td key={cI} style={{ padding: '8px' }}>{row[cI] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ExternalLinks onAadharClick={() => setIsAadharModalOpen(true)} />
    </div>
  );
}

export default App;
