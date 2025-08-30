let isAdd=false
let hadBlock=false

function setAdd(a){
    isAdd=a
}
function getAdd(){
    return isAdd
}

function setBlock(a){
    hadBlock=a
}
function getBlock(){
    return hadBlock
}

export {setAdd,getAdd,setBlock,getBlock}