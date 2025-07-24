let POSE;
let poseNetmode = null; // 存储加载的模型
var detectionInterval = null; // 存储模型绘制定时器 ID
var showInterval = null;//展示训练好的模型定时器

let data=[];
var shootTime= null;//拍摄定时器
let relation=[];//建立图片与训练数据的联系

let epo=50;
let batch=32;
// const { ipcRenderer } = require('electron');

let isTrain=false;//是否训练模型

var classData=[];//训练后的所有类
var saveClassData=[]//保存项目时类名

const channelModelName=new BroadcastChannel('modelName')

const channelClassName =new BroadcastChannel('classInfo')

const channelWhatModel = new BroadcastChannel('whatModel')

const waitLoad = document.getElementById('waitLoad');
waitLoad.classList.remove('hidden'); // 显示加载动画

/*TensorFlow.js 已经准备就绪*/
tf.ready().then(() => {
  console.log("使用后端: ", tf.getBackend());//获取当前 TensorFlow.js 所使用的计算后端
  tf.setBackend('webgl').then(() => {//切换后端
      console.log("切换到webgl后端.");
      loadMobilenet()
  });
});

// let channelVideo = new BroadcastChannel('channelVideo')


/*let modelUrl = './image/modules/model.json'; // 使用相对路径
async function loadMobilenet() {
    poseNetmode = await mobilenet.load()
    //poseNetmode = await tf.loadGraphModel(modelUrl);
//    poseNetmode = await mobilenet.load({
//          modelUrl:modelUrl,
//          version: 1,
//          alpha: 1.0 // 或其他适合的值
//        })
 //   poseNetmode = await tf.loadGraphModel('www/modules/model.json');


    poseNetmode = poseNetmode.model;
    console.log("加载完成")
    waitLoad.classList.add('hidden'); // 隐藏加载动画
}*/

async function loadMobilenet() {
//    try {
//        // 优先从 IndexedDB 加载
//        poseNetmode = await tf.loadGraphModel('indexeddb://mobilenet-model-i1');
//        console.log('模型已从 IndexedDB 加载');
//    } catch (error) {
//        console.warn('从 IndexedDB 加载模型失败，尝试从网络加载:', error);
//
//        // 如果 IndexedDB 加载失败，从网络加载
//
//        poseNetmode = await tf.loadGraphModel(h);
//        console.log('模型已从网络加载');
//
//        // 保存到 IndexedDB
//        await poseNetmode.save('indexeddb://mobilenet-model-i1');
//        console.log('模型已保存到 IndexedDB');
//    }
    let h = "./image/modules/model.json"
    poseNetmode = await mobilenet.load({
        modelUrl:h,
        version: 1,
        alpha: 1.0 // 或其他适合的值
      })
    poseNetmode = poseNetmode.model;
    console.log("加载完成")
    
    if(openFileEnd=='T'){
        waitLoad.classList.add('hidden'); // 隐藏加载动画
    }else{
        document.getElementById('load').innerHTML = window.parent.block_msg_load_file;
    }

}




// 检测姿势并在视频上绘制
async function detectPoseInRealTime(md,v,c) {

}

