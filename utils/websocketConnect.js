
const {setMode,getMode} = require('../utils/mode')
let serialWriteQueue = Promise.resolve();

function safeSerialWrite(port, str) {
  return new Promise((resolve, reject) => {
    // 把任务排进队列
    serialWriteQueue = serialWriteQueue.then(() => {
      return new Promise((res, rej) => {
        port.write(str, (err) => {
          if (err) {
            console.error("11串口写入失败:", err);
            rej(err);
            return reject('Error on write: ' + err.message);
          }
          console.log(`📤 222串口数据已发送: ${str}`);
          res();
          resolve();
        });
      });
    }).catch(err => {
      console.error("串口 safeSerialWrite 队列错误:", err);
    });
  });
}
function websocketConnect(setSocket,Current,getPort,setBricksSocket,setBricksMotor,WebSocket){
const WSS = new WebSocket.Server({ port: 8081 });
  WSS.on('connection', (ws) => {

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true; // 客户端回应 ping → 说明活着
      console.log('pong')
    });

    const pingInterval = setInterval(() => {
      if (ws.isAlive === false) {
        console.log('客户端无响应，关闭连接');
        return ws.terminate(); // 强制关闭
      }

      ws.isAlive = false;
      ws.ping(); // 发送原生 ping（不等于 send）
    }, 20000); // 30秒一次更合适

    ws.on('close', () => {
      // clearInterval(timer);
    });
    setSocket(ws)
    ws.on('message', async function incoming(message) {
      // console.log('Received from client:', message.toString());
      // console.log(JSON.parse(message).type)
      // console.log(JSON.parse(message).data.message)
      if(JSON.parse(message).type=='code'){
        fetch(`http://192.168.4.1:8080/upload_script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json;'
          },
          body: JSON.stringify({ // 将参数转换为 JSON 字符串
              script: JSON.parse(message).data.message
          }),
        })
        .then(response => response.text())
        .then(data => {
          console.log('服务器响应:', data);
          let dataJson=JSON.parse(data)
          if(dataJson.status=='success'){
            // res.send('111')
            // console.log('SUCCESS')
            ws.send(JSON.stringify({
              type:'wifiDown',
              data:{message:'success'}
            }))
          }else{
            ws.send(JSON.stringify({
              type:'wifiDown',
              data:{message:'error'}
            }))
          }
          
        })
        .catch(error => {
          console.error('错误:', error);
          ws.send(JSON.stringify({
            type:'wifiDown',
            data:{message:'error'}
          }))
        });
      }else if(JSON.parse(message).type=='offline'){
        // console.log('##############################################')
        Current.setWifi('')
      }else if(JSON.parse(message).type=='port'){
        let str=JSON.parse(message).data.message
        str+='\n'
        console.log(str)

        // console.log(new Uint8Array(str))
        // console.log(typeof str)

        //  // 转成 Uint8Array
        // const raw = new Uint8Array(str);

        // // 计算 CRC16
        // let crc = crc16(raw);

        // // 新建数组
        // let packet = new Uint8Array(raw.length + 3);

        // // 添加原始数据
        // packet.set(raw, 0);

        // packet[raw.length] = (crc >> 8) & 0xFF;   // 高字节
        // packet[raw.length + 1] = crc & 0xFF;      // 低字节

        // // 在最后添加换行符 \n 
        // packet[raw.length + 2] = 10;

        // console.log(packet);
        console.log(str)
        if(getPort()){
          // await safeSerialWrite(getPort(), str);
          await getPort().write(str, (err) => {
            if (err) {
              return reject('Error on write: ' + err.message);
            }
  
            console.log(`Data sent: ${str}`);
          });
        }
        
      }else if(JSON.parse(message).type=='mode'){
        setMode(JSON.parse(message).data)
      }
      
  });
  })
  const wss = new WebSocket.Server({ port: 8082 });
  // setWss(wss)
  let previousDistance = null;  // 保存上一次的距离数据
  wss.on('connection', (ws) => {
    setBricksSocket(ws)
    ws.on('message', function incoming(message) {
      console.log(message)
    })
      // setInterval(()=>{
      //   ws.send(`${getDistance()}`);
      // },1000)
       // 定期检查 getDistance() 的值是否发生变化
      // setInterval(() => {
      //   const currentDistance = getDistance();  // 获取当前的距离

      //   // 如果当前的距离与之前的不同，则发送新数据
      //   if (JSON.stringify(currentDistance) !== JSON.stringify(previousDistance)) {
      //     console.log('sending')
      //     // ws.send(`${currentDistance}`);
      //     ws.send(JSON.stringify(currentDistance))
      //     previousDistance = currentDistance;  // 更新保存的距离数据
      //   }
      // }, 100);  // 每 100 毫秒检查一次
      
  });
  // createWindow()



  const w = new WebSocket.Server({ port: 8084 });

  w.on('connection', (ws) => {
    setBricksMotor(ws)
    // ws.on('message', function incoming(message) {
    //   console.log(message)
    // })
  })
}

module.exports={
    websocketConnect
}
