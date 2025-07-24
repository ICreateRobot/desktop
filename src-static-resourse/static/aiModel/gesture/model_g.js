let POSE;
let poseNetmode = null; // 存储加载的模型
var detectionInterval = null; // 存储模型绘制定时器 ID
var showInterval = null;//展示训练好的模型定时器

let data=[];
var shootTime= null;//拍摄定时器
let relation=[];//建立图片与训练数据的联系


let isTrain=false;//是否训练模型

var classData=[];//训练后的所有类
var saveClassData=[]//保存项目时类名

let epo=50;
let batch=32;

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
  });
});


//加载PoseNet模型
const poseNet = handpose.load().then(model => {
    poseNetmode = model; // 保存加载好的模型
    poseNetmode.estimateHands(video)
    console.log("模型加载完成")
    if(openFileEnd=='T'){
        waitLoad.classList.add('hidden'); // 隐藏加载动画
    }else{
        document.getElementById('load').innerHTML = window.parent.block_msg_load_file;
    }

})
.catch(e=>{
  console.log("posenet加载出错")
});

const connections = [
    [0, 1],[1, 2],  [2, 4],  // 大拇指
    [0, 5], [5, 6], [6, 8],  // 食指
    [9, 10],  [10, 12], // 中指
    [13, 14],  [14, 16], // 无名指
    [0, 17], [17, 18],  [18, 20], // 小指
    [5, 9], [9, 13],  [13, 17] // 关节
];
// 检测姿势并在视频上绘制
async function detectPoseInRealTime(md,v,c) {
    const canvas = document.getElementById(c);
    // console.log(canvas)
    const ctx = canvas.getContext('2d');
//    // 确保 video 元素已经加载并稳定
//    if (!v || !v.videoWidth || !v.videoHeight) {
//        return; // 如果视频帧没有加载好，直接跳过当前检测
//    }

    const hands = await md.estimateHands(v);
    console.log(hands)
//    if (hands.length > 0) {
//        hands.forEach(hand =>{
//            POSE=hand;
//            ctx.clearRect(0, 0, canvas.width, canvas.height);
//            let minZ = Math.min(...hand.landmarks.map(point => point[2]));
//            hand.landmarks.forEach((landmark, index) => {
//                hand.landmarks[index][0]=hand.landmarks[index][0]*0.6
//                hand.landmarks[index][1]=hand.landmarks[index][1]*0.6
//                const adjustedX = hand.landmarks[index][0]
//                const adjustedY = hand.landmarks[index][1]
//                ctx.beginPath();
//                ctx.fillStyle = 'red';
//                ctx.arc(adjustedX, adjustedY, 5, 0, 2 * Math.PI);
//                ctx.fill();
//            });
//
//            const landmarks = hand.landmarks;
//            // 绘制每个手指上的相邻关节相连
//            for (let i = 0; i < 5; i++) {
//              for (let j = 1; j < 4; j++) {
//                  const x1 = landmarks[i * 4 + j][0];
//                  const y1 = landmarks[i * 4 + j][1];
//                  const x2 = landmarks[i * 4 + j + 1][0];
//                  const y2 = landmarks[i * 4 + j + 1][1];
//
//                  ctx.beginPath();
//                  ctx.moveTo(x1, y1);
//                  ctx.lineTo(x2, y2);
//                  ctx.strokeStyle = "white";
//                  ctx.lineWidth = 2;
//                  ctx.stroke();
//              }
//            }
//            // 绘制手指根部关节与手腕处的零号关节相连
//            for (let i = 0; i < 5; i++) {
//                const x1 = landmarks[i * 4 + 1][0];
//                const y1 = landmarks[i * 4 + 1][1];
//                const x2 = landmarks[0][0];
//                const y2 = landmarks[0][1];
//
//                ctx.beginPath();
//                ctx.moveTo(x1, y1);
//                ctx.lineTo(x2, y2);
//                ctx.strokeStyle = "white";
//                ctx.lineWidth = 2;
//                ctx.stroke();
//            }
//        })
//    }else{
//        ctx.clearRect(0, 0, canvas.width, canvas.height);
//    }
    // console.log(hands)
    if (hands.length > 0) {
        hands.forEach(hand => {
            POSE = hand;
            ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清空画布


            let videoWidth
            let videoHeight
            // 获取视频流和画布的宽高
            if(whatCamera=='local'){
                videoWidth=v.videoWidth
                videoHeight=v.videoHeight
            }else{
                videoWidth=v.width
                videoHeight=v.height
            }
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            // 缩放比例，基于视频流和画布大小适配
            const scaleX = canvasWidth / videoWidth;
            const scaleY = canvasHeight / videoHeight;

            // 画出手部关键点
            hand.landmarks.forEach((landmark, index) => {
                 // 跳过每个手指的第二个关键点 (i*4 + 1)
                 if (index % 4 === 3) return;  // 跳过手指的第二个关键点
                // 缩放坐标
                const adjustedX = landmark[0] *scaleX
                const adjustedY = landmark[1] *scaleY

                // console.log(landmark[0])
                // console.log(adjustedX)
                // 设置关键点的大小
                const pointSize = 3;

                // 绘制关键点
                ctx.beginPath();
                ctx.fillStyle = 'rgba(63, 220, 210, 1)';  // 关键点颜色
                ctx.arc(adjustedX, adjustedY, pointSize, 0, 2 * Math.PI);
                ctx.fill();
            });

            // 绘制手指骨骼连线
            connections.forEach(([startIdx, endIdx]) => {
                const start = hand.landmarks[startIdx];
                const end = hand.landmarks[endIdx];

                // 缩放后绘制连线
                const adjustedStartX = start[0] * scaleX;
                const adjustedStartY = start[1] * scaleY;
                const adjustedEndX = end[0] * scaleX;
                const adjustedEndY = end[1] * scaleY;

                ctx.beginPath();
                ctx.moveTo(adjustedStartX, adjustedStartY);
                ctx.lineTo(adjustedEndX, adjustedEndY);
                ctx.strokeStyle = 'white';  // 线条颜色
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        });
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清空画布
    }
}
function toggleAdvanced() {
    const advanced = document.getElementById('advancedSettings');
    const arrow = document.getElementById('arrowIcon');
    advanced.classList.toggle('expanded');
    arrow.innerText = advanced.classList.contains('expanded') ? '▴' : '▾';
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
    console.log(label)
    console.log(NUM_CLASS)

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 设置 canvas 的尺寸与视频相同
    canvas.width = video.width;
    canvas.height = video.height;
    canvas.transform='scaleX(-1)';

    shootTime=setInterval(()=>{
        const can=document.getElementById(canvasId)

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(can, 0, 0, canvas.width, canvas.height);
        // 获取 canvas 的图片数据
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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

        //let poseData=POSE.keypoints.map(kp => [kp.position.x,kp.position.y,kp.score]);

        relation.push({landmarks: POSE.landmarks.flat(),label:label,img:img.id})
        data.push({landmarks: POSE.landmarks.flat(),label:label})
        imageDATA.push({label:label,url:canvas.toDataURL('image/png'),data:{landmarks: POSE.landmarks.flat(),label:label}})
        //console.log(imageDATA)
    },400)
}


// 开始检测
function startDetection() {
    if (!poseNetmode) {
        console.log("模型尚未加载");
        return;
    }
    if (detectionInterval) {
        console.log("检测已在进行中");
        return;
    }
    detectionInterval = setInterval(() => {
        detectPoseInRealTime(poseNetmode,video,canvasId);
    }, 150); // 10 FPS
    console.log("姿势检测已启动");
}

// 停止检测
function stopDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        console.log("姿势检测已停止");
    } else {
        console.log("没有正在进行的检测");
    }
}


