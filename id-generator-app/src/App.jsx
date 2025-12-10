import { useState, useEffect } from 'react';
import './index.css';
import * as XLSX from 'xlsx';

// Components
import Header from './components/Header';
import ExternalLinks from './components/ExternalLinks';
import AadharModal from './components/AadharModal';
import DataPreview from './components/DataPreview';
import AdminLogin from './components/AdminLogin';
import ErrorBoundary from './components/ErrorBoundary';
import { enableProtection } from './utils/security';

// Utils & Constants
import { REQUIRED_COLUMNS } from './constants';
// Note: Dynamic imports for heavy logic kept to maintain startup performance if desired, 
// though for this size, static imports are fine. Sticking to dynamic for now as per original pattern.

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

  // Load History on Mount
  const [idHistory, setIdHistory] = useState({ ticket: new Set(), ftr: new Set(), reg: new Set() });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 1. Enable Security
    enableProtection();

    // 2. Check Session
    const sessionAuth = sessionStorage.getItem('imis_auth');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }

    // 3. Load existing history from local storage
    import('./utils/storage.js').then(({ IDStorage }) => {
      const history = IDStorage.loadHistory();
      if (history) {
        setIdHistory(history);
        console.log(`Loaded History: ${history.ticket.size} Tickets, ${history.ftr.size} FTRs, ${history.reg.size} Regs`);
      }
    });
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('imis_auth', 'true');
  };

  const handleBackup = async () => {
    const { IDStorage } = await import('./utils/storage.js');
    const data = IDStorage.exportHistoryData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imis_id_history_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const { IDStorage } = await import('./utils/storage.js');
          const result = IDStorage.importHistoryData(evt.target.result);
          if (result.success) {
            alert(`History Restored Successfully! (Items: ${result.count})`);
            const history = IDStorage.loadHistory();
            setIdHistory(history);
          } else {
            alert("Restore Failed: " + result.error);
          }
        } catch (err) {
          console.error(err);
          alert("Invalid Backup File");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

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

          // 1. Rename Logic
          const regIdxOld = oldHeaders.indexOf("Benificiary Registration Id");
          if (regIdxOld !== -1) oldHeaders[regIdxOld] = "IMIS Id";

          // 2. Define New Header Order
          let newHeaders = [...oldHeaders];
          newHeaders = newHeaders.filter(h => h !== "CFMS Id" && h !== "Aadhar Number" && h !== "Amount");

          const bankIdx = newHeaders.findIndex(h => h && h.trim() === "Bank Account Number");
          const colsToAdd = ["CFMS Id", "Aadhar Number"];

          if (bankIdx !== -1) {
            newHeaders.splice(bankIdx, 0, ...colsToAdd);
          } else {
            newHeaders.push(...colsToAdd);
          }

          if (!newHeaders.includes("Amount")) newHeaders.push("Amount");

          // 3. Reconstruct Data
          const oldHeaderMap = {};
          oldHeaders.forEach((h, i) => oldHeaderMap[h] = i);

          const restructuredData = rawData.slice(1).map(row => {
            return newHeaders.map(header => {
              const oldIdx = oldHeaderMap[header];
              if (oldIdx !== undefined && row[oldIdx] !== undefined) {
                return row[oldIdx];
              }
              return '';
            });
          });

          // Pre-scan for existing IDs in this file and add to History immediately (?)
          // Or just add to a temporary "File IDs" set?
          // Strategy: The generator takes "existingIds" set. We should Merge History + File IDs.
          // We SHOULD NOT save File IDs to History automatically unless we generated them?
          // Actually, if we see them in a file, they exist in the world, so we should know about them.
          // OPTION: We will add them to the Set passed to generator, but NOT save to disk unless they are new.
          // BUT: If user uploads file today, we want to know about these IDs tomorrow.
          // DECISION: We will NOT auto-save file IDs to persistent history (to avoid polluting with bad data),
          // BUT we will use persistent history to check against collisions.

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

      const { validateRow, } = await import('./utils/idGenerator.js');
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

      const realRegIdx = headers.indexOf('IMIS Id');
      const nameIdx = headers.indexOf('Benificiary Name');

      const total = data.length;

      for (let i = 0; i < total; i++) {
        const row = data[i];
        const validation = validateRow(row);

        if (validation.valid) {
          validCount++;
          if (ticketIdx !== -1 && !row[ticketIdx]) missingStats.ticket++;
          if (ftrIdx !== -1 && !row[ftrIdx]) missingStats.ftr++;
          if (realRegIdx !== -1 && !row[realRegIdx]) missingStats.reg++;
          if (nameIdx !== -1 && !row[nameIdx]) missingStats.name++;
        } else {
          invalidCount++;
        }

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
        context
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
      const { IDStorage } = await import('./utils/storage.js');

      const ticketIdx = headers.indexOf('Ticket Number');
      const ftrIdx = headers.indexOf('FTR Number');
      const regIdx = headers.indexOf('IMIS Id');
      const nameIdx = headers.indexOf('Benificiary Name');
      const distIdx = headers.indexOf('District');
      const mandalIdx = headers.indexOf('Mandal');

      const stageIdx = headers.indexOf('Stage Level');
      const amountIdx = headers.indexOf('Amount');
      const bankAccIdx = headers.indexOf('Bank Account Number');
      const bankBranchIdx = headers.indexOf('Bank Branch');
      const ifscIdx = headers.indexOf('IFSC Code');
      const nankAccIdx = headers.indexOf('Nank Account Number');

      // Initialize with Persistent History
      // We clone the sets so we don't mutate the state directly/prematurely, though sets are references.
      const existingIds = {
        ticket: new Set(idHistory.ticket),
        ftr: new Set(idHistory.ftr),
        reg: new Set(idHistory.reg)
      };

      const newGeneratedIds = {
        ticket: new Set(),
        ftr: new Set(),
        reg: new Set()
      };

      // Also add IDs from current file (these might not be in history yet)
      data.forEach(row => {
        if (ticketIdx !== -1 && row[ticketIdx]) existingIds.ticket.add(String(row[ticketIdx]));
        if (ftrIdx !== -1 && row[ftrIdx]) existingIds.ftr.add(String(row[ftrIdx]));
        if (regIdx !== -1 && row[regIdx]) existingIds.reg.add(String(row[regIdx]));
      });

      let currentTicketMax = generationContext.maxIds.ticket;
      let currentFtrMax = generationContext.maxIds.ftr;
      let currentRegMax = generationContext.maxIds.reg;

      // 1. Process Existing Data
      let updatedData = data.map(row => {
        if (!validateRow(row).valid) return row;

        let newRow = [...row];

        if (distIdx !== -1 && !newRow[distIdx] && generationContext.districtMode) {
          newRow[distIdx] = generationContext.districtMode;
        }
        if (mandalIdx !== -1 && !newRow[mandalIdx] && generationContext.mandalMode) {
          newRow[mandalIdx] = generationContext.mandalMode;
        }
        if (nameIdx !== -1 && !newRow[nameIdx] && generationContext.namePool) {
          newRow[nameIdx] = generateName(generationContext.namePool);
        }

        if (ticketIdx !== -1 && !newRow[ticketIdx]) {
          const newId = generateTicketNumber(existingIds.ticket, currentTicketMax);
          newRow[ticketIdx] = newId;
          existingIds.ticket.add(String(newId));
          newGeneratedIds.ticket.add(String(newId)); // Track new
          currentTicketMax = newId;
        }

        if (ftrIdx !== -1 && !newRow[ftrIdx]) {
          const newId = generateFTRNumber(existingIds.ftr, currentFtrMax);
          newRow[ftrIdx] = newId;
          existingIds.ftr.add(String(newId));
          newGeneratedIds.ftr.add(String(newId)); // Track new
          currentFtrMax = newId;
        }

        if (regIdx !== -1 && !newRow[regIdx]) {
          const newId = generateBeneficiaryRegId(existingIds.reg, currentRegMax);
          newRow[regIdx] = newId;
          existingIds.reg.add(String(newId));
          newGeneratedIds.reg.add(String(newId)); // Track new
          currentRegMax = newId;
        }

        return newRow;
      });

      const countToAdd = parseInt(synthesisCount, 10) || 0;
      let finalData = [];
      let newRowsCount = 0;

      if (countToAdd > 0) {
        // We need to capture generated IDs from synthesis too.
        // synthesizeRows modifies existingIds in place.
        // We can create a wrapper or just note that synthesizeRows adds to existingIds.
        // To track "newly generated", we can compare size or pass a tracker.
        // Let's modify synthesizeRows behavior? Or just diff the sets?
        // Simpler: Note the size before and after? No, we need the actual values to save selectively.
        // Let's just SAVE all current IDs to storage? No, storage is append-only mostly for efficiency.
        // Actually, IDStorage.saveBatch takes sets.
        // Let's just save the NEW ones.
        // Since synthesizeRows adds to `existingIds`, we need to intercept.
        // For now, let's just accept that we save user's file IDs too if they passed through generation.
        // Actually, let's just rely on the `newGeneratedIds` tracking we added for the Correction phase.
        // For Synthesis phase, we need to capture them.

        // Quick Hack: Snapshot size
        // Quick Hack: Snapshot size
        // ... this is hard to track.
        // ... this is hard to track.

        // Let's just use the `synthesizeRows` generic output to find them.
        const newRows = synthesizeRows(
          countToAdd,
          generationContext,
          headers,
          existingIds,
          { ticket: currentTicketMax, ftr: currentFtrMax, reg: currentRegMax }
        );
        newRowsCount = newRows.length;
        finalData = newRows;

        // Extract IDs from newRows
        newRows.forEach(row => {
          if (ticketIdx !== -1) newGeneratedIds.ticket.add(row[ticketIdx]);
          if (ftrIdx !== -1) newGeneratedIds.ftr.add(row[ftrIdx]);
          if (regIdx !== -1) newGeneratedIds.reg.add(row[regIdx]);
        });

      } else {
        finalData = updatedData;
      }

      // SAVE TO STORAGE
      IDStorage.saveBatch(newGeneratedIds);

      // Update Local State with new totals
      setIdHistory(IDStorage.loadHistory());

      const slNoIdx = headers.findIndex(h => {
        const lower = String(h).toLowerCase().replace('.', '').replace(/\\s/g, '');
        return ['sno', 'slno', 'serialno', 'serialnumber'].includes(lower);
      });

      finalData = finalData.map((row, index) => {
        while (row.length < headers.length) row.push('');
        let modifiedRow = [...row];

        if (slNoIdx !== -1) modifiedRow[slNoIdx] = index + 1;
        if (bankAccIdx !== -1) modifiedRow[bankAccIdx] = '';
        if (nankAccIdx !== -1) modifiedRow[nankAccIdx] = '';
        if (bankBranchIdx !== -1) modifiedRow[bankBranchIdx] = '';
        if (ifscIdx !== -1) modifiedRow[ifscIdx] = '';

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

      // Auto-Export
      const now = new Date();
      const datePrefix = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

      const ws = XLSX.utils.aoa_to_sheet([headers, ...finalData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const outName = `${datePrefix}_${fileName || 'data.xlsx'}`;
      XLSX.writeFile(wb, outName);

      if (countToAdd > 0) {
        alert(`SUCCESS!\n\nGenerated ${newRowsCount} NEW rows.\n\nFile saved as: ${outName}\n\n(Note: Output contains ONLY the new rows)\n\nIDs have been saved to History.`);
      } else {
        alert(`SUCCESS!\n\nProcessed ${finalData.length} existing rows.\n\nFile saved as: ${outName}\n\nIDs have been saved to History.`);
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
      let dataList = type === 'valid' ? generateValidAadhar(count) : generateInvalidAadhar(count);

      const wsData = [["Aadhar Number"], ...dataList.map(n => [n])];
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

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

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <div className="App">


        <AadharModal
          isOpen={isAadharModalOpen}
          onClose={() => setIsAadharModalOpen(false)}
          validCount={validAadharCount}
          setValidCount={setValidAadharCount}
          invalidCount={invalidAadharCount}
          setInvalidCount={setInvalidAadharCount}
          onGenerate={generateAadharExcel}
        />

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
          <DataPreview
            data={data}
            headers={headers}
            isVerifying={isVerifying}
            investigationReport={investigationReport}
            progress={progress}
            synthesisCount={synthesisCount}
            setSynthesisCount={setSynthesisCount}
            onClear={() => { setData([]); setInvestigationReport(null); }}
            onAnalyze={analyzeAndVerify}
            onGenerate={generateIds}
            onExport={exportData}
          />
        )}

        <ExternalLinks
          onAadharClick={() => setIsAadharModalOpen(true)}
          onBackup={handleBackup}
          onRestore={handleRestore}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
