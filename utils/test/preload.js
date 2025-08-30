const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('testAPI', {
  sendMessage: (message) => ipcRenderer.send('message-from-renderer', message),
  receiveMessage: (callback) => ipcRenderer.on('message-from-main', (event, arg) => callback(arg))
});