// 处理 'touchstart' 和 'mousedown' 事件
function handleButtonStart(e) {
    e.preventDefault();
    e.stopPropagation();
    document.addEventListener('mouseup', handleButtonEnd);
    document.addEventListener('touchend', handleButtonEnd);

    var parentId = $(classChecked_div).attr('id');//获取card的id
    parentId = parentId.split('-');
    var label = parentId[1]-1;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 设置 canvas 的尺寸与视频相同
    canvas.width = video.width;
    canvas.height = video.height;
    canvas.transform='scaleX(-1)';

    shootTime=setInterval(()=>{
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 将 canvas 的图片数据展示为图片
        const img = document.createElement('div');
        //img.src = canvas.toDataURL('image/png');
        img.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`;
        img.style.backgroundSize = 'cover';  // 确保图片覆盖整个 div
        img.style.backgroundPosition = 'center';
        img.classList.add('photo');
        img.id='img'+NUM_IMG;

        // 删除按钮
        const img_del = document.createElement('div');
        img_del.classList.add('img_del');
        img_del.innerHTML = '×';
        img_del.setAttribute('onclick', 'deletePhoto(this)');

        img.appendChild(img_del);
        $(classChecked_div).find('.photoLibrary').append(img);
        $(classChecked_div).find('.photoLibrary').scrollTop($(classChecked_div).find('.photoLibrary')[0].scrollHeight);

        //显示样本数量
        $(classChecked_div).find('.card_numText_n').text(parseInt($(classChecked_div).find('.card_numText_n').text())+1);
        //统计所有样本数
        sampleSize++;
        NUM_IMG++;

        const frame = tf.browser.fromPixels(video)
                      .resizeNearestNeighbor([224, 224])
                      .expandDims()
                      .toFloat()
                      .div(tf.scalar(255));

        const processedFrame =  poseNetmode.predict(frame);

        relation.push({frame:processedFrame,label:label,img:img.id})
        data.push({frame:processedFrame,label:label});
        const frameArray = processedFrame.arraySync();
        imageDATA.push({label:label,url:canvas.toDataURL('image/png'),data:{frame:processedFrame,label:label}});
        //console.log(imageDATA)
    },400)
}


// 开始检测
function startDetection() {
    /*if (!poseNetmode) {
        console.log("模型尚未加载");
        return;
    }
    if (detectionInterval) {
        console.log("检测已在进行中");
        return;
    }
    detectionInterval = setInterval(() => {
        detectPoseInRealTime(poseNetmode,video,'canvas');
    }, 200); // 10 FPS
    console.log("姿势检测已启动");*/
}

// 停止检测
function stopDetection() {
    /*if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        console.log("姿势检测已停止");
    } else {
        console.log("没有正在进行的检测");
    }*/
}


/*训练时使用*/
let model;
createModel()
async function createModel() {
   /* if (model) {
        model.dispose();  // 释放旧的模型
    }*/
    model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [1001], units: NUM_CLASS, activation: 'softmax' }));//2024/10/18
    model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy'] });
    //alert(SUM_CLASS)
    //return model;
}

let labelClass = [];//label集合，放置当前训练模型的lable，比对数据对齐
/*训练模型*/
let labelsData=[],imageData = [];

function showToast(message, duration = 3000) {
    // 如果 toast 容器不存在，则创建一个
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        Object.assign(container.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });
        document.body.appendChild(container);
    }

    // 创建 toast 元素
    const toast = document.createElement('div');
    toast.textContent = message;

    // 样式设置
    Object.assign(toast.style, {
        background: '#333',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        maxWidth: '300px'
    });

    // 添加 toast 到容器
    container.appendChild(toast);

    // 强制触发重绘以启用动画
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            toast.remove();
            // 若容器内无子元素则移除容器
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300); // 等动画结束
    }, duration);
}

async function trainModel() {
    if(isTraining) return
    if(SUM_CLASS<2) return
    isTraining=true
    closeAllCamera()
    // showToast('请稍后，不要关闭此界面')
    await tf.setBackend('cpu')
    console.log(data)
    createModel();
    imageData = [];
    labelsData = [];
    labelClass=[];
    // data.forEach((con,index)=>{
    //     imageData.push(con.frame)
    //     labelsData.push(con.label)
    //     // 杜绝重复添加
    //     if (!labelClass.includes(con.label)) {
    //         labelClass.push(con.label);
    //     }
    // })
    // labelClass.sort((x, y) => x - y);
    

    relation.sort((a, b) => a.label - b.label);
    data.sort((a, b) => a.label - b.label);
    imageDATA.sort((a, b) => a.label - b.label);

    data.forEach((con,index)=>{
        imageData.push(con.frame)
        labelsData.push(con.label)
        // 杜绝重复添加
        if (!labelClass.includes(con.label)) {
            labelClass.push(con.label);
        }
    })

    const inputs = tf.stack(imageData).squeeze();
    const labels = tf.tensor1d(labelsData, 'float32');
    epo=document.getElementById('epo').value
    batch=document.getElementById('batch').value
    await model.fit(inputs, labels, {
       epochs: epo,
       batchSize: Number(batch),
       callbacks: {
          onEpochEnd: (epoch, logs) =>{
              progressText.text (`已完成 ${Math.ceil(((epoch+1)/epo)*100)} %`);
              barTrain.css('width', `${Math.ceil(((epoch+1)/epo)*100)}%`);
          }
       }//训练进度
    });


    isTraining=false
    isTrain=true;
    className();//获取类名并修改展示标题
    startShow();//进行检测

    tf.setBackend('webgl')
    trainModel_end();//恢复样式
}

function preprocessData(data) {
    return data.map(item => ({
        x: tf.tensor2d([item.pose.flat()]),
        y: tf.oneHot(parseInt(item.label), SUM_CLASS)
    }));
}
function toggleAdvanced() {
    const advanced = document.getElementById('advancedSettings');
    const arrow = document.getElementById('arrowIcon');
    advanced.classList.toggle('expanded');
    arrow.innerText = advanced.classList.contains('expanded') ? '▴' : '▾';
}
/*获取类名并修改展示标题*/
function className(){
    const cardContainer = document.getElementById('class_show');
    cardContainer.innerHTML = '';
    classData=[];//清空
    for(let i=0;i<SUM_CLASS;i++){
        var name = $('#cards-container > div:eq('+i+') input').val()
        const card = document.createElement('div');
        card.classList.add('class_show_card');
        card.id = 'class_show_card_'+i;
        card.innerHTML = `
            <div class="class_show_name" >${name}</div>
            <div class='class_show_progressTrain'><div class='class_show_barTrain'></div></div>
            <div class="class_show_num" >0%</div>
        `;
        cardContainer.appendChild(card);
        classData.push(name)

    }
}

/*在展示区进行识别*/
async function startShow(){
    playModelType = true;
    $('#exportModel').text(window.parent.block_msg_exportModel_stop);//停止测试

    /*打开相机*/
    // videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // show_video.srcObject = videoStream;
    // channelVideo.postMessage(show_video.id)
    // var trainModel_classNUM = SUM_CLASS;

    if(whatCamera=='local'){
        show_video=document.getElementById('show_cameraView')
        document.getElementById('show_netCamera').style.display='none'
        show_video.style.display='block'
        channelVideo.postMessage(show_video.id)
        var trainModel_classNUM = SUM_CLASS;
    }else{
        show_video=document.getElementById('show_netCamera')
        document.getElementById('show_cameraView').style.display='none'
        if(whatCamera =='network'){
            show_video.src=`http://${ip}:81/stream`
        }else{
            show_video.src=`http://${ip}:8081/video_feed`
        }
        
        show_video.style.display='block'
        // channelVideo.postMessage(show_video.id)
        var trainModel_classNUM = SUM_CLASS;
    }
    //在展示窗口绘制
    showInterval = setInterval(() => {
        //detectPoseInRealTime(poseNetmode,show_video,'show_canvas');
        show_value(trainModel_classNUM);
    }, 150); // 10 FPS
    $('#showLoad').css('display', 'none');
}

