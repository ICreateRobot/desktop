let isDownLoad=0
let code;
let place;
function getCode(){
    return code
}
function setCode(a){
    code=a
}

function getDown(){
    return isDownLoad
}
function setDown(a){
    isDownLoad=a
}
function setPlace(a){
    place=a
}

function getPlace(){
    return place
}

module.exports={getCode,setCode,getDown,setDown,setPlace,getPlace}