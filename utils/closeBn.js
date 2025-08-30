let closeBn=[false,false,false]

function setCloseBn(a){
    for(let i=0;i<a.length;i++){
        closeBn[i]=a[i]
    }
}

function getCloseBn(){
    return closeBn
}

module.exports = {
    getCloseBn,
    setCloseBn
}