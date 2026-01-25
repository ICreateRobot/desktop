const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendToMain: (data) => ipcRenderer.send('toMain', data),
  openSerialSettings: () => ipcRenderer.invoke('open-serial-settings'),
  getStrings: () => ipcRenderer.sendSync('get-strings'),
  getPorts: () => ipcRenderer.sendSync('get-ports'),
  getCode: () => ipcRenderer.sendSync('get-code'),
  sendConnectPort:(port) => ipcRenderer.invoke('send-connect-port', port),
  sendCode:(code) => ipcRenderer.invoke('send-code', code),
  sendPlaceName:(place,name)=> ipcRenderer.invoke('send-place-name', place,name),
  isConnected: () => ipcRenderer.sendSync('is-connected'),
  isPosted: () => ipcRenderer.sendSync('is-posted'),


  sendWho:({who,port,filePath}) => ipcRenderer.invoke('send-who', {who,port,filePath}),

  getExtension: () => ipcRenderer.sendSync('get-extension'),
  getVersion: () => ipcRenderer.sendSync('get-version'),

  flashFirmware: () =>ipcRenderer.invoke('flash-firmware'),
   getTranslate: () => ipcRenderer.sendSync('get-translate'),

  downloadFirmware: (url) => ipcRenderer.invoke('download-firmware', url),
  getCommonFirmwareVersions: () => ipcRenderer.invoke('get-common-firmware-versions'),


  getFirmwareList: async () => {
    const res = await ipcRenderer.invoke('get-firmware-list');
    return res;
  },
  getFolderCommits: async (type, folderName) => {
    const res = await ipcRenderer.invoke('get-folder-commits', { type, folderName });
    return res;
  },
  downloadFirmware: async (type, folderName) => {
    const res = await ipcRenderer.invoke('download-firmware', { type, folderName });
    return res;
  },
});
