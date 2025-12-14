import React from 'react';
import SessionTimer from './SessionTimer';
import { authService } from '../services/AuthService';

const Header = ({ onDataEntryClick, onViewDataClick, onBulkUploadClick }) => (
    <header style={{ marginBottom: '2rem', position: 'relative' }}>
        {authService.isLoggedIn() && <SessionTimer />}
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            IMIS Data & ID Manager
        </h1>
        <p style={{ opacity: 0.8 }}>Upload any Excel file with the required format to generate missing IDs.</p>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
                onClick={onDataEntryClick}
                className="glass-button"
                style={{ background: 'rgba(33, 150, 243, 0.3)' }}
            >
                📝 Data Entry
            </button>
            <button
                onClick={onBulkUploadClick}
                className="glass-button"
                style={{ background: 'rgba(255, 152, 0, 0.3)' }}
            >
                📤 Bulk Upload
            </button>
            <button
                onClick={onViewDataClick}
                className="glass-button"
                style={{ background: 'rgba(156, 39, 176, 0.3)' }}
            >
                👁️ View Data Entry
            </button>
        </div>
    </header>
);

export default Header;
