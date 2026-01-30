let time=Date.now();

function getLastTime(){
    return time
}

function setLastTime(a){
    time=a
}

module.exports={
    getLastTime,
    setLastTime
}