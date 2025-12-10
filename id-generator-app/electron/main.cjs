const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "IMIS Data & ID Manager",
        autoHideMenuBar: true, // Also hide it on this window specifically
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        // Premium glassmorphism feel (optional, but good start)
        backgroundColor: '#ffffff',
    });

    // Open links in default browser instead of new electron window
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools(); // Optional: kept if needed, but menu is gone
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null); // Remove default menu
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
