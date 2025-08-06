const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('bleAPI', {
    cancelBluetoothRequest: () => ipcRenderer.send('cancel-bluetooth-request'),
    bluetoothPairingRequest: (callback) => ipcRenderer.on('bluetooth-pairing-request', () => callback()),
    bluetoothPairingResponse: (response) => ipcRenderer.send('bluetooth-pairing-response', response),
    sendDevice:(device) => ipcRenderer.send('send-device',device),
    sendDistance:(distance) => ipcRenderer.send('send-distance',distance),
    sendDeviceList: (callback) => ipcRenderer.on('device-list', (event, devicelist) => callback(devicelist)),
    sendMotor: (callback) => ipcRenderer.on('send-motor', (event, motor) => callback(motor)),
    codeDownLoad: (callback) => ipcRenderer.on('code-down', (event, codeDown) => callback(codeDown)),
    getBluetooth: () => navigator,
    sendCodeProsser:(state) => ipcRenderer.invoke('send-code-prosser', state),


    sendIsConnect:(ble) => ipcRenderer.send('ble-connect',ble),

    getTranslate: () => ipcRenderer.sendSync('get-translate'),

    setIsDownLoad:(down) => ipcRenderer.send('is-download',down),
});

