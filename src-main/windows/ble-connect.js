const {app, shell} = require('electron');
const AbstractWindow = require('./abstract');
const {translate, getStrings, getLocale} = require('../l10n');
const {APP_NAME} = require('../brand');
const settings = require('../settings');
const {isUpdateCheckerAllowed} = require('../update-checker');
const RichPresence = require('../rich-presence');

const {ipcMain}=require('electron/main')

const { SerialPort } = require('serialport');
const path = require('path');

const { BrowserWindow } = require('electron');

const {getWin,setWin} = require('../../utils/win')
const {getCode,setCode,getDown,setDown} = require('../../utils/tempCode')

const {getDistance,setDistance} = require('../../utils/distance')
// const {getDistance,setDistance} = require('../../node_modules/scratch-vm/src/util/action')
const fs = require('fs');
const {setSocket,getSocket,getBricksSocket,getBricksMotor} = require('../../utils/socket')


let bluetoothPinCallback
let selectBluetoothCallback


// class BleConnectWindow extends AbstractWindow {
//   constructor () {
//     super();

//     this.window.setTitle(`蓝牙连接 - ${APP_NAME}`);
//     this.window.setMinimizable(false);
//     this.window.setMaximizable(false);
//     // console.log(this.window.navigator);
    

//     const ipc = this.window.webContents.ipc;

//     this.window.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
//       console.log('执行了');
      
//       event.preventDefault()
//       selectBluetoothCallback = callback
//       const result = deviceList.find((device) => {
//         return device.deviceName === 'ICreateRobot'
//       })
//       console.log(deviceList)
//       if (result) {
//         callback(result.deviceId)
//       } else {
//         // The device wasn't found so we need to either wait longer (eg until the
//         // device is turned on) or until the user cancels the request
//       }
//     })
  
//     ipcMain.on('cancel-bluetooth-request', (event) => {
//       // console.log('UnBlueThooth*************');
//       selectBluetoothCallback('')
//     })
  
//     // Listen for a message from the renderer to get the response for the Bluetooth pairing.
//     ipcMain.on('bluetooth-pairing-response', (event, response) => {
//       bluetoothPinCallback(response)
//     })
  
//     this.window.webContents.session.setBluetoothPairingHandler((details, callback) => {
//       bluetoothPinCallback = callback
//       // Send a message to the renderer to prompt the user to confirm the pairing.
//       this.window.webContents.send('bluetooth-pairing-request', details)
//     })
    

    
//     this.loadURL('ble-connect://./ble-connect.html');
//   }


//   getDimensions () {
//     return {
//       width: 550,
//       height: 500
//     };
//   }

//   getPreload () {
//     return 'ble-data';
//   }

//   isPopup () {
//     return true;
//   }

//   static show () {
//     const window = AbstractWindow.singleton(BleConnectWindow);
//     window.show();
//   }
// }


class BleConnectWindow extends BrowserWindow {
  constructor() {
    

    super({
      width:550,
      height:500,
      title: `${translate('ble-connect.title')} - ${APP_NAME}`,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        preload: path.join(__dirname, '../../src-preload/ble-data.js'), 
      },
      closeable: false,
    });
    let This=this
    setWin(this)

    ipcMain.on('get-translate', (event) => {
      event.returnValue = {
        locale: getLocale(),
        strings: getStrings()
      }
    });

    let Device=0;
    // function waitForGlobalVariable() {
    //   return new Promise((resolve) => {
    //     const interval = setInterval(() => {
    //       console.log(Device)
    //       if (Device !== 0) {
    //         clearInterval(interval);
    //         resolve(Device);
    //       }
    //     }, 10000); // 每隔100毫秒检查一次全局变量是否被设置
    //   });
    // }

    function waitForCondition(variable, value, callback) {
      if (variable !== value) {
        // 变量已经不等于指定值，执行回调函数
        callback();
      } else {
        // 变量仍然等于指定值，稍后再检查
        setTimeout(function () {
          waitForCondition(variable, value, callback);
        }, 2000); // 每隔100毫秒检查一次
      }
    }

    
    setInterval(()=>{
      let codeDown={
        down:getDown(),
        code:getCode()
      }
      try{
        console.log(this.webContents.isDestroyed())
        if(this.webContents.isDestroyed()) return
        if(!this.webContents.isDestroyed()){
          this.webContents.send('code-down', codeDown);
          if(codeDown.down==1 || codeDown.down==2) setDown(0)
        }
      }catch(e){
        console.log(e)
      }
      
      
    },2000)

