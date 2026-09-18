let POSE;
let poseNetmode = null; // 存储加载的模型
var detectionInterval = null; // 存储模型绘制定时器 ID
var showInterval = null;//展示训练好的模型定时器

let data=[];
var shootTime= null;//拍摄定时器
let relation=[];//建立图片与训练数据的联系
let epo=50;
let batch=32;


let isTrain=false;//是否训练模型

var classData=[];//训练后的所有类
var saveClassData=[]//保存项目时类名
let poses;

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

let h = "./pose/modules/model-stride16.json"
const poseNet = posenet.load({modelUrl:h}).then(model => {
    poseNetmode = model; // 保存加载好的模型
    poseNetmode.estimateSinglePose(video)
    if(openFileEnd=='T'){
        waitLoad.classList.add('hidden'); // 隐藏加载动画
    }else{
        document.getElementById('load').innerHTML = window.parent.block_msg_load_file;
    }

})
.catch(e=>{
  console.log("posenet加载出错")
});

// 定义关键点连接的骨架
const skeleton = [
    ['leftShoulder', 'leftElbow'],
    ['leftElbow', 'leftWrist'],
    ['rightShoulder', 'rightElbow'],
    ['rightElbow', 'rightWrist'],
    ['leftShoulder', 'rightShoulder'],
    ['leftHip', 'rightHip'],
    ['leftShoulder', 'leftHip'],
    ['rightShoulder', 'rightHip'],
    ['leftHip', 'leftKnee'],
    ['leftKnee', 'leftAnkle'],
    ['rightHip', 'rightKnee'],
    ['rightKnee', 'rightAnkle'],
];


