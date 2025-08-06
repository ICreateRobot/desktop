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

const {getCloseBn,setCloseBn} = require('../../utils/closeBn')
// const {getSocket} = require('../../utils/socket')
const extensions = require('../../utils/extensionWho')


const DAPjs = require('dapjs');
const { DAPLink } = DAPjs;
const usb = require('usb');
const { ReadlineParser } = require('@serialport/parser-readline');
const {MicropythonFsHex }  = require('@microbit/microbit-fs');
const { microbitBoardId } = require('@microbit/microbit-universal-hex');
let options_mode ='full';//烧录模式---full：完整模式；incremental：增量模式



const IntelHex = require('intel-hex');
const fs = require('fs');
// const parser = require('@serialport/parser-readline');
const {setPort,getPort,getDeviceState,setDeviceState,setPortCom,getPortCom} = require('../../utils/port')
// const axios = require('axios');


const WebSocket = require('ws');
const iconv = require('iconv-lite');

const currentWifi=require('../../utils/currentWifi')

const { exec } = require('child_process');

const si = require('systeminformation');

const netTimer=require('../../utils/timer')

const wifi = require('node-wifi');
const os = require('os');



const sudo = require('sudo-prompt');
const history = require('../../utils/historyIp')

let esptool
// require = require('esm')(module)
// esptool =require('../../utils/espTool')
const net = require("net");
const QRCode = require('qrcode');

// const netTimer=require('../../utils/timer');
// const { name } = require('file-loader');
const ssid = 'MyHotspot'; // Wi-Fi 名称
const password = '12345678'; // Wi-Fi 密码

const currentEspIp = require('../../utils/currentEspIp')


const {getWin,setWin} = require('../../utils/win')
const {getCode,setCode,getDown,setDown} = require('../../utils/tempCode')

const {getDistance,setDistance} = require('../../utils/distance')
// const {getDistance,setDistance} = require('../../node_modules/scratch-vm/src/util/action')
const {setSocket,getSocket,getBricksSocket,getBricksMotor} = require('../../utils/socket')
const BleConnectWindow =require('./ble-connect')

let bluetoothPinCallback
let selectBluetoothCallback

let THIS
let isClosed

const Readline = require('@serialport/parser-readline')
// const parser = require('@serialport/parser-readline');
const socket =require('../../utils/socket')

