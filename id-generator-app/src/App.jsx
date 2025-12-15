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
import { useDataEntry } from './hooks/useDataEntry';
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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // STARTING LOADING STATE

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
    const initApp = async () => {
      try {
        // 1. Enable Security
        try {
          enableProtection();
        } catch (e) {
          console.warn("Security init failed", e);
        }

        // 2. Check Session
        // We rely on the authService listener we already have? 
        // Actually, authService.isLoggedIn() is checking session storage (sync).
        if (authService.isLoggedIn()) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Init failed:", err);
      } finally {
        // Always finish loading
        setIsLoadingAuth(false);
      }

      // 3. Load existing history from Firebase (Deprecated: No longer needed for generation)
      //   try {
      //     // Initial load removed for performance. 
      //     // Generation now uses server-side transactions.
      //   } catch (err) {
      //     console.error("Initial ID load failed (Offline?):", err);
      //   }
    };

    initApp();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Removed handleBackup and handleRestore

  if (isLoadingAuth) {
    // User filtered: "blank page, without showing login screen"
    return <div style={{ height: '100vh', width: '100vw', background: '#242424' }}></div>;
  }

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
    // Note: This specific Main-Screen generator (useIdGenerator hook) might still rely on local history 
    // if it's doing complex matching. For now, we are optimizing the Modal generators specifically (IMIS ID, Aadhar).
    // The main file processor generation is a separate flow.
    // If the user uploads a FILE to generate IDs, we should also eventually migrate that.
    // But for this task, we focus on the explicitly requested Modal flows first or use the history if available.
    // Since we stopped loading history, `idHistory` will be empty.
    // WARN: The file-based generator needs to be checked.
    // Ideally, `useIdGenerator` should also be refactored, but let's fix the Modals first as per plan.
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
      // optimized flow
      let dataList = [];

      if (type === 'valid') {
        console.log("Starting Valid Aadhar Generation...");
        // Use new Scalable Service
        toast.info("Generating Aadhar IDs (Checking Server)...");

        // Aadhar Generator provided pure string function now
        console.log("Importing generator...");
        const { generateValidAadharString } = await import('./utils/aadharGenerator.js');
        console.log("Generator imported. Calling ReserveIds...");

        const result = await IdService.reserveIds(
          'imis_history_aadhar',
          count,
          generateValidAadharString
        );
        console.log("ReserveIds result:", result);

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        dataList = result.ids;
        toast.success(`Generated ${count} unique Aadhar IDs!`);

      } else {
        dataList = generateInvalidAadhar(count);
        toast.success(`Generated ${count} Invalid Aadhar numbers.`);
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
      console.error("Error in generateAadharExcel:", err);
      toast.dismiss();
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
      console.log("Starting IMIS Generation...");
      // Import specifically the String generator
      const { generateBeneficiaryRegIdString } = await import('./utils/idGenerator.js');
      const { IdService } = await import('./services/IdService.js');
      console.log("Imports done.");

      toast.info("Generating IDs (Checking Server)...");

      // Use the new Scalable Service
      console.log("Calling reserveIds...");
      const result = await IdService.reserveIds(
        'imis_history_reg',  // Collection Name
        count,
        generateBeneficiaryRegIdString // Generator Function
      );
      console.log("Result:", result);


      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const generatedList = result.ids;

      // 5. Export to Excel
      const wsData = [["IMIS Id"], ...generatedList.map(id => [id])];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "IMIS IDs");

      const filename = `imis_ids_generated.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success(`Successfully Generated ${count} Unique IMIS IDs!`);
      setImisIdCount('');
      setIsImisModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.dismiss();
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
