
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
const {getWifiNode} = require('./wifiShare')

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

const {getVersion,setVersion} = require('./currentVersion')

const blocklySystemPrompt = require('./prompts.js')


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
    DOWNLOAD_URL = 'https://drive.google.com/drive/folders/1BelSOfzXOhKQjtSsvhnTnV4FC-a3zJ6A';
    // 国外逻辑
  }
  
  // 配置USB权限
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'usb') callback(true);
    else callback(true);
  });

  // 启动后台服务
  startServer(express, Bottleneck, path, fs, bodyParser, cors, app, timeout);


  const serverAi = express();
  const PORT = 3001;

// 🎨 控制台颜色代码
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// 📊 打印带时间的日志
const log = (emoji, message, color = 'white') => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}${emoji} [${timestamp}] ${message}${colors.reset}`);
};

serverAi.use(cors());
serverAi.use(bodyParser.json());

// 🔧 记录所有请求的中间件
serverAi.use((req, res, next) => {
  log("🔍", `收到 ${req.method} 请求: ${req.path}`, "cyan");
  if (req.method === 'POST' && req.body) {
    log("📦", `请求数据: ${JSON.stringify(req.body).substring(0, 100)}...`, "cyan");
  }
  next();
});

// 🤖 后端代理 DeepSeek 聊天
serverAi.post("/api/chat", async (req, res) => {
  const { description } = req.body;
  
  log("🚀", "=== 开始处理 AI 聊天请求 ===", "magenta");
  log("📝", `用户消息: "${description}"`, "yellow");
  
  if (!description) {
    log("❌", "错误: description 为空", "red");
    return res.status(400).json({ error: "description 不能为空" });
  }

  try {
    log("🔄", "准备调用 DeepSeek API...", "blue");
    log("🔌", "请求 URL: https://api.deepseek.com/chat/completions", "blue");
    
    // 打印请求数据
    const requestData = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是一个友好、礼貌的聊天助手。" },
        { role: "user", content: description }
      ]
    };
    log("📨", `发送给 DeepSeek 的数据: ${JSON.stringify(requestData)}`, "blue");
    
    const startTime = Date.now(); // 记录开始时间
    
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-200b049525cc4ab29094340e824e7434"
        },
        timeout: 30000 // 30秒超时
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log("✅", `DeepSeek API 调用成功！耗时: ${duration}ms`, "green");
    log("📄", `DeepSeek 返回状态: ${response.status}`, "green");
    
    // 打印完整的响应结构
    log("🔍", "完整的 API 响应结构:", "white");
    console.log(JSON.stringify(response.data, null, 2));
    
    const aiText = response.data.choices?.[0]?.message?.content ?? "";
    
    if (aiText) {
      log("💬", `AI 回复内容: ${aiText.substring(0, 100)}...`, "green");
    } else {
      log("⚠️", "警告: AI 回复内容为空", "yellow");
    }
    
    // 发送响应给前端
    res.json({ 
      content: aiText,
      duration: duration,
      timestamp: new Date().toISOString()
    });
    
    log("🎉", "=== 请求处理完成 ===", "magenta");

  } catch (err) {
    const errorTime = Date.now();
    log("❌", "=== API 调用失败 ===", "red");
    
    if (err.response) {
      // 服务器返回了错误状态码
      log("📡", `错误状态码: ${err.response.status}`, "red");
      log("📄", `错误响应数据: ${JSON.stringify(err.response.data)}`, "red");
      log("🔧", `响应头: ${JSON.stringify(err.response.headers)}`, "red");
      
      if (err.response.status === 401) {
        log("🔐", "认证失败: API Key 可能无效或过期", "red");
      } else if (err.response.status === 429) {
        log("⏰", "请求过于频繁，请稍后再试", "red");
      }
    } else if (err.request) {
      // 请求已发送但没有收到响应
      log("📡", "网络错误: 请求已发送但未收到响应", "red");
      log("🌐", `请求详情: ${JSON.stringify(err.request._options)}`, "red");
    } else {
      // 其他错误
      log("💥", `请求配置错误: ${err.message}`, "red");
    }
    
    log("⚡", `错误详情: ${err.message}`, "red");
    
    res.status(500).json({ 
      error: "AI 请求失败",
      details: err.message,
      timestamp: new Date().toISOString()
    });
    
    log("🔄", "=== 错误处理完成 ===", "red");
  }
});



// 🤖 专门生成 Blockly XML 的接口
serverAi.post("/api/blockly", async (req, res) => {
  const { description } = req.body;
  
  log("🚀", "=== 开始处理 Blockly 生成请求 ===", "magenta");
  log("📝", `用户需求描述: "${description}"`, "yellow");
  
  if (!description) {
    log("❌", "错误: description 为空", "red");
    return res.status(400).json({ error: "需求描述不能为空" });
  }

  try {
    log("🔄", "准备调用 DeepSeek API 生成 Blockly 代码...", "blue");
    
    const requestData = {
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: blocklySystemPrompt
        },
        { 
          role: "user", 
          content: `请生成实现以下功能的 Blockly XML 代码：${description}`
        }
      ],
      temperature: 0.3,  // 降低随机性，让输出更稳定
      max_tokens: 2000
    };
    // // 🧩 拼接最终 prompt
    // let finalPrompt = promptSections.base;

    // // 默认一定加 control（避免结构错误）
    // if (!usedModules.includes("control")) {
    //   usedModules.push("control");
    // }

    // usedModules.forEach(m => {
    //   if (promptSections[m]) {
    //     finalPrompt += "\n" + promptSections[m];
    //   }
    // });

    // // fallback（防识别失败）
    // if (usedModules.length === 0) {
    //   log("⚠️", "未识别模块，使用完整 prompt", "yellow");
    //   finalPrompt = blocklySystemPrompt;
    // }

    // log("📦", `最终 prompt 长度: ${finalPrompt.length}`, "blue");
    // const requestData = {
    //   model: "deepseek-chat",
    //   messages: [
    //     { role: "system", content: finalPrompt },
    //     { role: "user", content: `请生成实现以下功能的 Blockly XML 代码：${description}` }
    //   ],
    //   temperature: 0.3,
    //   max_tokens: 2000
    // };
    
    const startTime = Date.now();
    
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-200b049525cc4ab29094340e824e7434"
        },
        timeout: 30000
      }
    );

    const duration = Date.now() - startTime;
    
    log("✅", `Blockly 代码生成成功！耗时: ${duration}ms`, "green");
    
    let aiText = response.data.choices?.[0]?.message?.content ?? "";
    
    // 清理 AI 输出，确保是纯 XML
    aiText = aiText.trim();
    
    // 移除可能的代码块标记
    if (aiText.startsWith('```xml')) {
      aiText = aiText.substring(6);
    }
    if (aiText.startsWith('```')) {
      aiText = aiText.substring(3);
    }
    if (aiText.endsWith('```')) {
      aiText = aiText.substring(0, aiText.length - 3);
    }
    
    // 确保有 <xml> 标签
    if (!aiText.includes('<xml>')) {
      aiText = `<xml>\n${aiText}\n</xml>`;
    }
    
    log("📄", `生成的 Blockly XML (长度: ${aiText.length}):`, "green");
    console.log(aiText);
    
    res.json({ 
      success: true,
      blocklyXml: aiText,
      duration: duration,
      timestamp: new Date().toISOString()
    });
    
    log("🎉", "=== Blockly 生成完成 ===", "magenta");

  } catch (err) {
    log("❌", "=== Blockly 生成失败 ===", "red");
    console.error("详细错误:", err.response?.data || err.message);
    
    res.status(500).json({ 
      success: false,
      error: "生成 Blockly 代码失败",
      details: err.message
    });
  }
});