function toggleAdvanced() {
    const advanced = document.getElementById('advancedSettings');
    const arrow = document.getElementById('arrowIcon');
    advanced.classList.toggle('expanded');
    arrow.innerHTML = advanced.classList.contains('expanded') ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" style="transform: rotate(180deg);"><path d="m6 9 6 6 6-6"></path></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" style="transform: rotate(0deg);"><path d="m6 9 6 6 6-6"></path></svg>';
}
// 检测姿势并在视频上绘制
async function detectPoseInRealTime(md,v,c) {
    const canvas = document.getElementById(c);
    const ctx = canvas.getContext('2d');
    // 确保 video 元素已经加载并稳定
    if(whatCamera=='local'){
        if (!v || !v.videoWidth || !v.videoHeight) {
            return; // 如果视频帧没有加载好，直接跳过当前检测
        }
    }else{
        if (!v || !v.width || !v.height) {
            return; // 如果视频帧没有加载好，直接跳过当前检测
        }
    }
    
    // 处理视频帧，转换为 Tensor，并进行缩放和归一化
//    let fame = tf.browser.fromPixels(v)
//                    .resizeNearestNeighbor([160, 160])  // 缩放视频帧为 224x224
//                    .expandDims()  // 添加 batch 维度
//                    .toFloat()  // 转换为 float 类型
//                    .div(tf.scalar(255));  // 归一化到 [0, 1]


     // 只检测一个人的姿态
     poses = await md.estimatePoses(v, { maxPoses: 1 });

     if (poses.length === 0) return;
 
     let pose = poses[0]; // 只取第一个人的数据
     POSE = pose;
 
     ctx.clearRect(0, 0, canvas.width, canvas.height);
 
     // 关键点连接关系（不包括眼睛之间的连线，增加鼻子到肩膀的连线）
     const skeleton = [
         ['leftShoulder', 'rightShoulder'],
         ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
         ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
         ['leftShoulder', 'leftHip'], ['rightShoulder', 'rightHip'],
         ['leftHip', 'rightHip'],
         ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
         ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle']
     ];

     let videoWidth=v.width
    let videoHeight=v.height
    
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 缩放比例，基于视频流和画布大小适配
    const scaleX = canvasWidth / videoWidth;
    const scaleY = canvasHeight / videoHeight;
 
     // 画出关键点（跳过耳朵）
     pose.keypoints.forEach(keypoint => {
         if (keypoint.score > 0.75 && !['leftEar', 'rightEar'].includes(keypoint.part)) { //, 'leftEye', 'rightEye'

            

            let x
            let y
            if(whatCamera=='network' || whatCamera=='robot'){
                x=keypoint.position.x*scaleX
                y=keypoint.position.y*scaleY
            }else{
                x=keypoint.position.x
                y=keypoint.position.y
            }
            //  const { x, y } = keypoint.position;
             ctx.beginPath();
             ctx.arc(x, y, 4, 0, 2 * Math.PI);
             ctx.fillStyle = 'rgba(0, 255, 0, 1)';
             ctx.fill();
         }
     });
 
     // 画骨架连线
     ctx.strokeStyle = '#c4ebe3';
     ctx.lineWidth = 2;
     skeleton.forEach(([partA, partB]) => {
         const pointA = pose.keypoints.find(k => k.part === partA);
         const pointB = pose.keypoints.find(k => k.part === partB);
 
         if (pointA && pointB && pointA.score > 0.75 && pointB.score > 0.75) {
            if(whatCamera=='network' || whatCamera=='robot'){
                const dx = pointB.position.x*scaleX - pointA.position.x*scaleX;
                const dy = pointB.position.y*scaleY - pointA.position.y*scaleY;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                if (distance < 150) { // 限制最大连线长度，防止误连
                    ctx.beginPath();
                    ctx.moveTo(pointA.position.x*scaleX, pointA.position.y*scaleY);
                    ctx.lineTo(pointB.position.x*scaleX, pointB.position.y*scaleY);
                    ctx.stroke();
                }
            }else{
                const dx = pointB.position.x - pointA.position.x;
                const dy = pointB.position.y - pointA.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                if (distance < 150) { // 限制最大连线长度，防止误连
                    ctx.beginPath();
                    ctx.moveTo(pointA.position.x, pointA.position.y);
                    ctx.lineTo(pointB.position.x, pointB.position.y);
                    ctx.stroke();
                }
            }
             
        }

    })
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

        if (poses.length === 0){
            showToast('当前图像未检测到姿态')
            return
        }
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

        let poseData=POSE.keypoints.map(kp => [kp.position.x,kp.position.y,kp.score]);

        relation.push({pose:poseData,label:label,img:img.id})
        data.push({pose:poseData,label:label})
        imageDATA.push({label:label,url:canvas.toDataURL('image/png'),data:{pose:poseData,label:label}})
    },recordFps)
}

/*删除照片*/
function deletePhoto(button) {
    var photo = button.parentElement;
    var card = (photo.parentElement).parentElement;

    console.log(photo)
    console.log(card)
    //删除数据
    var pd,lab;
    relation.forEach(rela=>{
        if(rela.img==photo.id){
            pd=rela.pose
            lab=rela.label
        }
    })
    // data.forEach((da,index)=>{
    //     if(da.frame==pd && da.label==lab){
    //         data.splice(index,1)
    //     }
    // })
    // imageDATA.forEach((con,index)=>{
    //     if(con.data.frame==pd && con.data.label==lab){
    //         imageDATA.splice(index,1)
    //     }
    // })

    // //删除img
    // photo.remove()

    // //样本总量减少
    // card.querySelector('.card_numText_n').textContent = parseInt(card.querySelector('.card_numText_n').textContent)-1;
    // sampleSize--;

    // console.log(card)
    // 从后往前删除，避免 splice 导致跳过元素
    for (let index = data.length - 1; index >= 0; index--) {
        const da = data[index];

        if (da.pose == pd && da.label == lab) {
            data.splice(index, 1);
        }
    }

    // 从后往前删除，避免 splice 导致跳过元素
    for (let index = imageDATA.length - 1; index >= 0; index--) {
        const con = imageDATA[index];

        if (con.data.pose == pd && con.data.label == lab) {
            imageDATA.splice(index, 1);
        }
    }

    // 删除 img
    photo.remove();

    // 样本总量减少
    card.querySelector('.card_numText_n').textContent =
        parseInt(card.querySelector('.card_numText_n').textContent) - 1;

    sampleSize--;

    console.log(card);
    console.log(data)
    console.log(imageDATA)

   
    
}

