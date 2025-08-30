
const {myFun} = require('./data.mjs')

class setCode {
    constructor(code1) {
        this.code = code
    }
}
function getCode() {
    return this.code
  }
module.exports = {
    setCode,
    getCode
}

