// /* ======================================================
//    Microbit 固件下载工具（支持无网络兜底）
// ====================================================== */

// const fs = require('fs');
// const path = require('path');
// const os = require('os');
// const http = require('http');
// const https = require('https');
// const axios = require('axios');

// const {getGiteeTooken,getGithubTooken} = require('./tookenConfig')

// /* ================= Git 仓库配置 ================= */

// // ---- GITEE ----
// const GITEE_OWNER  = 'lgmShine';
// const GITEE_REPO   = 'bucket';
// const GITEE_BRANCH = 'master';
// const GITEE_TOKEN  = getGiteeTooken();

// // ---- GITHUB ----
// const GITHUB_OWNER  = 'ICreateRobot';
// const GITHUB_REPO   = 'bucket';
// const GITHUB_BRANCH = 'master';
// const GITHUB_TOKEN  = getGithubTooken();

// const BASE_FOLDER = 'firmware';

// /* ================= URL 构造 ================= */

// function giteeApiUrl(pathname, params = {}) {
//   const qs = new URLSearchParams(params).toString();
//   return `https://gitee.com/api/v5${pathname}${qs ? '?' + qs : ''}`;
// }

// function githubApiUrl(pathname, params = {}) {
//   const qs = new URLSearchParams(params).toString();
//   return `https://api.github.com${pathname}${qs ? '?' + qs : ''}`;
// }

// function giteeRawUrl(p) {
//   return `https://gitee.com/${GITEE_OWNER}/${GITEE_REPO}/raw/${GITEE_BRANCH}/${p}`;
// }

// function githubRawUrl(p) {
//   return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${p}`;
// }

// /* ================= 网络错误识别 ================= */

// function isNetworkError(err) {
//   return (
//     err.code === 'ENOTFOUND' ||
//     err.code === 'ECONNREFUSED' ||
//     err.code === 'ETIMEDOUT' ||
//     err.code === 'EAI_AGAIN'
//   );
// }

// /* ================= Fallback 请求 ================= */

// async function requestWithFallback({ gitee, github }) {
//   try {
//     return await axios.get(gitee.url, { headers: gitee.headers, timeout: 6000 });
//   } catch (e1) {
//     try {
//       return await axios.get(github.url, { headers: github.headers, timeout: 6000 });
//     } catch (e2) {
//       if (isNetworkError(e1) && isNetworkError(e2)) {
//         const err = new Error('NETWORK_OFFLINE');
//         err.code = 'NETWORK_OFFLINE';
//         throw err;
//       }
//       throw e2;
//     }
//   }
// }

// async function fetchRawWithFallback(repoPath) {
//   try {
//     return await axios.get(giteeRawUrl(repoPath), { timeout: 6000 });
//   } catch (e1) {
//     try {
//       return await axios.get(githubRawUrl(repoPath), { timeout: 6000 });
//     } catch (e2) {
//       if (isNetworkError(e1) && isNetworkError(e2)) {
//         const err = new Error('NETWORK_OFFLINE');
//         err.code = 'NETWORK_OFFLINE';
//         throw err;
//       }
//       throw e2;
//     }
//   }
// }

// /* ================= 版本比较 ================= */

// function compareVersion(a, b) {
//   const pa = String(a).split('.').map(n => parseInt(n) || 0);
//   const pb = String(b).split('.').map(n => parseInt(n) || 0);
//   const len = Math.max(pa.length, pb.length);
//   for (let i = 0; i < len; i++) {
//     if ((pa[i] || 0) > (pb[i] || 0)) return 1;
//     if ((pa[i] || 0) < (pb[i] || 0)) return -1;
//   }
//   return 0;
// }

// /* ================= 下载（带网络兜底） ================= */