/*展示区实时显示数据*/
async function show_value(num){
    if(!isTrain) return;

    let poseClass = await predict()
    //alert(poseClass)
    //所有数据刷新
    for(let i=0;i<labelClass.length;i++){//
        var card = document.getElementById('class_show_card_'+i);
        document.querySelector('#class_show_card_'+i+' .class_show_num').innerHTML=`${(poseClass[0][labelClass[i]]*100).toFixed(0)}%`;
        document.querySelector('#class_show_card_'+i+' .class_show_barTrain').style.width=`${(poseClass[0][labelClass[i]]*100).toFixed(0)}%`;
    }
}
/*结束展示*/
function endShow(){console.log("结束识别");
    playModelType = false;
    $('#exportModel').text(window.parent.block_msg_exportModel);//测试模型
    /*打开相机*/
    // 停止所有视频流
    channelVideo.postMessage('close')
    if(show_video.srcObject) show_video.srcObject = null;
    if(show_video.src) show_video.src = null
    clearInterval(showInterval);
    $('#showLoad').css('display', 'block');
}
/*使用模型*/
async function predict() {
    return tf.tidy(() => {
        const frame = tf.browser.fromPixels(show_video)
            .resizeNearestNeighbor([224, 224])
            .expandDims()
            .toFloat()
            .div(tf.scalar(255));

        const processedFrame = poseNetmode.predict(frame).squeeze();
        const prediction = model.predict(processedFrame.expandDims(0));
        const result = prediction.arraySync();  // 如果 prediction 是张量，这样将其转为数组
        return result;
    });
}


