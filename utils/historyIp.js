let historyName=''
let historyPass=''

function getName(){
    return historyName
}

function setName(a){
    historyName=a
}

function getPass(){
    return historyPass
}

function setPass(a){
    historyPass=a
}

module.exports={
    getName,
    setName,
    getPass,
    setPass
}