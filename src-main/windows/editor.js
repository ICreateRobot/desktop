const fsPromises = require('fs/promises');
const path = require('path');
const nodeURL = require('url');
const zlib = require('zlib');
const nodeCrypto = require('crypto');
const {app, dialog} = require('electron');
const ProjectRunningWindow = require('./project-running-window');
const AddonsWindow = require('./addons');
const DesktopSettingsWindow = require('./desktop-settings');
const PrivacyWindow = require('./privacy');
const AboutWindow = require('./about');
const PackagerWindow = require('./packager');
const {createAtomicWriteStream} = require('../atomic-write-stream');
const {translate, updateLocale, getStrings} = require('../l10n');
const {APP_NAME} = require('../brand');
const prompts = require('../prompts');
const settings = require('../settings');
const privilegedFetch = require('../fetch');
const RichPresence = require('../rich-presence.js');
const FileAccessWindow = require('./file-access-window.js');
const ExtensionDocumentationWindow = require('./extension-documentation.js');
const MasterWindow = require('./master.js')
const ConnectWindow=require('./connect-device.js')
const DownloadCodeWindow = require('./download-code');
const BleConnectWindow = require('./ble-connect')
const {getWin,setWin} = require('../../utils/win.js')
const {getCode,setCode,getDown,setDown,setPlace,getPlace} = require('../../utils/tempCode.js')
const {getPort,getUsingPort} =require('../../utils/port')
const extensions = require('../../utils/extensionWho.js')
const socket =require('../../utils/socket')
const {setVersion,getVersion} = require('../../utils/currentVersion')
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

const TYPE_FILE = 'file';
const TYPE_URL = 'url';
const TYPE_SCRATCH = 'scratch';
const TYPE_SAMPLE = 'sample';

class OpenedFile {
  constructor (type, path) {
    /** @type {TYPE_FILE|TYPE_URL|TYPE_SCRATCH|TYPE_SAMPLE} */
    this.type = type;

    /**
     * Absolute file path or URL
     * @type {string}
     */
    this.path = path;
  }

