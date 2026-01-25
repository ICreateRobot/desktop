
const {app,session,powerSaveBlocker,powerMonitor, webContents, ipcMain, ipcRenderer} = require('electron');
const { autoUpdater } = require('electron-updater');
const { dialog,shell  } = require('electron');
// requestSingleInstanceLock() crashes the app in signed MAS builds
// https://github.com/electron/electron/issues/15958
if (!process.mas && !app.requestSingleInstanceLock()) {
  app.exit();
}
const {systemPreferences} = require('electron')
const path = require('path');
const AbstractWindow = require('../src-main/windows/abstract');

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const Bottleneck = require('bottleneck');
const timeout = require('connect-timeout');
const {getWin,setWin} = require('./win')
// const {getWss,setWss} = require('../utils/wsSever')
const WebSocket = require('ws');

const {setPort,getPort,setDeviceState,getDeviceState} = require('./port')

const currentEspIp=require('./currentEspIp')

const {setSocket,getSocket,setBricksSocket,setBricksMotor} = require('./socket')

const { BrowserWindow } = require('electron');
// const wifi = require('node-wifi');
const Current=require('./currentWifi')

const { spawn } = require('child_process');
const {websocketConnect} = require('./websocketConnect')
const {startServer,stopServer} = require('./startServer')
const {APP_VERSION} = require('../src-main/brand');

const Store = require('electron-store').default; // 注意加 .default
const store = new Store();
// store.delete('ignoredVersion');
let DOWNLOAD_URL = 'https://www.icrobot.com/www/cn/index.html#/file/index?type2=ICRobot'; // 软件官网下载地址
const axios = require('axios')

const {setCurrent,getCurrent} = require('./whatConnectFun')

const {translate} = require('../src-main/l10n');


let shouldRelaunch = true;   // 是否重启的标记（用户关闭时设为 false）
let countdownTimer = null;   // 保存 setTimeout
let win = null;              // 提示窗口

function getShouldLaunch(){
  return shouldRelaunch
}

function setCountDownTimer(a){
  countdownTimer=a
}

function setPowerWin(a){
  win=a
}

function getPowerWin(){
  return win
}



// async function getICreateCodeVersions() {
//   const appName = 'ICreateCode';
//   const appVersion = APP_VERSION; // 可以为空，接口会返回所有可用版本

//   try {
//       const response = await fetch(`http://localhost:8086/getAppState?appName=${encodeURIComponent(appName)}&AppVersion=${appVersion}`);
//       const result = await response.json();

//       if (result && result.code === 200) { // 假设 ResultModel 中成功码是 200
//           const appState = result.data;
//           console.log('versionInformation：', appState);

//           // 最新版本
//           console.log('latestVersion:', appState.newAppVersion);

//           // 如果你想要全部版本列表，需要后端稍微改一下，直接返回 appVersionList
//           // 暂时只能通过 newAppVersion 得到最新版本
//       } else {
//           console.error('version failed:', result);
//       }
//   } catch (err) {
//       console.error('fetch error:', err);
//   }
// }


function compareVersion(latest, current) {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
      if ((latestParts[i] || 0) > (currentParts[i] || 0)) return 1;
      if ((latestParts[i] || 0) < (currentParts[i] || 0)) return -1;
  }
  return 0;
}

async function getICreateCodeVersions() {
  const appName = 'ICreateCode';
  const appVersion = APP_VERSION; // 空即可获取所有版本

  try {
      const response = await fetch(`http://139.129.32.56:8086/getAppState?appName=${encodeURIComponent(appName)}&AppVersion=${appVersion}`);
      const result = await response.json();

      if (result && result.code === 200) {
          const appState = result.data;
          const latestVersion = appState.newAppVersion;

          console.log('latestVersion:', latestVersion);

          // 最新版本 <= 当前版本，不需要提示
          if (compareVersion(latestVersion, APP_VERSION) <= 0) return;

          // 检查是否已保存“不再提示”版本
          const ignoredVersion = store.get('ignoredVersion', '0.0.0');
          if (latestVersion === ignoredVersion) {
              console.log(`版本 ${latestVersion} 已选择不再提示，跳过`);
              return;
          }

          console.log('1223343454',translate('updateWindow.cancel'))
          // 弹窗提示用户更新
          const { response: buttonIndex, checkboxChecked } = await dialog.showMessageBox({
              type: 'info',
              title: `${translate('updateWindow.title')}`,
              message: `${translate('updateWindow.msg1')} ${latestVersion}，${translate('updateWindow.msg2')} ${APP_VERSION}。\n${translate('updateWindow.msg3')}`,
              buttons: [translate('updateWindow.download'),translate('updateWindow.cancel')],
              checkboxLabel: `${translate('updateWindow.noalert')}`,
              defaultId: 0,
              cancelId: 1
          });

          if (checkboxChecked) {
              // 保存“不再提示”的最新版本号
              store.set('ignoredVersion', latestVersion);
          }

          if (buttonIndex === 0) {
              // 打开下载链接
              shell.openExternal(DOWNLOAD_URL);
          }

      } else {
          console.error('获取版本信息失败:', result);
      }
  } catch (err) {
      console.error('fetch error:', err);
  }
}