    this.webContents.on('select-bluetooth-device', async(event, deviceList, callback) => {
      event.preventDefault()
      selectBluetoothCallback = callback
      this.webContents.send('device-list', deviceList),
      console.log(deviceList)
      // await waitForGlobalVariable()
      waitForCondition(Device, 0, function () {
        console.log("myVariable 不等于 0，执行后续操作");
        
        // 在这里编写你的后续操作代码
        const result = deviceList.find((device) => {
          return device.deviceName === Device
        })
        
        if (result) {
          Device=0
          setWin(This)
          if(getSocket()){
            getSocket().send(JSON.stringify({
              type: 'ble-connect',
              data: { message: true }
          }))
          }
          callback(result.deviceId)
        } else {
          Device=0
          // The device wasn't found so we need to either wait longer (eg until the
          // device is turned on) or until the user cancels the request
        }

      });
      
    })

    ipcMain.on('send-device', (event, device) => {
      console.log(device)
      Device=device
    })


    

    ipcMain.handle('send-code-prosser', async (event, state) =>{

      console.log(state)
      if(getSocket()){
        getSocket().send(JSON.stringify({
          type: 'bricks',
          data: { message: state }
      }))
      }
      

    })


    // server.js (Node.js 服务器端)
    // const WebSocket = require('ws');
    // const wss = new WebSocket.Server({ port: 8080 });

    
    // let DIS;
    // wss.on('connection', (ws) => {
    //   // ws.on('message', (message) => {
    //   //   console.log(`Received: ${message}`);
    //   //   ws.send(`Hello, you sent -> ${distance}`);
    //   // });
    //   setInterval(()=>{
    //     ws.send(`${DIS}`);
    //   },1000)
      
    // });
    ipcMain.on('send-distance', (event, distance) => {
      // console.log(distance[2][2])
      // debouncedFetchData(distance)
      // setDistance(distance)
      // DIS=distance
      if(getBricksSocket()){
        getBricksSocket().send(JSON.stringify(distance))
      }
      setDistance(distance)

      
    })

    // let timer = setInterval(()=>{
    //   if(getBricksMotor()){
    //     clearInterval(timer)
    //     getBricksMotor().on('message', function incoming(message) {
    //       console.log(message)
    //     })
    //   }
      
    // },2000)

    // if(getBricksMotor()){
    //   console.log('################################')
    //   getBricksMotor().on('message', function incoming(message) {
    //     console.log(JSON.parse(message))
    //     This.webContents.send('send-motor', JSON.parse(message))
    //   })
    // }

    // 创建定时器持续检查
    const checkInterval = setInterval(() => {
      if (getBricksMotor()) {
          console.log('成功获取BricksMotor连接');
          clearInterval(checkInterval); // 停止检查

          // 添加消息监听
          getBricksMotor().on('message', function incoming(message) {
              try {
                  const parsed = JSON.parse(message);
                  console.log('收到电机消息:', parsed);
                  This.webContents.send('send-motor', parsed);
              } catch (err) {
                  console.error('消息解析失败:', err);
              }
          });

          // // 可选：监听连接关闭事件
          // getBricksMotor().on('close', () => {
          //     console.log('连接断开，重新开始检查');
          //     startChecking(); // 重新激活检查流程
          // });
      } else {
          console.log('等待BricksMotor连接...');
      }
    }, 2000); // 每秒检查一次

    

    ipcMain.on('ble-connect', (event, connect) => {
      console.log(connect)

      if(getSocket()){
        getSocket().send(JSON.stringify({
          type: 'ble',
          data: { message: connect }
      }))
      }
      
    })
  

    ipcMain.on('is-download', (event, down) => {

      if(getSocket()){
        getSocket().send(JSON.stringify({
          type: 'bleIsDownLoad',
          data: { message: down }
      }))
      }
      
    })
    ipcMain.on('cancel-bluetooth-request', (event) => {
      selectBluetoothCallback('')
    })
  
    // Listen for a message from the renderer to get the response for the Bluetooth pairing.
    ipcMain.on('bluetooth-pairing-response', (event, response) => {
      bluetoothPinCallback(response)
    })
  
    this.webContents.session.setBluetoothPairingHandler((details, callback) => {
      bluetoothPinCallback = callback
      // Send a message to the renderer to prompt the user to confirm the pairing.
      this.webContents.send('bluetooth-pairing-request', details)
    })

    this.on('close', (event) => {
      event.preventDefault();
      // 在这里可以添加自定义的关闭逻辑，例如显示一个确认对话框
      // 如果用户确认关闭，则调用 mainWindow.destroy() 销毁窗口
      setWin(this)
      this.hide()

      console.log('关闭事件')
    });
  

    let filePath=path.join(__dirname, '../../src-renderer/ble-connect/ble-connect.html')
    this.loadFile(filePath)
    this.on('closed', () => {
      setWin(null)
    });
    // this.webContents.openDevTools()
    

  }

  static show() {
    const window = new BleConnectWindow();
    window.show();
  }

}


module.exports = BleConnectWindow;
