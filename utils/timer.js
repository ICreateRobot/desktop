let netTimer;
function setTimer(a){
    netTimer=a
}

function getTimer(){
    return netTimer
}

module.exports = {
    setTimer,
    getTimer
};