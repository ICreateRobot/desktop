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
const {setVersion,getVersion} = require('../../utils/currentVersion')
const {getGiteeTooken,getGithubTooken} = require('../../utils/tookenConfig')

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
        // const filteredPorts = ports.filter(p => p.vendorId && p.vendorId.toUpperCase() === '1A86');
        const filteredPorts=ports
        .filter(p =>
          (
            p.vendorId === '0D28' &&
            ['0204', '0205'].includes(p.productId)
          ) ||
          (
            p.vendorId &&
            p.vendorId.toUpperCase() === '1A86'
          )
        )
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

    ipc.on('get-version', async (event) => {

      event.returnValue = getVersion();

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

    /* ================= 仓库配置 ================= */

    // // ---- GITEE ----
    // const GITEE_OWNER = 'lgmShine';
    // const GITEE_REPO = 'bucket';
    // const GITEE_BRANCH = 'master';
    // const GITEE_TOKEN = getGiteeTooken(); // 可选

    // // ---- GITHUB ----
    // const GITHUB_OWNER = 'ICreateRobot';
    // const GITHUB_REPO = 'bucket';
    // const GITHUB_BRANCH = 'master';
    // const GITHUB_TOKEN = getGithubTooken(); // public 仓库可留空

    // 固件根目录
    const BASE_FOLDER = 'firmware';
    const OSS_BASE_URL = 'https://arkt-advert.oss-cn-beijing.aliyuncs.com';

    const TYPE_CONFIG = {
      standard: { ext: '.bin' },
      xiaozhi:  { ext: '.bin' },
      microbit:{ ext: '.hex' }
    };


    const axios = require('axios');
    /* ================= URL 构造 ================= */

    // function giteeApiUrl(pathname, params = {}) {
    //   const base = `https://gitee.com/api/v5${pathname}`;
    //   const qs = new URLSearchParams(params).toString();
    //   return qs ? `${base}?${qs}` : base;
    // }

    // function githubApiUrl(pathname, params = {}) {
    //   const base = `https://api.github.com${pathname}`;
    //   const qs = new URLSearchParams(params).toString();
    //   return qs ? `${base}?${qs}` : base;
    // }

    // function giteeRawUrl(repoPath, commitSha = null) {
    //   if (commitSha) {
    //     return `https://gitee.com/${GITEE_OWNER}/${GITEE_REPO}/raw/${commitSha}/${repoPath}`;
    //   }
    //   return `https://gitee.com/${GITEE_OWNER}/${GITEE_REPO}/raw/${GITEE_BRANCH}/${repoPath}`;
    // }

    // function githubRawUrl(repoPath, commitSha = null) {
    //   if (commitSha) {
    //     return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${commitSha}/${repoPath}`;
    //   }
    //   return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${repoPath}`;
    // }

    /* ================= 通用 Fallback 请求 ================= */

    // async function requestWithFallback({ gitee, github }) {
    //   try {
    //     return await axios.get(gitee.url, { headers: gitee.headers });
    //   } catch (err) {
    //     console.warn('[GITEE FAILED] → GITHUB', err.message);
    //     return await axios.get(github.url, { headers: github.headers });
    //   }
    // }

    // async function fetchRawWithFallback(repoPath) {
    //   try {
    //     return await axios.get(giteeRawUrl(repoPath));
    //   } catch (err) {
    //     console.warn('[GITEE RAW FAILED] → GITHUB', repoPath);
    //     return await axios.get(githubRawUrl(repoPath));
    //   }
    // }

    /* ================= 超时包装 ================= */

    function withTimeout(promise, ms, msg = 'Request timeout') {
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(msg)), ms);
      });
      return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeout
      ]);
    }

    /* ======================================================
      1️⃣ 获取固件列表
    ====================================================== */

    // ipc.handle('get-firmware-list', async () => {
    //   try {
    //     const task = async () => {

    //       const listForType = async (type) => {
    //         const basePath = `${BASE_FOLDER}/${type}`;

    //         const res = await requestWithFallback({
    //           gitee: {
    //             url: giteeApiUrl(
    //               `/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${basePath}`,
    //               { ref: GITEE_BRANCH, per_page: 100 }
    //             ),
    //             headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
    //           },
    //           github: {
    //             url: githubApiUrl(
    //               `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${basePath}`,
    //               { ref: GITHUB_BRANCH, per_page: 100 }
    //             ),
    //             headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    //           }
    //         });

    //         const dirs = (res.data || []).filter(i => i.type === 'dir');
    //         const result = [];

    //         for (const d of dirs) {
    //           try {
    //             const r2 = await requestWithFallback({
    //               gitee: {
    //                 url: giteeApiUrl(
    //                   `/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${d.path}`,
    //                   { ref: GITEE_BRANCH, per_page: 100 }
    //                 ),
    //                 headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
    //               },
    //               github: {
    //                 url: githubApiUrl(
    //                   `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${d.path}`,
    //                   { ref: GITHUB_BRANCH, per_page: 100 }
    //                 ),
    //                 headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    //               }
    //             });

    //             const files = r2.data || [];

    //             let version = null;
    //             const vfile = files.find(f => f.name.toLowerCase() === 'version.txt');
    //             if (vfile) {
    //               try {
    //                 const v = await fetchRawWithFallback(vfile.path);
    //                 version = String(v.data).trim();
    //               } catch {}
    //             }

    //             const bins = files
    //               .filter(f => f.name.toLowerCase().endsWith('.bin'))
    //               .map(f => ({
    //                 name: f.name,
    //                 path: f.path,
    //                 rawUrl: giteeRawUrl(f.path),
    //                 rawUrlBackup: githubRawUrl(f.path)
    //               }));

    //             if (bins.length || version) {
    //               result.push({
    //                 name: d.name,
    //                 version,
    //                 files: bins
    //               });
    //             }
    //           } catch {}
    //         }
    //         return result;
    //       };

    //       const [standard, xiaozhi] = await Promise.all([
    //         listForType('standard'),
    //         listForType('xiaozhi')
    //       ]);

    //       return { ok: true, data: { standard, xiaozhi } };
    //     };

    //     return await withTimeout(task(), 12000);
    //   } catch (err) {
    //     return { ok: false, error: err.message };
    //   }
    // });

    // ipc.handle('get-firmware-list', async () => {
    //   try {
    //     const task = async () => {
    
    //       const listForType = async (type) => {
    //         const typeCfg = TYPE_CONFIG[type];
    //         if (!typeCfg) return [];
    
    //         const basePath = `${BASE_FOLDER}/${type}`;
    
    //         const res = await requestWithFallback({
    //           gitee: {
    //             url: giteeApiUrl(
    //               `/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${basePath}`,
    //               { ref: GITEE_BRANCH, per_page: 100 }
    //             ),
    //             headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
    //           },
    //           github: {
    //             url: githubApiUrl(
    //               `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${basePath}`,
    //               { ref: GITHUB_BRANCH, per_page: 100 }
    //             ),
    //             headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    //           }
    //         });
    
    //         const dirs = (res.data || []).filter(i => i.type === 'dir');
    //         const result = [];
    
    //         for (const d of dirs) {
    //           try {
    //             const r2 = await requestWithFallback({
    //               gitee: {
    //                 url: giteeApiUrl(
    //                   `/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${d.path}`,
    //                   { ref: GITEE_BRANCH, per_page: 100 }
    //                 ),
    //                 headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
    //               },
    //               github: {
    //                 url: githubApiUrl(
    //                   `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${d.path}`,
    //                   { ref: GITHUB_BRANCH, per_page: 100 }
    //                 ),
    //                 headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    //               }
    //             });
    
    //             const files = r2.data || [];
    
    //             /* ===== version.txt ===== */
    //             let version = null;
    //             const vfile = files.find(f => f.name.toLowerCase() === 'version.txt');
    //             if (vfile) {
    //               try {
    //                 const v = await fetchRawWithFallback(vfile.path);
    //                 version = String(v.data).trim();
    //               } catch {}
    //             }
    
    //             /* ===== 固件文件（bin / hex） ===== */
    //             const firmwareFiles = files
    //               .filter(f => f.name.toLowerCase().endsWith(typeCfg.ext))
    //               .map(f => ({
    //                 name: f.name,
    //                 path: f.path,
    //                 rawUrl: giteeRawUrl(f.path),
    //                 rawUrlBackup: githubRawUrl(f.path)
    //               }));
    
    //             if (firmwareFiles.length || version) {
    //               result.push({
    //                 name: d.name,      // last / middle / long
    //                 version,
    //                 files: firmwareFiles
    //               });
    //             }
    //           } catch {}
    //         }
    //         return result;
    //       };
    
    //       const [standard, xiaozhi, microbit] = await Promise.all([
    //         listForType('standard'),
    //         listForType('xiaozhi'),
    //         listForType('microbit')
    //       ]);
    
    //       return {
    //         ok: true,
    //         data: { standard, xiaozhi, microbit }
    //       };
    //     };
    
    //     return await withTimeout(task(), 12000);
    //   } catch (err) {
    //     return { ok: false, error: err.message };
    //   }
    // });
    ipc.handle('get-firmware-list', async () => {
      try {
    
        const TYPES = ['standard', 'xiaozhi', 'microbit'];
        const LEVELS = ['last', 'middle', 'long'];
    
        const result = {};
    
        for (const type of TYPES) {
    
          const ext = TYPE_CONFIG[type].ext;
    
          result[type] = [];
    
          for (const level of LEVELS) {
    
            try {
    
              const infoUrl =
              `${OSS_BASE_URL}/firmware/${type}/${level}/info.json`;
            
              const infoRes = await axios.get(infoUrl, {
                timeout: 5000
              });
              
              const firmwareInfo = infoRes.data || {};
              console.log('firmwareInfo',firmwareInfo.version)
              
              const version = firmwareInfo.version || '0.0.0';
              
              const description = firmwareInfo.description || {
                zh: '',
                en: ''
              };
    
              let files = [];
    
              if (type === 'microbit') {
    
                files.push({
                  name: 'MICROBIT.hex',
                  path: `firmware/${type}/${level}/MICROBIT.hex`,
                  rawUrl:
                    `${OSS_BASE_URL}/firmware/${type}/${level}/MICROBIT.hex`
                });
    
              } else if(type ==="standard") {
    
                files.push({
                  name: 'firmware.bin',
                  path: `firmware/${type}/${level}/firmware.bin`,
                  rawUrl:
                    `${OSS_BASE_URL}/firmware/${type}/${level}/firmware.bin`
                });
    
                files.push({
                  name: 'vfs.bin',
                  path: `firmware/${type}/${level}/vfs.bin`,
                  rawUrl:
                    `${OSS_BASE_URL}/firmware/${type}/${level}/vfs.bin`
                });
              }else{
                files.push({
                  name: 'combined.bin',
                  path: `firmware/${type}/${level}/combined.bin`,
                  rawUrl:
                    `${OSS_BASE_URL}/firmware/${type}/${level}/combined.bin`
                });
    
              }
    
              result[type].push({
                name: level,
                version,
                description,
                files
              });
    
            } catch (err) {
    
              console.warn(
                `[OSS] skip ${type}/${level}`,
                err.message
              );
            }
          }
        }
    
        return {
          ok: true,
          data: result
        };
    
      } catch (err) {
    
        return {
          ok: false,
          error: err.message
        };
      }
    });

    /* ======================================================
      2️⃣ 获取文件夹提交记录
    ====================================================== */

    // ipc.handle('get-folder-commits', async (e, { type, folderName, per_page = 10 }) => {
    //   try {
    //     const repoPath = `${BASE_FOLDER}/${type}/${folderName}`;

    //     const res = await requestWithFallback({
    //       gitee: {
    //         url: giteeApiUrl(
    //           `/repos/${GITEE_OWNER}/${GITEE_REPO}/commits`,
    //           { path: repoPath, sha: GITEE_BRANCH, per_page }
    //         ),
    //         headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
    //       },
    //       github: {
    //         url: githubApiUrl(
    //           `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits`,
    //           { path: repoPath, sha: GITHUB_BRANCH, per_page }
    //         ),
    //         headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    //       }
    //     });

    //     const commits = (res.data || []).map(c => ({
    //       sha: c.sha,
    //       message: c.commit?.message?.split('\n')[0] || '',
    //       date: c.commit?.committer?.date || '',
    //       author: c.commit?.committer?.name || ''
    //     }));

    //     return { ok: true, data: commits };
    //   } catch (err) {
    //     return { ok: false, error: err.message };
    //   }
    // });
    ipc.handle('get-folder-commits', async (e, {
      type,
      folderName
    }) => {
    
      try {
    
        const infoUrl =
          `${OSS_BASE_URL}/firmware/${type}/${folderName}/info.json`;
    
        const res = await axios.get(infoUrl, {
          timeout: 5000
        });
    
        const firmwareInfo = res.data || {};
    
        return {
          ok: true,
          data: [
            {
              version: firmwareInfo.version || '0.0.0',
    
              description:
                firmwareInfo.description || {
                  zh: '',
                  en: ''
                }
            }
          ]
        };
    
      } catch (err) {
    
        return {
          ok: false,
          error: err.message
        };
      }
    });

    /* ======================================================
      3️⃣ 下载固件（bin）
    ====================================================== */

    // ipc.handle('download-firmware', async (e, { type, folderName }) => {
    //   try {
    //     const repoPath = `${BASE_FOLDER}/${type}/${folderName}`;

    //     const res = await requestWithFallback({
    //       gitee: {
    //         url: giteeApiUrl(
    //           `/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${repoPath}`,
    //           { ref: GITEE_BRANCH }
    //         ),
    //         headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
    //       },
    //       github: {
    //         url: githubApiUrl(
    //           `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoPath}`,
    //           { ref: GITHUB_BRANCH }
    //         ),
    //         headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    //       }
    //     });
    //     console.log(res)

    //     // const bins = (res.data || []).filter(f => f.name.endsWith('.bin'));
    //     const ext = TYPE_CONFIG[type]?.ext;
    //     if (!ext) return { ok: false, error: '未知固件类型' };

    //     const bins = (res.data || []).filter(f => f.name.toLowerCase().endsWith(ext));
    //     if (!bins.length) return { ok: false, error: '未找到 bin 文件' };

    //     const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firmware-'));

    //     // const downloadOne = (urls, savePath) =>
    //     //   new Promise((resolve, reject) => {
    //     //     console.log('aaaaaa')
    //     //     const tryNext = (i) => {
    //     //       console.log(urls)
    //     //       console.log(urls.length)
    //     //       if (i >= urls.length) return reject(new Error('下载失败'));
    //     //       const url = urls[i];
    //     //       const proto = url.startsWith('https') ? https : http;
    //     //       console.log(url)
    //     //       proto.get(url, res => {
    //     //         console.log('-----------------------')
    //     //         console.log(res.statusCode)
    //     //         if (res.statusCode !== 200) return tryNext(i + 1);
    //     //         const ws = fs.createWriteStream(savePath);
    //     //         res.pipe(ws);
    //     //         ws.on('finish', () => resolve());
    //     //       }).on('error', () => tryNext(i + 1));
    //     //     };
    //     //     tryNext(0);
    //     //   });
    //     const downloadOne = async (urls, savePath) => {
    //       for (const url of urls) {
    //         try {
    //           const response = await axios.get(url, { responseType: 'stream', maxRedirects: 5 });
    //           const ws = fs.createWriteStream(savePath);
    //           response.data.pipe(ws);
    //           await new Promise((resolve, reject) => {
    //             ws.on('finish', resolve);
    //             ws.on('error', reject);
    //           });
    //           return; // 下载成功，退出
    //         } catch (err) {
    //           console.warn(`[DOWNLOAD FAILED] ${url} → ${err.message}`);
    //         }
    //       }
    //       throw new Error('下载失败');
    //     };

    //     const downloaded = [];
    //     for (const b of bins) {
    //       const savePath = path.join(tmpDir, b.name);
    //       await downloadOne(
    //         [giteeRawUrl(b.path), githubRawUrl(b.path)],
    //         savePath
    //       );
    //       downloaded.push({ name: b.name, path: savePath });
    //     }

    //     return { ok: true, data: { downloaded, tmpDir } };
    //   } catch (err) {
    //     return { ok: false, error: err.message };
    //   }
    // });
    // ipc.handle('download-firmware', async (e, { type, folderName }) => {

    //   try {
    
    //     const tmpDir = fs.mkdtempSync(
    //       path.join(os.tmpdir(), 'firmware-')
    //     );
    
    //     const downloaded = [];
    
    //     const downloadOne = async (url, savePath) => {
    
    //       const response = await axios.get(url, {
    //         responseType: 'stream',
    //         timeout: 10000
    //       });
    
    //       const ws = fs.createWriteStream(savePath);
    
    //       response.data.pipe(ws);
    
    //       await new Promise((resolve, reject) => {
    //         ws.on('finish', resolve);
    //         ws.on('error', reject);
    //       });
    //     };
    
    //     if (type === 'microbit') {
    
    //       const fileName = 'firmware.hex';
    
    //       const url =
    //         `${OSS_BASE_URL}/firmware/${type}/${folderName}/${fileName}`;
    
    //       const savePath = path.join(tmpDir, fileName);
    
    //       await downloadOne(url, savePath);
    
    //       downloaded.push({
    //         name: fileName,
    //         path: savePath
    //       });
    
    //     } else {
    
    //       const files = ['firmware.bin', 'vfs.bin'];
    
    //       for (const fileName of files) {
    
    //         const url =
    //           `${OSS_BASE_URL}/firmware/${type}/${folderName}/${fileName}`;
    
    //         const savePath = path.join(tmpDir, fileName);
    
    //         await downloadOne(url, savePath);
    
    //         downloaded.push({
    //           name: fileName,
    //           path: savePath
    //         });
    //       }
    //     }
    
    //     return {
    //       ok: true,
    //       data: {
    //         downloaded,
    //         tmpDir
    //       }
    //     };
    
    //   } catch (err) {
    
    //     return {
    //       ok: false,
    //       error: err.message
    //     };
    //   }
    // });
    ipc.handle('download-firmware', async (e, { type, folderName }) => {

      try {
    
        /* =========================
          1. 获取版本号
        ========================= */
    
        const infoUrl =
          `${OSS_BASE_URL}/firmware/${type}/${folderName}/info.json`;

        const infoRes = await axios.get(infoUrl, {
          timeout: 5000
        });

        const firmwareInfo = infoRes.data || {};

        const version = firmwareInfo.version || '0.0.0';

        const description = firmwareInfo.description || {
          zh: '',
          en: ''
        };
        const place = firmwareInfo.place
        console.log('download place:',place.first)
    
        /* =========================
          2. 构建缓存目录
        ========================= */
    
        // firmware-standard-last-1.1.1
        const cacheDirName =
          `firmware-${type}-${version}`;
    
        const tmpDir = path.join(
          os.tmpdir(),
          cacheDirName
        );
    
        /* =========================
          3. 如果不存在则创建
        ========================= */
    
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
    
        /* =========================
          4. 需要的文件列表
        ========================= */
    
        let fileList = [];
    
        if (type === 'microbit') {
    
          fileList = [
            'MICROBIT.hex'
          ];
    
        } else if (type ==="standard") {
    
          fileList = [
            'firmware.bin',
            'vfs.bin'
          ];
        }else{
          fileList = [
            "combined.bin"
          ];
        }
    
        /* =========================
          5. 检查是否已经缓存
        ========================= */
    
        const allExists = fileList.every(fileName => {
    
          const fullPath = path.join(tmpDir, fileName);
    
          return (
            fs.existsSync(fullPath) &&
            fs.statSync(fullPath).size > 0
          );
        });
    
        /* =========================
          6. 已存在 -> 直接返回
        ========================= */
    
        if (allExists) {
    
          console.log(
            `[CACHE HIT] use local catch: ${tmpDir}`
          );
    
          return {
            ok: true,
            cached: true,
            data: {
              downloaded: fileList.map(fileName => ({
                name: fileName,
                path: path.join(tmpDir, fileName)
              })),
              tmpDir,
              version,
              description,
              place
            }
          };
        }
    
        /* =========================
          7. 下载函数
        ========================= */
    
        const downloadOne = async (url, savePath) => {
    
          const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 15000
          });
    
          const ws = fs.createWriteStream(savePath);
    
          response.data.pipe(ws);
    
          await new Promise((resolve, reject) => {
            ws.on('finish', resolve);
            ws.on('error', reject);
          });
        };
    
        /* =========================
          8. 开始下载
        ========================= */
    
        const downloaded = [];
    
        for (const fileName of fileList) {
    
          const url =
            `${OSS_BASE_URL}/firmware/${type}/${folderName}/${fileName}`;
    
          const savePath = path.join(tmpDir, fileName);
    
          console.log(
            `[DOWNLOAD] ${url}`
          );
    
          await downloadOne(url, savePath);
    
          downloaded.push({
            name: fileName,
            path: savePath
          });
        }
    
        /* =========================
          9. 返回
        ========================= */
    
        return {
          ok: true,
          cached: false,
          data: {
            downloaded,
            tmpDir,
            version,
            description,
            place
          }
        };
    
      } catch (err) {
    
        return {
          ok: false,
          error: err.message
        };
      }
    });




    // const OWNER = 'lgmShine';        // <-- 修改为你的 gitee owner
    // const REPO = 'bucket';          // <-- 修改为你的仓库名
    // const BRANCH = 'master';        // <-- 分支
    // const BASE_FOLDER = 'firmware'; // 仓库中固件的根目录，如 firmware/standard/last/...

    // // 5317e371401159915e29615d4efff0ef
    
    // // 可选 token（如果是私有仓库）
    // const GITEE_TOKEN = '39bdb0e0d25fb2d7e4b54ff21e15ec99'; // 如果需要就填

    // const axios = require('axios');
    // // HELPERS
    // function giteeApiUrl(pathname, params = {}) {
    //   const base = `https://gitee.com/api/v5${pathname}`;
    //   const qs = new URLSearchParams(params).toString();
    //   return qs ? `${base}?${qs}` : base;
    // }
    // function rawUrl(repoPath, commitSha = null) {
    //   // raw URL: https://gitee.com/{owner}/{repo}/raw/{branch}/{path}
    //   if (commitSha) return `https://gitee.com/${OWNER}/${REPO}/raw/${commitSha}/${repoPath}`;
    //   return `https://gitee.com/${OWNER}/${REPO}/raw/${BRANCH}/${repoPath}`;
    // }


    // function withTimeout(promise, ms, timeoutMessage = 'Request timeout') {
    //   let timer;
    //   const timeoutPromise = new Promise((_, reject) => {
    //     timer = setTimeout(() => {
    //       reject(new Error(timeoutMessage));
    //     }, ms);
    //   });

    //   return Promise.race([
    //     promise.finally(() => clearTimeout(timer)),
    //     timeoutPromise,
    //   ]);
    // }
    // ipc.handle('get-firmware-list', async (event, repoSubpath = BASE_FOLDER) => {
    //   try {
    //     const task = (async () => {

    //       const listForType = async (type) => {
    //         const basePath = `${repoSubpath}/${type}`;
    //         const url = giteeApiUrl(
    //           `/repos/${OWNER}/${REPO}/contents/${basePath}`,
    //           { ref: BRANCH, per_page: 100 }
    //         );

    //         const res = await axios.get(
    //           url,
    //           { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} }
    //         );

    //         const dirs = (res.data || []).filter(i => i.type === 'dir');
    //         const result = [];

    //         for (const d of dirs) {
    //           const listUrl = giteeApiUrl(
    //             `/repos/${OWNER}/${REPO}/contents/${d.path}`,
    //             { ref: BRANCH, per_page: 100 }
    //           );

    //           try {
    //             const r2 = await axios.get(
    //               listUrl,
    //               { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} }
    //             );

    //             const files = r2.data || [];

    //             const vfile = files.find(f => f.name.toLowerCase() === 'version.txt');
    //             let version = null;

    //             if (vfile) {
    //               try {
    //                 const vcontent = await axios.get(rawUrl(vfile.path));
    //                 version = String(vcontent.data).trim();
    //               } catch {
    //                 version = null;
    //               }
    //             }

    //             const bins = files
    //               .filter(f => f.name.toLowerCase().endsWith('.bin'))
    //               .map(f => ({
    //                 name: f.name,
    //                 path: f.path,
    //                 rawUrl: rawUrl(f.path),
    //               }));

    //             if (bins.length > 0 || version) {
    //               result.push({
    //                 name: d.name,
    //                 version: version,
    //                 files: bins,
    //               });
    //             }
    //           } catch {
    //             continue;
    //           }
    //         }

    //         return result;
    //       };

    //       const [standard, xiaozhi] = await Promise.all([
    //         listForType('standard'),
    //         listForType('xiaozhi'),
    //       ]);

    //       return { ok: true, data: { standard, xiaozhi } };
    //     })();

    //     // ⭐ 8 秒超时
    //     return await withTimeout(task, 12000, 'get-firmware-list timeout');

    //   } catch (err) {
    //     return { ok: false, error: err.message || String(err) };
    //   }
    // });

    // // 2) 获取某个文件夹的 commit 记录（用于显示该文件夹的提交历史）
    // ipc.handle('get-folder-commits', async (event, { type, folderName, per_page = 10 }) => {
    //   try {
    //     const repoPath = `${BASE_FOLDER}/${type}/${folderName}`;
    //     const url = giteeApiUrl(`/repos/${OWNER}/${REPO}/commits`, { path: repoPath, sha: BRANCH, per_page });
    //     const res = await axios.get(url, { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} });
    //     // 简化返回
    //     const commits = (res.data || []).map(c => ({
    //       sha: c.sha,
    //       message: c.commit && c.commit.message ? c.commit.message.split('\n')[0] : '',
    //       date: c.commit && c.commit.committer ? c.commit.committer.date : '',
    //       author: c.commit && c.commit.committer ? c.commit.committer.name : ''
    //     }));
    //     return { ok: true, data: commits };
    //   } catch (err) {
    //     return { ok: false, error: err.message || String(err) };
    //   }
    // });

    // // 3) 下载固件：下载某个 type/folder 下的所有 bin 文件到临时目录并返回本地路径数组
    // ipc.handle('download-firmware', async (event, { type, folderName }) => {
    //   try {
    //     // 先列出文件（复用 get-firmware-list）
    //     const listRes = await ipc.invoke ? await event.sender.invoke('get-firmware-list') : null;
    //     // 上面方式可能不可行（ipcMain.invoke 不存在），直接复用 listForType 逻辑：简化处理，直接请求 gitee
    //     const repoPath = `${BASE_FOLDER}/${type}/${folderName}`;
    //     const contentsUrl = giteeApiUrl(`/repos/${OWNER}/${REPO}/contents/${repoPath}`, { ref: BRANCH, per_page: 100 });
    //     const r = await axios.get(contentsUrl, { headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {} });
    //     const files = r.data || [];
    //     const bins = files.filter(f => f.name.toLowerCase().endsWith('.bin'));
    //     if (bins.length === 0) {
    //       return { ok: false, error: '未找到 bin 文件' };
    //     }
    //     const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firmware-'));
    //     const download = (file) => new Promise((resolve, reject) => {
    //       const url = rawUrl(file.path);
    //       const savePath = path.join(tmpDir, file.name);
    //       const protocol = url.startsWith('https') ? https : http;
    //       const req = protocol.get(url, (res) => {
    //         if (res.statusCode !== 200) {
    //           reject(new Error(`下载 ${file.name} 失败，状态码 ${res.statusCode}`));
    //           return;
    //         }
    //         const ws = fs.createWriteStream(savePath);
    //         res.pipe(ws);
    //         ws.on('finish', () => {
    //           ws.close(() => resolve({ name: file.name, path: savePath }));
    //         });
    //         ws.on('error', (err) => reject(err));
    //       });
    //       req.on('error', err => reject(err));
    //     });

    //     // 并行下载所有 bin
    //     const downloaded = [];
    //     for (const b of bins) {
    //       const d = await download(b);
    //       downloaded.push(d);
    //     }
    //     return { ok: true, data: { downloaded, tmpDir } };
    //   } catch (err) {
    //     return { ok: false, error: err.message || String(err) };
    //   }
    // });

    ipc.handle('select-file', async () => {
      const result = await dialog.showOpenDialog({
        title: '选择固件文件',
        properties: ['openFile'],
        filters: [
          { name: '固件文件', extensions: ['bin'] },
          // { name: '所有文件', extensions: ['*'] }
        ]
      });
  
      if (result.canceled) return null;
      return result.filePaths[0];

    })
    //自定义烧录逻辑
    ipc.handle('flash-custom', async (event, port,baudRate,files) =>{
      console.log('--------------------')
      console.log(port)
      console.log(baudRate)
      console.log(files)
      console.log('--------------------')
      const ConnectDevice=require('./connect-device')
      // console.log(ConnectDevice.disconnectPortLogic)
      if(port==getPortCom()){
        await ConnectDevice.disconnectPortLogic()
      }
      this.window.setAlwaysOnTop(false); 
      this.window.blur(); // 让出焦点，主窗口会浮上来

      let isError=false

      let isTimeout=false
      

      this.canClose = false;
      getSocket().send(JSON.stringify({
          type: 'burnLogs',
          data: {
              message: {
                  flashing: true,
                  logs: '__MODE_SINGLE__'
              }
          }
      }));

      // const args = [
      //     '--chip', 'esp32s3',
      //     '--port', port,
      //     '--baud', '1152000',
      //     '--before', 'default_reset',
      //     '--after', 'hard_reset',
      //     'write_flash',
      //     '--flash_mode', 'dio',
      //     '--flash_size', '32MB',
      //     '--flash_freq', '80m',

      //     // 你的两个固件（保持你说的地址）
      //     place? place.first:'0x0', 
      //     filePath? filePath[0].path:commonFilePath,          // 第一个固件
      //     place? place.second:'0x1420000', 
      //     filePath? filePath[1].path:testFirmwareVfs,    // 第二个固件
      //   ];
      const baseArgs = [
        '--chip', 'esp32s3',
        '--port', port,
        '--baud', String(baudRate),
        '--before', 'default_reset',
        '--after', 'hard_reset',
        'write_flash',
        '--flash_mode', 'dio',
        '--flash_size', '32MB',
        '--flash_freq', '80m'
      ];
    
      const flashArgs = files.flatMap(f => [f.address, f.path]);
    
      const args = [...baseArgs, ...flashArgs];
    
      console.log('esptool args:', args);
      const flashProcess = spawn(esptoolPath, args, { encoding: 'utf8' });

      flashProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        if(data.includes('A serial exception error occurred:')||data.includes('fatal error')){
          isTimeout=true
          // flashProcess.kill('SIGKILL');
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

      flashProcess.stderr.on('data', async(data) => {
        console.error(`stderr: ${data}`);
        // if (data.includes('Detected overlap at address')) {
        //   if(getSocket()){
        //     getSocket().send(JSON.stringify({
        //       type: 'burnLogs',
        //       data: { message: {
        //         flashing:true,
        //         logs:`stdout: ${data}`
        //       } }
        //     }))
        //   }
        // }
        // await new Promise(resolve => setTimeout(resolve, 100));
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
        this.canClose = true;
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
    })

    //默认烧录逻辑
    ipc.handle('send-who', async (event, {who,port,filePath,place}) =>{

      if(place){
        console.log(place.first)
      }
      if(place){
        console.log(place.second)
      }
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
      }else if(who=='xiaozhi'){
         console.log(firmwareFilePath);
          console.log(esptoolPath);

          let isError=false

          let isTimeout=false
          
          console.log(filePath)

          this.canClose = false;
          getSocket().send(JSON.stringify({
              type: 'burnLogs',
              data: {
                  message: {
                      flashing: true,
                      logs: '__MODE_SINGLE__'
                  }
              }
          }));

          const args = ['--port', port,"--baud", "1152000", 'write_flash', place? place.first:'0x0', filePath? filePath[0].path:firmwareFilePath];
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

      }else if(who=='standard'){
        //  console.log(firmwareFilePath);
        //   console.log(esptoolPath);

        //   let isError=false

        //   let isTimeout=false
          

        //   this.canClose = false;

        //   // const args = ['--port', port,"--baud", "1152000", 'write_flash', '0x0', testFirmware];

        //   const args = [
        //       '--chip', 'esp32s3',
        //       '--port', port,
        //       '--baud', '1152000',
        //       '--before', 'default_reset',
        //       '--after', 'hard_reset',
        //       'write_flash',
        //       '--flash_mode', 'dio',
        //       '--flash_size', '32MB',
        //       '--flash_freq', '80m',

        //       // 你的两个固件（保持你说的地址）
        //       place? place.first:'0x0', 
        //       filePath? filePath[0].path:commonFilePath,          // 第一个固件
        //       place? place.second:'0x1420000', 
        //       filePath? filePath[1].path:testFirmwareVfs,    // 第二个固件
        //     ];
        //   const flashProcess = spawn(esptoolPath, args, { encoding: 'utf8' });

        //   flashProcess.stdout.on('data', (data) => {
        //     console.log(`stdout: ${data}`);
        //     if(data.includes('A serial exception error occurred:')||data.includes('fatal error')){
        //       isTimeout=true
        //     }
        //     if(getSocket()){
        //       // console.log('可能发送了')
        //       getSocket().send(JSON.stringify({
        //         type: 'burnLogs',
        //         data: { message: {
        //           flashing:true,
        //           logs:`stdout: ${data}`
        //         } }
        //       }))
        //     }
        //     event.sender.send('esptool-log', { type: 'stdout', message: data.toString() });
        //   });

        //   flashProcess.stderr.on('data', (data) => {
        //     console.error(`stderr: ${data}`);
        //     isError=true
        //     if(getSocket()){
        //       // console.log('可能发送了')
        //       getSocket().send(JSON.stringify({
        //         type: 'burnLogs',
        //         data: { message: {
        //           flashing:false,
        //           logs:'Failed'
        //         } }
        //       }))
        //     }
        //     event.sender.send('esptool-log', { type: 'stderr', message: data.toString() });
        //   });

        //   flashProcess.on('close', (code) => {
        //     console.log(`Child process exited with code ${code}`);
        //     if(!isError && getSocket()){
        //       // console.log('可能发送了')
        //       if(isTimeout){
        //         getSocket().send(JSON.stringify({
        //           type: 'burnLogs',
        //           data: { message: {
        //             flashing:false,
        //             logs:''
        //           } }
        //         }))
        //       }else{
        //          getSocket().send(JSON.stringify({
        //           type: 'burnLogs',
        //           data: { message: {
        //             flashing:false,
        //             logs:'success'
        //           } }
        //         }))
        //       }
             
        //     }
        //     this.canClose = true; // ✅ 允许关闭窗口
        //     event.sender.send('esptool-log', { type: 'done', code });
        //   });
        console.log(firmwareFilePath);
        console.log(esptoolPath);
    
        let isError = false;
        let isTimeout = false;
    
        this.canClose = false;
        getSocket().send(JSON.stringify({
          type: 'burnLogs',
          data: {
              message: {
                  flashing: true,
                  logs: '__MODE_DUAL__'
              }
          }
      }));
        // =========================
        // 第一个固件
        // =========================
        const args1 = [
            '--chip', 'esp32s3',
            '--port', port,
            '--baud', '1152000',
            '--before', 'default_reset',
            '--after', 'hard_reset',
    
            'write_flash',
    
            '--flash_mode', 'dio',
            '--flash_size', '32MB',
            '--flash_freq', '80m',
    
            place ? place.first : '0x0',
            filePath ? filePath[0].path : commonFilePath,
        ];
    
        // =========================
        // 第二个固件
        // =========================
        const args2 = [
            '--chip', 'esp32s3',
            '--port', port,
            '--baud', '1152000',
            '--before', 'default_reset',
            '--after', 'hard_reset',
    
            'write_flash',
    
            '--flash_mode', 'dio',
            '--flash_size', '32MB',
            '--flash_freq', '80m',
    
            place ? place.second : '0x1420000',
            filePath ? filePath[1].path : testFirmwareVfs,
        ];
    
        // =========================
        // 公共日志处理
        // =========================
        const bindProcessEvents = (flashProcess, isLastProcess = false) => {
    
            flashProcess.stdout.on('data', (data) => {
    
                console.log(`stdout: ${data}`);
    
                if (
                    data.includes('A serial exception error occurred:') ||
                    data.includes('fatal error')
                ) {
                    isTimeout = true;
                }
    
                if (getSocket()) {
                    getSocket().send(JSON.stringify({
                        type: 'burnLogs',
                        data: {
                            message: {
                                flashing: true,
                                logs: `stdout: ${data}`
                            }
                        }
                    }));
                }
    
                event.sender.send('esptool-log', {
                    type: 'stdout',
                    message: data.toString()
                });
            });
    
            flashProcess.stderr.on('data', (data) => {
    
                console.error(`stderr: ${data}`);
    
                isError = true;
    
                if (getSocket()) {
                    getSocket().send(JSON.stringify({
                        type: 'burnLogs',
                        data: {
                            message: {
                                flashing: false,
                                logs: 'Failed'
                            }
                        }
                    }));
                }
    
                event.sender.send('esptool-log', {
                    type: 'stderr',
                    message: data.toString()
                });
            });
    
            flashProcess.on('close', (code) => {
    
                console.log(`Child process exited with code ${code}`);
    
                // 第一段失败直接结束
                if (code !== 0) {
    
                    this.canClose = true;
    
                    event.sender.send('esptool-log', {
                        type: 'done',
                        code
                    });
    
                    return;
                }
    
                // 最后一个烧录完成
                if (isLastProcess) {
    
                    if (!isError && getSocket()) {
    
                        if (isTimeout) {
    
                            getSocket().send(JSON.stringify({
                                type: 'burnLogs',
                                data: {
                                    message: {
                                        flashing: false,
                                        logs: ''
                                    }
                                }
                            }));
    
                        } else {
    
                            getSocket().send(JSON.stringify({
                                type: 'burnLogs',
                                data: {
                                    message: {
                                        flashing: false,
                                        logs: 'success'
                                    }
                                }
                            }));
                        }
                    }
    
                    this.canClose = true;
    
                    event.sender.send('esptool-log', {
                        type: 'done',
                        code
                    });
                }
            });
        };
    
        // =========================
        // 开始第一次烧录
        // =========================
        const flashProcess1 = spawn(esptoolPath, args1, {
            encoding: 'utf8'
        });
    
        bindProcessEvents(flashProcess1, false);
    
        // =========================
        // 第一次完成后开始第二次
        // =========================
        flashProcess1.on('close', (code) => {
    
            if (code !== 0) {
                return;
            }
    
            console.log('First firmware flash success, start second...');
            if (getSocket()) {
                getSocket().send(JSON.stringify({
                    type: 'burnLogs',
                    data: {
                        message: {
                            flashing: true,
                            logs: '__STAGE_2__'
                        }
                    }
                }));
            }
    
            const flashProcess2 = spawn(esptoolPath, args2, {
                encoding: 'utf8'
            });
    
            bindProcessEvents(flashProcess2, true);
        });

      }else if(who=='microbit'){
        let daplink
        let usbDevice
        try {
            // if (!deviceState.usbDevice) {
            //   throw new Error('未找到连接的USB设备');
            // }
            console.log('aaaaaaaa')
            // return


            //首先连接usb
            const ports = await SerialPort.list();
            const targetPortInfo = ports.find(p => p.path === port);
    
            const isMicrobit = targetPortInfo &&
              targetPortInfo.vendorId === '0D28' &&
              ['0204', '0205'].includes(targetPortInfo.productId?.toUpperCase?.());
    
            if (isMicrobit) {
              console.log('识别为 Micro:bit 设备，尝试初始化 USB 与串口连接');
    
              // 获取 USB 设备
              usbDevice=usb.findByIds(0x0d28, parseInt(targetPortInfo.productId, 16))
              
              if (!usbDevice) {
                return { success: false, error: '未找到匹配的 USB 设备' };
              }
    
              try {
                usbDevice.open();
                // if (usbDevice.interfaces?.length > 0) {
                //   usbDevice.interfaces[0].claim();
                // }
                console.log('usb connect succcess')
              } catch (err) {
                console.warn('USB open failed:', err.message);
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
                return
              }
            }else{
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
              return
            }    

            //获取固件文件地址
            console.log(filePath)
            this.canClose = false;
            let hexPath
            if(filePath){
              hexPath=filePath[0].path
            }else{
              hexPath = getResourcePath('microbit_firmware/MICROBIT(12).hex')
            }
            // 读取HEX文件
            
            console.log(hexPath)
            const hexData = fs.readFileSync(hexPath);
        
            console.log('bbbbbbb')
           // await flashHexToDevice(hexData);
           getSocket().send(JSON.stringify({
              type: 'burnLogs',
              data: {
                  message: {
                      flashing: true,
                      logs: '__MODE_MICROBIT__'
                  }
              }
          }));
           try {
            // 创建DAPLink传输层
            const transport = new DAPjs.USB(usbDevice);
            // getDeviceState().daplink = new DAPLink(transport);
            // setDeviceState(['daplink',new DAPLink(transport)])
            daplink=new DAPLink(transport)
        
            console.log('ccccc')
            // 连接设备
            await daplink.connect();
        
            let lastPercent = -1; // 用于记录上一次的进度
            // 执行烧录
            await new Promise((resolve, reject) => {
              console.log('start flash firmware')
              daplink.on(DAPjs.DAPLink.EVENT_PROGRESS, progress => {
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
        
              daplink.flash(hexData)
                .then(resolve)
                .catch(reject);
            });
          } catch (err) {
            console.log(err)
            this.canClose = true;
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
            // if (getDeviceState().daplink) {
            //   await getDeviceState().daplink.disconnect().catch(() => {});
            //   setDeviceState(['daplink',null])
            // }

            if(daplink){
              await closeDapLink(daplink)
            }
            try {
              if (usbDevice) {
                // if (usbDevice.interfaces?.[0]?.isKernelDriverActive?.()) {
                //   usbDevice.interfaces[0].detachKernelDriver();
                // }
                if (usbDevice.interfaces?.[0]?.claimed) {
                  usbDevice.interfaces[0].release(true, () => {});
                }
                usbDevice.close();
              }
            } catch (err) {
              console.warn('USB 清理时异常:', err.message);
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
        
            this.canClose = true;

            if(daplink){
              await closeDapLink(daplink)
            }
            try {
              if (usbDevice) {
                // if (usbDevice.interfaces?.[0]?.isKernelDriverActive?.()) {
                //   usbDevice.interfaces[0].detachKernelDriver();
                // }
                if (usbDevice.interfaces?.[0]?.claimed) {
                  usbDevice.interfaces[0].release(true, () => {});
                }
                usbDevice.close();
              }
            } catch (err) {
              console.warn('USB 清理时异常:', err.message);
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
            this.canClose = true;
            if(daplink){
              await closeDapLink(daplink)
            }
            try {
              if (usbDevice) {
                // if (usbDevice.interfaces?.[0]?.isKernelDriverActive?.()) {
                //   usbDevice.interfaces[0].detachKernelDriver();
                // }
                if (usbDevice.interfaces?.[0]?.claimed) {
                  usbDevice.interfaces[0].release(true, () => {});
                }
                usbDevice.close();
              }
            } catch (err) {
              console.warn('USB 清理时异常:', err.message);
            }
            
            return { 
              success: false, 
              error: `烧录失败: ${err.message}`,
              ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            };
          }
      }
    })

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
