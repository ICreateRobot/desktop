const DAPjs = require('dapjs');
const { DAPLink } = DAPjs;
const usb = require('usb');
const { ReadlineParser } = require('@serialport/parser-readline');
const {MicropythonFsHex }  = require('@microbit/microbit-fs');
const { microbitBoardId } = require('@microbit/microbit-universal-hex');
const { ipcMain } = require('electron')
const {setPort,getPort,setDeviceState,getDeviceState} = require('../utils/port')
const path = require('path');
const fs = require('fs');
const { dialog,app } = require('electron');
let options_mode ='full';//烧录模式---full：完整模式；incremental：增量模式



// 状态管理
const deviceState = {
  usbDevice: null,
  daplink: null,
  serialPort: null,
  parser: null,
  replActive: false,
  serialBuffer: '',
  currentResolve: null
};

// ==================== 设备扫描 ====================
ipcMain.handle('usb-request-device', async () => {
  try {
    // 扫描USB设备
    const usbDevices = usb.getDeviceList().filter(d => 
      d.deviceDescriptor.idVendor === 0x0d28 && 
      [0x0204, 0x0205].includes(d.deviceDescriptor.idProduct)
    );

    // 扫描串口设备
    const ports = await SerialPort.list();
    const microbitPorts = ports.filter(p => 
      p.vendorId === '0D28' && 
      ['0204', '0205'].includes(p.productId)
    );

    // 匹配
    const devices = usbDevices.map(d => {
      // Windows特殊处理
      let port = null;
      if (process.platform === 'win32') {
        // 从locationId中提取设备号
        const deviceNumber = `${d.busNumber}-${d.deviceAddress}`;
        port = microbitPorts.find(p => 
          p.locationId && p.locationId.includes(deviceNumber)
        );
        
        //匹配设备路径中的数字
        if (!port) {
          const usbPathMatch = d.device?.deviceAddress?.toString() || '';
          port = microbitPorts.find(p => 
            p.path && p.path.includes(usbPathMatch)
          );
        }
      } else {
        // 非Windows系统使用常规匹配
        port = microbitPorts.find(p => 
          p.serialNumber && d.serialNumber &&
          p.serialNumber === d.serialNumber
        );
      }
      
      return {
        vendorId: d.deviceDescriptor.idVendor,
        productId: d.deviceDescriptor.idProduct,
        busNumber: d.busNumber,
        deviceAddress: d.deviceAddress,
        serialNumber: d.serialNumber || 'N/A',
        comPort: port?.path || null,
        manufacturer: 'Micro:bit'
      };
    });

    return { 
      success: true, 
      devices,
      selectedDevice: devices[0] || null
    };
  } catch (err) {
    return { 
      success: false, 
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
  }
});

// ==================== 设备连接 ====================
ipcMain.handle('usb-connect-device', async (_, deviceInfo) => {
  try {
    // 先清理可能存在的旧连接
    await disconnectDevice();

    // 验证端口是否存在
    if (deviceInfo.comPort) {
      const ports = await SerialPort.list();
      if (!ports.some(p => p.path === deviceInfo.comPort)) {
        throw new Error(`COM端口 ${deviceInfo.comPort} 不可用`);
      }
    }

    // 初始化USB设备
    deviceState.usbDevice = usb.findByIds(deviceInfo.vendorId, deviceInfo.productId);
    if (!deviceState.usbDevice) throw new Error('设备未找到');

    // 打开设备-烧录使用
    try {
      deviceState.usbDevice.open();
      if (deviceState.usbDevice.interfaces?.length > 0) {
        deviceState.usbDevice.interfaces[0].claim();
      }
    } catch (openErr) {
      console.warn('设备打开警告:', openErr.message);
    }

    // 初始化串口-repl使用
    if (deviceInfo.comPort) {
      deviceState.serialPort = new SerialPort({
        path: deviceInfo.comPort,
        baudRate: 115200,
        autoOpen: false
      });

      await new Promise((resolve, reject) => {
        deviceState.serialPort.open(err => err ? reject(err) : resolve());
      });

      deviceState.parser = deviceState.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      setupSerialListeners();// 监听断开或异常
    }

    notifyRenderer('usb-device-connected', { comPort: deviceInfo.comPort });
    return { success: true };
  } catch (err) {
    await disconnectDevice();
    return { success: false, error: err.message };
  }
});

// ==================== 断开功能 ====================
ipcMain.handle('usb-disconnect-device', async () => {
  try {
    // 检查是否有活动连接
    if (!deviceState.usbDevice && !deviceState.serialPort) {
      throw new Error('没有已连接的设备');
    }
    // 保存当前状态用于通知
    const wasReplActive = deviceState.replActive;
    // 执行断开操作
    await disconnectDevice();
    console.log(wasReplActive)
    notifyRenderer('usb-device-disconnected', { wasReplActive });
    return { 
      success: true, 
      message: '设备已断开连接',
      wasReplActive // 返回断开前的REPL状态
    };
  } catch (err) {
    return { 
      success: false, 
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
  }
});


// ==================== 固件烧录 ====================
ipcMain.handle('usb-flash-firmware', async () => {
  // try {
  //   if (!deviceState.usbDevice) {
  //     throw new Error('未找到连接的USB设备');
  //   }

  //   // 读取HEX文件
  //   const hexPath = path.join(__dirname, '../utils/microbit_firmware/MICROBIT.hex');
  //   const hexData = fs.readFileSync(hexPath);

  //  // await flashHexToDevice(hexData);
  //  try {
  //   // 创建DAPLink传输层
  //   const transport = new DAPjs.USB(deviceState.usbDevice);
  //   deviceState.daplink = new DAPLink(transport);

  //   // 连接设备
  //   await deviceState.daplink.connect();

  //   // 执行烧录
  //   await new Promise((resolve, reject) => {
  //     deviceState.daplink.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {
  //       const percent = Math.round(progress * 100);
  //       notifyRenderer('flash-progress', percent );
  //     });

  //     deviceState.daplink.flash(hexData)
  //       .then(resolve)
  //       .catch(reject);
  //   });
  // } catch (err) {
  //   // 确保发生错误时断开连接
  //   if (deviceState.daplink) {
  //     await deviceState.daplink.disconnect().catch(() => {});
  //     deviceState.daplink = null;
  //   }
  //   return { 
  //     success: false, 
  //     error: `烧录失败: ${err.message}`,
  //     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  //   };
  // }



  //   // 完成烧录
  //   //notifyRenderer('flash-status', { status: 'completed' });
  //   return { success: true, message: '固件烧录完成' };

  // } catch (err) {
  //   // 确保发生错误时断开连接
  //   if (deviceState.daplink) {
  //     await deviceState.daplink.disconnect().catch(() => {});
  //     deviceState.daplink = null;
  //   }
  //   return { 
  //     success: false, 
  //     error: `烧录失败: ${err.message}`,
  //     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  //   };
  // }



   try {
    // 读取HEX文件
    const hexPath = path.join(__dirname, '../utils/microbit_firmware/MICROBIT.hex');
    const hexData = fs.readFileSync(hexPath);

    // 弹出保存窗口，让用户选择 micro:bit U盘目录（或任意位置）
    const saveDialogResult = await dialog.showSaveDialog({
      title: '保存 HEX 文件到 micro:bit',
      defaultPath: 'MICROBIT.hex',
      filters: [
        { name: 'HEX 文件', extensions: ['hex'] }
      ]
    });

    if (saveDialogResult.canceled || !saveDialogResult.filePath) {
      return {
        success: false,
        error: '用户取消了保存 HEX 文件操作'
      };
    }

    //  return new Promise((resolve, reject) => {
    //   const child = fork(path.join(__dirname, '../utils/writeHexChild.js'));
    //   child.send({
    //     hexPath: path.join(__dirname, '../utils/microbit_firmware/MICROBIT.hex'),
    //     targetPath: saveDialogResult.filePath
    //   });

    //   child.on('message', (msg) => {
    //     resolve(msg);
    //   });

    //   child.on('error', (err) => {
    //     reject({ success: false, error: `子进程失败：${err.message}` });
    //   });
    // });

    // 将 HEX 数据写入用户指定的位置
    fs.writeFileSync(saveDialogResult.filePath, hexData);

    return {
      success: true,
      message: 'HEX 文件已保存，请手动复制或已直接保存至 micro:bit'
    };

  } catch (err) {
    return {
      success: false,
      error: `保存 HEX 文件失败: ${err.message}`,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
  }
});






//下载程序
ipcMain.handle('usb-download-flash', async (_, code) => {

    console.log(code)
    // code=`from microbit import *\ndisplay.show(Image.YES)\n`
    await generateV2Hex(code);

    const hexPath = path.join(__dirname, '../utils/microbit_firmware/MICROBIT.hex');
    const hexData = fs.readFileSync(hexPath);

    // try {
    //   // 创建DAPLink传输层
    //   const transport = new DAPjs.USB(getDeviceState().usbDevice);
    //   // deviceState.daplink = new DAPLink(transport);
    //   setDeviceState(['daplink',new DAPLink(transport)])

    //   // 连接设备
    //   await getDeviceState().daplink.connect();

    //   // 执行烧录
    //   await new Promise((resolve, reject) => {
    //     getDeviceState().daplink.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {
    //       const percent = Math.round(progress * 100);
    //       notifyRenderer('flash-progress', percent );
    //     });

    //     getDeviceState().daplink.flash(hexData)
    //       .then(async()=>{
    //         await getDeviceState().daplink.disconnect().catch(() => {});
    //         resolve()
    //       })
    //       .catch(reject);
    //   });
    // } catch (err) {
    //   // 确保发生错误时断开连接
    //   if (getDeviceState().daplink) {
    //     await getDeviceState().daplink.disconnect().catch(() => {});
    //     deviceState.daplink = null;
    //     setDeviceState(['daplink',null])
    //   }
    //   return { 
    //     success: false, 
    //     error: `烧录失败: ${err.message}`,
    //     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    //   };
    // }   


    // try {
    //   const oldDaplink = getDeviceState().daplink;
    //   if (oldDaplink) {
    //     await oldDaplink.disconnect().catch(() => {});
    //     setDeviceState(['daplink', null]);
    //   }

    //   const transport = new DAPjs.USB(getDeviceState().usbDevice);
    //   const daplink = new DAPjs.DAPLink(transport);
    //   setDeviceState(['daplink', daplink]);

      
    //   await daplink.connect();
    //   await new Promise(resolve => setTimeout(resolve, 500)); // 延迟确保设备准备好

    //   await new Promise((resolve, reject) => {
    //     daplink.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {
    //       const percent = Math.round(progress * 100);
    //       notifyRenderer('flash-progress', percent);
    //     });

    //     daplink.flash(hexData)
    //       .then(async () => {
    //         await daplink.disconnect().catch(() => {});
    //         resolve();
    //       })
    //       .catch(reject);
    //   });
    // } catch (err) {
    //   if (getDeviceState().daplink) {
    //     await getDeviceState().daplink.disconnect().catch(() => {});
    //     setDeviceState(['daplink', null]);
    //   }
    //   return {
    //     success: false,
    //     error: `烧录失败: ${err.message}`,
    //     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    //   };
    // }

      try {
        console.log(code)
        // 第一步：生成 HEX 文件（你已有这个函数）
        await generateV2Hex(code);

        // 第二步：读取生成的 HEX 文件
        // const hexPath = path.join(__dirname, '../utils/output_v2.hex');
        const hexPath = getResourcePath('/output_v2.hex')
        const hexData = fs.readFileSync(hexPath);

        console.log(hexData)
        // 第三步：弹出“保存文件”对话框，让用户选择保存路径（例如 micro:bit U盘）
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: '保存 HEX 文件到 micro:bit',
          defaultPath: 'microbit.hex',
          filters: [
            { name: 'HEX 文件', extensions: ['hex'] }
          ]
        });

        if (canceled || !filePath) {
          return {
            success: false,
            error: '用户取消了保存操作'
          };
        }

        // 第四步：保存 HEX 文件到用户指定的位置
        fs.writeFileSync(filePath, hexData);

        return {
          success: true,
          message: 'HEX 文件已保存，请在 micro:bit 中查看运行效果'
        };

      } catch (err) {
        return {
          success: false,
          error: `保存 HEX 文件失败: ${err.message}`,
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        };
    }
});


function getResourcePath(relativePath) {
    if (app.isPackaged) {
      // 打包后
      return path.join(process.resourcesPath, 'utils', relativePath);
    } else {
      // 开发环境
      return path.join(__dirname, '../utils', relativePath);
    }
  }
// ==================== HEX生成 ====================
async function generateV2Hex(code) {
  try{
    // 基础HEX
    // const baseHexPath = path.join(__dirname, '../utils/microbit_firmware/MICROBIT.hex');
    const baseHexPath = getResourcePath('/microbit_firmware/MICROBIT.hex')
    const hexContent = fs.readFileSync(baseHexPath, 'utf8');
    const fsHex = new MicropythonFsHex([{
      hex: hexContent,
      boardId: microbitBoardId.V2 
    }]);

    // 更新代码
    if (code && code.trim() !== '') {
        fsHex.write('main.py', code); 
    } else if (fsHex.exists('main.py')) {
        fsHex.remove('main.py');  
    }

    //板级HEX
    const boardHex = fsHex.getIntelHex(); 

    //生成文件
    // const outputPath = path.join(__dirname, '../utils/output_v2.hex');
    const outputPath = getResourcePath('/output_v2.hex')
    fs.writeFileSync(outputPath, boardHex);
  }catch(e){
    console.log(e)
  }
}



//进入烧录模式
ipcMain.handle('usb-exit-repl', async () => {
  try {
    if (!getDeviceState().replActive) {
      return { success: false, error: "未处于REPL模式" };
    }

    await sendSerialCommand('\x03'); 
    await sendSerialCommand('\x04'); 
    
    // deviceState.replActive = false;
    setDeviceState(['replActive',false])
    notifyRenderer('usb-flash-activated');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ==================== REPL功能 ====================
//进入repl模式
ipcMain.handle('usb-enter-repl', async () => {
  try {
    // if (!getDeviceState().serialPort || getDeviceState().replActive) {
    //   return { success: false, error: "串口未连接或已处于REPL模式"};
    // }

    // 中断当前程序
    await sendSerialCommand('\x03'); 
    await sendSerialCommand('from microbit import *\r',200);
    await sendSerialCommand('from ICreate import *\r',200);
    await sendSerialCommand('display.show(Image.HEART)\n\r', 200);
    
    // deviceState.replActive = true;
    setDeviceState(['replActive',true])
    notifyRenderer('usb-repl-activated');
    return { success: true , message: 'REPL模式已激活'};
  } catch (err) {
    return { success: false, error: err.message };
  }
});

//发送数据
ipcMain.handle('usb-send-command', async (_, command) => {
  try {
    if (!getDeviceState().serialPort) {
      return { success: false, error: "未连接设备" };
    }
    // deviceState.serialBuffer = '';// 清空上次结果

    setDeviceState(['serialBuffer',''])
    getDeviceState().serialPort.write(command + '\r\n');//发送
    
    // 等待响应
    const response = await new Promise((resolve) => {
      // deviceState.currentResolve = (data) => {
      //   deviceState.currentResolve = null;
      //   resolve(data);
      // };

      setDeviceState(['currentResolve', (data) => {
        setDeviceState(['currentResolve', null]);
        resolve(data);
      }]);
      
      // 超时
      // setTimeout(() => {
      //   if (deviceState.currentResolve) {
      //     deviceState.currentResolve = null;
      //     resolve(' 未收到响应');
      //   }
      // }, 2000);
    });

    // 控制发送速率
    await new Promise(resolve => setTimeout(resolve, 50));

    return { success: true, response: response.trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});



// ==================== 相关函数 ====================
//断开初始化
async function disconnectDevice() {
  // 1. 先重置状态避免后续操作
  const stateCopy = { ...deviceState };
  deviceState.serialPort = null;
  deviceState.usbDevice = null;
  deviceState.daplink = null;
  deviceState.replActive = false;
  deviceState.serialBuffer = '';
  deviceState.currentResolve = null;
  // 2. 异步执行资源清理（避免阻塞主线程）
  return new Promise(resolve => {
    setImmediate(async () => {
      try {
        // 3. 关闭串口
        if (stateCopy.serialPort) {
          await closeSerialPort(stateCopy.serialPort);
        }

        // 4. 关闭USB设备
        // if (stateCopy.usbDevice) {
        //   await closeUsbDevice(stateCopy.usbDevice);
        // }
        // 5. 关闭DAPLink
        if (stateCopy.daplink) {
          await closeDapLink(stateCopy.daplink);
        }
      } catch (err) {
        console.error('资源清理错误:', err);
      } finally {
        resolve();
      }
    });
  });
}
async function closeSerialPort(port) {
  return new Promise(resolve => {
    try {
      // 移除所有监听器
      port.removeAllListeners();
      
      if (port.isOpen) {
        port.close(err => {
          if (err) console.error('串口关闭错误:', err);
          resolve();
        });
      } else {
        resolve();
      }
    } catch (err) {
      console.error('串口清理异常:', err);
      resolve();
    }
  });
}

async function closeUsbDevice(device) {
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        // 检查设备是否仍然连接
        const stillConnected = usb.getDeviceList().some(d => 
          d.busNumber === device.busNumber &&
          d.deviceAddress === device.deviceAddress
        );

        if (!stillConnected) {
          console.warn('USB设备已物理断开');
          return resolve();
        }

        // 使用setTimeout避免NAPI冲突
        setTimeout(() => {
          try {
            device.close(() => {
              // 额外延迟确保资源释放
              setTimeout(resolve, 50);
            });
          } catch (err) {
            console.error('USB关闭异常:', err);
            resolve();
          }
        }, 0);
      } catch (err) {
        console.error('USB设备检查错误:', err);
        resolve();
      }
    }, 100); // 增加延迟
  });
}

async function closeDapLink(daplink) {
  return new Promise(resolve => {
    try {
      daplink.disconnect().then(resolve).catch(err => {
        console.error('DAPLink断开错误:', err);
        resolve();
      });
    } catch (err) {
      console.error('DAPLink断开异常:', err);
      resolve();
    }
  });
}

// 监听断开或异常
function setupSerialListeners() {
  // 先移除旧监听器
  if (getDeviceState().parser) {
    getDeviceState().parser.removeAllListeners();
  }

  getDeviceState().parser.on('data', data => {
    // deviceState.serialBuffer += data;
    setDeviceState(['serialBuffer',getDeviceState().serialBuffer+data])
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
    disconnectDevice().catch(console.error);
    notifyRenderer('usb-device-disconnected');
  });

  getDeviceState().serialPort.once('error', err => {
    disconnectDevice().catch(console.error);
    notifyRenderer('usb-device-error', { error: err.message });
  });
}

async function sendSerialCommand(command, delay = 50) {
  return new Promise((resolve, reject) => {
    getDeviceState().serialPort.write(command, err => {
      if (err) return reject(err);
      setTimeout(resolve, delay);
    });
  });
}

function notifyRenderer(channel, payload = {}) {
  const win = BrowserWindow.getAllWindows()[0];
  win?.webContents?.send(channel, payload);
}