// function downloadWithFallback(urls, savePath) {
//   return new Promise((resolve, reject) => {
//     const tryNext = (i) => {
//       if (i >= urls.length) {
//         const err = new Error('DOWNLOAD_NETWORK_ERROR');
//         err.code = 'DOWNLOAD_NETWORK_ERROR';
//         return reject(err);
//       }
//       const url = urls[i];
//       const proto = url.startsWith('https') ? https : http;
//       proto.get(url, res => {
//         if (res.statusCode !== 200) return tryNext(i + 1);
//         const ws = fs.createWriteStream(savePath);
//         res.pipe(ws);
//         ws.on('finish', resolve);
//       }).on('error', () => tryNext(i + 1));
//     };
//     tryNext(0);
//   });
// }

// /* ======================================================
//    ⭐ 核心函数
// ====================================================== */

// async function downloadLatestMicrobitHex() {
//   const folders = ['last', 'middle', 'long'];
//   const base = `${BASE_FOLDER}/microbit`;
//   const list = [];

//   for (const f of folders) {
//     try {
//       const res = await requestWithFallback({
//         gitee: {
//           url: giteeApiUrl(`/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${base}/${f}`, { ref: GITEE_BRANCH }),
//           headers: GITEE_TOKEN ? { Authorization: `token ${GITEE_TOKEN}` } : {}
//         },
//         github: {
//           url: githubApiUrl(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${base}/${f}`, { ref: GITHUB_BRANCH }),
//           headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
//         }
//       });

//       const files = res.data || [];
//       const v = files.find(x => x.name === 'version.txt');
//       const h = files.find(x => x.name.endsWith('.hex'));
//       if (!v || !h) continue;

//       const vr = await fetchRawWithFallback(v.path);
//       list.push({ folder: f, version: String(vr.data).trim(), hex: h });
//     } catch (e) {
//       if (e.code === 'NETWORK_OFFLINE') throw e;
//     }
//   }

//   if (!list.length) throw new Error('NO_MICROBIT_FIRMWARE');

//   list.sort((a, b) => compareVersion(b.version, a.version));
//   const best = list[0];

//   const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'microbit-'));
//   const savePath = path.join(tmpDir, best.hex.name);

//   await downloadWithFallback(
//     [giteeRawUrl(best.hex.path), githubRawUrl(best.hex.path)],
//     savePath
//   );

//   return {
//     version: best.version,
//     folder: best.folder,
//     hexPath: savePath
//   };
// }


// async function getLatestMicrobitVersion() {
//     const folders = ['last', 'middle', 'long'];
//     const base = `${BASE_FOLDER}/microbit`;
//     const list = [];
  
//     for (const f of folders) {
//       try {
//         const res = await requestWithFallback({
//           gitee: {
//             url: giteeApiUrl(
//               `/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${base}/${f}`,
//               { ref: GITEE_BRANCH }
//             ),
//             headers: GITEE_TOKEN
//               ? { Authorization: `token ${GITEE_TOKEN}` }
//               : {}
//           },
//           github: {
//             url: githubApiUrl(
//               `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${base}/${f}`,
//               { ref: GITHUB_BRANCH }
//             ),
//             headers: GITHUB_TOKEN
//               ? { Authorization: `token ${GITHUB_TOKEN}` }
//               : {}
//           }
//         });
  
//         const files = res.data || [];
//         const v = files.find(x => x.name === 'version.txt');
//         if (!v) continue;
  
//         const vr = await fetchRawWithFallback(v.path);
  
//         list.push({
//           folder: f,
//           version: String(vr.data).trim()
//         });
//       } catch (e) {
//         if (e.code === 'NETWORK_OFFLINE') throw e;
//         // 单个目录失败直接跳过
//       }
//     }
  
//     if (!list.length) {
//       throw new Error('NO_MICROBIT_VERSION_FOUND');
//     }
  
//     // 按版本号倒序
//     list.sort((a, b) => compareVersion(b.version, a.version));
  
//     return list[0]; // { version, folder }
// }
// /* ================= 导出 ================= */

// module.exports = {
//   downloadLatestMicrobitHex,
//   getLatestMicrobitVersion
// };

