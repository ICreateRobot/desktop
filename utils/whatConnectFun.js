let current='';//当前的连接方式

/**
 * 用于设置当前连接方式
 * @param {连接方式} a 
 */
function setCurrent(a){
    current=a
}
/**
 * 
 * @returns 返回当前的连接方式
 */
function getCurrent(){
    return current
}

module.exports={
    setCurrent,
    getCurrent
}
