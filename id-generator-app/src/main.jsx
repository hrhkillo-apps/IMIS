import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from './context/ToastContext.jsx'
import { DataEntryProvider } from './context/DataEntryContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <DataEntryProvider>
        <App />
      </DataEntryProvider>
    </ToastProvider>
  </StrictMode>,
)
