global.code=''
// let state={
//     code:'123'
// }


function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const sendDataToServer = (con) => {
  // 发送数据到服务器的函数
  fetch('http://localhost:3000/get-code', {
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

const debouncedFetchData = debounce(sendDataToServer, 5000);
const codeModule = {
    getCode() {
      // console.log('hello');
      // console.log('CODE' + global.code);
      return global.code;
    },
    setCode(c) {
        global.code = c;
        debouncedFetchData(c)
    }
};



export default codeModule;