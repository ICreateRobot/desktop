// const {app, shell} = require('electron');
// const AbstractWindow = require('./abstract');
// const {translate, getStrings, getLocale} = require('../l10n');
// const {APP_NAME} = require('../brand');
// const settings = require('../settings');
// const {isUpdateCheckerAllowed} = require('../update-checker');
// const RichPresence = require('../rich-presence');

// const { SerialPort } = require('serialport');
// const { exec } = require('child_process');
// const path = require('path');
// // const {setCode,getCode} = require('../../utils/global');
// // import {setCode,getCode} from '../../utils/global';
// // const parser = require('@serialport/parser-readline');
// const {getPort} =require('../../utils/port')
// // const {code}= require('../../utils/bridge')
// // require('../../utils/global')



// let CODE=''
// let Place=''
// let Name=''
// function stringToBinary(str) {
//   const encoder = new TextEncoder();
//   const uint8Array = encoder.encode(str);
//   return uint8Array;
// }

// function startMsg(){
//   let msg=[0xAF,0x04,0x96,0x00,0x01,0x4a]
//   return msg;
// }

// function nameMsg(){
//   let msg=[0xAF,0x1C,0x00,0x06]
//   return msg;
// }

// function timeMsg(){
//   let msg=[0xAF,0x1C,0x01,0x06]
//   return msg;
// }

// function codeMsg(){
//   let msg=[0xAF,0x1C,0x02,0x06];
//   return msg;
// }

// function endMsg(){
//   let msg=[0xAF,0x04,0x96,0x00,0x00,0x49]
//   return msg;
// }

// function binToByteArray(binaryString) {
//   // 确保二进制字符串的长度为 16 位
//   if (binaryString.length !== 16) {
//       binaryString = binaryString.padStart(16, '0');
//   }

//   const byte1 = parseInt(binaryString.substring(0, 8), 2);
//   const byte2 = parseInt(binaryString.substring(8, 16), 2);

//   return new Uint8Array([byte1, byte2]);
// }

// function codeSlice(start,end,code){
//   return code.slice(start,end);
// }
// let isContinue='0'

// class DownloadCodeWindow extends AbstractWindow {
//   constructor () {
//     super();

//     this.window.setTitle(`代码下载 - ${APP_NAME}`);
//     this.window.setMinimizable(false);
//     this.window.setMaximizable(false);

//     let PORT = getPort();
//     // PORT.on('data', (data) => {
//     //     console.log('Received data:', data.toString()); // 将 Buffer 转换为字符串
//     //     isContinue=data.toString()
//     // });
    
//     // 发送数据并等待接收特定数据后再继续
//     async function sendDataAndWait(dataToSend) {
//       return new Promise(async (resolve, reject) => {
//         // 发送数据
//         await PORT.write(dataToSend, (err) => {
//           if (err) {
//             return reject('Error on write: ' + err.message);
//           }

//           console.log(`Data sent: ${dataToSend}`);
//         });

//         // 等待接收到的数据
//         // await PORT.on('data', (data) => {
//         //   console.log('Data received:', data.toString());
//         //   console.log(typeof(data.toString()))

//         //   // 检查是否是我们想要的响应（例如，'0'）
//         //   if (data.toString().includes('71')) {
//         //     console.log('Received 71, continuing...');
//         //     PORT.removeListener('data');
//         //     resolve(); // 继续执行
//         //   }
//         // });
//         const onDataReceived = (data) => {
//           console.log('Data received:', data.toString());
//           console.log(typeof (data.toString()));
        
//           // 检查是否是我们想要的响应（例如，'0'）
//           if(data.toString().includes('74')){
//             console.log('Received 74, completed');
//             PORT.removeListener('data', onDataReceived); // 使用 removeListener 停止监听
//             resolve(); // 继续执行
//           }else if (data.toString().includes('71')) {
//             console.log('Received 71, continuing...');
//             PORT.removeListener('data', onDataReceived); // 使用 removeListener 停止监听
//             resolve(); // 继续执行
//           }
//         };
        
//         PORT.on('data', onDataReceived); // 添加 data 事件的监听器

//         // 可选：添加一个超时机制，防止长时间等待
//         setTimeout(() => {
//           reject('Timeout: No response received in time.');
//         }, 5000); // 5秒超时
//       });
//     }

//     const ipc = this.window.webContents.ipc;

//     ipc.on('get-code', (event) => {
//       event.returnValue = {
//         CODE
//       }
//     });

//     const execFile=path.resolve(__dirname, '../../utils', 'syntax_checker.exe');

//     function checkPythonSyntax(code) {
//       return new Promise((resolve, reject) => {
//         const child = exec(execFile, (error, stdout, stderr) => {
//           if (error) {
//             reject(error);
//             return;
//           }
//           try {
//             const errors = JSON.parse(stdout);
//             resolve(errors);
//           } catch (e) {
//             reject(e);
//           }
    
//         });
//         child.stdin.write(code);
//         child.stdin.end()
//       });
//     }
//     ipc.handle('send-code',(event,code)=>{
//       // exec(`${execFile} ${code}`, (error, stdout, stderr) => {
//       //   if (error) {
//       //       console.error('Error:', error);
//       //       return;
//       //   }

//       //   const result = JSON.parse(stdout);
//       //   console.log(result)
//       // });

//       checkPythonSyntax(code)
//       .then(errors => {
//         console.log(errors);
//       })
//       .catch(error => {
//         console.error(error);
//       });
//     })

//     ipc.handle('send-place-name', async (event, place,name) =>{

//       const encoder = new TextEncoder();
//       const data1 = encoder.encode('Lua:').buffer;
//       const data2=encoder.encode('aaaaaaa').buffer
//       let code=`while(true)
// do
//   L1(0,255,0,0)
//   D1(1)
//   L1(0,0,29,255)
//   D1(1)