// 🏥 健康检查端点
serverAi.get("/api/health", (req, res) => {
  log("❤️", "收到健康检查请求", "green");
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ℹ️ 服务器信息端点
serverAi.get("/api/info", (req, res) => {
  log("📊", "收到服务器信息请求", "cyan");
  res.json({
    server: "AI Chat Proxy",
    version: "1.0.0",
    endpoints: [
      "POST /api/chat - AI聊天",
      "GET /api/health - 健康检查",
      "GET /api/info - 服务器信息"
    ],
    memory: process.memoryUsage(),
    node: process.version
  });
});

// 🔍 根路径
serverAi.get("/", (req, res) => {
  log("🏠", "访问根路径", "cyan");
  res.send(`
    <html>
      <head><title>AI 聊天代理服务器</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>🤖 AI 聊天代理服务器运行中</h1>
        <p>服务器已启动，当前时间: ${new Date().toLocaleString()}</p>
        <h3>可用端点:</h3>
        <ul>
          <li><a href="/api/chat">POST /api/chat</a> - AI聊天（需要POST请求）</li>
          <li><a href="/api/health">GET /api/health</a> - 健康检查</li>
          <li><a href="/api/info">GET /api/info</a> - 服务器信息</li>
        </ul>
        <h3>测试聊天:</h3>
        <button onclick="testChat()">测试聊天</button>
        <div id="result"></div>
        <script>
          async function testChat() {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({message: '你好，介绍一下你自己'})
            });
            const data = await response.json();
            document.getElementById('result').innerHTML = 
              '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          }
        </script>
      </body>
    </html>
  `);
});

// 🚀 启动服务器
serverAi.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  log("🚀", `后端代理启动成功！`, "green");
  log("🌐", `访问地址: http://localhost:${PORT}`, "cyan");
  log("📡", `API 端点: http://localhost:${PORT}/api/chat`, "cyan");
  log("❤️", `健康检查: http://localhost:${PORT}/api/health`, "cyan");
  log("📊", `服务器信息: http://localhost:${PORT}/api/info`, "cyan");
  console.log("=".repeat(50) + "\n");
});

// 🎯 添加启动后的提示
process.on('SIGINT', () => {
  log("🛑", "正在关闭服务器...", "yellow");
  process.exit(0);
});

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
          if(Current.getWifi() && getWifiNode()){
            getWifiNode().disconnect((err) => {
              if (err) {
                  console.error('WIFI disconnect error:', err);
              }else{
                console.log('wifi disconnect success');
              }
              
            });
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
          setVersion(['icrobot',''])
          setVersion(['icrobotHard',''])
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