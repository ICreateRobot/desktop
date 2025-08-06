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


  sendWho:({who,port}) => ipcRenderer.invoke('send-who', {who,port}),

  getExtension: () => ipcRenderer.sendSync('get-extension'),

  flashFirmware: () =>ipcRenderer.invoke('flash-firmware'),
});