// end`
//       sendDataAndWait('Lua:').then(() => {
//         sendDataAndWait(code).then(() => {
//           sendDataAndWait('endLua')
//         })
//       })

//       // console.log(place);
//       // console.log(name);
//       // Place=place
//       // Name=name

//       // let NAME=Place+'_'+Name+'.py'
//       // const data1 = new Uint8Array(startMsg());

//       // //名称请求信息（固定不变）
//       // let nameM = nameMsg();
//       // let Nam = stringToBinary(NAME);
//       // let j = 0;
//       // for (let i = 4; i < 29; i++) {
//       //   if (j < Nam.length) {
//       //     nameM.push(Nam[j]);
//       //     j++;
//       //   } else {
//       //     nameM.push(0);
//       //   }
//       // }
//       // let perfi = 0;
//       // for (let s = 0; s < nameM.length; s++) {
//       //   perfi = perfi + nameM[s];
//       // }
//       // nameM.push(perfi)
//       // const data2 = new Uint8Array(nameM);
//       // // console.log(data2)

//       // //结束请求信息（固定不变）
//       // const data4 = new Uint8Array(endMsg());

//       // const now = new Date()
//       // let year=now.getFullYear()
//       // let month=now.getMonth()+1
//       // let date=now.getDate()
//       // let hours=now.getHours()
//       // let minutes=now.getMinutes()
//       // let seconds=now.getSeconds()
//       // console.log(year)
//       // console.log(month)
//       // console.log(date)
//       // console.log(hours)
//       // console.log(minutes)
//       // console.log(seconds)

//       // let yearBin=(year-1980).toString(2)
//       // let first=(year-1980)*Math.pow(2,9)+month*32+date
//       // let second=hours*2048+minutes*32+seconds/2

//       // let firstArray=binToByteArray(first.toString(2))
//       // let secondArray=binToByteArray(second.toString(2))
//       // let timeM=timeMsg()
//       // for (let p=0;p<firstArray.length;p++){
//       //   timeM.push(firstArray[p])
//       // }
//       // for (let q=0;q<secondArray.length;q++){
//       //   timeM.push(secondArray[q])
//       // }
//       // for (let k=8;k<29;k++){
//       //   timeM.push(0)
//       // }
//       // let totalTime = 0;
//       // for (let x = 0; x < timeM.length; x++) {
//       //   totalTime = totalTime + timeM[x];
//       // }
//       // timeM.push(totalTime)
//       // console.log(timeM)
//       // const data5=new Uint8Array(timeM)
//       // sendDataAndWait(data1).then(() => {
//       //   sendDataAndWait(data5).then(() => {
//       //     sendDataAndWait(data2).then(async () => {
//       //       console.log(CODE)
//       //       if (stringToBinary(CODE).length > 25) {//如果代码长度大于25则需要切片
//       //         let start = 0;
//       //         let end = 24
//       //         let flag = false;
//       //         while (true) {
//       //           if (flag) {
//       //             let dataCode = codeSlice(start, end, stringToBinary(CODE));
//       //             let codeM = codeMsg();
//       //             codeM.push(end - start);
//       //             for (let i = 0; i < dataCode.length; i++) {
//       //               codeM.push(dataCode[i]);
//       //             }
//       //             let len0 = 25 - end + start - 1;
//       //             for (let j = 0; j < len0; j++) {
//       //               codeM.push(0);
//       //             }
//       //             if (codeM.length>30){
//       //               codeM=codeM.slice(0,-1)
//       //             }
//       //             let m = 0;
//       //             for (let k = 0; k < codeM.length; k++) {
//       //               m = m + codeM[k];
//       //             }
//       //             codeM.push(m)
//       //             const data3 = new Uint8Array(codeM);
//       //             console.log(data3)
//       //             sendDataAndWait(data3).then(() => {
//       //               sendDataAndWait(data4).then(() => {
//       //                 console.log("下载完成")
//       //                 ipc.on('is-posted', (event) => {
//       //                   event.returnValue = {
//       //                     flag: true
//       //                   }
//       //                 });
//       //               })
//       //             })
      
      
//       //             break;
//       //           }
//       //           let dataCode = codeSlice(start, end, stringToBinary(CODE));
//       //           let codeM = codeMsg();
//       //           codeM.push(end - start);
//       //           for (let i = 0; i < dataCode.length; i++) {
//       //             codeM.push(dataCode[i]);
//       //           }
//       //           let m = 0;
//       //           for (let k = 0; k < codeM.length; k++) {
//       //             m = m + codeM[k];
//       //           }
//       //           codeM.push(m)
//       //           const data3 = new Uint8Array(codeM);
//       //           start = end;
//       //           end = end + 24;
//       //           if (end > stringToBinary(CODE).length) {
//       //             end = stringToBinary(CODE).length - 1
//       //             flag = true
//       //           }
//       //           // await writer.write(data3)
//       //           console.log(data3)
//       //           await sendDataAndWait(data3)
      
      
//       //         }
//       //       } else {
//       //         console.log("执行了")
//       //         let codeM = codeMsg();
//       //         codeM.push(stringToBinary(CODE).length);
//       //         for (let i = 0; i < stringToBinary(CODE).length; i++) {
//       //           codeM.push(stringToBinary(CODE)[i]);
//       //         }
//       //         let len0 = 24 - stringToBinary(CODE).length
//       //         for (let j = 0; j < len0; j++) {
//       //           codeM.push(0)
//       //         }
//       //         let m = 0;
//       //         for (let k = 0; k < codeM.length; k++) {
//       //           m = m + codeM[k]
//       //         }
      
