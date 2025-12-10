const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Add IPC methods here later
    ping: () => console.log('pong'),
    openSecureLink: (url, credentials) => ipcRenderer.invoke('open-secure-link', { url, credentials }),
});
