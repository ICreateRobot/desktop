import { getCode } from "./global"

export default async function download() {
    const {getPort} = require("./port");
    alert(getCode())
    alert(getPort())
    let PORT = getPort();
    PORT.on('data', (data) => {
        alert('Received data:', data.toString()); // 将 Buffer 转换为字符串
    });
    try {
        let startMsg=[0xAF,0x04,0x96,0x00,0x01,0x4a]
        const data1 = new Uint8Array(startMsg);
        PORT.write(data1);
    }
    catch (err) {
        alert('发送数据失败: ' + err.message+'\n');
    }
    
}