//       //         codeM.push(m);
//       //         const data3 = new Uint8Array(codeM);
//       //         console.log(data3)
//       //         // await writer.write(data3)
//       //         sendDataAndWait(data3).then(() => {
//       //           sendDataAndWait(data4).then(() => {
//       //             console.log("下载完成")
//       //             ipc.on('is-posted', (event) => {
//       //               event.returnValue = {
//       //                 flag: true
//       //               }
//       //             });
//       //           })
//       //         })
    
      
//       //       }
//       //     })
//       //   })
//       // })
      
      

      



//       // await PORT.write(data1);
//       // if(isContinue=='0'){
//       //   console.log('start')
//       //   await PORT.write(data5);
//       //   if(isContinue=='0'){
//       //     console.log('time')
//       //     await PORT.write(data2);
//       //     if(isContinue=='0'){
//       //       console.log('name')
//       //       if (stringToBinary(CODE).length > 25) {//如果代码长度大于25则需要切片
//       //         let start = 0;
//       //         let end = 24
//       //         let flag = false;
//       //         while (true) {
//       //           if (flag) {
//       //             let dataCode = codeSlice(start, end, stringToBinary(CODE));
//       //             let codeM = codeMsg();
//       //             codeM.push(end - start);
//       //             for (let i = 0; i < dataCode.length; i++) {
//       //               codeM.push(dataCode[i]);
//       //             }
//       //             let len0 = 25 - end + start - 1;
//       //             for (let j = 0; j < len0; j++) {
//       //               codeM.push(0);
//       //             }
//       //             if (codeM.length>30){
//       //               codeM=codeM.slice(0,-1)
//       //             }
//       //             let m = 0;
//       //             for (let k = 0; k < codeM.length; k++) {
//       //               m = m + codeM[k];
//       //             }
//       //             codeM.push(m)
//       //             const data3 = new Uint8Array(codeM);
//       //             await PORT.write(data3)
//       //             if(isContinue=='0'){
//       //               await PORT.write(data4);
//       //               if(isContinue=='0'){
//       //                 console.log("下载完成")
//       //               }else{
//       //                 console.log("结束异常")
//       //               }
//       //             }

//       //             break;
//       //           }
//       //           let dataCode = codeSlice(start, end, stringToBinary(CODE));
//       //           let codeM = codeMsg();
//       //           codeM.push(end - start);
//       //           for (let i = 0; i < dataCode.length; i++) {
//       //             codeM.push(dataCode[i]);
//       //           }
//       //           let m = 0;
//       //           for (let k = 0; k < codeM.length; k++) {
//       //             m = m + codeM[k];
//       //           }
//       //           codeM.push(m)
//       //           const data3 = new Uint8Array(codeM);
//       //           start = end;
//       //           end = end + 24;
//       //           if (end > stringToBinary(CODE).length) {
//       //             end = stringToBinary(CODE).length - 1
//       //             flag = true
//       //           }
//       //           await PORT.write(data3)

//       //           if(isContinue=='0'){
//       //             console.log('代码发送结束')
//       //           }

//       //         }
//       //       } else {
//       //         console.log("执行了")
//       //         let codeM = codeMsg();
//       //         codeM.push(stringToBinary(CODE).length);
//       //         for (let i = 0; i < stringToBinary(CODE).length; i++) {
//       //           codeM.push(stringToBinary(CODE)[i]);
//       //         }
//       //         let len0 = 24 - stringToBinary(CODE).length
//       //         for (let j = 0; j < len0; j++) {
//       //           codeM.push(0)
//       //         }
//       //         let m = 0;
//       //         for (let k = 0; k < codeM.length; k++) {
//       //           m = m + codeM[k]
//       //         }

//       //         codeM.push(m);
//       //         const data3 = new Uint8Array(codeM);
//       //         console.log(data3)
//       //         await PORT.write(data3)
//       //         console.log("write执行了")

//       //         if(isContinue=='0'){
//       //           console.log('代码发送结束')
//       //           await PORT.write(data4);
//       //           if(isContinue=='0'){
//       //             console.log('发送结束')
//       //             console.log("下载完成")
//       //           }else{
//       //             console.log("结束异常")
//       //           }
//       //         }
//       //       }
//       //     }
//       //   }
//       // }

//     })

 
//     // try {
//     //     let startMsg=[0xAF,0x04,0x96,0x00,0x01,0x4a]
//     //     const data1 = new Uint8Array(startMsg);
//     //     PORT.write(data1);
//     // }
//     // catch (err) {
//     //     console.log('发送数据失败: ' + err.message+'\n');
//     // }
//     console.log(getPort());
//     console.log('Code:'+CODE);
    
    
//     this.loadURL('download-code://./download-code.html');
//   }

//   getDimensions () {
//     return {
//       width: 550,
//       height: 500
//     };
//   }

//   getPreload () {
//     return 'serial-data';
//   }

//   isPopup () {
//     return true;
//   }

//   static show (code) {
//     try{
//       CODE=code
//       const window = AbstractWindow.singleton(DownloadCodeWindow);
//       window.show();
//     }catch (err) {
//       console.log(err);
//     }
    
//   }
// }

// module.exports = DownloadCodeWindow;







const {app, shell} = require('electron');
const AbstractWindow = require('./abstract');
const {translate, getStrings, getLocale} = require('../l10n');
const {APP_NAME} = require('../brand');
const settings = require('../settings');
const {isUpdateCheckerAllowed} = require('../update-checker');
const RichPresence = require('../rich-presence');

const { SerialPort } = require('serialport');
const IntelHex = require('intel-hex');
const fs = require('fs');
// const parser = require('@serialport/parser-readline');
const {setPort,getPort,setPortCom,getPortCom} = require('../../utils/port')
const path = require('path');
const {getSocket} = require('../../utils/socket')
let esptool
// require = require('esm')(module)
// esptool =require('../../utils/espTool')
const { exec } = require('child_process');
const { spawn } = require('child_process');
const extensions = require('../../utils/extensionWho')
const { dialog } = require('electron');