function deleteSample(el) {
    const card = el.parentElement.parentElement.parentElement;
    const photos = card.querySelector('.photoLibrary');
    const numText = card.querySelector('.card_numText_n');

    if (!photos) return;

    // children 是动态 HTMLCollection，先转成静态数组
    const photoList = Array.from(photos.children);

    // 建立 relation 映射，避免每张图片都遍历一次 relation
    const relationMap = new Map();

    relation.forEach(rela => {
        relationMap.set(rela.img, {
            pose: rela.pose,
            label: rela.label
        });
    });

    // 记录本次需要删除的 pose + label
    const deleteKeys = new Set();

    photoList.forEach(photo => {
        const rela = relationMap.get(photo.id);

        if (rela) {
            const key = `${rela.pose}__${rela.label}`;
            deleteKeys.add(key);
        }
    });

    // 删除 data 中符合条件的数据
    data = data.filter(da => {
        const key = `${da.pose}__${da.label}`;
        return !deleteKeys.has(key);
    });

    // 删除 imageDATA 中符合条件的数据
    imageDATA = imageDATA.filter(con => {
        const key = `${con.data.pose}__${con.data.label}`;
        return !deleteKeys.has(key);
    });

    // 删除所有图片
    photoList.forEach(photo => {
        photo.remove();

        // 样本总量减少
        numText.textContent = parseInt(numText.textContent) - 1;
        sampleSize--;
    });
}


// 开始检测
//let lastDetectionTime = Date.now();
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
//        let currentTime = Date.now();
//        if (currentTime - lastDetectionTime > 200) {  // 每隔 200ms 执行一次
//            lastDetectionTime = currentTime;
//            detectPoseInRealTime(poseNetmode, video, 'canvas');
//        }
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

    model.add(tf.layers.dense({inputShape: [51], units: 128, activation: 'relu'}));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    model.add(tf.layers.dense({units: NUM_CLASS, activation: 'softmax'}));
    const optimizer = tf.train.adam(0.001);
    model.compile({optimizer: optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy']});

    return model;
}

let labelClass = [];//label集合，放置当前训练模型的lable，比对数据对齐
/*训练模型*/
async function trainModel() {
    if(isTraining) return
    if(SUM_CLASS<2) return
    isTraining=true
    closeAllCamera()
    if(classChecked_div){
        closeCameraWin()
    }
    await tf.setBackend('cpu')
    model = createModel();
    const processedData = preprocessData(data);
    const xs = tf.concat(processedData.map(d => d.x));
    const ys = tf.oneHot(data.map(e => parseInt(e.label)), NUM_CLASS);

    data.forEach((con,index)=>{
        // 杜绝重复添加
        if (!labelClass.includes(con.label)) {
            labelClass.push(con.label);
        }
    })


    relation.sort((a, b) => a.label - b.label);
    data.sort((a, b) => a.label - b.label);
    imageDATA.sort((a, b) => a.label - b.label);
    epo=document.getElementById('epo').value
    batch=document.getElementById('batch').value

    const trainBtn = document.getElementById('trainingModel');
    trainBtn.classList.add('trainGray');
    trainBtn.style.setProperty('--progress', '0%');
    trainBtn.textContent =
        languageDate[localStorage.getItem('tw:language') || 'zh-cn']['completed'] + ' 0%';
    await model.fit(xs, ys, {
        epochs: epo,//训练 50 个周期
        batchSize: Number(batch),//每次梯度更新使用 32 个样本
        callbacks: {
            onEpochEnd: async(epoch, logs) =>{
                //   progressText.text (`${languageDate[localStorage.getItem('tw:language') || 'zh-cn']['completed']} ${Math.ceil(((epoch+1)/epo)*100)} %`);
                //   barTrain.css('width', `${Math.ceil(((epoch+1)/epo)*100)}%`);
                const percent = Math.ceil(((epoch + 1) / epo) * 100);
    
                console.log(percent)
    
                trainBtn.style.setProperty('--progress', percent + '%');
    
                trainBtn.textContent =
                languageDate[localStorage.getItem('tw:language') || 'zh-cn']['completed'] +
                    ' ' + percent + '%';
                await new Promise(r=>setTimeout(r,100));
            }
        }
    });
    document.querySelector('.preview_center').style.display ='flex'

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
    // 保存本次生成已经使用过的色相
    const usedHues = [];

    // 生成一个随机且尽量不重复的颜色
    function getRandomColor() {
        let hue;
        let minDistance = 30; // 两个颜色至少间隔 30°

        // 尝试生成一个与已有颜色差距较大的色相
        let attempts = 0;

        do {
            hue = Math.floor(Math.random() * 360);
            attempts++;

            // 判断与已经使用的颜色是否太接近
            const isTooClose = usedHues.some(oldHue => {
                let distance = Math.abs(hue - oldHue);

                // 色轮首尾也是相连的
                distance = Math.min(distance, 360 - distance);

                return distance < minDistance;
            });

            if (!isTooClose || attempts > 100) {
                break;
            }

        } while (true);

        usedHues.push(hue);

        // HSL：
        // S = 饱和度
        // L = 明度
        return `hsl(${hue}, 70%, 55%)`;
    }
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
        // 给当前进度条生成随机颜色
        const randomColor = getRandomColor();

        const progressBar = card.querySelector('.class_show_barTrain');
        const progressTrain = card.querySelector('.class_show_progressTrain');

        progressBar.style.backgroundColor = randomColor;
        progressTrain.style.borderColor=randomColor
        cardContainer.appendChild(card);
        classData.push(name)
    }
}