/*打开项目界面初始化*/
function INIpage(projectName,image){
    imageDATA = image;
    oldProjectName = projectName;

    /*名称说明*/
    projectName = projectName.split('-');
    $('#tilt').text(projectName[0])
    $('#explain').val(projectName[1])

    if(image.length == 0 || image[0].SUM_CLASS == 0){
        return;
    }
    /*类别计数*/
    NUM_CLASS = image[0].NUM_CLASS;
    SUM_CLASS = image[0].SUM_CLASS;
    document.getElementById('cards-container').innerHTML ='';//清空类选项
    const cardContainer = document.getElementById('cards-container');//卡片放置处


    /*图像*/
    try{
        for(let i=0;i<image.length;i++){
            const newImg = document.createElement('div');
            //newImg.src = image[i].url;
            newImg.style.backgroundImage = `url(${image[i].url})`;
            newImg.style.backgroundSize = 'cover';  // 确保图片覆盖整个 div
            newImg.style.backgroundPosition = 'center';
            newImg.classList.add('photo');
            newImg.id='img'+NUM_IMG;

            // 删除按钮
            const img_del = document.createElement('div');
            img_del.classList.add('img_del');
            img_del.innerHTML = '×';
            img_del.setAttribute('onclick', 'deletePhoto(this)');

            newImg.appendChild(img_del);
            let card = document.getElementById('card-'+(image[i].label+1));
            if (!card) {
                // 如果没有这个元素，就创建一个新的 div 元素
                card = document.createElement('div');
                card.classList.add('card');
                card.id = 'card-'+(image[i].label+1);
                // card.innerHTML = `
                //     <div class="card_top" ></div>
                //     <input type="text"  value="${image[i].labelName}" />
                //     <button class="delete" onclick="deleteCard(this)">×</button>
                //     <button class="camera" onclick="openCamera(this)"></button>
                //     <button class="upload gray" onmousedown="handleButtonStart(event)" onmouseup="handleButtonEnd(event)" ontouchstart="handleButtonStart(event)" ontouchend="handleButtonEnd(event)"></button>
                //     <p class="card_numText"><span class="card_numText_n">0</span>个图像样本</p>
                //     <div class="photoLibrary"> </div>
                // `;//个图像样本

                card.innerHTML=`
                <div class="card_top"></div>
                    <input type="text"  value="${image[i].labelName}" />
                    <button class="delete" onclick="deleteCard(this)">×</button>
                    <div style="height: 1px; width: 100%; border-bottom: 1px solid black;"></div>
                    <div class="cameraBn" style="display: flex;">
                        <button class="camera" onclick="openCamera(this)"></button>
                        <button class="upFile" onclick="openFile(this)"></button>
                    </div>
                    <div class="cameraWin" id="cameraWin${image[i].label+1}">
                        <video class="cameraView" width="320" height="240" id="cameraView${image[i].label+1}"  autoplay muted></video>
                        <img class="netCamera"  crossorigin="anonymous" id="netCamera${image[i].label+1}">
                        <canvas class="cameraView" width="320" height="240" id="canvas${image[i].label+1}" ></canvas>
                
                        <button class="cameraWinButton_close">×</button>
                    </div>
                    <button class="upload gray" onmousedown="handleButtonStart(event)" onmouseup="handleButtonEnd(event)" ontouchstart="handleButtonStart(event)" ontouchend="handleButtonEnd(event)">长按此处持续拍照</button>
                    <p class="card_numText"><span class='card_numText_n'>0</span><span id='n1'>个图像样本</span></p>
                    <div class="photoLibrary"> </div>
                   
                `
                // 将新卡片添加到 container 中
                cardContainer.appendChild(card);
            }
            card.querySelector('.photoLibrary').appendChild(newImg)

            //显示样本数量
            card.querySelector('.card_numText_n').textContent = parseInt(card.querySelector('.card_numText_n').textContent)+1;
            sampleSize++;
            NUM_IMG++;

            image[i].data.frame=tf.tensor(image[i].data.frame)
            let cent=image[i].data
            cent.img=newImg.id
            relation.push(cent)
            data.push(image[i].data)
        }
        $('.cameraWinButton_close').click(function() {
            closeCameraWin();
        });
    }catch(e){
        console.log(e);
        console.log(JSON.stringify(e));
    }
    openFileEnd='T';
    if(poseNetmode!=null){
        waitLoad.classList.add('hidden'); // 隐藏加载动画
    }

}

