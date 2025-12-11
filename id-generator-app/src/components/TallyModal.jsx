
import React, { useState } from 'react';
import { compareExcelFiles, generateDifferenceExcel } from '../utils/tallyProcessor';
import { useToast } from '../context/ToastContext';

const TallyModal = ({ isOpen, onClose }) => {
    const toast = useToast();
    const [oldFile, setOldFile] = useState(null);
    const [newFile, setNewFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null); // { count: number, error: string }

    if (!isOpen) return null;

    const handleCompare = async () => {
        if (!oldFile || !newFile) {
            toast.error("Please upload both files.");
            return;
        }

        setProcessing(true);
        setResult(null);

        try {
            const { headers, newRows, count, error } = await compareExcelFiles(oldFile, newFile);

            if (error) {
                setResult({ error });
            } else {
                setResult({ count });
                if (count > 0) {
                    generateDifferenceExcel(headers, newRows);
                }
            }
        } catch (err) {
            setResult({ error: err.message });
        } finally {
            setProcessing(false);
        }
    };

    const reset = () => {
        setOldFile(null);
        setNewFile(null);
        setResult(null);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '600px', position: 'relative', padding: '2rem' }}>
                <button
                    onClick={() => { reset(); onClose(); }}
                    style={{
                        position: 'absolute', top: '15px', right: '15px',
                        background: 'none', border: 'none', color: 'white',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}>
                    &times;
                </button>

                <h2 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Tally Analysis</h2>
                <p style={{ marginBottom: '2rem', opacity: 0.7, fontSize: '0.9rem' }}>
                    Compare two Excel files to extract newly added rows.
                </p>

                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Old File Input */}
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>1. Old File</label>
                        <div style={{
                            border: '1px dashed rgba(255,255,255,0.3)', padding: '1.5rem',
                            borderRadius: '8px', textAlign: 'center', background: oldFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            {oldFile ? (
                                <div>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                                    <div style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{oldFile.name}</div>
                                    <button onClick={() => setOldFile(null)} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={(e) => setOldFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                        id="old-file-upload"
                                    />
                                    <label htmlFor="old-file-upload" className="glass-button" style={{ fontSize: '0.8rem' }}>Browse Old</label>
                                </>
                            )}
                        </div>
                    </div>

                    {/* New File Input */}
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>2. Latest File</label>
                        <div style={{
                            border: '1px dashed rgba(255,255,255,0.3)', padding: '1.5rem',
                            borderRadius: '8px', textAlign: 'center', background: newFile ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                        }}>
                            {newFile ? (
                                <div>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                                    <div style={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>{newFile.name}</div>
                                    <button onClick={() => setNewFile(null)} style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={(e) => setNewFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                        id="new-file-upload"
                                    />
                                    <label htmlFor="new-file-upload" className="glass-button" style={{ fontSize: '0.8rem' }}>Browse Latest</label>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Processing State */}
                {processing && (
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <div className="spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}></div>
                        <span>Processing files...</span>
                    </div>
                )}

                {/* Result State */}
                {result && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px', background: result.error ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)', border: `1px solid ${result.error ? '#f44336' : '#4caf50'}` }}>
                        {result.error ? (
                            <div style={{ color: '#ff6b6b' }}>⚠️ {result.error}</div>
                        ) : (
                            <div style={{ color: '#81c784' }}>
                                ✅ Success! Found <strong>{result.count}</strong> new newly added rows.
                                {result.count > 0 && <div>File downloaded automatically.</div>}
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={handleCompare}
                    disabled={!oldFile || !newFile || processing}
                    className="glass-button"
                    style={{
                        width: '100%',
                        background: (!oldFile || !newFile) ? 'rgba(255,255,255,0.1)' : 'rgba(0, 123, 255, 0.5)',
                        cursor: (!oldFile || !newFile) ? 'not-allowed' : 'pointer',
                        padding: '1rem',
                        fontSize: '1.1rem'
                    }}
                >
                    Compare & Download Differences
                </button>

            </div>
        </div>
    );
};

export default TallyModal;