/*在展示区进行识别*/
async function startShow(){console.log("识别");
    playModelType = true;
    $('#exportModel').text(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['stopTest']);//停止测试

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
        detectPoseInRealTime(poseNetmode,show_video,'show_canvas');
        show_value(trainModel_classNUM);
    }, 200); // 10 FPS
    // $('#showLoad').css('display', 'none');
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
    $('#exportModel').text(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['exportModel']);//测试模型
    /*打开相机*/
    // 停止所有视频流
    channelVideo.postMessage('close')
    if(show_video.srcObject) show_video.srcObject = null;
    if(show_video.src) show_video.src = null
    clearInterval(showInterval);
    const canvas = document.getElementById('show_canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // $('#showLoad').css('display', 'block');
}
/*使用模型*/
function predictPose(pose) {
    const poseData = pose.keypoints.map(kp => [kp.position.x, kp.position.y,kp.score]);
    const input = tf.tensor2d([poseData.flat()]);
    const floatInput = tf.cast(input, 'float32');
    const result = model.predict(floatInput).arraySync();

    return result;
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
                // `;

                // card.innerHTML=`
                //     <div class="card_top"></div>
                //     <input type="text"  value="${image[i].labelName}" />
                //     <button class="delete" onclick="deleteCard(this)">×</button>
                //     <div style="height: 1px; width: 100%; border-bottom: 1px solid black;"></div>
                //     <div class="cameraBn" style="display: flex;">
                //         <button class="camera" onclick="openCamera(this)"></button>
                //         <button class="upFile" onclick="openFile(this)"></button>
                //     </div>
                //     <div class="cameraWin" id="cameraWin${image[i].label+1}">
                //         <video class="cameraView" width="320" height="240" id="cameraView${image[i].label+1}"  autoplay muted></video>
                //          <img class="netCamera"  crossorigin="anonymous" id="netCamera${image[i].label+1}">
                //         <canvas class="cameraView" width="320" height="240" id="canvas${image[i].label+1}" ></canvas>
                
                //         <button class="cameraWinButton_close">×</button>
                //     </div>
                //     <button class="upload gray" onmousedown="handleButtonStart(event)" onmouseup="handleButtonEnd(event)" ontouchstart="handleButtonStart(event)" ontouchend="handleButtonEnd(event)">长按此处持续拍照</button>
                //     <p class="card_numText"><span class='card_numText_n'>0</span><span id='n${image[i].label+1}'>个图像样本</span></p>
                //     <div class="photoLibrary"> </div>
                // `
                card.innerHTML=`
                <span class="input-wrap">
                <input type="text" id="c${image[i].label+1}" value="${image[i].labelName}" />
                
                <button style="background-color: transparent;border: none;margin-top:10px" onclick="focusInput(this)">
                <svg xmlns="http://www.w3.org/2000/svg"
                    width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="lucide lucide-pencil">
                    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path>
                    <path d="m15 5 4 4"></path>
                </svg>
                </button>
            
            </span>

            <!-- <button class="delete" onclick="deleteCard(this)"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical ant-dropdown-trigger" style="cursor: pointer;"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button> -->
            <div class="menu-wrap">
                <button class="delete" type="button" onclick="toggleMenu(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>

                <!-- 下拉菜单 -->
                <div class="menu">
                    <div class="menu-item" onclick="deleteCard(this)">删除类别</div>
                    <div class="menu-item" onclick="deleteSample(this)">移除所有类别</div>
                </div>
            </div>
            <!-- <span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis-vertical ant-dropdown-trigger" style="cursor: pointer;"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></span> -->
            <div style="height: 1px; width: 100%; border-bottom: 1px solid rgb(220, 216, 216);margin-top:20px"></div>
            <div class="cameraBn" style="display: flex;">
                <button class="camera" onclick="openCamera(this)"></button>
                <button class="upFile" onclick="openFile(this)"></button>
            </div>
            <div class="cameraLeft" id="cameraLeft${image[i].label+1}">
            <div class="cameraTop">
                <span class="webcamSpan">webcam</span>
                <button class="cameraWinButton_close">×</button>
            </div>

            <!-- 设置面板 -->
            <div class="cameraSettings" style="display:none;">
                
                <!-- FPS 设置 -->
                <div class="settingItem">
                <label>FPS：</label>
                <div class="numberBox">
                    <input type="number" id="fpsInput1" min="1" max="100" value="30">
                    <!-- <div class="stepBtns">
                    <button onclick="changeFPS(this,1)">▲</button>
                    <button onclick="changeFPS(this,-1)">▼</button>
                    </div> -->
                </div>
                </div>

                <!-- 按住录制开关 -->
                <!-- <div class="settingItem">
                <label>按住即可录制</label>
                <label class="switch">
                    <input type="checkbox" id="holdRecord1">
                    <span class="slider"></span>
                </label>
                </div>-->

                <!-- 底部按钮 -->
                <div class="settingActions">
                <button class="settingsCancel" onclick="cancelSetting(this)">取消</button>
                <button class="settingsSave" onclick="saveSetting(this)">保存</button>
                </div>

            </div>
            
            <div class="cameraWin" id="cameraWin${image[i].label+1}">
                <video class="cameraView" width="320" height="240" id="cameraView${image[i].label+1}"  autoplay muted></video>
                <img class="netCamera"  crossorigin="anonymous" id="netCamera${image[i].label+1}">
                <canvas class="cameraView" width="320" height="240" id="canvas${image[i].label+1}" ></canvas>

                
            </div>
            <button class="upload gray" onmousedown="handleButtonStart(event)" onmouseup="handleButtonEnd(event)" ontouchstart="handleButtonStart(event)" ontouchend="handleButtonEnd(event)">点击此处可持续拍照</button>
            <span class="uploadSetting"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings" style="color: rgb(25, 103, 210);"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg></span>
            </div>
            
            <!-- <button
            class="upload gray"
            onmousedown="handleButtonStart(event)"
            ontouchstart="handleButtonStart(event)">
            长按此处持续拍照
            </button> -->
            <div class="sampleRight">
            <p class="card_numText"><span class='card_numText_n'>0</span><span id='n${image[i].label+1}'>个图像样本</span></p>
            <div class="photoLibrary single-line"> </div>
            </div>
                `
                // 将新卡片添加到 container 中
                cardContainer.appendChild(card);
            }
            card.querySelector('.photoLibrary').appendChild(newImg)

            document.querySelectorAll('.uploadSetting').forEach(btn=>{
                btn.removeEventListener('click',uploadSettingFun)
                btn.addEventListener('click', uploadSettingFun);
            });

            //显示样本数量
            card.querySelector('.card_numText_n').textContent = parseInt(card.querySelector('.card_numText_n').textContent)+1;
            sampleSize++;
            NUM_IMG++;

            let cent=image[i].data
            cent.img=newImg.id
            relation.push(cent)
            data.push(image[i].data)

            //  if(localStorage.getItem('tw:language')=='en'){
            //     document.getElementById(`n${image[i].label+1}`).textContent=languageDate['en'].getSampleText(image[i].label+1)
            //      const uploadButtons = document.querySelectorAll('.upload');
            //     uploadButtons.forEach(button => {
            //         button.textContent = languageDate['en']['keepPhoto'];
            //     });
            // }else{
            //     document.getElementById(`n${image[i].label+1}`).textContent=languageDate['zh-cn'].getSampleText(image[i].label+1)
            //     const uploadButtons = document.querySelectorAll('.upload');
            //     uploadButtons.forEach(button => {
            //         button.textContent = languageDate['zh-cn']['keepPhoto'];
            //     });
            // }
            const lang = localStorage.getItem('tw:language') || 'zh-cn';
            const dataLang = languageDate[lang] || languageDate['zh-cn'];

            document.getElementById(`n${image[i].label + 1}`).textContent =
            dataLang.getSampleText(image[i].label + 1);

            const uploadButtons = document.querySelectorAll('.upload');
            uploadButtons.forEach(button => {
            button.textContent = dataLang.keepPhoto;
            });
            document.querySelectorAll('.settingsCancel').forEach(btn => {
                btn.textContent = dataLang.cancel;
            });
            document.querySelectorAll('.settingsSave').forEach(btn => {
                btn.textContent = dataLang.save;
            });
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
        showToast(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['nameNotNull'])//"项目名称不能为空"
        return
    }else if(saveMname.includes('-')){
        showToast(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['illeglStr'])//"存在非法字符 - "
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

    let projectName=saveMname+'-'+$('#explain').val()+'-'+y+m+d+h+mn+s+'.icPMP.P';


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
    removeKeysWithPrefix('labelClass')
    removeKeysWithPrefix('class')
    var saveMname=$('#tilt').text();
    if(saveMname==""){
       showToast(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['nameNotNull'])//"项目名称不能为空"
       return
    }else if(saveMname.includes('-')){
        showToast(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['illeglStr'])//"存在非法字符 - "
        return
    }

    var time = new Date();
    var y=time.getFullYear(); //获取当前年份\
    var m=time.getMonth()+1; //获取当前月份(0-11,0代表1月)
    var d=time.getDate(); //获取当前日(1-31)
    var h=time.getHours(); //获取当前小时数(0-23)
    var mn=time.getMinutes(); //获取当前分钟数(0-59)
    var s=time.getSeconds();


    

    let modelName = saveMname+'-'+y+m+d+h+mn+s+".icPM";
    channelModelName.postMessage(modelName)

    channelClassName.postMessage([labelClass,classData])

    channelWhatModel.postMessage('pose')

    localStorage.setItem('labelClass',labelClass)
    localStorage.setItem('class',classData)
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
    //console.log(dataModel);

    // p.writeModel(modelName,dataModel);
}
