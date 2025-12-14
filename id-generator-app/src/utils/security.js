/**
 * Security Utility
 * Implements client-side restrictions to prevent inspection, copying, and context menus.
 * Warning: Client-side circumvention is always possible by skilled users.
 */

export const enableProtection = () => {
    // 1. Block Right Click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        alert("Not permitted by the admin");
    });

    // 1b. Block Double Click (Selection attempting)
    document.addEventListener('dblclick', (e) => {
        e.preventDefault();
        alert("Not permitted by the admin");
    });

    // 1c. Prevent Selection (Extra safety)
    document.addEventListener('selectstart', (e) => {
        e.preventDefault();
    });

    // 2. Block Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+C, Ctrl+U)
    document.addEventListener('keydown', (e) => {
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            e.stopPropagation();
        }

        // Ctrl+Shift+I (DevTools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            e.stopPropagation();
        }

        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            e.stopPropagation();
        }

        // Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            e.stopPropagation();
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            e.stopPropagation();
        }

        // Ctrl+C (Copy) - Optional, maybe too aggressive? User asked for strict.
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            e.stopPropagation();
        }
    });

    // 3. Anti-Debugger Trap
    // This constantly pauses execution if DevTools is open (if not detached)
    setInterval(() => {
        // We use Function constructor to avoid static analysis finding 'debugger' statement easily if parsing source
        // But direct debugger statement is effective too.
        (function () { }.constructor("debugger")());
    }, 1000);

    // 4. Blank Console
    console.log = function () { };
    console.warn = function () { };
    console.error = function () { };
};
