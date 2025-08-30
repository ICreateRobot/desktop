let port='';



let deviceState = {
  usbDevice: null,
  daplink: null,
  serialPort: null,
  parser: null,
  replActive: false,
  serialBuffer: '',
  currentResolve: null
};

let portCom=''
function setPort(Port) {
  port = Port;
}

function getPort() {
  return port;
}


function getDeviceState(){
  return deviceState
}

function setDeviceState(a){
  deviceState[a[0]]=a[1]
}

function setPortCom(a){
  portCom=a
}
function getPortCom(){
  return portCom
}
// export { getPort, setPort };
module.exports = { getPort, setPort, getDeviceState, setDeviceState ,setPortCom,getPortCom};