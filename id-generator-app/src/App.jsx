import { useState, useEffect } from 'react';
import './index.css';
import * as XLSX from 'xlsx';
import { useToast } from './hooks/useToast';

// Components
import Header from './components/Header';
import ExternalLinks from './components/ExternalLinks';
import AadharModal from './components/AadharModal';
import DataPreview from './components/DataPreview';
import AdminLogin from './components/AdminLogin';
import TallyModal from './components/TallyModal';
import ImisIdModal from './components/ImisIdModal';
import MatchModal from './components/MatchModal';
import CommitmentsModal from './components/CommitmentsModal';
import DataEntryModal from './components/DataEntryModal';
import BulkDataEntryModal from './components/BulkDataEntryModal';
import ViewDataEntryModal from './components/ViewDataEntryModal';
import ErrorBoundary from './components/ErrorBoundary';
import { useFileProcessor } from './hooks/useFileProcessor';
import { useIdGenerator } from './hooks/useIdGenerator';
import { enableProtection } from './utils/security';
import { authService } from './services/AuthService';
import { useDataEntry } from './context/DataEntryContext';
import Footer from './components/Footer';

// Utils & Constants
import { REQUIRED_COLUMNS } from './constants';
// Note: Dynamic imports for heavy logic kept to maintain startup performance if desired, 
// though for this size, static imports are fine. Sticking to dynamic for now as per original pattern.

