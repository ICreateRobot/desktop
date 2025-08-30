// let writer;
// let reader;

// function setWriter(w) {
//   writer = w;
// }

// function setReader(r) {
//   reader = r;
// }

// function getWriter() {
//   return writer;
// }

// function getReader() {
//   return reader;
// }

// module.exports ={ setWriter, setReader, getWriter, getReader };
const { app } = require('electron');

// 在主进程中设置全局变量
global.bleState = {
  writer: null,
  reader: null,
  setWriter(writer) {
    this.writer = writer;
  },
  setReader(reader) {
    this.reader = reader;
  },
  getWriter() {
    return this.writer;
  },
  getReader() {
    return this.reader;
  }
};

module.exports = global.bleState;