/*训练时使用*/
let model = createModel();
function createModel() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [63] }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dense({ units: NUM_CLASS, activation: 'softmax' }));
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
    return model;
}

let labelClass = [];//label集合，放置当前训练模型的lable，比对数据对齐
/*训练模型*/
async function trainModel() {
    if(isTraining) return
    if(SUM_CLASS<2) return
    isTraining=true
    closeAllCamera()
    await tf.setBackend('cpu')
    model = createModel();
    relation.sort((a, b) => a.label - b.label);
    data.sort((a, b) => a.label - b.label);
    imageDATA.sort((a, b) => a.label - b.label);
    //const processedData = preprocessData(data);
    const xs = data.map(item => item.landmarks);
    const ys = data.map(item => item.label);
    console.log(data)
    const xsTensor = tf.tensor2d(xs);
    const ysTensor = tf.oneHot(ys, NUM_CLASS).asType('float32');

    data.forEach((con,index)=>{
        // 杜绝重复添加
        if (!labelClass.includes(con.label)) {
            labelClass.push(con.label);
        }
    })

    epo=document.getElementById('epo').value
    batch=document.getElementById('batch').value

    const history = await model.fit(xsTensor, ysTensor, {
        epochs: epo,
        batchSize: Number(batch),
        callbacks: {
            onEpochEnd: (epoch, logs) =>{
                progressText.text (`已完成 ${Math.ceil(((epoch+1)/epo)*100)} %`);
                barTrain.css('width', `${Math.ceil(((epoch+1)/epo)*100)}%`);
            }
        }
    });
    xsTensor.dispose();
    ysTensor.dispose();

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
async function startShow(){console.log("识别");
    playModelType = true;
    // document.getElementsByClassName('model_show').style.height='520px'
    $('#exportModel').text(window.parent.block_msg_exportModel_stop);//停止测试


    /*打开相机*/
    // videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // show_video.srcObject = videoStream;
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
        detectPoseInRealTime(poseNetmode,show_video,'show_canvas');
        show_value(trainModel_classNUM);
    }, 200); // 10 FPS
    $('#showLoad').css('display', 'none');
}

