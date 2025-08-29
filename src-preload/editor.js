const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('EditorPreload', {
  isInitiallyFullscreen: () => ipcRenderer.sendSync('is-initially-fullscreen'),
  getInitialFile: () => ipcRenderer.invoke('get-initial-file'),
  getFile: (id) => ipcRenderer.invoke('get-file', id),
  openedFile: (id) => ipcRenderer.invoke('opened-file', id),
  closedFile: () => ipcRenderer.invoke('closed-file'),
  showSaveFilePicker: (suggestedName) => ipcRenderer.invoke('show-save-file-picker', suggestedName),
  showOpenFilePicker: () => ipcRenderer.invoke('show-open-file-picker'),
  setLocale: (locale) => ipcRenderer.sendSync('set-locale', locale),
  setChanged: (changed) => ipcRenderer.invoke('set-changed', changed),
  openNewWindow: () => ipcRenderer.invoke('open-new-window'),
  openAddonSettings: (search) => ipcRenderer.invoke('open-addon-settings', search),
  openPackager: () => ipcRenderer.invoke('open-packager'),
  openDesktopSettings: () => ipcRenderer.invoke('open-desktop-settings'),
  openPrivacy: () => ipcRenderer.invoke('open-privacy'),
  openAbout: () => ipcRenderer.invoke('open-about'),
  getPreferredMediaDevices: () => ipcRenderer.invoke('get-preferred-media-devices'),
  getAdvancedCustomizations: () => ipcRenderer.invoke('get-advanced-customizations'),
  setExportForPackager: (callback) => {
    exportForPackager = callback;
  },
  setIsFullScreen: (isFullScreen) => ipcRenderer.invoke('set-is-full-screen', isFullScreen),
  openMasterWindow: () => ipcRenderer.invoke('open-master-window'),
  openConnectWindow:() =>ipcRenderer.invoke('open-connect-window'),
  openBleSettings: () => ipcRenderer.invoke('open-ble-settings'),
  openDownloadSettings: (code) => ipcRenderer.invoke('open-download-settings',code),
  sendStateData: (callback) => ipcRenderer.on('send-state', (event, state) => callback(state)),
  sendSenorData: (callback) => ipcRenderer.on('send-senor', (event, senor) => callback(senor)),
  getRobotData: () => ipcRenderer.sendSync('get-robot-data'),
  download: (code,args) => ipcRenderer.invoke('download',code,args),
  SerialDownload: (code) => ipcRenderer.invoke('serial-download',code),
  cancelload: () => ipcRenderer.invoke('cancelload'),

   // 浦东第一帅-----------------------------------------------
   //连接相关
   requestUSBPermission: () => ipcRenderer.invoke('usb-request-device'),
   connectUSBDevice: (deviceInfo) => ipcRenderer.invoke('usb-connect-device', deviceInfo),
   disconnectUSBDevice: () => ipcRenderer.invoke('usb-disconnect-device'),
  //烧录原始固件
   flashFirmware: () => ipcRenderer.invoke('usb-flash-firmware'),
 
   flashHexFile: (hexData, boardId) => ipcRenderer.invoke('usb-flash-hex', { hexData, boardId }),
   getStorageInfo: () => ipcRenderer.invoke('usb-get-storage-info'),
   
   // 添加USB设备事件监听
   onUSBDeviceEvent: (callback) => {
     ipcRenderer.on('usb-device-connected', (event, device) => callback('connected', device));
     ipcRenderer.on('usb-device-disconnected', (event, device) => callback('disconnected', device));
     ipcRenderer.on('usb-device-error', (event, error) => callback('error', null, error));
     ipcRenderer.on('flash-progress', (event, progress) => callback('progress',null,progress));
   },
   enterReplMode: () => ipcRenderer.invoke('usb-enter-repl'),
   exitReplMode: () => ipcRenderer.invoke('usb-exit-repl'),
   sendCommandToDevice: (command) => ipcRenderer.invoke('usb-send-command', command),
   
   downloadCode: (code) => ipcRenderer.invoke('usb-download-flash',code),
   // 添加REPL数据接收监听
   onReplData: (callback) => {
     ipcRenderer.on('repl-data-received', (event, data) => {
       callback({
         ...data,
         isPrompt: data.text.includes('>>>') 
       });
     });
   },
   // 移除监听
   offReplData: () => {
     ipcRenderer.removeAllListeners('repl-data-received');
   }
});

let exportForPackager = () => Promise.reject(new Error('exportForPackager missing'));

ipcRenderer.on('export-project-to-port', (e) => {
  const port = e.ports[0];
  exportForPackager()
    .then(({data, name}) => {
      port.postMessage({ data, name });
    })
    .catch((error) => {
      console.error(error);
      port.postMessage({ error: true });
    });
});

window.addEventListener('message', (e) => {
  if (e.source === window) {
    const data = e.data;
    if (data && typeof data.ipcStartWriteStream === 'string') {
      ipcRenderer.postMessage('start-write-stream', data.ipcStartWriteStream, e.ports);
    }
  }
});

ipcRenderer.on('enumerate-media-devices', (e) => {
  navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
      e.sender.send('enumerated-media-devices', {
        devices: devices.map((device) => ({
          deviceId: device.deviceId,
          kind: device.kind,
          label: device.label
        }))
      });
    })
    .catch((error) => {
      console.error(error);
      e.sender.send('enumerated-media-devices', {
        error: `${error}`
      });
    });
});

contextBridge.exposeInMainWorld('PromptsPreload', {
  alert: (message) => ipcRenderer.sendSync('alert', message),
  confirm: (message) => ipcRenderer.sendSync('confirm', message),
});

// In some Linux environments, people may try to drag & drop files that we don't have access to.
// Remove when https://github.com/electron/electron/issues/30650 is fixed.
if (navigator.userAgent.includes('Linux')) {
  document.addEventListener('drop', (e) => {
    if (e.isTrusted) {
      for (const file of e.dataTransfer.files) {
        // Using webUtils is safe as we don't have a legacy build for Linux
        const {webUtils} = require('electron');
        const path = webUtils.getPathForFile(file);
        ipcRenderer.invoke('check-drag-and-drop-path', path);
      }
    }
  }, {
    capture: true
  });
}