/* ======================================================
   Microbit 固件下载工具（OSS 版）
====================================================== */

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

/* ======================================================
   OSS 配置
====================================================== */

const OSS_BASE_URL =
  'https://arkt-advert.oss-cn-beijing.aliyuncs.com';

const BASE_FOLDER = 'firmware/microbit';

const FOLDERS = ['last', 'middle', 'long'];

/* ======================================================
   版本比较
====================================================== */

function compareVersion(a, b) {

  const normalize = (v) =>
    String(v)
      .split('-')[0]
      .split('.')
      .map(n => parseInt(n) || 0);

  const pa = normalize(a);
  const pb = normalize(b);

  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {

    if ((pa[i] || 0) > (pb[i] || 0)) {
      return 1;
    }

    if ((pa[i] || 0) < (pb[i] || 0)) {
      return -1;
    }
  }

  return 0;
}

/* ======================================================
   获取 info.json
====================================================== */

async function getFirmwareInfo(folder) {

  const infoUrl =
    `${OSS_BASE_URL}/${BASE_FOLDER}/${folder}/info.json`;

  const res = await axios.get(infoUrl, {
    timeout: 5000
  });

  let info = {};

  try {

    info =
      typeof res.data === 'string'
        ? JSON.parse(res.data)
        : res.data || {};

  } catch (err) {

    console.error(
      '[Microbit Info Parse Error]',
      err
    );

    info = {};
  }

  return info;
}

/* ======================================================
   下载文件
====================================================== */

async function downloadFile(url, savePath) {

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
}

/* ======================================================
   获取最新版本
====================================================== */

async function getLatestMicrobitVersion() {

  const list = [];

  for (const folder of FOLDERS) {

    try {

      const info = await getFirmwareInfo(folder);

      list.push({
        folder,
        version: info.version || '0.0.0',
        description: info.description || {
          zh: '',
          en: ''
        }
      });

    } catch (err) {

      console.warn(
        `[Microbit] Skip ${folder}`,
        err.message
      );
    }
  }

  if (!list.length) {

    throw new Error(
      'NO_MICROBIT_VERSION_FOUND'
    );
  }

  list.sort((a, b) =>
    compareVersion(
      b.version,
      a.version
    )
  );

  return list[0];
}

/* ======================================================
   下载最新固件（带缓存）
====================================================== */

async function downloadLatestMicrobitHex() {

  const latest =
    await getLatestMicrobitVersion();

  const version =
    latest.version || '0.0.0';

  const safeVersion =
    version.replace(/[\\/:*?"<>|]/g, '_');

  const cacheDir =
    path.join(
      os.tmpdir(),
      `microbit-${safeVersion}`
    );

  const hexName = 'MICROBIT.hex';

  const hexPath =
    path.join(cacheDir, hexName);

  /* =========================
     缓存命中
  ========================= */

  if (
    fs.existsSync(cacheDir) &&
    fs.existsSync(hexPath)
  ) {

    console.log(
      '[Microbit Cache Hit]',
      cacheDir
    );

    return {
      version,
      folder: latest.folder,
      hexPath,
      cached: true,
      description:
        latest.description || {
          zh: '',
          en: ''
        }
    };
  }

  /* =========================
     创建缓存目录
  ========================= */

  fs.mkdirSync(cacheDir, {
    recursive: true
  });

  /* =========================
     下载 HEX
  ========================= */

  const hexUrl =
    `${OSS_BASE_URL}/${BASE_FOLDER}/${latest.folder}/${hexName}`;

  console.log(
    '[Microbit Download]',
    hexUrl
  );

  await downloadFile(
    hexUrl,
    hexPath
  );

  return {
    version,
    folder: latest.folder,
    hexPath,
    cached: false,
    description:
      latest.description || {
        zh: '',
        en: ''
      }
  };
}

/* ======================================================
   导出
====================================================== */

module.exports = {
  downloadLatestMicrobitHex,
  getLatestMicrobitVersion
};
