
const {app,session,powerSaveBlocker,powerMonitor, webContents} = require('electron');
const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
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





async function initializeAppServices() {
  // 启用必要的命令行开关
  app.commandLine.appendSwitch('enable-experimental-web-platform-features');

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
      if (AbstractWindow.getAllWindows().length == 0 && getWin()) {
        getWin().destroy();
      }
      if (AbstractWindow.getAllWindows()[0].constructor.name != 'EditorWindow') {
        AbstractWindow.getAllWindows().forEach((win) => {
          if (!win.window.isDestroyed()) {
            win.window.close();
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
    initializeAppServices
}