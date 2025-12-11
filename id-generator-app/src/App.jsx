import { useState, useEffect } from 'react';
import './index.css';
import * as XLSX from 'xlsx';

// Components
import Header from './components/Header';
import ExternalLinks from './components/ExternalLinks';
import AadharModal from './components/AadharModal';
import DataPreview from './components/DataPreview';
import AdminLogin from './components/AdminLogin';
import TallyModal from './components/TallyModal';
import ErrorBoundary from './components/ErrorBoundary';
import { useFileProcessor } from './hooks/useFileProcessor';
import { useIdGenerator } from './hooks/useIdGenerator';
import { enableProtection } from './utils/security';
import { authService } from './services/AuthService';

// Utils & Constants
import { REQUIRED_COLUMNS } from './constants';
// Note: Dynamic imports for heavy logic kept to maintain startup performance if desired, 
// though for this size, static imports are fine. Sticking to dynamic for now as per original pattern.

function App() {
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

  // Load History on Mount
  const [idHistory, setIdHistory] = useState({ ticket: new Set(), ftr: new Set(), reg: new Set() });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 1. Enable Security
    enableProtection();

    // 2. Check Session
    if (authService.isLoggedIn()) {
      setIsAuthenticated(true);
    }

    // 3. Load existing history from local storage
    import('./utils/storage.js').then(({ IDStorage }) => {
      const history = IDStorage.loadHistory();
      if (history) {
        setIdHistory(history);
        console.log(`Loaded History: ${history.ticket.size} Tickets, ${history.ftr.size} FTRs, ${history.reg.size} Regs`);
      }
    }).catch(err => {
      console.warn("Failed to load history storage:", err);
    });
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
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
    if (file) {
      resetGenerator(); // Reset generator state on new file
      processFile(file);
    }
  };

  const handleAnalyze = async () => {
    const result = await analyzeAndVerify(data, headers);
    if (!result.success && result.error.includes("CRITICAL")) {
      alert(result.error);
    } else if (!result.success) {
      alert("Analysis failed. Please check file.");
    }
  };

  const handleGenerate = async () => {
    const result = await generateIds(data, headers, idHistory, fileName);
    if (result.success) {
      setData(result.finalData);
      setIdHistory(result.newHistory);
      alert(result.message);
    } else {
      alert("Generation failed: " + result.error);
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
          onBackup={handleBackup}
          onRestore={handleRestore}
          onTallyClick={() => setIsTallyModalOpen(true)}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
