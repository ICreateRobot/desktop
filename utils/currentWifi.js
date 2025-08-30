let currentwifi=''
function getWifi(){
    return currentwifi
}

function setWifi(a){
    currentwifi=a
}

module.exports={
    getWifi,
    setWifi
}