async function getICreateCodeVersionsFromGithub() {
  const appName = 'ICreateCode';
  const appVersion = APP_VERSION; // 空即可获取所有版本
  const githubRepoUrl = 'https://api.github.com/repos/ICreateRobot/software/contents/ICreateCode/version.txt'; // 替换成你的 GitHub 仓库链接

  try {
      // 从 GitHub 获取 version.txt 文件内容
      const response = await fetch(githubRepoUrl);
      const data = await response.json();

      if (data && data.content) {
          // 解码 Base64 内容
          const latestVersion = atob(data.content).trim(); // atob 解码 Base64
          console.log('latestVersion:', latestVersion);

          // 最新版本 <= 当前版本，不需要提示
          if (compareVersion(latestVersion, APP_VERSION) <= 0) return;

          // 检查是否已保存“不再提示”版本
          const ignoredVersion = store.get('ignoredVersion', '0.0.0');
          if (latestVersion === ignoredVersion) {
              console.log(`版本 ${latestVersion} 已选择不再提示，跳过`);
              return;
          }

          console.log('1223343454', translate('updateWindow.cancel'))
          // 弹窗提示用户更新
          const { response: buttonIndex, checkboxChecked } = await dialog.showMessageBox({
              type: 'info',
              title: `${translate('updateWindow.title')}`,
              message: `${translate('updateWindow.msg1')} ${latestVersion}，${translate('updateWindow.msg2')} ${APP_VERSION}。\n${translate('updateWindow.msg3')}`,
              buttons: [translate('updateWindow.download'), translate('updateWindow.cancel')],
              checkboxLabel: `${translate('updateWindow.noalert')}`,
              defaultId: 0,
              cancelId: 1
          });

          if (checkboxChecked) {
              // 保存“不再提示”的最新版本号
              store.set('ignoredVersion', latestVersion);
          }

          if (buttonIndex === 0) {
              // 打开下载链接
              shell.openExternal(DOWNLOAD_URL);
          }
      } else {
          console.error('get vesion failed:', data);
      }
  } catch (err) {
      console.error('fetch error:', err);
  }
}