  async read () {
    if (this.type === TYPE_FILE) {
      return {
        name: path.basename(this.path),
        data: await fsPromises.readFile(this.path)
      };
    }

    if (this.type === TYPE_URL) {
      const buffer = await privilegedFetch(this.path);
      return {
        name: decodeURIComponent(path.basename(this.path)),
        data: buffer
      };
    }

    if (this.type === TYPE_SCRATCH) {
      const metadata = await privilegedFetch.json(`https://api.scratch.mit.edu/projects/${this.path}`);
      const token = metadata.project_token;
      const title = metadata.title;

      const projectBuffer = await privilegedFetch(`https://projects.scratch.mit.edu/${this.path}?token=${token}`);
      return {
        name: title,
        data: projectBuffer
      };
    }

    if (this.type === TYPE_SAMPLE) {
      const sampleRoot = path.resolve(__dirname, '../../dist-extensions/samples/');
      const resolvedPath = path.join(sampleRoot, this.path);
      if (resolvedPath.startsWith(sampleRoot)) {
        const compressedPath = `${resolvedPath}.br`;
        const compressedData = await fsPromises.readFile(compressedPath);

        // dist-extensions is all brotli'd; must decompress
        const decompressedData = await new Promise((resolve, reject) => {
          zlib.brotliDecompress(compressedData, (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        });

        return {
          name: this.path,
          data: decompressedData
        };
      }
      throw new Error('Unsafe join');
    }

    throw new Error(`Unknown type: ${this.type}`);
  }
}

/**
 * @param {string} file
 * @param {string|null} workingDirectory
 * @returns {OpenedFile}
 */
const parseOpenedFile = (file, workingDirectory) => {
  let url;
  try {
    url = new URL(file);
  } catch (e) {
    // Error means it was not a valid full URL
  }

  if (url) {
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      // Scratch URLs require special treatment as they are not direct downloads.
      const scratchMatch = file.match(/^https?:\/\/scratch\.mit\.edu\/projects\/(\d+)\/?/);
      if (scratchMatch) {
        return new OpenedFile(TYPE_SCRATCH, scratchMatch[1]);
      }

      // Need to manually redirect extension samples to the copies we already have offline as the
      // fetching code will not go through web request handlers or custom protocols.
      const sampleMatch = file.match(/^https?:\/\/extensions\.turbowarp\.org\/samples\/(.+\.sb3)$/);
      if (sampleMatch) {
        return new OpenedFile(TYPE_SAMPLE, decodeURIComponent(sampleMatch[1]));
      }

      return new OpenedFile(TYPE_URL, file);
    }

    // Parse file:// URLs.
    // Notably we receive these in the flatpak version of the app when we can only access a file through
    // the XDG document portal instead of having direct access with eg. --filesystem=home
    if (url.protocol === 'file:') {
      let filePath;
      try {
        filePath = nodeURL.fileURLToPath(file);
      } catch (e) {
        // Very unlikely but possible
      }

      if (filePath) {
        return new OpenedFile(TYPE_FILE, path.resolve(workingDirectory, filePath));
      }
    }

    // Don't throw an error just because we don't recognize the URL protocol as
    // Windows paths look close enough to real URLs to be parsed successfully.
  }

  return new OpenedFile(TYPE_FILE, path.resolve(workingDirectory, file));
};

/**
 * @returns {Array<{path: string; app: string;}>}
 */
const getUnsafePaths = () => {
  if (process.platform !== 'win32') {
    // This problem doesn't really exist on other platforms
    return [];
  }

  const localPrograms = path.join(app.getPath('home'), 'AppData', 'Local', 'Programs');
  const appData = app.getPath('appData');
  return [
    // Current app, regardless of where it is installed or how modded it is
    {
      path: path.dirname(app.getPath('exe')),
      app: APP_NAME,
    },
    {
      path: app.getPath('userData'),
      app: APP_NAME,
    },

    // TurboWarp Desktop defaults
    {
      path: path.join(appData, 'turbowarp-desktop'),
      app: 'TurboWarp Desktop'
    },
    {
      path: path.join(localPrograms, 'TurboWarp'),
      app: 'TurboWarp Desktop'
    },

    // Scratch Desktop defaults
    {
      path: path.join(appData, 'Scratch'),
      app: 'Scratch Desktop'
    },
    {
      path: path.join(localPrograms, 'Scratch 3'),
      app: 'Scratch Desktop'
    }
  ];
};

/**
 * @param {string} parent
 * @param {string} child
 * @returns {boolean}
 */
const isChildPath = (parent, child) => {
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

/**
 * @returns {string} A unique string.
 */
const generateFileId = () => {
  // Note that we can't use the randomUUID from web crypto as we need to support Electron 22.
  return `desktop_file_id{${nodeCrypto.randomUUID()}}`;
};

class EditorWindow extends ProjectRunningWindow {
  /**
   * @param {OpenedFile|null} initialFile
   * @param {boolean} isInitiallyFullscreen
   */
  constructor (initialFile, isInitiallyFullscreen) {
    super();

    /**
     * Ideally we would revoke access after loading a new project, but our file handle handling in
     * the GUI isn't robust enough for that yet. We do at least use random file handle IDs which
     * makes it much harder for malicious code in the renderer process to enumerate all previously
     * opened IDs and overwrite them.
     * @type {Map<string, OpenedFile>}
     */
    EditorWindow.instance = this; // 保存最新的实例
    this.robotData=[
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
      [1],
    ]
     //禁止节流
    this.window.webContents.setBackgroundThrottling(false);
    this.openedFiles = new Map();
    this.activeFileId = null;

    if (initialFile !== null) {
      this.activeFileId = generateFileId();
      this.openedFiles.set(this.activeFileId, initialFile);
    }

    this.openedProjectAt = Date.now();

    /**
     * @param {string} id
     * @returns {OpenedFile}
     * @throws if invalid ID
     */
    const getFileById = (id) => {
      if (!this.openedFiles.has(id)) {
        throw new Error('Invalid file ID');
      }
      return this.openedFiles.get(id);
    };

    this.window.webContents.on('will-prevent-unload', (event) => {
      const choice = dialog.showMessageBoxSync(this.window, {
        title: APP_NAME,
        type: 'info',
        buttons: [
          translate('unload.stay'),
          translate('unload.leave')
        ],
        cancelId: 0,
        defaultId: 0,
        message: translate('unload.message'),
        detail: translate('unload.detail'),
        noLink: true
      });
      if (choice === 1) {
        event.preventDefault();
      }
    });

    this.window.on('page-title-updated', (event, title, explicitSet) => {
      event.preventDefault();
      if (explicitSet && title) {
        this.window.setTitle(`${title} - ${APP_NAME}`);
        this.projectTitle = title;
      } else {
        this.window.setTitle(APP_NAME);
        this.projectTitle = '';
      }

      this.updateRichPresence();
    });
    this.window.setTitle(APP_NAME);

    this.window.on('focus', () => {
      this.updateRichPresence();
    });

    this.ipc.on('is-initially-fullscreen', (e) => {
      e.returnValue = isInitiallyFullscreen;
    });

    this.ipc.handle('get-initial-file', () => {
      return this.activeFileId;
    });

    this.ipc.handle('get-file', async (event, id) => {
      const file = getFileById(id);
      const {name, data} = await file.read();
      return {
        name,
        type: file.type,
        data
      };
    });

    this.ipc.on('set-locale', async (event, locale) => {
      if (settings.locale !== locale) {
        settings.locale = locale;
        updateLocale(locale);

        // Imported late due to circular dependency
        const rebuildMenuBar = require('../menu-bar');
        rebuildMenuBar();

        // Let the save happen in the background, not important
        Promise.resolve().then(() => settings.save());
      }
      event.returnValue = {
        strings: getStrings(),
        mas: !!process.mas
      };
    });

    this.ipc.handle('set-changed', (event, changed) => {
      this.window.setDocumentEdited(changed);
    });

    this.ipc.handle('opened-file', (event, id) => {
      const file = getFileById(id);
      if (file.type !== TYPE_FILE) {
        throw new Error('Not a file');
      }
      this.activeFileId = id;
      this.openedProjectAt = Date.now();
      this.window.setRepresentedFilename(file.path);
    });

    this.ipc.handle('closed-file', () => {
      this.activeFileId = null;
      this.window.setRepresentedFilename('');
    });

    this.ipc.handle('show-open-file-picker', async () => {
      const result = await dialog.showOpenDialog(this.window, {
        properties: ['openFile'],
        defaultPath: settings.lastDirectory,
        filters: [
          {
            name: 'Scratch Project',
            extensions: ['sb3', 'sb2', 'sb'],
          }
        ]
      });
      if (result.canceled) {
        return null;
      }

      const filePath = result.filePaths[0];
      settings.lastDirectory = path.dirname(filePath);
      await settings.save();

      const id = generateFileId();
      this.openedFiles.set(id, new OpenedFile(TYPE_FILE, filePath));

      return {
        id,
        name: path.basename(filePath)
      };
    });

    this.ipc.handle('show-save-file-picker', async (event, suggestedName) => {
      const result = await dialog.showSaveDialog(this.window, {
        defaultPath: path.join(settings.lastDirectory, suggestedName),
        filters: [
          {
            name: 'Scratch 3 Project',
            extensions: ['sb3'],
          }
        ]
      });
      if (result.canceled) {
        return null;
      }

      const filePath = result.filePath;

      const unsafePath = getUnsafePaths().find(i => isChildPath(i.path, filePath));
      if (unsafePath) {
        // No need to block until the message box is closed
        dialog.showMessageBox(this.window, {
          type: 'error',
          title: APP_NAME,
          message: translate('unsafe-path.title'),
          detail: translate(`unsafe-path.details`)
            .replace('{APP_NAME}', unsafePath.app)
            .replace('{file}', filePath),
          noLink: true
        });  
        return null;
      }

      settings.lastDirectory = path.dirname(filePath);
      await settings.save();

      const id = generateFileId();
      this.openedFiles.set(id, new OpenedFile(TYPE_FILE, filePath));

      return {
        id,
        name: path.basename(filePath)
      };
    });

    this.ipc.handle('get-preferred-media-devices', () => {
      return {
        microphone: settings.microphone,
        camera: settings.camera
      };
    });

    this.ipc.on('start-write-stream', async (startEvent, id) => {
      const file = getFileById(id);
      if (file.type !== TYPE_FILE) {
        throw new Error('Not a file');
      }

      const port = startEvent.ports[0];

      /** @type {NodeJS.WritableStream|null} */
      let writeStream = null;

      const handleError = (error) => {
        console.error('Write stream error', error);
        port.postMessage({
          error
        });

        // Make sure the port is started in case we encounter an error before we normally
        // begin to accept messages.
        port.start();
      };

      try {
        writeStream = await createAtomicWriteStream(file.path);
      } catch (error) {
        handleError(error);
        return;
      }

      writeStream.on('atomic-error', handleError);

      const handleMessage = (data) => {
        if (data.write) {
          if (writeStream.write(data.write)) {
            // Still more space in the buffer. Ask for more immediately.
            return;
          }
          // Wait for the buffer to become empty before asking for more.
          return new Promise(resolve => {
            writeStream.once('drain', resolve);
          });
        } else if (data.finish) {
          // Wait for the atomic file write to complete.
          return new Promise(resolve => {
            writeStream.once('atomic-finish', resolve);
            writeStream.end();
          });
        } else if (data.abort) {
          writeStream.emit('error', new Error('Aborted by renderer process'));
          return;
        }
        throw new Error('Unknown message from renderer');
      };

      port.on('message', async (messageEvent) => {
        try {
          const data = messageEvent.data;
          const id = data.id;
          const result = await handleMessage(data);
          port.postMessage({
            response: {
              id,
              result
            }
          });
        } catch (error) {
          handleError(error);
        }
      });

      port.start();
    });

    this.ipc.on('alert', (event, message) => {
      event.returnValue = prompts.alert(this.window, message);
    });

    this.ipc.on('confirm', (event, message) => {
      event.returnValue = prompts.confirm(this.window, message);
    });

    this.ipc.handle('open-packager', () => {
      PackagerWindow.forEditor(this);
    });

    this.ipc.handle('open-new-window', () => {
      EditorWindow.newWindow();
    });

    this.ipc.handle('open-addon-settings', (event, search) => {
      AddonsWindow.show(search);
    });

    this.ipc.handle('open-desktop-settings', () => {
      DesktopSettingsWindow.show();
    });

    this.ipc.handle('open-privacy', () => {
      PrivacyWindow.show();
    });

    this.ipc.handle('open-about', () => {
      AboutWindow.show();
    });

    this.ipc.handle('open-master-window', () => {
      MasterWindow.show();
      
    });
    this.ipc.handle('open-connect-window', () => {
      // console.log('#######################')
      ConnectWindow.show();
      
    });
    this.ipc.handle('open-download-settings', (event,code) => {
      DownloadCodeWindow.show(code);
    });
    this.ipc.handle('open-ble-settings', () => {
      if(getWin()){
        getWin().show()
      }else{
        BleConnectWindow.show();
      }
      
      
    });

    this.ipc.handle('disconnect-wifi', (event,isDis) => {
      if(isDis){
        ConnectWindow.disconnectWifi()
      }
    });
    this.ipc.on('get-robot-data', (event) => {
      // console.log(this.robotData)
      event.returnValue = this.robotData
    });
    this.ipc.handle('download', (event,code,args) => {
      console.log('--------------')
      console.log(code)
      setCode(code)
      setDown(1)
      setPlace(args)
    });
    let PORT=getPort()
     // 发送数据并等待接收特定数据后再继续
     async function sendDataAndWait(dataToSend) {
      return new Promise(async (resolve, reject) => {
        // 发送数据
        await PORT.write(dataToSend, (err) => {
          if (err) {
            return reject('Error on write: ' + err.message);
          }

          console.log(`Data sent: ${dataToSend}`);
        });

        // 等待接收到的数据
        // await PORT.on('data', (data) => {
        //   console.log('Data received:', data.toString());
        //   console.log(typeof(data.toString()))

        //   // 检查是否是我们想要的响应（例如，'0'）
        //   if (data.toString().includes('71')) {
        //     console.log('Received 71, continuing...');
        //     PORT.removeListener('data');
        //     resolve(); // 继续执行
        //   }
        // });
        const onDataReceived = (data) => {
          console.log('Data received:', data.toString());
          console.log(typeof (data.toString()));
        
          // 检查是否是我们想要的响应（例如，'0'）
          if(data.toString().includes('74')){
            console.log('Received 74, completed');
            PORT.removeListener('data', onDataReceived); // 使用 removeListener 停止监听
            resolve(); // 继续执行
          }else if (data.toString().includes('71')) {
            console.log('Received 71, continuing...');
            PORT.removeListener('data', onDataReceived); // 使用 removeListener 停止监听
            resolve(); // 继续执行
          }
        };
        
        PORT.on('data', onDataReceived); // 添加 data 事件的监听器

        // 可选：添加一个超时机制，防止长时间等待
        setTimeout(() => {
          reject('Timeout: No response received in time.');
        }, 5000); // 5秒超时
      });
    }
    function toTwoDigitHexadecimalPair(decimal) {
          if (decimal < 0) {
              throw new Error("Input must be a non-negative integer");
          }

          const rightHex = decimal % 256; // 右边的两位十六进制数表示255以内的数
          const leftHex = Math.floor(decimal / 256); // 左边的两位十六进制数表示右边数满255时往左边进位的次数

          return [
              // leftHex.toString(16).padStart(2, '0'), // 转换为两位十六进制字符串
              // rightHex.toString(16).padStart(2, '0'), // 转换为两位十六进制字符串
              leftHex,
              rightHex
          ];
    }

    function crc16(arr) {
        // let crc = 0xFFFF; // 初始值
        // for (let i = 0; i < arr.length; i++) {
        //   crc ^= (arr[i] << 8);
        //   for (let j = 0; j < 8; j++) {
        //     if (crc & 0x8000) {
        //       crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        //     } else {
        //       crc = (crc << 1) & 0xFFFF;
        //     }
        //   }
        // }
        // return crc;
        let crc = 0xFFFF;
        for (let i = 0; i < arr.length; i++) {
          crc ^= arr[i];
          for (let j = 0; j < 8; j++) {
            if (crc & 0x0001) {
              crc = (crc >> 1) ^ 0xA001;
            } else {
              crc >>= 1;
            }
            crc &= 0xFFFF; // 保持 16 位
          }
        }
        return crc;
      }
      function splitUint8Array(uint8Array, chunkSize = 500) {
        const chunks = [];
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          let slice = uint8Array.slice(i, i + chunkSize);

          // 新包长度 = 头(2) + 数据(N) + CRC16(2)
          let packet = new Uint8Array(slice.length + 4);

          // 设置包头
          packet[0] = 0xaa;
          packet[1] = 0x02;

          // 复制数据
          packet.set(slice, 2);

          // 计算 CRC16（头 + 数据）
          let crc = crc16(packet.slice(0, packet.length - 2));

          // 填充 CRC16 高低字节
          packet[packet.length - 2] = (crc >> 8) & 0xFF;
          packet[packet.length - 1] = crc & 0xFF;

          chunks.push(packet);
        }
        return chunks;
      }

      function stringToBinary(str) {
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(str);
        return uint8Array;
      }
      let bufferData = '';
      function createPromiseForSerial(port) {
        return new Promise((resolve, reject) => {
          const onData = (data) => {
            // const value = data[0]; // 假设返回单字节
            // console.log("收到串口数据:", value);

            let value
            bufferData += data.toString();
            if (bufferData.endsWith('\r\n')) {
              const message = bufferData.trim();
              bufferData = '';

              try {
                // const parsed = JSON.parse(message);
                // console.log(parsed)

                  let parsed;

                // 判断是否是 ESP32 特殊格式 {[…]}
                if (/^\{\[.*\]\}$/.test(message)) {
                  const match = message.match(/\[(.*?)\]/);
                  if (match) {
                    parsed = match[1].split(',').map(n => Number(n.trim()));
                  }
                } else {
                  // 如果是 JSON 就解析，否则丢异常走 catch
                  parsed = JSON.parse(message);
                }
                value=parsed
              } catch {
                value=message
              }
            }

            if ((Array.isArray(value) && value.length==1 && value[0] === 0) || (typeof value === "string" && value.includes("[0]"))) {
              port.off('data', onData); // 收到 0 就解绑
              resolve(0);
            }
            // 如果不是 0，继续等，不 resolve
          };

          port.on('data', onData);
        });
      }


      
      function appendCrcAndNewline(raw) {
        let crc = crc16(raw);
        let msg = new Uint8Array(raw.length + 3); // 原始长度 + CRC2字节 + 1个\n
        msg.set(raw, 0);
        msg[raw.length] = (crc >> 8) & 0xFF;
        msg[raw.length + 1] = crc & 0xFF;
        msg[raw.length + 2] = 0x0A; // '\n'
        return msg;
      }
    this.ipc.handle('serial-download', async(event,code) => {
      console.log(extensions.getExtension())
      PORT=getPort()
      console.log(PORT)
      if(extensions.getExtension()==1){
        console.log('#########################################')
        sendDataAndWait('Lua:').then(() => {
          sendDataAndWait(code.code).then(() => {
            sendDataAndWait('endLua')
          })
        })

      }else if(extensions.getExtension()==2){
        let p1 = createPromiseForSerial(PORT);
        let downloadCode=code.code
        // if (!downloadCode.includes('while')) {
        //     // 2. 如果没有 'while' 循环，拼接一个
        //     downloadCode += '\nwhile True:\n    pass';
        // }
        downloadCode+='\n'

        let jsonData={
          "command": "upload_script",
          "params": 
              {
                  "name": `${code.place}.py`,            // 字符串：1-5.py
                  "script":downloadCode,            //字符串：程序内容 
              }
        }
        let str=JSON.stringify(jsonData)
        str+='\n'
        console.log(str)

        await PORT.write(str, async(err) => {
          if (err) {
            return reject('Error on write: ' + err.message);
          }

          await p1;
          console.log(`Data sent: ${str}`);
          console.log("所有数据包发送完毕 ✅");
          if (socket.getSocket()) {
            socket.getSocket().send(JSON.stringify({
              type: 'serialSuccess',
              data: { message: true }
            }));
          }
        });

        // let startRaw = new Uint8Array([
        //   0xbb, 
        //   0x01, 
        //   code.place, 
        //   toTwoDigitHexadecimalPair(downloadCode.length)[0],
        //   toTwoDigitHexadecimalPair(downloadCode.length)[1]
        // ]);
        // let startMsg = appendCrcAndNewline(startRaw);

        // // endMsg
        // let endRaw = new Uint8Array([0xbb, 0x02]);
        // let endMsg = appendCrcAndNewline(endRaw);

        // // codeMsg (每个分包都要加 CRC + \n)
        // let codeBin = stringToBinary(downloadCode);
        // let codeChunks = splitUint8Array(codeBin);
        // let codeMsg = codeChunks.map(chunk => appendCrcAndNewline(chunk));

        // console.log("startMsg:", startMsg);
        // console.log("endMsg:", endMsg);
        // console.log("codeMsg:", codeMsg);

        // // === 发送逻辑 ===

        // // 发 start
        // let p1 = createPromiseForSerial(PORT);
        // await PORT.write(startMsg);
        // await p1;

        // // 发 code 数据包
        // for (let i = 0; i < codeMsg.length; i++) {
        //   let p2 = createPromiseForSerial(PORT);
        //   await PORT.write(codeMsg[i]);
        //   await p2;
        // }

        // // 发 end
        // let p3 = createPromiseForSerial(PORT);
        // await PORT.write(endMsg);
        // await p3;

        // console.log("所有数据包发送完毕 ✅");
        // if (socket.getSocket()) {
        //   socket.getSocket().send(JSON.stringify({
        //     type: 'serialSuccess',
        //     data: { message: true }
        //   }));
        // }

      }
      
      
    });

    function parseVersion(num) {
      const str = String(num).padStart(3, '0'); // 防止出现 12 这种情况
      return `${str[0]}.${str[1]}.${str[2]}`;
    }
    this.ipc.handle('robot-version', async(event,version) => {
      console.log(version)
      if(!getVersion.icrobot){
        setVersion(['icrobot',parseVersion(version[0])])
        setVersion(['icrobotHard',parseVersion(version[1])])
      }
      
    })
    
    this.ipc.handle('cancelload', () => {
      setDown(2)

    });

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

    // ============================================================
    // Arduino CLI
    // ============================================================

    const cliPath = getResourcePath(
      "resources/arduino-cli.exe"
  );


  // ============================================================
  // PY32 ISP 烧录程序
  // ============================================================

  const puyaispPath = getResourcePath(
      "resources/puyaispcom.exe"
  );


  // ============================================================
  // Arduino / PY32 编译烧录
  // ============================================================

  this.ipc.handle(
      "flash-arduino",
      async (event, {code, boardType }) => {

        let port =getUsingPort()

          console.log("==========================================");
          console.log("开始编译 / 烧录");
          console.log("设备类型:", boardType);
          console.log("串口:", port);
          console.log("==========================================");


          try {

              // ====================================================
              // 1. 检查参数
              // ====================================================

              if (!port) {
                  prompts.alert(this.window,translate('flash-alert-noselectPort'))
                  throw new Error("没有提供串口号");
                  
              }

              if (!code) {
                  throw new Error("没有提供 Arduino 代码");
              }


              // 如果没有传 boardType
              // 默认按照 UNO 处理
              if (!boardType) {
                  boardType = "uno";
              }


              // ====================================================
              // 2. 创建 Sketch
              // ====================================================

              // Sketch 名称
              const sketchName = "mysketch";


              // 临时 Sketch 目录
              const sketchDir = path.join(
                  os.tmpdir(),
                  sketchName
              );


              // 如果不存在则创建
              if (!fs.existsSync(sketchDir)) {

                  fs.mkdirSync(
                      sketchDir,
                      {
                          recursive: true
                      }
                  );

              }


              // Sketch 文件
              const sketchFile = path.join(
                  sketchDir,
                  sketchName + ".ino"
              );


              // 写入 Arduino 代码
              fs.writeFileSync(
                  sketchFile,
                  code,
                  "utf8"
              );


              console.log(
                  "Sketch 文件:",
                  sketchFile
              );


              EditorWindow.instance.window.webContents.send(
                  'send-arduino-flash',
                  'start compile'
              );
              // ====================================================
              // 3. Arduino UNO
              // ====================================================

              if (boardType === "uno") {

                  console.log("------------------------------------------");
                  console.log("目标设备: Arduino UNO");
                  console.log("------------------------------------------");


                  // =================================================
                  // 检查 Arduino AVR Core
                  // =================================================

                  console.log(
                      "检查 Arduino AVR Core..."
                  );


                  // 如果你的 Arduino Core 已经放在 package 中，
                  // 这里不需要每次安装。
                  //
                  // 如果以后需要自动安装，可以打开：
                  //
                  // await runCli([
                  //     "core",
                  //     "install",
                  //     "arduino:avr"
                  // ]);


                  console.log(
                      "Arduino AVR Core 已准备完成"
                  );


                  // =================================================
                  // 编译 UNO
                  // =================================================

                  console.log(
                      "开始编译 Arduino UNO..."
                  );


                  await runCli([
                      "compile",

                      "--fqbn",
                      "arduino:avr:uno",

                      sketchDir
                  ]);


                  console.log(
                      "Arduino UNO 编译成功"
                  );


                  // =================================================
                  // 上传 UNO
                  // =================================================

                  EditorWindow.instance.window.webContents.send(
                      'send-arduino-flash',
                      'start flash'
                  );
                  console.log(
                      "开始上传 Arduino UNO..."
                  );

                  console.log(
                      "串口:",
                      port
                  );


                  await runCli([
                      "upload",

                      "--fqbn",
                      "arduino:avr:uno",

                      "-p",
                      port,

                      sketchDir
                  ]);


                  console.log(
                      "Arduino UNO 烧录成功"
                  );


                  return {

                      success: true,

                      type: "uno"

                  };

              }


              // ====================================================
              // 4. PY32
              // ====================================================

              if (boardType === "py32") {

                  console.log("------------------------------------------");
                  console.log("目标设备: PY32");
                  console.log("------------------------------------------");


                  // =================================================
                  // PY32 编译输出目录
                  // =================================================

                  const py32BuildDir = path.join(
                      os.tmpdir(),
                      "py32_build"
                  );


                  // =================================================
                  // 清理旧编译结果
                  // =================================================

                  if (fs.existsSync(py32BuildDir)) {

                      console.log(
                          "清理旧的 PY32 编译目录..."
                      );


                      fs.rmSync(
                          py32BuildDir,
                          {
                              recursive: true,
                              force: true
                          }
                      );

                  }


                  // 创建新的编译目录
                  fs.mkdirSync(
                      py32BuildDir,
                      {
                          recursive: true
                      }
                  );


                  console.log(
                      "PY32 编译输出目录:",
                      py32BuildDir
                  );


                  // =================================================
                  // PY32 FQBN
                  // =================================================

                  const py32Fqbn =
                      "PY32Duino:PY32:GenF030:pnum=PY32F030x8";


                  console.log(
                      "PY32 FQBN:",
                      py32Fqbn
                  );


                  // =================================================
                  // 编译 PY32
                  // =================================================

                  console.log(
                      "开始编译 PY32..."
                  );


                  await runCli([
                      "compile",

                      "--fqbn",
                      py32Fqbn,

                      "--output-dir",
                      py32BuildDir,

                      sketchDir
                  ]);


                  console.log(
                      "PY32 编译成功"
                  );


                  // =================================================
                  // 获取 BIN 文件
                  // =================================================
                  //
                  // Arduino CLI 的输出文件按照 Sketch 名称生成。
                  //
                  // 当前：
                  //
                  // sketchName = mysketch
                  //
                  // 所以：
                  //
                  // mysketch.ino
                  //
                  // 对应：
                  //
                  // mysketch.ino.bin
                  //
                  // =================================================

                  const binFile = path.join(
                      py32BuildDir,
                      sketchName + ".ino.bin"
                  );


                  console.log(
                      "PY32 BIN 文件:",
                      binFile
                  );


                  // =================================================
                  // 检查 BIN 文件
                  // =================================================

                  if (!fs.existsSync(binFile)) {

                      throw new Error(
                          "PY32 编译成功，但是没有找到 BIN 文件:\n" +
                          binFile
                      );

                  }


                  // 获取 BIN 文件大小
                  const binStat =
                      fs.statSync(binFile);


                  console.log(
                      "BIN 文件大小:",
                      binStat.size,
                      "bytes"
                  );


                  // =================================================
                  // PY32 烧录
                  // =================================================

                  EditorWindow.instance.window.webContents.send(
                      'send-arduino-flash',
                      'start flash'
                  );
                  console.log(
                      "开始烧录 PY32..."
                  );


                  console.log(
                      "烧录程序:",
                      puyaispPath
                  );


                  console.log(
                      "烧录串口:",
                      port
                  );


                  console.log(
                      "烧录固件:",
                      binFile
                  );


                  // =================================================
                  // puyaispcom 参数
                  // =================================================
                  //
                  // 假设你的 puyaispcom.exe 使用：
                  //
                  // puyaispcom.exe
                  //     --port COM3
                  //     -f xxx.bin
                  //
                  // =================================================

                  const puyaispArgs = [

                      "--port",
                      port,

                      "-f",
                      binFile

                  ];


                  // =================================================
                  // 调用 puyaispcom.exe
                  // =================================================

                  await runPuyaisp(
                      puyaispPath,
                      puyaispArgs
                  );


                  console.log(
                      "PY32 烧录成功"
                  );


                  return {

                      success: true,

                      type: "py32",

                      binFile: binFile

                  };

              }


              // ====================================================
              // 5. 未知设备类型
              // ====================================================

              throw new Error(
                  "未知的设备类型: " +
                  boardType
              );


          } catch (err) {

              console.error(
                  "编译 / 烧录失败:",
                  err
              );


              return {

                  success: false,

                  error:
                      err.message ||
                      String(err)

              };

          }

      }
  );


  // ============================================================
  // Arduino CLI 执行函数
  // ============================================================

  function runCli(args) {

      // ==========================================================
      // Arduino CLI 配置文件
      // ==========================================================

      const config = getResourcePath(
          "resources/arduino-cli.yaml"
      );


      // ==========================================================
      // Arduino CLI 工作目录
      // ==========================================================
      //
      // arduino-cli.yaml 中如果存在：
      //
      // ./data
      // ./staging
      //
      // 那么这里必须使用 resources 作为 cwd。
      //
      // ==========================================================

      const cliDir = getResourcePath(
          "resources"
      );


      return new Promise(
          (resolve, reject) => {


              console.log(
                  "=========================================="
              );


              console.log(
                  "执行 Arduino CLI:"
              );


              console.log(
                  cliPath,
                  "--config-file",
                  config,
                  ...args
              );


              console.log(
                  "CLI cwd:",
                  cliDir
              );


              console.log(
                  "CLI config:",
                  config
              );
              


              // ====================================================
              // 启动 Arduino CLI
              // ====================================================

              const proc = spawn(

                  cliPath,

                  [
                      "--config-file",
                      config,

                      ...args
                  ],

                  {

                      // 工作目录
                      cwd: cliDir,

                      // Windows 下直接执行 exe
                      shell: false

                  }

              );


              // ====================================================
              // stdout
              // ====================================================

              proc.stdout.on(
                  "data",
                  d => {

                      const output =
                          d.toString();


                      EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          output
                      );
                      console.log(
                          "[CLI stdout]:",
                          output
                      );

                  }
              );


              // ====================================================
              // stderr
              // ====================================================

              proc.stderr.on(
                  "data",
                  d => {

                      const output =
                          d.toString();


                      if(args[0]=='compile'){
                        EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'cli-failed'+output
                        );
                      }else if(args[0]=='upload'){
                        EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'unoFlash-failed'+output
                        );
                      }
                      
                      console.error(
                          "[CLI stderr]:",
                          output
                      );

                  }
              );


              // ====================================================
              // CLI 结束
              // ====================================================

              proc.on(
                  "close",
                  code => {

                      console.log(
                          "Arduino CLI exit code:",
                          code
                      );
                      
                      if(args[0]=='compile'){
                        EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'cli-close'+code
                      );
                      }else if(args[0]=='upload'){
                        EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'flash-exit'+code
                        );
                      }


                      if (code === 0) {

                          resolve();

                      } else {

                          reject(
                              new Error(
                                  "Arduino CLI Error, exitCode=" +
                                  code
                              )
                          );

                      }

                  }
              );


