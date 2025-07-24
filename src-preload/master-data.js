const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('master', {
    sendMaster:(num) => ipcRenderer.invoke('send-master', num),
    sendCloseBn:(num) => ipcRenderer.invoke('send-close', num),
    getCloseBn: () => ipcRenderer.sendSync('get-close'),
});