const QRCode = require('qrcode');

const https = require('https');
const http = require('http');
const os = require('os');
const {getDeviceState,setDeviceState} = require('../../utils/port')
const DAPjs = require('dapjs');
const { DAPLink } = DAPjs;
const usb = require('usb');
const {BrowserWindow } = require('electron');

const ssid = 'MyHotspot'; // Wi-Fi 名称
const password = '12345678'; // Wi-Fi 密码

function hexToByteArray(hex) {
  const byteArray = [];
  for (let i = 0; i < hex.length; i += 2) {
    byteArray.push(parseInt(hex.substr(i, 2), 16));
  }
  return byteArray;
}

function notifyRenderer(channel, payload = {}) {
  const win = BrowserWindow.getAllWindows()[0];
  // console.log(win.webContents.send)
  win?.webContents?.send(channel, payload);
}

class DownloadCodeWindow extends AbstractWindow {
  constructor () {
    super();

    this.window.setTitle(`${translate('download-code.title')} - ${APP_NAME}`);
    this.window.setMinimizable(false);
    this.window.setMaximizable(false);


    this.canClose = true; // 默认可以关闭

    this.window.on('close', (event) => {
      if (!this.canClose) {
        event.preventDefault();
        this.window.webContents.send('show-warning', '烧录进行中，暂时无法关闭窗口。');
      }
    });

    const ipc = this.window.webContents.ipc;
    ipc.on('get-translate', (event) => {
      event.returnValue = {
        locale: getLocale(),
        strings: getStrings()
      }
    });
    ipc.on('get-std', (event) => {
      event.returnValue = {
        stdout:false
      }
    });
    ipc.on('get-ports', async (event) => {
      try {
        const ports = await SerialPort.list();
        const filteredPorts = ports.filter(p => p.vendorId && p.vendorId.toUpperCase() === '1A86');
        const portPaths = filteredPorts.map(p => p.path);
        event.returnValue = portPaths;
      } catch (err) {
        console.error('Error listing ports:', err);
        event.returnValue = [];
      }
    });

    ipc.on('get-extension', async (event) => {

        event.returnValue = extensions.getExtension();

    });


    function downloadFirmwareToTmp(url, saveAsName = 'firmware.bin') {
      return new Promise((resolve, reject) => {
        const tmpDir = os.tmpdir();
        const savePath = path.join(tmpDir, saveAsName);

        const protocol = url.startsWith('https') ? https : http;

        const file = fs.createWriteStream(savePath);
        const request = protocol.get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`下载失败，状态码: ${res.statusCode}`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve(savePath));
          });
        });

        request.on('error', (err) => {
          fs.unlink(savePath, () => reject(err));
        });
      });
    }

    // 获取资源路径
    function getResourcePath(relativePath) {
      if (app.isPackaged) {
        // 打包后
        return path.join(process.resourcesPath, 'utils', relativePath);
      } else {
        // 开发环境
        return path.join(__dirname, '../../utils', relativePath);
      }
    }

    // let commonFilePath
    // (async () => {
    //   try {
    //     const firmwareUrl = 'https://gitee.com/lgmShine/bucket/raw/master/firmware.bin';
    //     commonFilePath = await downloadFirmwareToTmp(firmwareUrl, 'firmware.bin');
    //     console.log('download Success:', commonFilePath);
    //     // 现在可以把 localPath 传给 esptool 烧录
    //   } catch (err) {
    //     console.error('download error:', err);
    //   }
    // })();


    //ESP32
    const firmwareFilePath=getResourcePath('combined.bin')

    const commonFilePath=getResourcePath('firmware.bin')
    const testFirmware = getResourcePath('ICRobot_ESP32_V1.2.0.bin')
    const testFirmwareVfs=getResourcePath('vfs.bin')
    const esptoolPath=getResourcePath('esptool.exe');

    const upload = getResourcePath('upload.exe')
    const mainPy = getResourcePath('main.py')
    const icrobotPy = getResourcePath('icrobot.mpy')



    const OWNER = 'lgmShine';        // <-- 修改为你的 gitee owner
    const REPO = 'bucket';          // <-- 修改为你的仓库名
    const BRANCH = 'master';        // <-- 分支
    const BASE_FOLDER = 'firmware'; // 仓库中固件的根目录，如 firmware/standard/last/...

    // 5317e371401159915e29615d4efff0ef
    
    // 可选 token（如果是私有仓库）
    const GITEE_TOKEN = '39bdb0e0d25fb2d7e4b54ff21e15ec99'; // 如果需要就填
    // ipc.handle('download-firmware', async (event, url) => {
    //   return new Promise((resolve, reject) => {
    //     const tmpDir = os.tmpdir();
    //     const fileName = 'commonFirmware.bin';
    //     const savePath = path.join(tmpDir, fileName);

    //     const protocol = url.startsWith('https') ? https : http;
    //     const file = fs.createWriteStream(savePath);
    //     const request = protocol.get(url, (res) => {
    //       if (res.statusCode !== 200) {
    //         reject(new Error(`下载失败，状态码: ${res.statusCode}`));
    //         return;
    //       }
    //       res.pipe(file);
    //       file.on('finish', () => {
    //         file.close(() => resolve(savePath));
    //       });
    //     });

    //     request.on('error', (err) => {
    //       fs.unlink(savePath, () => reject(err));
    //     });
    //   });
    // });

    // ipc.handle('get-common-firmware-versions', async () => {
    //   // 这里用之前的 Gitee API 获取最近3次提交
    //   const owner = 'lgmShine';
    //   const repo = 'bucket';
    //   const filePath = 'firmware.bin';
    //   const branch = 'master';
    //   const token = ''; // 如果公开仓库可不填

    //   const url = `https://gitee.com/api/v5/repos/${owner}/${repo}/commits?path=${filePath}&sha=${branch}&per_page=3`;

    //   const axios = require('axios');
    //   const res = await axios.get(url, {
    //     headers: token ? { Authorization: `token ${token}` } : {}
    //   });

    //   // 返回给前端，包含下载原始 URL
    //   return res.data.map(c => ({
    //     sha: c.sha,
    //     message: c.commit.message,
    //     time: c.commit.committer.date,
    //     author: c.commit.committer.name,
    //     url: `https://gitee.com/${owner}/${repo}/raw/${branch}/${filePath}?commit=${c.sha}`
    //   }));

    // });



    const axios = require('axios');
    // HELPERS
    function giteeApiUrl(pathname, params = {}) {
      const base = `https://gitee.com/api/v5${pathname}`;
      const qs = new URLSearchParams(params).toString();
      return qs ? `${base}?${qs}` : base;
    }
    function rawUrl(repoPath, commitSha = null) {
      // raw URL: https://gitee.com/{owner}/{repo}/raw/{branch}/{path}
      if (commitSha) return `https://gitee.com/${OWNER}/${REPO}/raw/${commitSha}/${repoPath}`;
      return `https://gitee.com/${OWNER}/${REPO}/raw/${BRANCH}/${repoPath}`;
    }


    function withTimeout(promise, ms, timeoutMessage = 'Request timeout') {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, ms);
      });

      return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeoutPromise,
      ]);
    }

    // 1) 获取固件列表：返回 standard/xiaozhi 每个子文件夹（last/middle/long）有无 bin + version.txt
    // ipc.handle('get-firmware-list', async (event, repoSubpath = BASE_FOLDER) => {
    //   // 返回结构 {
    //   //   standard: [{ name:'last', version:'v1.0.0', files: [{name, path, rawUrl}] }, ...],
    //   //   xiaozhi: [...]
    //   // }
    //   try {
    //     const listForType = async (type) => {
    //       const basePath = `${repoSubpath}/${type}`;
    //       // 先列出 type 下的目录（last/middle/long）
    //       const url = giteeApiUrl(`/repos/${OWNER}/${REPO}/contents/${basePath}`, { ref: BRANCH, per_page: 100 });
    //       console.log(url)
    //       const res = await axios.get(url, { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} });
    //       // res.data 应为数组，元素包含 {name, path, type}
    //       const dirs = (res.data || []).filter(i => i.type === 'dir');
    //       const result = [];
    //       for (const d of dirs) {
    //         // 列出 d.path 下的文件
    //         const listUrl = giteeApiUrl(`/repos/${OWNER}/${REPO}/contents/${d.path}`, { ref: BRANCH, per_page: 100 });
    //         try {
    //           const r2 = await axios.get(listUrl, { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} });
    //           const files = r2.data || [];
    //           // find version.txt content if exists
    //           const vfile = files.find(f => f.name.toLowerCase() === 'version.txt');
    //           let version = null;
    //           if (vfile) {
    //             const rawVerUrl = rawUrl(vfile.path);
    //             try {
    //               const vcontent = await axios.get(rawVerUrl);
    //               version = String(vcontent.data).trim();
    //             } catch(e){
    //               version = null;
    //             }
    //           }
    //           // gather .bin files
    //           const bins = files.filter(f => f.name.toLowerCase().endsWith('.bin')).map(f => ({
    //             name: f.name,
    //             path: f.path,
    //             rawUrl: rawUrl(f.path)
    //           }));
    //           if (bins.length > 0 || version) {
    //             result.push({
    //               name: d.name, // last/middle/long
    //               version: version || null,
    //               files: bins
    //             });
    //           }
    //         } catch (e) {
    //           // 空目录或其它错误，跳过
    //           continue;
    //         }
    //       }
    //       return result;
    //     };

    //     const [standard, xiaozhi] = await Promise.all([listForType('standard'), listForType('xiaozhi')]);
    //     return { ok: true, data: { standard, xiaozhi } };
    //   } catch (err) {
    //     return { ok: false, error: err.message || String(err) };
    //   }
    // });
    ipc.handle('get-firmware-list', async (event, repoSubpath = BASE_FOLDER) => {
      try {
        const task = (async () => {

          const listForType = async (type) => {
            const basePath = `${repoSubpath}/${type}`;
            const url = giteeApiUrl(
              `/repos/${OWNER}/${REPO}/contents/${basePath}`,
              { ref: BRANCH, per_page: 100 }
            );

            const res = await axios.get(
              url,
              { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} }
            );

            const dirs = (res.data || []).filter(i => i.type === 'dir');
            const result = [];

            for (const d of dirs) {
              const listUrl = giteeApiUrl(
                `/repos/${OWNER}/${REPO}/contents/${d.path}`,
                { ref: BRANCH, per_page: 100 }
              );

              try {
                const r2 = await axios.get(
                  listUrl,
                  { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} }
                );

                const files = r2.data || [];

                const vfile = files.find(f => f.name.toLowerCase() === 'version.txt');
                let version = null;

                if (vfile) {
                  try {
                    const vcontent = await axios.get(rawUrl(vfile.path));
                    version = String(vcontent.data).trim();
                  } catch {
                    version = null;
                  }
                }

                const bins = files
                  .filter(f => f.name.toLowerCase().endsWith('.bin'))
                  .map(f => ({
                    name: f.name,
                    path: f.path,
                    rawUrl: rawUrl(f.path),
                  }));

                if (bins.length > 0 || version) {
                  result.push({
                    name: d.name,
                    version: version,
                    files: bins,
                  });
                }
              } catch {
                continue;
              }
            }

            return result;
          };

          const [standard, xiaozhi] = await Promise.all([
            listForType('standard'),
            listForType('xiaozhi'),
          ]);

          return { ok: true, data: { standard, xiaozhi } };
        })();

        // ⭐ 8 秒超时
        return await withTimeout(task, 12000, 'get-firmware-list timeout');

      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    });

    // 2) 获取某个文件夹的 commit 记录（用于显示该文件夹的提交历史）
    ipc.handle('get-folder-commits', async (event, { type, folderName, per_page = 10 }) => {
      try {
        const repoPath = `${BASE_FOLDER}/${type}/${folderName}`;
        const url = giteeApiUrl(`/repos/${OWNER}/${REPO}/commits`, { path: repoPath, sha: BRANCH, per_page });
        const res = await axios.get(url, { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} });
        // 简化返回
        const commits = (res.data || []).map(c => ({
          sha: c.sha,
          message: c.commit && c.commit.message ? c.commit.message.split('\n')[0] : '',
          date: c.commit && c.commit.committer ? c.commit.committer.date : '',
          author: c.commit && c.commit.committer ? c.commit.committer.name : ''
        }));
        return { ok: true, data: commits };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    });

    // 3) 下载固件：下载某个 type/folder 下的所有 bin 文件到临时目录并返回本地路径数组
    ipc.handle('download-firmware', async (event, { type, folderName }) => {
      try {
        // 先列出文件（复用 get-firmware-list）
        const listRes = await ipc.invoke ? await event.sender.invoke('get-firmware-list') : null;
        // 上面方式可能不可行（ipcMain.invoke 不存在），直接复用 listForType 逻辑：简化处理，直接请求 gitee
        const repoPath = `${BASE_FOLDER}/${type}/${folderName}`;
        const contentsUrl = giteeApiUrl(`/repos/${OWNER}/${REPO}/contents/${repoPath}`, { ref: BRANCH, per_page: 100 });
        const r = await axios.get(contentsUrl, { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} });
        const files = r.data || [];
        const bins = files.filter(f => f.name.toLowerCase().endsWith('.bin'));
        if (bins.length === 0) {
          return { ok: false, error: '未找到 bin 文件' };
        }
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firmware-'));
        const download = (file) => new Promise((resolve, reject) => {
          const url = rawUrl(file.path);
          const savePath = path.join(tmpDir, file.name);
          const protocol = url.startsWith('https') ? https : http;
          const req = protocol.get(url, (res) => {
            if (res.statusCode !== 200) {
              reject(new Error(`下载 ${file.name} 失败，状态码 ${res.statusCode}`));
              return;
            }
            const ws = fs.createWriteStream(savePath);
            res.pipe(ws);
            ws.on('finish', () => {
              ws.close(() => resolve({ name: file.name, path: savePath }));
            });
            ws.on('error', (err) => reject(err));
          });
          req.on('error', err => reject(err));
        });

        // 并行下载所有 bin
        const downloaded = [];
        for (const b of bins) {
          const d = await download(b);
          downloaded.push(d);
        }
        return { ok: true, data: { downloaded, tmpDir } };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    });


    ipc.handle('send-who', async (event, {who,port,filePath}) =>{

      if(!this.canClose){
        return
      }

      console.log(getPortCom())
      console.log(port)
      const ConnectDevice=require('./connect-device')
      // console.log(ConnectDevice.disconnectPortLogic)
      if(port==getPortCom()){
        await ConnectDevice.disconnectPortLogic()
      }
      // return
      // 在开始烧录时调用
      this.window.setAlwaysOnTop(false); 
      this.window.blur(); // 让出焦点，主窗口会浮上来
      console.log(who)
      if(who=='common'){

        let isError=false

        let isTimeout=false

        let isUploadErr=false
        // console.log(getPort().settings.path)
        console.log(firmwareFilePath);
        console.log(esptoolPath);
        
        this.canClose = false;

        const args = ['--port', port,"--baud", "1152000", 'write_flash', '0x0', filePath];
        const flashProcess = spawn(esptoolPath, args, { encoding: 'utf8' });

        flashProcess.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
          if(data.includes('A serial exception error occurred:') || data.includes('fatal error')){
            isTimeout=true
          }
          if(getSocket()){
            // console.log('可能发送了')
            getSocket().send(JSON.stringify({
              type: 'burnLogs',
              data: { message: {
                flashing:true,
                logs:`${data}`
              } }
            }))
          }
          event.sender.send('esptool-log', { type: 'stdout', message: data.toString() });
        });

        flashProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
          isError=true
          if(getSocket()){
            // console.log('可能发送了')
            getSocket().send(JSON.stringify({
              type: 'burnLogs',
              data: { message: {
                flashing:false,
                logs:''
              } }
            }))
          }
          event.sender.send('esptool-log', { type: 'stderr', message: data.toString() });
        });

        flashProcess.on('close', async(code) => {
          console.log(`Child process exited with code ${code}`);
          // if(getSocket()){
          //   // console.log('可能发送了')
          //   getSocket().send(JSON.stringify({
          //     type: 'burnLogs',
          //     data: { message: {
          //       flashing:false,
          //       logs:'success'
          //     } }
          //   }))
          // }
          // this.canClose = true; // ✅ 允许关闭窗口
          // event.sender.send('esptool-log', { type: 'done', code });



          if(isError || isTimeout){
             if(getSocket()){
              getSocket().send(JSON.stringify({
                type: 'burnLogs',
                data: { message: {
                  flashing:false,
                  logs:''
                } }
              }))
            }
            this.canClose = true; 
          }else{
            await new Promise((resolve)=>{
              dialog.showMessageBox({
                type:'info',
                buttons:[`${translate('download-code.reconnect')}`],
                title:`${translate('download-code.prompt')}`,
                message:`${translate('download-code.message')}`,
                detail:`${translate('download-code.detail')}`
              }).then(()=>{
                resolve()
              }).catch(err=>{
                resolve()
              })
            })
            const uploadProcess = spawn(upload, [port, mainPy, icrobotPy]);

            uploadProcess.stdout.on('data', (data) => {
              console.log(`[upload] stdout: ${data}`);
              if(data.includes('REPL')){
                isUploadErr=true
              }
              if (getSocket()) {
                getSocket().send(JSON.stringify({
                  type: 'burnLogs',
                  data: {
                    message: {
                      flashing:true,
                      logs:`${data}`
                    }
                  }
                }));
              }
              event.sender.send('upload-log', { type: 'stdout', message: data.toString() });
            });

            uploadProcess.stderr.on('data', (data) => {
              console.error(`[upload] stderr: ${data}`);
              isUploadErr=true
              if(getSocket()){
                  // console.log('可能发送了')
                  getSocket().send(JSON.stringify({
                    type: 'burnLogs',
                    data: { message: {
                      flashing:false,
                      logs:''
                    } }
                  }))
                }
              event.sender.send('upload-log', { type: 'stderr', message: data.toString() });
            });

            uploadProcess.on('close', (code) => {
              console.log(`[upload] 子进程退出，code=${code}`);

              if(isUploadErr){
                if(getSocket()){
                  getSocket().send(JSON.stringify({
                    type: 'burnLogs',
                    data: { message: {
                      flashing:false,
                      logs:'Failed'
                    } }
                  }))
                }
                this.canClose = true; 
              }else if(getSocket()){
                // console.log('可能发送了')
                getSocket().send(JSON.stringify({
                  type: 'burnLogs',
                  data: { message: {
                    flashing:false,
                    logs:'success'
                  } }
                }))
              }
              event.sender.send('upload-log', { type: 'done', code });
              this.canClose = true; // ✅ 完全完成，允许关闭窗口
            });
          }
          
        });
      }else if(who=='xiaoZhi'){
         console.log(firmwareFilePath);
          console.log(esptoolPath);

          let isError=false

          let isTimeout=false
          
          

          // const command = `${esptoolPath} --port ${port} write_flash 0x0 ${firmwareFilePath}`;

          // const options = { encoding: 'utf8' }; // 明确指定编码

          // exec(command,options, (error, stdout, stderr) => {
          //   if (error) {
          //     console.error(`Error executing esptool: ${error}`);
          //     event.sender.send('esptool-result', { error: error.message });
          //     return;
          //   }
          //   console.log(`stdout: ${stdout}`);
          //   console.error(`stderr: ${stderr}`);
          //   event.sender.send('esptool-result', { stdout, stderr });
          // });

          this.canClose = false;

          const args = ['--port', port,"--baud", "1152000", 'write_flash', '0x0', filePath? filePath[0].path:firmwareFilePath];
          const flashProcess = spawn(esptoolPath, args, { encoding: 'utf8' });

          flashProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            if(data.includes('A serial exception error occurred:')){
              isTimeout=true
            }
            if(getSocket()){
              // console.log('可能发送了')
              getSocket().send(JSON.stringify({
                type: 'burnLogs',
                data: { message: {
                  flashing:true,
                  logs:`${data}`
                } }
              }))
            }
            event.sender.send('esptool-log', { type: 'stdout', message: data.toString() });
          });

          flashProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            isError=true
            if(getSocket()){
              // console.log('可能发送了')
              getSocket().send(JSON.stringify({
                type: 'burnLogs',
                data: { message: {
                  flashing:false,
                  logs:'Failed'
                } }
              }))
            }
            event.sender.send('esptool-log', { type: 'stderr', message: data.toString() });
          });

          flashProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            if(!isError && getSocket()){
              // console.log('可能发送了')
              if(isTimeout){
                getSocket().send(JSON.stringify({
                  type: 'burnLogs',
                  data: { message: {
                    flashing:false,
                    logs:''
                  } }
                }))
              }else{
                 getSocket().send(JSON.stringify({
                  type: 'burnLogs',
                  data: { message: {
                    flashing:false,
                    logs:'success'
                  } }
                }))
              }
             
            }
            this.canClose = true; // ✅ 允许关闭窗口
            event.sender.send('esptool-log', { type: 'done', code });
          });

      }else if(who=='test'){
         console.log(firmwareFilePath);
          console.log(esptoolPath);

          let isError=false

          let isTimeout=false
          

          this.canClose = false;

          // const args = ['--port', port,"--baud", "1152000", 'write_flash', '0x0', testFirmware];

          const args = [
              '--chip', 'esp32s3',
              '--port', port,
              '--baud', '1152000',
              '--before', 'default_reset',
              '--after', 'hard_reset',
              'write_flash',
              '--flash_mode', 'dio',
              '--flash_size', '32MB',
              '--flash_freq', '80m',

              // 你的两个固件（保持你说的地址）
              '0x0', filePath? filePath[0].path:commonFilePath,          // 第一个固件
              '0x1420000', filePath? filePath[1].path:testFirmwareVfs,    // 第二个固件
            ];
          const flashProcess = spawn(esptoolPath, args, { encoding: 'utf8' });

          flashProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            if(data.includes('A serial exception error occurred:')){
              isTimeout=true
            }
            if(getSocket()){
              // console.log('可能发送了')
              getSocket().send(JSON.stringify({
                type: 'burnLogs',
                data: { message: {
                  flashing:true,
                  logs:`stdout: ${data}`
                } }
              }))
            }
            event.sender.send('esptool-log', { type: 'stdout', message: data.toString() });
          });

          flashProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            isError=true
            if(getSocket()){
              // console.log('可能发送了')
              getSocket().send(JSON.stringify({
                type: 'burnLogs',
                data: { message: {
                  flashing:false,
                  logs:'Failed'
                } }
              }))
            }
            event.sender.send('esptool-log', { type: 'stderr', message: data.toString() });
          });

          flashProcess.on('close', (code) => {
            console.log(`Child process exited with code ${code}`);
            if(!isError && getSocket()){
              // console.log('可能发送了')
              if(isTimeout){
                getSocket().send(JSON.stringify({
                  type: 'burnLogs',
                  data: { message: {
                    flashing:false,
                    logs:''
                  } }
                }))
              }else{
                 getSocket().send(JSON.stringify({
                  type: 'burnLogs',
                  data: { message: {
                    flashing:false,
                    logs:'success'
                  } }
                }))
              }
             
            }
            this.canClose = true; // ✅ 允许关闭窗口
            event.sender.send('esptool-log', { type: 'done', code });
          });

      }
    })

    

     ipc.handle('flash-firmware', async (event) =>{
      // try {
      //     // 读取HEX文件
      //     const hexPath = path.join(__dirname, '../../utils/microbit_firmware/MICROBIT.hex');
      //     const hexData = fs.readFileSync(hexPath);
      
      //     // 弹出保存窗口，让用户选择 micro:bit U盘目录（或任意位置）
      //     const saveDialogResult = await dialog.showSaveDialog({
      //       title: '保存 HEX 文件到 micro:bit',
      //       defaultPath: 'MICROBIT.hex',
      //       filters: [
      //         { name: 'HEX 文件', extensions: ['hex'] }
      //       ]
      //     });
      
      //     if (saveDialogResult.canceled || !saveDialogResult.filePath) {
      //       return {
      //         success: false,
      //         error: '用户取消了保存 HEX 文件操作'
      //       };
      //     }
      
      //     // 将 HEX 数据写入用户指定的位置
      //     fs.writeFileSync(saveDialogResult.filePath, hexData);
      
      //     return {
      //       success: true,
      //       message: 'HEX 文件已保存，请手动复制或已直接保存至 micro:bit'
      //     };
      
      //   } catch (err) {
      //     return {
      //       success: false,
      //       error: `保存 HEX 文件失败: ${err.message}`,
      //       ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      //     };
      //   }

       try {
        this.window.setAlwaysOnTop(false); 
        this.window.blur(); // 让出焦点，主窗口会浮上来
          // if (!deviceState.usbDevice) {
          //   throw new Error('未找到连接的USB设备');
          // }
          console.log('aaaaaaaa')
          // 读取HEX文件
          const hexPath = path.join(__dirname, '../../utils/microbit_firmware/MICROBIT(8).hex');
          const hexData = fs.readFileSync(hexPath);
      
          console.log('bbbbbbb')
         // await flashHexToDevice(hexData);
         try {
          // 创建DAPLink传输层
          const transport = new DAPjs.USB(getDeviceState().usbDevice);
          // getDeviceState().daplink = new DAPLink(transport);
          setDeviceState(['daplink',new DAPLink(transport)])
      
          console.log('ccccc')
          // 连接设备
          await getDeviceState().daplink.connect();
      
          let lastPercent = -1; // 用于记录上一次的进度
          // 执行烧录
          await new Promise((resolve, reject) => {
            console.log('start flash firmware')
            getDeviceState().daplink.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {
              const percent = Math.round(progress * 100);
              // 只有 percent 变化时才发送
              if (percent !== lastPercent) {
                lastPercent = percent   // 更新缓存
                if(getSocket()){
                  // console.log('可能发送了')
                  getSocket().send(JSON.stringify({
                    type: 'burnLogs',
                    data: { message: {
                      flashing:true,
                      logs:`${percent}`
                    } }
                  }))
                }
              }
              console.log(percent)
            });
      
            getDeviceState().daplink.flash(hexData)
              .then(resolve)
              .catch(reject);
          });
        } catch (err) {
          console.log(err)
          // 确保发生错误时断开连接
          if(getSocket()){
            // console.log('可能发送了')
            getSocket().send(JSON.stringify({
              type: 'burnLogs',
              data: { message: {
                flashing:false,
                logs:'Failed'
              } }
            }))
          }
          if (getDeviceState().daplink) {
            await getDeviceState().daplink.disconnect().catch(() => {});
            setDeviceState(['daplink',null])
          }
          return { 
            success: false, 
            error: `烧录失败: ${err.message}`,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
          };
        }
      
      
          if(getSocket()){
            // console.log('可能发送了')
            getSocket().send(JSON.stringify({
              type: 'burnLogs',
              data: { message: {
                flashing:false,
                logs:'success'
              } }
            }))
          }
      
          // 完成烧录
          //notifyRenderer('flash-status', { status: 'completed' });
          return { success: true, message: '固件烧录完成' };
      
        } catch (err) {
          // 确保发生错误时断开连接
          if (getDeviceState().daplink) {
            await getDeviceState().daplink.disconnect().catch(() => {});
            setDeviceState(['daplink',null])
          }
          return { 
            success: false, 
            error: `烧录失败: ${err.message}`,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
          };
        }
     })
   
    
    this.loadURL('download-code://./download-code.html');
  }

  getDimensions () {
    return {
      width: 550,
      height: 500
    };
  }

  getPreload () {
    return 'serial-data';
  }

  isPopup () {
    return true;
  }

    static show (code) {
    try{
      const window = AbstractWindow.singleton(DownloadCodeWindow);
      window.show();
    }catch (err) {
      console.log(err);
    }
    
  }
}

module.exports = DownloadCodeWindow;
