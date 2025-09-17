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
const {getPort} =require('../../utils/port')
const extensions = require('../../utils/extensionWho.js')
const socket =require('../../utils/socket')

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
    this.ipc.handle('cancelload', () => {
      setDown(2)

    });
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