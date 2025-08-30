let content=''

function setContent(c){
    content=c
    console.log(c)
    sendDataToServer(c)
}

function getContent(){
    return content
}

const sendDataToServer = (con) => {
    // 发送数据到服务器的函数
    fetch('http://localhost:3000/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: con
    })
    .then(response => response.text())
    .then(data => {
      console.log('服务器响应:', data);
    })
    .catch(error => {
      console.error('错误:', error);
    });
};

export {setContent,getContent}