/*展示区实时显示数据*/
function show_value(num){
    if(!isTrain) return;

    //sendData=[]
    const poseClass = predictPose(POSE);
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
function predictPose(pose) {
    const landmarks=pose.landmarks;
    const input=tf.tensor2d([landmarks.flat()]);
    const floatInput=tf.cast(input,'float32');
    const result=model.predict(floatInput).arraySync();

    return result;
}



/*打开项目界面初始化*/
function INIpage(projectName,image){
    console.log(image)
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
                // `;
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
    }

    if(imageDATA.length==0) return;//没数据直接返回

    var time = new Date();
    var y=time.getFullYear(); //获取当前年份\
    var m=time.getMonth()+1; //获取当前月份(0-11,0代表1月)
    var d=time.getDate(); //获取当前日(1-31)
    var h=time.getHours(); //获取当前小时数(0-23)
    var mn=time.getMinutes(); //获取当前分钟数(0-59)
    var s=time.getSeconds();

    let projectName=saveMname+'-'+$('#explain').val()+'-'+y+m+d+h+mn+s+'.icGMP.G';

    let content = {
        oldProjectName:oldProjectName,
        projectName:projectName,
        imageDATA:imageDATA,
        down:down
    }

    console.log(content)
    // === 2. 上传到主进程 Express 服务 ===
    // fetch('http://localhost:3000/save-project', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(content)
    //     }).then(response => {
    //         if (!response.ok) throw new Error('Network response was not ok.');
    //         console.log("项目已发送到主进程保存目录");
    //     }).catch(err => {
    //         console.error("发送项目失败:", err);
    //     });
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
    removeKeysWithPrefix("tensorflowjs_models");
    var saveMname=$('#tilt').text();
    if(saveMname==""){
       alert(window.parent.error_projectNull)//"项目名称不能为空"
       return
    }else if(saveMname.includes('-')){
        alert(window.parent.file_saveFailure2)//"存在非法字符 - "
        return
    }else if(saveMname.includes(' ')){
        alert(window.parent.error_projectSpan)//"不能使用空格"
        return
    }

    var time = new Date();
    var y=time.getFullYear(); //获取当前年份\
    var m=time.getMonth()+1; //获取当前月份(0-11,0代表1月)
    var d=time.getDate(); //获取当前日(1-31)
    var h=time.getHours(); //获取当前小时数(0-23)
    var mn=time.getMinutes(); //获取当前分钟数(0-59)
    var s=time.getSeconds();

    let modelName = saveMname+'-'+y+m+d+h+mn+s+".icGM";


    channelModelName.postMessage(modelName)

    channelClassName.postMessage([labelClass,classData])

    channelWhatModel.postMessage('gesture')
    await model.save('localstorage://'+modelName)
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

    // p.writeModel(modelName,dataModel);
}