function App() {
  const toast = useToast();

  // Hooks
  const {
    data, setData, headers, isUploading, error: uploadError,
    processFile, clearData, fileName
  } = useFileProcessor();

  const {
    isVerifying, investigationReport, synthesisCount, setSynthesisCount, progress,
    analyzeAndVerify, generateIds, reset: resetGenerator
  } = useIdGenerator();

  // Aadhar Modal States
  const [isAadharModalOpen, setIsAadharModalOpen] = useState(false);
  const [validAadharCount, setValidAadharCount] = useState('');
  const [invalidAadharCount, setInvalidAadharCount] = useState('');

  // Tally Modal State
  const [isTallyModalOpen, setIsTallyModalOpen] = useState(false);

  // IMIS ID Generator Modal State
  const [isImisModalOpen, setIsImisModalOpen] = useState(false);
  const [imisIdCount, setImisIdCount] = useState('');

  // Match CFMS Modal State
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  // Commitments Modal State
  const [isCommitmentsModalOpen, setIsCommitmentsModalOpen] = useState(false);

  // Load History on Mount
  const [idHistory, setIdHistory] = useState({ ticket: new Set(), ftr: new Set(), reg: new Set() });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Data Entry State
  const { entries, addEntry, updateEntry, deleteEntry } = useDataEntry();
  const [isDataEntryModalOpen, setIsDataEntryModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isViewDataModalOpen, setIsViewDataModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const handleDataEntryClick = () => {
    setEditingEntry(null);
    setIsDataEntryModalOpen(true);
  };

  const handleBulkUploadClick = () => {
    setIsBulkModalOpen(true);
  };

  const handleViewDataClick = () => {
    setIsViewDataModalOpen(true);
  };

  const handleSaveEntry = async (data) => {
    let success = false;
    if (editingEntry) {
      success = await updateEntry(editingEntry.id, data);
      if (success) toast.success("Entry updated successfully!");
    } else {
      success = await addEntry(data);
      if (success) toast.success("Entry added successfully!");
    }
    // We don't close the view modal if it's open, just the entry modal
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setIsDataEntryModalOpen(true);
  };

  const handleDeleteEntry = (id) => {
    deleteEntry(id);
    toast.success("Entry deleted successfully!");
  };

  useEffect(() => {
    // 1. Enable Security
    enableProtection();

    // 2. Check Session
    if (authService.isLoggedIn()) {
      setIsAuthenticated(true);
    }

    // 3. Load existing history from Firebase
    import('./services/IdService.js').then(({ IdService }) => {
      IdService.getAllIds().then(history => {
        if (history) {
          setIdHistory(history);
        }
      }).catch(err => {
        console.error("Initial ID load failed (Offline?):", err);
        // We don't block the UI here, but generation will be blocked by strict checks later.
      });
    });
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Removed handleBackup and handleRestore

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      resetGenerator(); // Reset generator state on new file
      processFile(file);
    }
  };

  const handleAnalyze = async () => {
    const result = await analyzeAndVerify(data, headers);
    if (!result.success && result.error.includes("CRITICAL")) {
      toast.error(result.error);
    } else if (!result.success) {
      toast.error("Analysis failed. Please check file.");
    }
  };

  const handleGenerate = async () => {
    const result = await generateIds(data, headers, idHistory, fileName);
    if (result.success) {
      setData(result.finalData);
      setIdHistory(result.newHistory);
      toast.success(result.message);
    } else {
      toast.error("Generation failed: " + result.error);
    }
  };

  const generateAadharExcel = async (type) => {
    const count = type === 'valid' ? Number(validAadharCount) : Number(invalidAadharCount);
    if (!count || count <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    try {
      const { generateValidAadhar, generateInvalidAadhar } = await import('./utils/aadharGenerator.js');
      const { IdService } = await import('./services/IdService.js');

      // 1. Fetch History if Valid
      let existingAadharSet = new Set();
      if (type === 'valid') {
        const history = await IdService.getAllIds();
        existingAadharSet = history.aadhar;
      }

      // 2. Generate
      let dataList = [];
      if (type === 'valid') {
        // Pass existing set to ensure uniqueness
        dataList = generateValidAadhar(count, existingAadharSet);
      } else {
        // Invalid generator usually doesn't need history check, but consistent
        dataList = generateInvalidAadhar(count);
      }

      // 3. Save "Valid" IDs to Firebase
      if (type === 'valid' && dataList.length > 0) {
        await IdService.saveBatch({
          ticket: new Set(), ftr: new Set(), reg: new Set(),
          aadhar: new Set(dataList)
        });

        // Update local state if we were tracking it, but here we just re-fetch next time or rely on service
        toast.success(`Generated ${count} unique Aadhar IDs and saved to Database!`);
      } else {
        toast.success(`Generated ${count} Invalid Aadhar numbers (Not saved to DB).`);
      }

      const wsData = [["Aadhar Number"], ...dataList.map(n => [n])];
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Aadhar");
      const filename = `${type}_aadhar_${timestamp}.xlsx`;
      XLSX.writeFile(wb, filename);

    } catch (err) {
      console.error(err);
      toast.error('Error: ' + err.message);
    }
  };


  const handleGenerateImis = async () => {
    const count = Number(imisIdCount);
    if (!count || count <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    try {
      const { generateBeneficiaryRegId } = await import('./utils/idGenerator.js');
      const { IdService } = await import('./services/IdService.js');

      // 1. STRICT CONNECTION CHECK & Load full history
      // We explicitly fetch here to ensure we are online and have latest data.
      let currentHistory;
      try {
        currentHistory = await IdService.getAllIds();
      } catch (e) {
        toast.error("Generation Aborted: Cannot connect to online storage.");
        return;
      }

      // 2. Create a working set initialized with existing REG IDs
      // We clone it to avoid mutating the original state immediately, 
      // though Set mutation is fine here as we'll save explicitly.
      const workingRegSet = new Set(currentHistory.reg);
      const newBatchIds = new Set();
      const generatedList = [];

      for (let i = 0; i < count; i++) {
        // generateBeneficiaryRegId checks against the set passed to it
        const newId = generateBeneficiaryRegId(workingRegSet);

        // Add to both sets
        workingRegSet.add(String(newId));
        newBatchIds.add(String(newId));
        generatedList.push(newId);
      }

      // 3. Save the new batch to persistent storage
      await IdService.saveBatch({
        ticket: new Set(),
        ftr: new Set(),
        reg: newBatchIds
      });

      // 4. Update local state history so the main app knows about these new IDs too
      const updatedHistory = await IdService.getAllIds();
      setIdHistory(updatedHistory);

      // 5. Export to Excel
      const wsData = [["IMIS Id"], ...generatedList.map(id => [id])];
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "IMIS IDs");

      // Use simple filename to test
      const filename = `imis_ids_generated.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Generated ${count} unique IMIS IDs and saved to history!`);
      setImisIdCount('');
      setIsImisModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error: ' + err.message);
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

  // Handle generic error from upload if any (though usually we just alert)
  if (uploadError) {
    // We could use an ErrorBoundary/Toast, for now just log/alert was default
    console.error(uploadError);
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

        <TallyModal
          isOpen={isTallyModalOpen}
          onClose={() => setIsTallyModalOpen(false)}
        />

        <ImisIdModal
          isOpen={isImisModalOpen}
          onClose={() => setIsImisModalOpen(false)}
          count={imisIdCount}
          setCount={setImisIdCount}
          onGenerate={handleGenerateImis}
        />

        <MatchModal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
        />

        <CommitmentsModal
          isOpen={isCommitmentsModalOpen}
          onClose={() => setIsCommitmentsModalOpen(false)}
        />

        <DataEntryModal
          isOpen={isDataEntryModalOpen}
          onClose={() => setIsDataEntryModalOpen(false)}
          initialData={editingEntry}
          onSave={handleSaveEntry}
        />

        <BulkDataEntryModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
        />

        <ViewDataEntryModal
          isOpen={isViewDataModalOpen}
          onClose={() => setIsViewDataModalOpen(false)}
          entries={entries}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />

        <Header
          onDataEntryClick={handleDataEntryClick}
          onBulkUploadClick={handleBulkUploadClick}
          onViewDataClick={handleViewDataClick}
        />

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
                {uploadError && <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>{uploadError}</p>}
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
            onClear={clearData}
            onAnalyze={handleAnalyze}
            onGenerate={handleGenerate}
            onExport={exportData}
          />
        )}

        <ExternalLinks
          onAadharClick={() => setIsAadharModalOpen(true)}
          onTallyClick={() => setIsTallyModalOpen(true)}
          onImisClick={() => setIsImisModalOpen(true)}
          onMatchClick={() => setIsMatchModalOpen(true)}
          onCommitmentsClick={() => setIsCommitmentsModalOpen(true)}
        />

        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