/*保存项目*/
function saveProject(down){

    relation.sort((a, b) => a.label - b.label);
    data.sort((a, b) => a.label - b.label);
    imageDATA.sort((a, b) => a.label - b.label);
    console.log('保存项目')
    var saveMname=$('#tilt').text();
    var saveExplain=$('#explain').val();
    if(saveMname==""){
        alert(window.parent.error_projectNull)//"项目名称不能为空"
        return
    }else if(saveMname.includes('-')){
        alert(window.parent.file_saveFailure2)//"存在非法字符 - "
        return
    }else if(saveExplain.includes('-')){
        alert(window.parent.file_saveFailure2)//"存在非法字符 - "
        return
    }else if(saveMname.includes(' ')){
        alert(window.parent.error_projectSpan)//"不能使用空格"
        return
    }
    /*重新获取类名集合*/
    saveClassData={};
    var nullClass=0;//统计类别为空数量
    for(let i=0;i<SUM_CLASS;i++){
        var name = $('#cards-container > div:eq('+i+') input').val();
        var cardID = $('#cards-container > div').eq(i).attr('id');
        cardID = cardID.split('-');
        // 判断当前 div 下是否有 class 为 photoLibrary 的子元素
        if ($('#cards-container > div:eq('+i+') .photoLibrary').children().length < 1) {
            nullClass++;
        }
        //saveClassData.push(name)
        saveClassData[cardID[1]-1] = name;
    }
    for(let i=0;i<imageDATA.length;i++){
        imageDATA[i].labelName=saveClassData[imageDATA[i].label];
        imageDATA[i].SUM_CLASS=SUM_CLASS - nullClass;//类别总和
        imageDATA[i].NUM_CLASS=NUM_CLASS;//计数位置
        if(typeof imageDATA[i].data.frame.arraySync === "function"){
            imageDATA[i].data.frame=imageDATA[i].data.frame.arraySync();
        }
        
    }
    if(imageDATA.length==0) return;//没数据直接返回

    var time = new Date();
    var y=time.getFullYear(); //获取当前年份
    var m=time.getMonth()+1; //获取当前月份(0-11,0代表1月)
    var d=time.getDate(); //获取当前日(1-31)
    var h=time.getHours(); //获取当前小时数(0-23)
    var mn=time.getMinutes(); //获取当前分钟数(0-59)
    var s=time.getSeconds();

    let projectName=saveMname+'-'+$('#explain').val()+'-'+y+m+d+h+mn+s+'.icIMP.I';
    let content = {
        oldProjectName:oldProjectName,
        projectName:projectName,
        imageDATA:imageDATA,
        down:down
    }

    console.log(content)

    // === 2. 上传到主进程 Express 服务 ===
    // fetch('http://localhost:3000/save-project', {
    // method: 'POST',
    // headers: {
    //     'Content-Type': 'application/json'
    // },
    // body: JSON.stringify(content)
    // }).then(response => {
    //     if (!response.ok) throw new Error('Network response was not ok.');
    //     console.log("项目已发送到主进程保存目录");
    // }).catch(err => {
    //     console.error("发送项目失败:", err);
    // });
    try{
        // 将对象转换为 JSON 字符串
        let jsonData = JSON.stringify(content, null, 4);

        // 创建 Blob
        let blob = new Blob([jsonData], { type: "application/json" });

        // 创建下载链接
        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = projectName + ".json"; // 设置下载的文件名
        document.body.appendChild(a);
        a.click()

        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }catch(e){
        console.log(e)
    }
    
    // 保存项目 JSON 文件
    // p.writeMPFile(oldProjectName,projectName,imageDATA,down);
    oldProjectName = projectName;//新老更替
}




