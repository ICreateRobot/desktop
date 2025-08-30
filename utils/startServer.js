let extension;
let isConnectBle='1'
let CODE='111';
let DEVList;
const {getCloseBn,setCloseBn} = require('./closeBn')
function startServer(express,Bottleneck,path,fs,bodyParser,cors,app,timeout){
  // 创建 Express 应用程序
  const server = express();
  const limiter = new Bottleneck({
    maxConcurrent: 1, // 设置最大并发数为1，即一次只处理一个请求
    minTime: 500 // 可选：设置最小时间间隔，单位为毫秒
  });

  // 配置端口
  const port = 3000;

  // 指定文件路径
  // const filePath = 'node_modules/scratch-vm/src/extensions/scratch3_hello_world/index.js';
  const filePath = path.join(app.getPath('userData'), 'localWifi.js')

  // 确保路径存在
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // 确保文件存在（如果不存在就创建一个空文件）
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
  // 使用 body-parser 中间件解析请求体
  server.use(bodyParser.text());

  // 允许跨域请求
  server.use(cors());

  server.use(express.json({ limit: '50mb' }));

  // 设置请求超时
  server.use(timeout('3s')); // 设置30秒超时
  server.use((req, res, next) => {
    if (!req.timedout) next();
  });
  // 定义接收数据的路由
  server.post('/save-data', limiter.wrap((req, res) => {
    const data = req.body;
    console.log(data)

      // 清空文件内容
    fs.truncate(filePath, 0, (err) => {
      if (err) {
        console.error('清空文件出错:', err);
        res.status(500).send('内部服务器错误');
        return;
      }

      // 写入新数据
      fs.appendFile(filePath, data + '\n', (err) => {
        if (err) {
          console.error('写入文件出错:', err);
          res.status(500).send('内部服务器错误');
        } else {
          res.status(200).send('dataissaved');
        }
      });
    });
    
  }));

  // 读取文件的路由
    server.get('/read-data', (req, res) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('读取文件出错:', err);
          return res.status(500).send('内部服务器错误');
        }

        // 解析数据
        let ssid = '';
        let password = '';

        const lines = data.split('\n');
        lines.forEach(line => {
          if (line.startsWith('热点名称:')) {
            ssid = line.replace('热点名称:', '').trim();
          } else if (line.startsWith('热点密码:')) {
            password = line.replace('热点密码:', '').trim();
          }
        });

        // 返回 JSON 格式
        res.status(200).json({ ssid, password });
      });
  });

  //保存机器学习项目
  server.post('/save-project', limiter.wrap((req, res) => {
    // console.log(req.body)
    const { projectName, imageDATA, down } = req.body;

    try {
        // 获取 Electron 应用根目录，避免硬编码
        const userDataPath = app.getPath('userData'); // 推荐路径
        console.log(userDataPath)
        const projectsDir = path.join(userDataPath, 'projects');

        if (!fs.existsSync(projectsDir)) {
            fs.mkdirSync(projectsDir, { recursive: true });
        }

        const filePath = path.join(projectsDir, `${projectName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 4));

        console.log(`项目保存到：${filePath}`);
        res.status(200).send({ message: '保存成功' });
    } catch (error) {
        console.error("保存失败:", error);
        res.status(500).send({ message: '保存失败', error });
    }

    
    
  }));

  server.get('/get-projects', limiter.wrap((req, res) => {
      try {
          const userDataPath = app.getPath('userData');
          const projectsDir = path.join(userDataPath, 'projects');

          if (!fs.existsSync(projectsDir)) {
              return res.status(200).send([]); // 目录不存在，返回空数组
          }

          const files = fs.readdirSync(projectsDir);
          const projects = [];

          files.forEach(file => {
              if (path.extname(file) === '.json') {
                  const filePath = path.join(projectsDir, file);
                  const content = fs.readFileSync(filePath, 'utf-8');
                  try {
                      const parsed = JSON.parse(content);
                      projects.push(parsed);
                  } catch (e) {
                      console.warn(`跳过无法解析的文件: ${file}`);
                  }
              }
          });

          res.status(200).send(projects);
      } catch (error) {
          console.error("读取项目失败:", error);
          res.status(500).send({ message: '读取失败', error });
      }
  }));

  server.post('/get-code', limiter.wrap((req, res) => {
    const data = req.body;
    console.log(data)
    CODE=data
    
  }))
  server.get('/get',limiter.wrap((req,res)=>{
    console.log(CODE)
    res.status(200).send(CODE || '');
  }))

  //设置已选扩展
  server.post('/set-extension', limiter.wrap((req, res) => {
    extension=req.body
    console.log("extension"+extension)
    res.status(200).send('OK'); // 或其他响应内容
  }));
  //获得已选扩展
  server.get('/get-extension', limiter.wrap((req, res) => {
    res.status(200).send(extension || 'No extension available'); // 如果extension未定义，则返回'No code available'
  }));

  server.get('/get-devicelist', limiter.wrap((req, res) => {
    res.status(200).send(DEVList || ''); 
  }));

   //主控器是否添加
  server.get('/get-close', limiter.wrap((req, res) => {
    res.status(200).send(getCloseBn() || ''); 
  }));
  //是否成功连接上蓝牙
  server.post('/set-ble', limiter.wrap((req, res) => {
    isConnectBle=req.body
    console.log("isConnectBle"+isConnectBle)
  }));

  server.get('/get-ble', limiter.wrap((req, res) => {
    res.status(200).send(isConnectBle || ''); 
  }));

  // 启动服务器
  server.listen(port, () => {
    console.log(`服务器已启动，正在监听端口 ${port}`);
    // 停止服务器的函数
    // stopServer = () => {
    //   console.log('停止服务器...');
    //   process.exit(0); // 优雅地关闭服务器
    // };
  });
}
function stopServer(){
    console.log('停止服务器...');
    process.exit(0); // 优雅地关闭服务器
}


module.exports={
    startServer,
    stopServer
}