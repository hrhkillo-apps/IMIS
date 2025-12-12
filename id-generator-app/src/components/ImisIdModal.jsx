import React from 'react';

const ImisIdModal = ({ isOpen, onClose, count, setCount, onGenerate }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{ width: '400px', position: 'relative', padding: '2rem' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '10px', right: '15px',
                        background: 'none', border: 'none', color: 'white',
                        fontSize: '1.5rem', cursor: 'pointer'
                    }}>
                    &times;
                </button>
                <h2 style={{ marginBottom: '1.5rem', marginTop: 0, textAlign: 'center' }}>IMIS ID Generator</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', textAlign: 'left', opacity: 0.9 }}>Number of IDs to Generate:</label>
                        <input
                            type="number"
                            className="glass-input"
                            placeholder="Enter quantity..."
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            style={{ padding: '0.8rem' }}
                        />
                    </div>

                    <button
                        className="glass-button"
                        style={{ marginTop: '0.5rem', justifyContent: 'center', background: 'rgba(33, 150, 243, 0.3)' }}
                        onClick={onGenerate}
                    >
                        Generte & Download .xlsx
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImisIdModal;
