const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('connect', {
    sendMaster:(num) => ipcRenderer.invoke('send-master', num),

    //wifi链接
    sendNum:(num) => ipcRenderer.invoke('send-num', num),
    scanWifi: () => ipcRenderer.invoke('scan-wifi'),   // 扫描 Wi-Fi 网络
    connectWifi: (ssid, password) => ipcRenderer.invoke('connect-wifi', ssid, password), // 连接 Wi-Fi

    isClose: (flag) => ipcRenderer.invoke('close', flag), // 连接 Wi-Fi

    disConn: () => ipcRenderer.invoke('disConn'), // 连接 Wi-Fi


    sendData: async (message) => await ipcRenderer.invoke('whatssid', message),
    changeName: async (name) => await ipcRenderer.invoke('change-name',name),

    currentWifi: () => ipcRenderer.sendSync('current-wifi'),



    //生成二维码
    sendWho:(who) => ipcRenderer.invoke('send-who', who),
    getStd: () => ipcRenderer.sendSync('get-std'),
    onResult: (callback) => {
        ipcRenderer.on('esptool-result', (event, result) => callback(result));
        ipcRenderer.on('avrdude-result', (event, result) => callback(result));
      },
    wifiInfo: async (info) => await ipcRenderer.invoke('wifi-info',info),

    usbWifiInfo: async (info) => await ipcRenderer.invoke('usb-wifi-info',info),

    setHistory: async (info) => await ipcRenderer.invoke('set-history',info),

    getHistory: () => ipcRenderer.sendSync('get-history'),


    //ble

    openBle: async (info) => await ipcRenderer.invoke('open-ble',info),


    //serial

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
    whatPortConnect: () => ipcRenderer.sendSync('what-port-connect'),

    disconnectPort: ()=>ipcRenderer.invoke('disconnect'),

    sendWhoPort:({who,port}) => ipcRenderer.invoke('send-who-port', {who,port}),


    getExtensions: () => ipcRenderer.sendSync('get-extension'),


    getTranslate: () => ipcRenderer.sendSync('get-translate'),

});