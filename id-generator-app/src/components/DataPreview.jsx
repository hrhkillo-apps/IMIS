import React from 'react';

const DataPreview = ({
  data,
  headers,
  isVerifying,
  investigationReport,
  progress,
  synthesisCount,
  setSynthesisCount,
  onClear,
  onAnalyze,
  onGenerate,
  onExport
}) => {
  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Preview: {data.length} Rows</h2>
        <div style={{ gap: '1rem', display: 'flex' }}>
          <button className="glass-button" style={{ background: 'rgba(255,0,0,0.2)' }} onClick={onClear}>Clear</button>
        </div>
      </div>

      {/* Action Area */}
      <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center' }}>

        {!investigationReport && !isVerifying && (
          <div>
            <p style={{ marginBottom: '1rem', color: '#ccc' }}>Step 1: Analyze file for missing data and consistency.</p>
            <button className="glass-button" onClick={onAnalyze} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>
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
              <button className="glass-button" onClick={onGenerate} style={{ background: '#28a745', fontSize: '1.1rem', padding: '12px 24px', border: 'none' }}>
                ✨ Generate Smart IDs
              </button>
              <button className="glass-button" onClick={onExport}>📥 Export Excel</button>
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
    </div >
  );
};

export default DataPreview;