function detectIsChina() {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,          // 不显示
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    let resolved = false;

    win.webContents.on('console-message', (_, __, message) => {
      if (message.startsWith('__REGION_RESULT__:')) {
        resolved = true;
        // console.log(message)
        const isChina = message.endsWith('CN');
        resolve(isChina);
        win.destroy();
      }
    });

    // 超时兜底（防止卡死）
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolve(false); // 默认按国外处理
        win.destroy();
      }
    }, 8000);

    win.loadURL(`data:text/html;charset=utf-8,
<!DOCTYPE html>
<html>
  <body>
    <script>
      fetch('http://ip-api.com/json')
        .then(res => res.json())
        .then(data => {
          const code = data && data.countryCode === 'CN' ? 'CN' : 'OTHER';
          console.log('__REGION_RESULT__:' + code);
        })
        .catch(() => {
          console.log('__REGION_RESULT__:ERROR');
        });
    </script>
  </body>
</html>
    `);

    win.on('closed', () => {
      clearTimeout(timeout);
    });
  });
}
async function initializeAppServices() {
  // 启用必要的命令行开关
  // app.commandLine.appendSwitch('enable-experimental-web-platform-features');


  // console.log('123',APP_VERSION)
  // 调用

  const isChina = await detectIsChina();

  if (isChina) {
    getICreateCodeVersions();
    console.log('location china');
    DOWNLOAD_URL = 'https://www.icrobot.com/www/cn/index.html#/file/index?type2=ICRobot';
    // 国内逻辑
  } else {
    getICreateCodeVersionsFromGithub()
    console.log('location forign');
    DOWNLOAD_URL = 'https://www.icreaterobot.com/pages/software';
    // 国外逻辑
  }
  
  // 配置USB权限
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'usb') callback(true);
    else callback(true);
  });

  // 启动后台服务
  startServer(express, Bottleneck, path, fs, bodyParser, cors, app, timeout);

  // 摄像头权限
  await checkAndApplyCameraAccess();

  // WebSocket 连接
  websocketConnect(setSocket, Current, getPort, setBricksSocket, setBricksMotor, WebSocket);

  // 定时检测窗口状态
  setInterval(() => {
    try {
      // console.log(AbstractWindow.getAllWindows())
      if (AbstractWindow.getAllWindows().length == 0 && getWin()) {
        getWin().destroy();
      }
      // console.log(AbstractWindow.getAllWindows())
      if (!AbstractWindow.getAllWindows()[0] || AbstractWindow.getAllWindows()[0].constructor.name != 'EditorWindow') {

        console.log('aaaaaaaaaaaaaaaaaaaa')
          shouldRelaunch = false; // 不再重启
      
          if (countdownTimer) {
            clearTimeout(countdownTimer);
            countdownTimer = null;
          }
      
          if (win && !win.isDestroyed()) {
            win.close();
          }
        AbstractWindow.getAllWindows().forEach((win) => {
          if (!win.window.isDestroyed()) {
            win.window.close();
            win.window.destroy();
          }
        });
      }
    } catch (e) {
      console.log(e);
    }
  }, 2000);

  // 在线检测
  const interval = 2000; // 检查间隔，单位毫秒
  let lastStatus = null;
  function checkOnline() {
    const ip = currentEspIp.getIp();
    if (!ip) return;

    const ping = spawn('ping', ['-n', '4', ip]); // Windows: -n 是次数
    let output = '';

    ping.stdout.on('data', (data) => {
      output += data.toString();
    });

    ping.stderr.on('data', (data) => {
      console.error(`ping stderr: ${data}`);
    });

    ping.on('close', () => {
      const successMatches = output.match(/TTL=/gi);
      const successCount = successMatches ? successMatches.length : 0;

      const isOnline = successCount >= 1;

      if (isOnline !== lastStatus) {
        console.log(`[statusChange] ESP32 device ${isOnline ? '🟢 online' : '🔴 offline'}`);
        if (getSocket() && !isOnline) {
          currentEspIp.setIp('');
          setCurrent('')
          getSocket().send(JSON.stringify({
            type: 'espIpStatus',
            data: { message: true }
          }));
        }
        lastStatus = isOnline;
      } else {
        console.log(`[pingCheck] ESP32 untile ${isOnline ? 'online' : 'offline'} (${successCount}/4)`);
      }
    });
  }
  setInterval(checkOnline, interval);

  // 自动更新封装
  function safeCheckForUpdates() {
    return autoUpdater.checkForUpdates().catch((err) => {
      console.warn('自动更新检查失败:', err.message);
      return null;
    });
  }

  function setupAutoUpdater() {
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-downloaded', () => {
      const hiddenWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true }
      });

      const choice = dialog.showMessageBoxSync(hiddenWin, {
        type: 'question',
        buttons: ['立即重启', '以后'],
        title: '可更新',
        message: '最新版本已就绪，是否立即更新?'
      });

      hiddenWin.destroy();

      if (choice === 0) {
        autoUpdater.quitAndInstall();
      }
    });

    autoUpdater.on('error', (err) => {
      console.warn('autoUpdater error:', err.message);
    });

    process.on('uncaughtException', (e) => {
      console.warn('未捕获异常:', e.message);
    });

    process.on('unhandledRejection', (reason) => {
      console.warn('未处理拒绝:', reason?.message || reason);
    });

    safeCheckForUpdates();
  }

  // 延迟 3 秒进行更新检查
  setTimeout(() => {
    setupAutoUpdater();
  }, 3000);
}

async function checkAndApplyCameraAccess(){
  
  const cameraPrivilege = systemPreferences.getMediaAccessStatus('camera')
  console.log('aaaaa',cameraPrivilege)
  if(cameraPrivilege!=='granted'){
    try{
      await systemPreferences.askForMediaAccess('camera')

      console.log('#################')
    }catch(error){
      console.log('camera filed'+error)
    }
  }
}

module.exports={
    initializeAppServices,
    setCountDownTimer,
    setPowerWin,
    getPowerWin,
    getShouldLaunch
}