//---------------------wifi模式-------------------------
function detectPreferredInterface() {
  return new Promise((resolve, reject) => {
    exec('netsh wlan show interfaces', { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ERROR: ${error.message}`);
        return reject(error);
      }

      if (stderr) {
        console.error(`⚠️ stderr: ${stderr}`);
        // 可以选择继续，也可以 reject
      }

      // 正则匹配像 WLAN 1、WLAN 5 等接口名
      const regex = /WLAN\s*\d+/i;
      const match = stdout.match(regex);
      const preferredInterface = match ? match[0].trim() : null;

      console.log('✅ Detected interface:', preferredInterface);
      resolve(preferredInterface);
    });
  });
}

detectPreferredInterface()
  .then(iface => {
    wifi.init({ iface });  // null 会自动用默认接口
    console.log('📶 Using interface:', iface || '(default)');
  })
  .catch(err => {
    console.error('❌ Failed to detect interface:', err);
  });


  //-------------------二维码模式--------------------

  function hexToByteArray(hex) {
    const byteArray = [];
    for (let i = 0; i < hex.length; i += 2) {
      byteArray.push(parseInt(hex.substr(i, 2), 16));
    }
    return byteArray;
  }
  
  
  const baseIp = "192.168.137."; // 你的电脑热点 IP 段（例如 192.168.137.X）
  const port = 8082; // ESP32 运行 WebSocket 的端口
  const TimeOut = 500; // 超时时间（毫秒）
  
  let checking=false
  
  // async function checkIp(ip) {
  //     return new Promise((resolve) => {
  //         const socket = new net.Socket();
  //         socket.setTimeout(TimeOut);
  
  //         socket.on("connect", () => {
  //             console.log(`找到 ESP32: ${ip}`);
  //             socket.destroy();
  //             // socket.close()
  //             resolve(ip);
  //         });
  
  //         socket.on("error", (e) => {
  //           // console.log(e)
  //           // socket.destroy();
  //             resolve(null);
  //         });
  
  //         socket.on("timeout", () => {
  //           // console.log('timeout')
  //           // socket.destroy();
  //             resolve(null);
  //         });
  
  //         socket.connect(port, ip);
  //     });
  // }
  
  // async function scanNetwork() {
     
  //     const tasks = [];
  //     for (let i = 2; i < 255; i++) {
  //         tasks.push(checkIp(baseIp + i));
  //     }
  
  //     const results = await Promise.all(tasks);
  //     const espIp = results.find((ip) => ip !== null);
  
  //     if (espIp) {
  //         console.log(`ESP32 IP 地址: ${espIp}`);
  //         currentEspIp.setIp(espIp)
  //         clearInterval(netTimer.getTimer())
  //         // await new Promise(resolve => setTimeout(resolve, 1000));
  //         if(getSocket()){
  //             getSocket().send(JSON.stringify({
  //               type: 'whatIp',
  //               data: { message: espIp }
  //             }))
  //         }
  //     } else {
  //         console.log("未找到 ESP32");
  //     }
  
  // }

  let isScanning = false;
  let scanAbort = false;

  function checkIp(ip) {
      return new Promise((resolve) => {
          if (scanAbort) return resolve(null);

          const socket = new net.Socket();
          socket.setTimeout(TimeOut);

          socket.on("connect", () => {
              console.log(`找到 ESP32: ${ip}`);
              socket.destroy();
              resolve(ip);
          });

          socket.on("error", () => resolve(null));
          socket.on("timeout", () => resolve(null));

          socket.connect(port, ip);
      });
  }

  async function scanNetwork() {
      if (isScanning) return;
      isScanning = true;
      scanAbort = false;

      for (let i = 2; i < 255; i++) {
          const ip = baseIp + i;

          // 在每次 checkIp 调用前判断是否已中止
          checkIp(ip).then((result) => {
              if (result && !scanAbort) {
                  scanAbort = true; // 停止其他任务的继续执行
                  console.log(`ESP32 IP 地址: ${result}`);
                  currentEspIp.setIp(result);
                  clearInterval(netTimer.getTimer());

                  if (getSocket()) {
                      getSocket().send(JSON.stringify({
                          type: 'whatIp',
                          data: { message: result }
                      }));
                  }
                  if(!isClosed){
                    THIS.window.close()
                  }

              }
          });

          // 在找到 IP 后跳出 for 循环
          if (scanAbort) break;
          await new Promise(res => setTimeout(res, 20)); // 节流，避免过快
      }

      isScanning = false;
  }

class ConnectWindow extends AbstractWindow {
  constructor () {
    super();

    this.window.setTitle(`${translate('connect-device.title')} - ${APP_NAME}`);
    this.window.setMinimizable(false);
    this.window.setMaximizable(false);
    // this.window.setResizable(false)
    // console.log(this.window.navigator);
    // this.window.webContents.openDevTools()
    isClosed=false
    THIS=this
    const ipc = this.window.webContents.ipc;

    
    ipc.on('get-translate', (event) => {
      event.returnValue = {
        locale: getLocale(),
        strings: getStrings()
      }
    });

    ipc.on('get-extension', async(event) => {

      if(extensions.getExtension()!=1 && extensions.getExtension()!=2 && extensions.getExtension()!=3){
        this.window.close()
        await new Promise(resolve => setTimeout(resolve, 200));
        const MasterWindow = require('./master')
        MasterWindow.show()
        
      }
      console.log('________________________')
      event.returnValue = {
        wifi: extensions.getExtension(),
      }
    });

    this.window.on('close', (event) => {
      console.log('ConnectWindow is about to close');
      // 可在这里做清理工作，比如断开socket连接、保存状态等
      isClosed=true
      if(getSocket()){
        getSocket().send(JSON.stringify({
          type: 'addLoad',
          data: { message: false }
        }))
      }
      if (netTimer.getTimer()) {
        clearInterval(netTimer.getTimer());
      }
    });
//--------------wifi模式-----------------------
     // 扫描 Wi-Fi 网络
    ipc.handle('scan-wifi', async () => {
      // exec('netsh wlan show networks', (error, stdout, stderr) => {
      //   if (error) {
      //       console.error(`exec error: ${error}`);
      //       return;
      //   }
      //   console.log(`stdout: ${stdout}`);
      //   console.error(`stderr: ${stderr}`);
      // });
      return new Promise((resolve, reject) => {
        
        wifi.scan((error, networks) => {
          if (error) {
            reject(error);
          } else {
            resolve(networks);  // 返回可用的 Wi-Fi 网络列表
          }
        });
      });
    });

    ipc.on('current-wifi', (event) => {
      event.returnValue = {
        wifi: currentWifi.getWifi(),
      }
    });


    async function checkWifi() {
      try {
        const interfaces = await si.networkInterfaces();
        const wifiInterface = interfaces.find(iface => 
          iface.type === 'wireless' && iface.operstate === 'up'
        );
        return !!wifiInterface;
      } catch (error) {
        console.error('Error:', error);
        return false;
      }
    }


      function getCurrentSSID(callback) {
        exec('netsh wlan show interfaces', (err, stdout) => {
          if (err) return callback(err);
      
          const match = stdout.match(/^\s*SSID\s*:\s(.+)$/m);
          if (match) {
            callback(null, match[1].trim());
          } else {
            callback(null, null); // 没有连接
          }
        });
      }
            
          
    setInterval(()=>{
      getCurrentSSID((err, ssid) => {
        if (err) {
          console.error('Error:', err);
        } else if (currentWifi.getWifi() && ssid !== currentWifi.getWifi()) {
          console.log('Disconnected or connected to the wrong network');
          currentWifi.setWifi('')
          if(getSocket()){
            // console.log('可能发送了')
            getSocket().send(JSON.stringify({
              type: 'wifiIsConnected',
              data: { message: false }
            }))
          }
        } else {
          // console.log('Connected to target SSID');
        }
      });
    },3000)
    

      function checkNetworkInterface(ssid) {
        const interfaces = os.networkInterfaces();
        for (let iface in interfaces) {
          for (let details of interfaces[iface]) {
            if (details.family === 'IPv4' && !details.internal) {
              console.log(`Connected Wi-Fi IP: ${details.address}`);
              return true;  // 设备成功获取了 IP，说明连上 Wi-Fi
            }
          }
        }
        return false;  // 设备没有获取 IP，说明 Wi-Fi 可能没连上
      }

      // 通用方法：检查是否连接到指定Wi-Fi
      function checkConnectedToSSID(ssid) {
        return new Promise((resolve) => {
          const command = process.platform === 'win32' ?
            `netsh wlan show interfaces | findstr /C:"SSID" | findstr "${ssid}"` :
            `iwgetid -r | grep "^${ssid}$"`;

          exec(command, (error, stdout) => {
            resolve(!error && stdout.includes(ssid));
          });
        });
      }

      // 改进后的连接逻辑
      ipc.handle('connect-wifi', async (event, ssid, password) => {
        console.log('-------------------')
        return new Promise(async (resolve, reject) => {
          const maxRetries = 3;
          let retries = 0;

          const attemptConnect = async () => {
            try {
              await new Promise((innerResolve, innerReject) => {
                wifi.connect({ ssid, password }, (error) => {
                  error ? innerReject(error) : innerResolve();
                });
              });

              // 等待并验证连接
              const isConnected = await waitForConnection(ssid, 15000); // 最多等15秒
              if (isConnected) {
                console.log("connected----------")
                currentWifi.setWifi(ssid);

                clearInterval(netTimer.getTimer())
                if(getSocket()){
                  console.log('可能发送了')
                  getSocket().send(JSON.stringify({
                    type: 'whatIp',
                    data: { message: '192.168.4.1' }
                  }))
                }
                resolve("connected");
              } else {
                console.log("timeout------------")
                throw new Error("timeout");
              }
            } catch (error) {
              if (retries++ < maxRetries) {
                setTimeout(attemptConnect, 2000); // 2秒后重试
              } else {
                console.log(`connect failed--------------: ${error.message}`)
                reject(`connect failed: ${error.message}`);
              }
            }
          };

          attemptConnect();
        });
      });

      // 等待连接完成的辅助函数
      async function waitForConnection(ssid, timeoutMs) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          if (await checkConnectedToSSID(ssid)) return true;
          await new Promise(resolve => setTimeout(resolve, 1000)); // 每秒检查一次
        }
        return false;
      }



    // 监听来自渲染进程的消息
    ipc.handle('whatssid', async (event, arg) => {
      console.log('收到消息:', arg);
      return currentWifi.getWifi()

      // return new Promise((resolve, reject) => {
      //   wifi.getCurrentConnections((error, currentConnections) => {
      //     if (error) {
      //       console.error('获取当前 Wi-Fi 连接失败:', error);
      //       reject(error);
      //       return;
      //     }
    
      //     if (currentConnections.length > 0) {
      //       let ssid = currentConnections[0].ssid;
    
      //       // **强制转换编码为 UTF-8**
      //       ssid = iconv.decode(Buffer.from(ssid, 'binary'), 'utf-8');
    
      //       console.log('当前连接的 Wi-Fi SSID:', ssid);
      //       resolve(ssid);
      //     } else {
      //       console.log('当前未连接到 Wi-Fi');
      //       resolve(null);
      //     }
      //   });
      // });
      
    });

    ipc.handle('close', async (event, flag) => {
      if(flag){


        // if(getSocket()){
        //   console.log('postMessage')
        //   getSocket().send(JSON.stringify({
        //     type: 'wifi',
        //     data: { message: true }
        //   }))
        // }
        if (this.window && !this.window.isDestroyed()) {
          setTimeout(() => {
            this.window.close();
          }, 200); // 添加短暂延迟确保用户体验
        }

        
      }
    })



    ipc.handle('disConn', async (event) => {
      console.log('--------------------------')
      // 断开当前连接的 Wi-Fi 网络
      currentWifi.setWifi('')
      wifi.disconnect((err) => {
        if (err) {
            console.error('断开连接失败:', err);
            return;
        }
        console.log('成功断开当前 Wi-Fi 网络');
      });
    })

    ipc.handle('change-name', async (event,name) => {

      // let jsonData={
      //   "command": "update_ap",
      //   "params": 
      //    {
      //       "ssid": name,
      //   }
      // }
      
      // const Socket = new WebSocket('ws://192.168.4.1:8084');
                    
      // Socket.addEventListener('open', (event) => {


      //   Socket.send(JSON.stringify(jsonData))
        

      // });

      // Socket.addEventListener('message', (event) => {
      //   if(event.data=='success'){
      //     Socket.close()
      //   }
          
      // })

      return new Promise((resolve, reject) => {
        let jsonData = {
            "command": "update_ap",
            "params": {
                "ssid": name,
            }
        };

        const Socket = new WebSocket('ws://192.168.4.1:8084');

        // 监听 WebSocket 连接打开事件
        Socket.addEventListener('open', () => {
            Socket.send(JSON.stringify(jsonData));
        });

        // 监听 WebSocket 消息事件
        Socket.addEventListener('message', (event) => {
            if (event.data === 'success') {
                console.log('success')
                Socket.close();
                resolve(true); // 成功后返回 true
            }
        });
      })

    })


    //--------------二维码模式--------------------
      ipc.on('get-std', (event) => {
          event.returnValue = {
            stdout:false
          }
        });
    
      ipc.handle('wifi-info', async (event, info) =>{
  
  
        try {
          
          // 生成 Wi-Fi 配置字符串
          const wifiConfig = `WIFI:T:WPA;S:${info.name};P:${info.password};;`;
  
          // 生成二维码（返回 Promise）
          const qrUrl = await QRCode.toDataURL(wifiConfig);
  
          console.log('📷 生成的二维码 URL:', qrUrl);
  
          if(info.isConnect){
            if(getSocket()){
              getSocket().send(JSON.stringify({
                type: 'addLoad',
                data: { message: true }
              }))
            }
            if (netTimer.getTimer()) {
              clearInterval(netTimer.getTimer());
            }

            netTimer.setTimer(setInterval(async()=>{
              // console.log('newTime')
                scanNetwork()
    
                
            },5000))
          }
          
          // 返回二维码 URL 给渲染进程
          return qrUrl;
  
  
  
        } catch (err) {
            console.error('❌ 生成二维码失败:', err);
            throw err;
        }
      })
  
  
  
  
      ipc.handle('usb-wifi-info', async (event, info) =>{
  
  
          try {
          // 🔧 1. 生成命令字符串
          const command = `netsh wlan stop hostednetwork && netsh wlan set hostednetwork mode=allow ssid=${info.name} key=${info.password} && netsh wlan start hostednetwork`;
          
          // 🔧 2. sudo-prompt 选项
          const options = {
            name: 'ESP32 Hotspot Manager',
          };
  
          // ✅ 3. 将 sudo.exec 包装为 Promise
          const execAsAdmin = () =>
            new Promise((resolve, reject) => {
              sudo.exec(command, options, (error, stdout, stderr) => {
                if (error) {
                  console.error('❌ failed to start hotspot:', error);
                  console.error('📄 stderr:', stderr);  // 👈 关键调试信息
                  reject(error);
                } else {
                  console.log('✅ Hotspot started:\n', stdout);
                  resolve(stdout);
                }
              });
            });
  
          // ✅ 4. 等待命令执行完成
          await execAsAdmin();
  
          // ✅ 5. 命令成功后生成二维码
          const wifiConfig = `WIFI:T:WPA;S:${info.name};P:${info.password};;`;
          const qrUrl = await QRCode.toDataURL(wifiConfig);
          console.log('📷 生成的二维码 URL:', qrUrl);
  

          if(info.isConnect){
            if(getSocket()){
              getSocket().send(JSON.stringify({
                type: 'addLoad',
                data: { message: true }
              }))
            }
            

              // ✅ 6. 设置网络扫描定时器
            if (netTimer.getTimer()) {
              clearInterval(netTimer.getTimer());
            }
    
            netTimer.setTimer(setInterval(() => {
              scanNetwork(); // 你自定义的函数
            }, 5000));

          }
        
  
          // ✅ 7. 返回二维码 URL 给渲染进程
          return qrUrl;
  
        } catch (err) {
          console.error('❌ 整个流程失败:', err);
          throw err;
        }
      })
  
  
      ipc.handle('set-history', async (event, info) =>{

        console.log('*****************');
        
  
        fetch('http://localhost:3000/save-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: `热点名称: ${info.name}\n热点密码: ${info.password}`
        })
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.error('错误:', error));
        history.setName(info.name)
        history.setPass(info.password)
      })
  
  
  
      fetch('http://localhost:3000/read-data')
        .then(res => res.json())
        .then(data => {
          const ssid = data.ssid;
          const password = data.password;
          console.log('热点名称:', ssid);
          console.log('热点密码:', password);
  
          history.setName(ssid)
          history.setPass(password)
        });
      ipc.on('get-history', (event) => {
        
        event.returnValue = {
          name:history.getName(),
          pass:history.getPass()
        }
      });

      //------------ble----------------
      ipc.handle('open-ble', async (event, info) =>{

       if(info){
         if(getWin()){
          getWin().show()
        }else{
          BleConnectWindow.show();
        }
       }
      })

      //----------------serial---------------------
      ipc.on('get-strings', (event) => {
        event.returnValue = {
          locale: getLocale(),
          strings: getStrings()
        }
      });

      async function sendSerialCommand(command, delay = 50) {
        console.log('111111111111111111111111111111111111111')
          return new Promise((resolve, reject) => {
            getDeviceState().serialPort.write(command, err => {
              if (err) return reject(err);
              setTimeout(resolve, delay);
            });
          });
        }
  
  
      let PORT
      // let portCom=''
       ipc.on('what-port-connect', (event) => {
          event.returnValue = {
            port: getPortCom()
          }
        });
      ipc.handle('send-connect-port', async (event, port) =>{
        // console.log(port)
  
        // // 创建一个 SerialPort 对象
        // PORT = new SerialPort({
        //     path: port, // 串口名称
        //     baudRate: 115200, // 波特率
        //     dataBits: 8, // 数据位
        //     stopBits: 1, // 停止位
        //     parity: 'none' // 校验位
        // },(err) =>{
        //   console.log(PORT)
        // })
  
  
        // // 监听打开事件
        // PORT.on('open', () => {
        //   console.log('Port opened successfully');
        //   console.log(PORT)
        //   setPort(PORT)
        //   portCom=port
        //   if(socket.getSocket()){
        //     socket.getSocket().send(JSON.stringify({
        //       type: 'isOpenPort',
        //       data: { message: true }
        //     }))
        //   }
        //   console.log('GETPORT: ')
        //   console.log(getPort())
        //   ipc.on('is-connected', (event) => {
        //     event.returnValue = {
        //       flag: true
        //     }
        //   });
        //   // try {
        //   //   let startMsg=[0xAF,0x04,0x96,0x00,0x01,0x4a]
        //   //   const data1 = new Uint8Array(startMsg);
        //   //   PORT.write(data1);
        //   // }
        //   // catch (err) {
        //   //   console.log('发送数据失败: ' + err.message+'\n');
        //   // }
        //   // // 创建解析器
        //   // const parserInstance = PORT.pipe(new parser({ delimiter: '\r\n' }));
        //   // // 监听数据
        //   // parserInstance.on('data', (data) => {
        //   //   console.log(`Received: ${data}`);
        //   // });
        
        // });
    
  
        // PORT.on('close',()=>{
        //   console.log('Port closed')
        //   if(socket.getSocket()){
        //     socket.getSocket().send(JSON.stringify({
        //       type: 'isOpenPort',
        //       data: { message: false }
        //     }))
        //   }
        // })
        // // 监听错误事件
        // PORT.on('error', (err) => {
        // console.error('Serial port error:', err);
        // });
  
        // let bufferData = '';
        // PORT.on('data', (data) => {
        //   bufferData += data.toString(); // 累加接收到的串口数据
  
        //   // 判断是否一条消息结束（根据你的设备协议，这里以 \r\n 为结尾）
        //   if (bufferData.endsWith('\r\n')) {
        //     const message = bufferData.trim(); // 去除 \r\n 和空格
        //     bufferData = ''; // 清空缓存，准备下一条
        //     console.log(typeof message)
        //     if(message=='["success"]'){
        //       console.log(message)
        //     }
        
        //     // 尝试判断是不是 JSON 数组
        //     if (message.startsWith('[') && message.endsWith(']')) {
        //       // console.log('recive array'+message)
        //       try {
        //         const parsedArray = JSON.parse(message);
        //         // console.log('✅ 接收到数组:', parsedArray);
        
                
        //         // 广播或其他操作...
        //         socket.getSocket()?.send(JSON.stringify({
        //           type: 'serialData',
        //           data: { message: parsedArray }
        //         }));
        
        //       } catch (err) {
        //         // console.error('JSON 解析失败:', err.message);
        //       }
        //     } else {
        //       // console.log('recive string:', message);
        
        //       socket.getSocket()?.send(JSON.stringify({
        //         type: 'serialData',
        //         data: { message }
        //       }));
        
        //       // 你也可以做一些判断
        //       if (message === 'success') {
        //         console.log('SUCCESS');
        //       } else if (message === 'fail') {
        //         console.log('FAILED');
        //       }
        //     }
        //   }
        // });



        
        

        // 扫描串口列表，尝试识别 micro:bit
        const ports = await SerialPort.list();
        const targetPortInfo = ports.find(p => p.path === port);

        const isMicrobit = targetPortInfo &&
          targetPortInfo.vendorId === '0D28' &&
          ['0204', '0205'].includes(targetPortInfo.productId?.toUpperCase?.());

        if (isMicrobit) {
          console.log('识别为 Micro:bit 设备，尝试初始化 USB 与串口连接');

          // 获取 USB 设备
          setDeviceState(['usbDevice',usb.findByIds(0x0d28, parseInt(targetPortInfo.productId, 16))])
          if (!getDeviceState().usbDevice) {
            return { success: false, error: '未找到匹配的 USB 设备' };
          }

          try {
            getDeviceState().usbDevice.open();
            if (getDeviceState().usbDevice.interfaces?.length > 0) {
              getDeviceState().usbDevice.interfaces[0].claim();
            }
            console.log('usb connect succcess')
          } catch (err) {
            console.warn('USB 打开失败:', err.message);
          }

          // 初始化串口（和之前一致）
          setDeviceState(['serialPort',new SerialPort({
            path: port,
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            autoOpen: false
          })])

          await new Promise((resolve, reject) => {
            getDeviceState().serialPort.open(err => (err ? reject(err) : resolve()));
          });

          console.log('串口连接成功（Micro:bit）');
          setPort(getDeviceState().serialPort);
          setPortCom(port)

          // const parserInstance = serial.pipe(new ReadlineParser({ delimiter: '\r\n' }));
          setDeviceState(['parser',getDeviceState().serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))])

          

          setupSerialListeners()


          await new Promise(resolve => setTimeout(resolve, 1000))

          await sendSerialCommand('\x03'); 
          await sendSerialCommand('from microbit import *\r',200);
          await sendSerialCommand('from ICreate import *\r',200);
          await sendSerialCommand('display.show(Image.HEART)\n\r', 200);
          // let bufferData = '';
          // getDeviceState().parser.on('data', (data) => {
          //   bufferData += data.toString();
          //   if (bufferData.endsWith('\r\n')) {
          //     const message = bufferData.trim();
          //     bufferData = '';

          //     try {
          //       const parsed = JSON.parse(message);
          //       socket.getSocket()?.send(JSON.stringify({
          //         type: 'serialData',
          //         data: { message: parsed }
          //       }));
          //     } catch {
          //       socket.getSocket()?.send(JSON.stringify({
          //         type: 'serialData',
          //         data: { message }
          //       }));
          //     }
          //   }
          // });

          // getDeviceState().serialPort.on('close', () => {
          //   socket.getSocket()?.send(JSON.stringify({
          //     type: 'isOpenPort',
          //     data: { message: false }
          //   }));
          // });

          // getDeviceState().serialPort.on('error', err => console.error('串口错误:', err));


          return { success: true, microbit: true };
        } else {
          // 非 Micro:bit — 原有逻辑
          console.log('非 Micro:bit 串口，使用原始连接方式');

          PORT = new SerialPort({
            path: port,
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none'
          });

          PORT.on('open', () => {
            console.log('串口打开成功');
            setPort(PORT);
            setPortCom(port)

            socket.getSocket()?.send(JSON.stringify({
              type: 'isOpenPort',
              data: { message: true }
            }));

            ipc.on('is-connected', (event) => {
              event.returnValue = { flag: true };
            });
          });

          let bufferData = '';
          PORT.on('data', (data) => {
            bufferData += data.toString();
            if (bufferData.endsWith('\r\n')) {
              const message = bufferData.trim();
              bufferData = '';

              try {
                const parsed = JSON.parse(message);
                socket.getSocket()?.send(JSON.stringify({
                  type: 'serialData',
                  data: { message: parsed }
                }));
              } catch {
                socket.getSocket()?.send(JSON.stringify({
                  type: 'serialData',
                  data: { message }
                }));
              }
            }
          });

          PORT.on('close', () => {
            console.log('串口关闭');
            setPortCom('')
            socket.getSocket()?.send(JSON.stringify({
              type: 'isOpenPort',
              data: { message: false }
            }));
          });

          PORT.on('error', err => console.error('串口错误:', err));

          return { success: true, microbit: false };
        }
  
  
        
  
      })
      

      // 监听断开或异常
      function setupSerialListeners() {
        // 先移除旧监听器
        if (getDeviceState().parser) {
          getDeviceState().parser.removeAllListeners();
        }
      
        getDeviceState().serialPort.on('data', data => {
          const buffer = getDeviceState().serialBuffer + data;
          setDeviceState(['serialBuffer',buffer])
          // console.log(data)
          if (getDeviceState().serialBuffer.includes('>>>') && getDeviceState().currentResolve) {
            const response = getDeviceState().serialBuffer;
            console.log("####",response)
            // deviceState.serialBuffer = '';
            setDeviceState(['serialBuffer',''])
            getDeviceState().currentResolve(response);
            // deviceState.currentResolve = null;
            setDeviceState('currentResolve',null)
          }


         
        });
      
        getDeviceState().serialPort.once('close', () => {
          // portCom=''
          setPortCom('')
          disconnectDevice().catch(console.error);
        });
      
        getDeviceState().serialPort.once('error', err => {
          disconnectDevice().catch(console.error);
        });
      }


      async function disconnectDevice() {
        const deviceState = getDeviceState();

        // 关闭串口
        if (deviceState.serialPort && deviceState.serialPort.isOpen) {
          await new Promise((resolve, reject) => {
            deviceState.serialPort.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // 关闭 USB 设备
        try {
          if (deviceState.usbDevice) {
            if (deviceState.usbDevice.interfaces?.[0]?.isKernelDriverActive?.()) {
              deviceState.usbDevice.interfaces[0].detachKernelDriver();
            }
            if (deviceState.usbDevice.interfaces?.[0]?.claimed) {
              deviceState.usbDevice.interfaces[0].release(true, () => {});
            }
            deviceState.usbDevice.close();
          }
        } catch (err) {
          console.warn('USB 清理时异常:', err.message);
        }

        // 清理状态
        setDeviceState(['serialPort', null]);
        setDeviceState(['usbDevice', null]);
        setDeviceState(['parser', null]);
        setDeviceState(['replActive', false]);
        setDeviceState(['serialBuffer', '']);
        setDeviceState(['currentResolve', null]);

        // 通知前端
        if (socket.getSocket()) {
          socket.getSocket().send(JSON.stringify({
            type: 'isOpenPort',
            data: { message: false }
          }));
        }
      }

      ipc.handle('disconnect', async (event) =>{

        //   if (PORT && PORT.isOpen) {
        //     try {
        //         // 等待串口关闭完成
        //         await new Promise((resolve, reject) => {
        //             PORT.close((err) => {
        //                 if (err) {
        //                     console.error('关闭串口时发生错误:', err.message);
        //                     reject(err); // 拒绝 Promise
        //                 } else {
        //                     console.log('串口已成功关闭');

        //                     // 清理操作
        //                     setPort(null);
        //                     portCom = '';

        //                     if (socket.getSocket()) {
        //                         socket.getSocket().send(JSON.stringify({
        //                             type: 'isOpenPort',
        //                             data: { message: false }
        //                         }));
        //                     }

        //                     PORT.removeAllListeners();
        //                     resolve(); // 成功
        //                 }
        //             });
        //         });

        //         return { success: true };

        //     } catch (err) {
        //         return { success: false, error: err.message };
        //     }
        // } else {
        //     return { success: true, message: '串口未打开' };
        // }



        // 检查当前端口是否为 micro:bit
        const ports = await SerialPort.list();
        const currentPortInfo = ports.find(p => p.path === getPortCom());

        const isMicrobit = currentPortInfo &&
          currentPortInfo.vendorId === '0D28' &&
          ['0204', '0205'].includes(currentPortInfo.productId?.toUpperCase?.());

        try {
          if (isMicrobit) {
            await disconnectDevice();

            // 清空端口记录
            setPort(null);
            // portCom = '';
            setPortCom('')

            console.log('Micro:bit is disconnected');
            return { success: true, microbit: true };
          }

          // 非 Micro:bit 串口处理（原逻辑）
          if (PORT && PORT.isOpen) {
            await new Promise((resolve, reject) => {
              PORT.close((err) => {
                if (err) {
                  console.error('serial close failed:', err.message);
                  reject(err);
                } else {
                  console.log('serial close success');

                  setPort(null);
                  // portCom = '';
                  setPortCom('')

                  if (socket.getSocket()) {
                    socket.getSocket().send(JSON.stringify({
                      type: 'isOpenPort',
                      data: { message: false }
                    }));
                  }

                  PORT.removeAllListeners();
                  resolve();
                }
              });
            });

            return { success: true, microbit: false };
          } else {
            return { success: true, message: '串口未打开' };
          }
        } catch (err) {
          return { success: false, error: err.message };
        }
      })
  
      const session = require('electron').session;
      session.defaultSession.setPermissionCheckHandler((permission, details) => {
        if (permission === 'serial') {
          return true; // 允许访问串口设备
        }
        return false;
      });
  
      
  
      let port;
      let writer;
      let reader;
      let PORTS=[]
      async function init(){
        // await SerialPort.list().then(ports => {
        //   ports.forEach(port=>{
        //     console.log(port.path)
        //     PORTS.push(port.path)
        //     // console.log(PORTS)
        //   })
        // })
        // console.log(PORTS)

        try {
          PORTS=[]
          const ports = await SerialPort.list();  // ✅ 直接使用 await 获取结果
          // ports.forEach(port => {
          //   console.log(port.path);
          //   PORTS.push(port.path);
          // });

          // console.log(ports)

          PORTS = ports.map(port => ({
            path: port.path,
             label: (port.vendorId === '0D28' && ['0204', '0205'].includes(port.productId)) 
              ? `${port.path}（Microbit）`
              : port.path
          }));

          // console.log(PORTS);
        } catch (error) {
          console.error('获取串口列表失败:', error);
        }
        
      
  
      }

      init()
      setInterval(init, 3000);

      ipc.on('get-ports', (event) => {
        // init()
        event.returnValue = {
          PORTS
        }
      });
      
    
    
    this.loadURL('connect://./connect-device.html');
  }


  getDimensions () {
    return {
      width: 500,
      height: 400
    };
  }

  getPreload () {
    return 'connect-device';
  }

  isPopup () {
    return true;
  }

  static show () {
    const window = AbstractWindow.singleton(ConnectWindow);
    window.show();
  }
}

module.exports = ConnectWindow;
