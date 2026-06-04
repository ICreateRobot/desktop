let masterVersion={
    icbricks:'',
    icrobot:'',
    microbit:'',
    icrobotHard:''
}


function getVersion(){
    return masterVersion
  }
  
function setVersion(a){
    masterVersion[a[0]]=a[1]
}

module.exports={
    getVersion,
    setVersion
}