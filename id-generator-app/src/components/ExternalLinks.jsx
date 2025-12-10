import React from 'react';
import { PREDEFINED_LINKS } from '../constants';

const ExternalLinks = ({ onAadharClick, onBackup, onRestore }) => (
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
                style={{
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    background: 'rgba(255, 100, 100, 0.2)',
                    border: '1px solid rgba(255, 100, 100, 0.4)'
                }}
            >
                🆔 Aadhar Generator
            </button>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1rem 0' }}></div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>ID History:</span>
                <button onClick={onBackup} className="glass-button" style={{ fontSize: '0.8rem' }} title="Download History Backup">⬇️ Backup</button>
                <button onClick={onRestore} className="glass-button" style={{ fontSize: '0.8rem' }} title="Restore History from File">⬆️ Restore</button>
            </div>
        </div>
    </div>
);

export default ExternalLinks;