              // ====================================================
              // CLI 启动失败
              // ====================================================

              proc.on(
                  "error",
                  err => {

                      console.error(
                          "Arduino CLI process error:",
                          err
                      );
                      EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'cli-start-failed'+err
                      );


                      reject(err);

                  }
              );

          }
      );

  }


// ============================================================
// Arduino 库安装 / 卸载
// ============================================================

this.ipc.handle(
  "download-lib",
  async (event, data) => {

    console.log(
      "Arduino 库操作请求:",
      data
    );


    try {

      // ========================================================
      // 获取参数
      // ========================================================

      const lib =
        data && typeof data === "object"
          ? data.lib
          : data;

      const action =
        data && typeof data === "object"
          ? data.action
          : "install";


      // ========================================================
      // 检查库名称
      // ========================================================

      if (
        !lib ||
        typeof lib !== "string" ||
        !lib.trim()
      ) {

        throw new Error(
          "Arduino 库名称不能为空"
        );

      }


      // ========================================================
      // 检查操作类型
      // ========================================================

      if (
        action !== "install" &&
        action !== "uninstall"
      ) {

        throw new Error(
          `不支持的 Arduino 库操作：${action}`
        );

      }


      // ========================================================
      // 执行 Arduino CLI
      // ========================================================

      const result =
        await runArduinoLibInstall(
          lib,
          action
        );


      return result;


    } catch (err) {

      console.error(
        "Arduino 库操作失败:",
        err
      );


      // ========================================================
      // 将错误发送给渲染进程
      // ========================================================

      if (
        EditorWindow.instance &&
        EditorWindow.instance.window
      ) {

        EditorWindow.instance.window.webContents.send(
          'send-arduino-library-log',
          {
            type: 'error',
            message:
              err.message ||
              String(err)
          }
        );

      }


      return {

        success: false,

        lib:
          data && typeof data === "object"
            ? data.lib
            : data,

        action:
          data && typeof data === "object"
            ? data.action
            : "install",

        error:
          err.message ||
          String(err)

      };

    }

  }
);