function removeKeysWithPrefix(prefix) {
    let keysToRemove = [];

    // 遍历 localStorage 找到所有匹配的键
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }

    // 删除找到的键（因为不能在遍历时修改 localStorage）
    keysToRemove.forEach(key => localStorage.removeItem(key));
}
/*保存模型*/
async function saveModel(){

    relation.sort((a, b) => a.label - b.label);
    data.sort((a, b) => a.label - b.label);
    imageDATA.sort((a, b) => a.label - b.label);
    console.log(model);
    removeKeysWithPrefix("tensorflowjs_models");
    var saveMname=$('#tilt').text();
    if(saveMname==""){
       alert("项目名称不能为空")//"项目名称不能为空"
       return
    }else if(saveMname.includes('-')){
        alert("存在非法字符 - ")//"存在非法字符 - "
        return
    }else if(saveMname.includes(' ')){
        alert("不能使用空格")//"不能使用空格"
        return
    }

    var time = new Date();
    var y=time.getFullYear(); //获取当前年份\
    var m=time.getMonth()+1; //获取当前月份(0-11,0代表1月)
    var d=time.getDate(); //获取当前日(1-31)
    var h=time.getHours(); //获取当前小时数(0-23)
    var mn=time.getMinutes(); //获取当前分钟数(0-59)
    var s=time.getSeconds();

    let modelName = saveMname+'-'+y+m+d+h+mn+s+".icIM";
    channelModelName.postMessage(modelName)
    // console.log(labelClass)
    // console.log(classData)
    channelClassName.postMessage([labelClass,classData])

    channelWhatModel.postMessage('image')

    await model.save('localstorage://'+modelName)

    // await model.save('downloads://my-model');
    // await model.save('file:///D:/esp-ai');
    
    // let dataModel=[]
    // let modelTopology='tensorflowjs_models/'+modelName+'/model_topology'
    // let weightData='tensorflowjs_models/'+modelName+'/weight_data'
    // let weightSpecs='tensorflowjs_models/'+modelName+'/weight_specs'
    // let info='tensorflowjs_models/'+modelName+'/info'
    // let modelMetadata='tensorflowjs_models/'+modelName+'/model_metadata'
    // dataModel.push({
    //   key:modelTopology,
    //   value:localStorage.getItem(modelTopology)
    // })
    // dataModel.push({
    //   key:weightData,
    //   value:localStorage.getItem(weightData)
    // })
    // dataModel.push({
    //   key:weightSpecs,
    //   value:localStorage.getItem(weightSpecs)
    // })
    // dataModel.push({
    //   key:info,
    //   value:localStorage.getItem(info)})
    // dataModel.push({
    //   key:modelMetadata,
    //   value:localStorage.getItem(modelMetadata)})
    // dataModel.push({
    //   key:"class",
    //   value:classData})
    // dataModel.push({
    //   key:"labelClass",
    //   value:labelClass})

    // console.log(dataModel)
    // console.log(modelName)

    // console.log(localStorage.getItem(modelTopology))
    // p.writeModel(modelName,dataModel);
}
