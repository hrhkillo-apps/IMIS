import React from 'react';

const AadharModal = ({ isOpen, onClose, validCount, setValidCount, invalidCount, setInvalidCount, onGenerate }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '500px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '10px', right: '15px',
                        background: 'none', border: 'none', color: 'white',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}>
                    &times;
                </button>
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
                            value={validCount}
                            onChange={(e) => setValidCount(e.target.value)}
                        />
                        <button
                            className="glass-button"
                            style={{ background: 'rgba(76, 175, 80, 0.4)' }}
                            onClick={() => onGenerate('valid')}
                        >
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
                            value={invalidCount}
                            onChange={(e) => setInvalidCount(e.target.value)}
                        />
                        <button
                            className="glass-button"
                            style={{ background: 'rgba(244, 67, 54, 0.4)' }}
                            onClick={() => onGenerate('invalid')}
                        >
                            Download .xlsx
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AadharModal;