// ============================================================
// Arduino 库安装 / 卸载专用执行函数
// ============================================================

function runArduinoLibInstall(
  libraryName,
  action = "install"
) {

  // ==========================================================
  // Arduino CLI 配置文件
  // ==========================================================

  const config =
    getResourcePath(
      "resources/arduino-cli.yaml"
    );


  // ==========================================================
  // Arduino CLI 工作目录
  // ==========================================================
  //
  // arduino-cli.yaml 中如果使用：
  //
  // ./data
  // ./staging
  // ./user
  // ./libraries
  //
  // 那么 cwd 必须是 resources
  //
  // ==========================================================

  const cliDir =
    getResourcePath(
      "resources"
    );


  return new Promise(
    (resolve, reject) => {

      console.log(
        "=========================================="
      );


      console.log(
        action === "install"
          ? "开始安装 Arduino 库"
          : "开始卸载 Arduino 库"
      );


      console.log(
        "库名称:",
        libraryName
      );


      console.log(
        "操作:",
        action
      );


      console.log(
        "Arduino CLI:",
        cliPath
      );


      console.log(
        "CLI config:",
        config
      );


      console.log(
        "CLI cwd:",
        cliDir
      );


      console.log(
        "=========================================="
      );


      // ========================================================
      // 检查库名称
      // ========================================================

      if (
        !libraryName ||
        typeof libraryName !== "string" ||
        !libraryName.trim()
      ) {

        reject(
          new Error(
            "Arduino 库名称不能为空"
          )
        );

        return;

      }


      libraryName =
        libraryName.trim();


      // ========================================================
      // 检查操作类型
      // ========================================================

      if (
        action !== "install" &&
        action !== "uninstall"
      ) {

        reject(
          new Error(
            `不支持的 Arduino 库操作：${action}`
          )
        );

        return;

      }


      // ========================================================
      // Arduino CLI 参数
      // ========================================================
      //
      // install：
      //
      // arduino-cli.exe
      //   --config-file
      //   arduino-cli.yaml
      //   lib
      //   install
      //   TM1637
      //
      //
      // uninstall：
      //
      // arduino-cli.exe
      //   --config-file
      //   arduino-cli.yaml
      //   lib
      //   uninstall
      //   TM1637
      //
      // ========================================================

      const args = [

        "--config-file",
        config,

        "lib",

        action,

        libraryName

      ];


      console.log(
        "执行命令:",
        cliPath,
        ...args
      );


      // ========================================================
      // 启动 Arduino CLI
      // ========================================================

      const proc =
        spawn(
          cliPath,

          args,

          {
            cwd: cliDir,
            shell: false
          }
        );


      // ========================================================
      // stdout
      // ========================================================

      proc.stdout.on(
        "data",
        d => {

          const output =
            d.toString();


          console.log(
            "[Arduino Lib stdout]:",
            output
          );


          // ====================================================
          // 实时发送日志到渲染进程
          // ====================================================

          if (
            EditorWindow.instance &&
            EditorWindow.instance.window
          ) {

            EditorWindow.instance.window.webContents.send(
              'send-arduino-library-log',
              {
                type: 'stdout',
                message: output
              }
            );

          }

        }
      );


      // ========================================================
      // stderr
      // ========================================================

      proc.stderr.on(
        "data",
        d => {

          const output =
            d.toString();


          console.error(
            "[Arduino Lib stderr]:",
            output
          );


          // ====================================================
          // 注意：
          //
          // stderr 不一定代表失败。
          //
          // Arduino CLI 某些正常信息也可能通过 stderr
          // 输出，所以这里仅仅把它发送给渲染进程。
          //
          // 真正成功/失败以 close 的 exit code 为准。
          // ====================================================

          if (
            EditorWindow.instance &&
            EditorWindow.instance.window
          ) {

            EditorWindow.instance.window.webContents.send(
              'send-arduino-library-log',
              {
                type: 'stderr',
                message: output
              }
            );

          }

        }
      );


      // ========================================================
      // Arduino CLI 进程结束
      // ========================================================

      proc.on(
        "close",
        code => {

          console.log(
            "Arduino CLI lib exit code:",
            code
          );


          // ====================================================
          // 操作成功
          // ====================================================

          if (code === 0) {

            const successMessage =
              action === "install"

                ? `Arduino 库 ${libraryName} 安装成功`

                : `Arduino 库 ${libraryName} 卸载成功`;


            console.log(
              successMessage
            );


            // ==================================================
            // 发送成功日志
            // ==================================================

            if (
              EditorWindow.instance &&
              EditorWindow.instance.window
            ) {

              EditorWindow.instance.window.webContents.send(
                'send-arduino-library-log',
                {
                  type: 'success',
                  message: successMessage
                }
              );

            }


            resolve({

              success: true,

              libraryName,

              action

            });


          }

          // ====================================================
          // 操作失败
          // ====================================================

          else {

            const failMessage =
              action === "install"

                ? `Arduino 库 ${libraryName} 安装失败，退出码：${code}`

                : `Arduino 库 ${libraryName} 卸载失败，退出码：${code}`;


            console.error(
              failMessage
            );


            // ==================================================
            // 发送失败日志
            // ==================================================

            if (
              EditorWindow.instance &&
              EditorWindow.instance.window
            ) {

              EditorWindow.instance.window.webContents.send(
                'send-arduino-library-log',
                {
                  type: 'error',
                  message: failMessage,
                  exitCode: code
                }
              );

            }


            reject(

              new Error(
                action === "install"

                  ? `Arduino 库安装失败，exitCode=${code}`

                  : `Arduino 库卸载失败，exitCode=${code}`
              )

            );

          }

        }
      );


      // ========================================================
      // CLI 启动失败
      // ========================================================

      proc.on(
        "error",
        err => {

          console.error(
            "Arduino CLI 启动失败:",
            err
          );


          // ====================================================
          // 发送启动错误日志
          // ====================================================

          if (
            EditorWindow.instance &&
            EditorWindow.instance.window
          ) {

            EditorWindow.instance.window.webContents.send(
              'send-arduino-library-log',
              {
                type: 'error',
                message:
                  `Arduino CLI 启动失败：${
                    err.message || err
                  }`
              }
            );

          }


          reject(err);

        }
      );

    }
  );

}

  // ============================================================
  // PY32 puyaispcom 执行函数
  // ============================================================

  function runPuyaisp(exePath, args) {

      return new Promise(
          (resolve, reject) => {


              console.log(
                  "=========================================="
              );


              console.log(
                  "执行 PY32 ISP:"
              );


              console.log(
                  exePath,
                  ...args
              );


              // ====================================================
              // 启动 puyaispcom.exe
              // ====================================================

              const proc = spawn(

                  exePath,

                  args,

                  {

                      // 以 exe 所在目录作为工作目录
                      cwd: path.dirname(exePath),

                      // 不使用 shell
                      shell: false

                  }

              );


              // ====================================================
              // stdout
              // ====================================================

              // proc.stdout.on(
              //     "data",
              //     d => {

              //         const output =
              //             d.toString();


              //         EditorWindow.instance.window.webContents.send('send-arduino-flash', output);
              //         console.log(
              //             "[PY32 ISP stdout]:",
              //             output
              //         );

              //     }
              // );
              proc.stdout.on("data", d => {

                const output = d.toString("utf8");
            
                console.log(
                    "[PY32 ISP stdout RAW]:",
                    JSON.stringify(output)
                );
            
                // 按 \r / \n 分割
                const messages = output.split(/[\r\n]+/);
            
                messages.forEach(message => {
            
                    if (!message) {
                        return;
                    }
            
                    EditorWindow.instance.window.webContents.send(
                        'send-arduino-flash',
                        message
                    );
            
                    console.log(
                        "[PY32 ISP]:",
                        message
                    );
            
                });
            
            });


              // ====================================================
              // stderr
              // ====================================================

              
              proc.stderr.on(
                  "data",
                  d => {

                    // console.log('errrrr',d)
                      const output =
                          d.toString();


                      EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          JSON.stringify(output)
                      );
                      console.log(
                          "[PY32 ISP stderr]:",
                          JSON.stringify(output)
                      );

                  }
              );
              /*
              proc.stderr.on("data", d => {

                console.log("========== STDERR START ==========");
            
                console.log("1. d =", d);
            
                const output = d.toString();
            
                console.log("2. output =", JSON.stringify(output));
            
                console.log("3. about to console.error");
            
                console.log("[PY32 ISP stderr]:", output);
            
                console.log("4. after console.error");
            
                process.stdout.write(
                    "[STDERR TEST] " + JSON.stringify(output) + "\n"
                );
            
                console.log("========== STDERR END ==========");
            
            });
            */
              


              // ====================================================
              // 进程结束
              // ====================================================

              proc.on(
                  "close",
                  code => {

                      console.log(
                          "PY32 ISP exit code:",
                          code
                      );

                      EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'flash-exit'+code
                      );


                      if (code === 0) {

                          resolve();

                      } else {

                          reject(
                              new Error(
                                  "PY32 ISP 烧录失败，exitCode=" +
                                  code
                              )
                          );

                      }

                  }
              );


              // ====================================================
              // 进程启动失败
              // ====================================================

              proc.on(
                  "error",
                  err => {

                      console.error(
                          "PY32 ISP process error:",
                          err
                      );
                      EditorWindow.instance.window.webContents.send(
                          'send-arduino-flash',
                          'flash-start-failed'
                      );


                      reject(err);

                  }
              );

          }
      );

  }
    this.ipc.handle('get-advanced-customizations', async () => {
      const USERSCRIPT_PATH = path.join(app.getPath('userData'), 'userscript.js');
      const USERSTYLE_PATH = path.join(app.getPath('userData'), 'userstyle.css');

      const [userscript, userstyle] = await Promise.all([
        fsPromises.readFile(USERSCRIPT_PATH, 'utf-8').catch(() => ''),
        fsPromises.readFile(USERSTYLE_PATH, 'utf-8').catch(() => '')
      ]);

      return {
        userscript,
        userstyle
      };
    });

    this.ipc.handle('check-drag-and-drop-path', (event, filePath) => {
      FileAccessWindow.check(filePath);
    });

    /**
     * Refers to the full screen button in the editor, not the OS-level fullscreen through
     * F11/Alt+Enter (Windows, Linux) or buttons provided by the OS (macOS).
     */
    this.isInEditorFullScreen = false;

    this.ipc.handle('set-is-full-screen', (event, isFullScreen) => {
      this.isInEditorFullScreen = !!isFullScreen;
    });

    this.loadURL('tw-editor://./gui/gui.html');
    this.show();
  }

  getPreload () {
    return 'editor';
  }

  getDimensions () {
    return {
      width: 1280,
      height: 800
    };
  }

  getBackgroundColor () {
    return '#333333';
  }

  applySettings () {
    this.window.webContents.setBackgroundThrottling(settings.backgroundThrottling);
  }

  enumerateMediaDevices () {
    // Used by desktop settings
    return new Promise((resolve, reject) => {
      this.ipc.once('enumerated-media-devices', (event, result) => {
        if (typeof result.error !== 'undefined') {
          reject(result.error);
        } else {
          resolve(result.devices);
        }
      });
      this.window.webContents.send('enumerate-media-devices');
    });
  }

  handleWindowOpen (details) {
    const url = new URL(details.url);
    const params = new URLSearchParams(url.search);

    // Open extension sample projects in-app
    if (
      url.protocol === 'tw-editor:' &&
      url.host === '.' &&
      params.has('project_url')
    ) {
      const projectUrl = params.get('project_url');
      const parsedFile = parseOpenedFile(projectUrl, null);
      if (parsedFile.type === TYPE_SAMPLE) {
        new EditorWindow(parsedFile, null);
        return {
          action: 'deny'
        };
      }
    }

    // Open extension documentation in-app
    const extensionsDocsMatch = details.url.match(
      /^https:\/\/extensions\.turbowarp\.org\/([\w_\-.\/]+)$/
    );
    if (extensionsDocsMatch) {
      ExtensionDocumentationWindow.open(extensionsDocsMatch[1]);
      return {
        action: 'deny'
      };
    }

    return super.handleWindowOpen(details);
  }

  canExitFullscreenByPressingEscape () {
    return !this.isInEditorFullScreen;
  }

  updateRichPresence () {
    RichPresence.setActivity(this.projectTitle, this.openedProjectAt);
  }

  /**
   * @param {string[]} files
   * @param {boolean} fullscreen
   * @param {string|null} workingDirectory
   */
  static openFiles (files, fullscreen, workingDirectory) {
    if (files.length === 0) {
      EditorWindow.newWindow(fullscreen);
    } else {
      for (const file of files) {
        new EditorWindow(parseOpenedFile(file, workingDirectory), fullscreen);
      }
    }
  }

  /**
   * Open a new window with the default project.
   * @param {boolean} fullscreen
   */
  static newWindow (fullscreen) {
    new EditorWindow(null, fullscreen);
  }

  static dataSend(data){
    console.log(data)
    if (EditorWindow.instance) {
      EditorWindow.instance.window.webContents.send('send-state', data);
    }
  }

  static setRobotData(data){
    // console.log('33333333',data)
     if (EditorWindow.instance) {
      // console.log('111111',data)
      // console.log('2222222',EditorWindow.instance.robotData)
      EditorWindow.instance.robotData=data
      EditorWindow.instance.window.webContents.send('send-senor', data);
    }
  }
}

module.exports = EditorWindow;