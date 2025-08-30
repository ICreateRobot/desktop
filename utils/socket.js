let socket=null
let bricksSocket=null
let bricksMotor=null

function setSocket(a){
    socket=a
}

function getSocket(){
    return socket
}

function setBricksSocket(a){
    bricksSocket=a
}

function getBricksSocket(){
    return bricksSocket
}
function setBricksMotor(a){
    bricksMotor=a
}

function getBricksMotor(){
    return bricksMotor
}

module.exports={setSocket,getSocket,setBricksSocket,getBricksSocket,setBricksMotor,getBricksMotor}