const {setLastTime} = require('./portSendLastTime')
let writing = false;

async function safeSerialWrite(port, data) {
  if (!port || !port.isOpen) return;

  // 简单互斥：如果正在写，等一等
  while (writing) {
    await new Promise(r => setTimeout(r, 5));
  }

  writing = true;
  await new Promise(r => setTimeout(r, 100));

  return new Promise(async(resolve, reject) => {
    port.write(data, (err) => {
      writing = false;
      if (err) {
        reject(err);
      } else {
        setLastTime(Date.now()); // ⭐ 只在真正写完后更新时间
        resolve();
      }
    });
  });
}
module.exports={
    safeSerialWrite
}