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


const waitLoad = document.getElementById('waitLoad');
waitLoad.classList.remove('hidden'); // 显示加载动画
/*TensorFlow.js 已经准备就绪*/
tf.ready().then(() => {
  console.log("使用后端: ", tf.getBackend());//获取当前 TensorFlow.js 所使用的计算后端
  tf.setBackend('webgl').then(() => {//切换后端
      console.log("切换到webgl后端.");
  });
});
alert(1)

//加载PoseNet模型
let modelUrl='modules/model-stride16.json'
const poseNet = posenet.load({modelUrl:modelUrl}).then(model => {
    poseNetmode = model; // 保存加载好的模型
    waitLoad.classList.add('hidden'); // 隐藏加载动画
})
.catch(e=>{
  console.log("posenet加载出错")
});


// 检测姿势并在视频上绘制
function detectPoseInRealTime(md,v,c) {
    const canvas = document.getElementById(c);
    const ctx = canvas.getContext('2d');

    md.estimateSinglePose(v).then(pose => {
        POSE = pose;
        // 清除canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 画出姿势关键点
        if (pose.keypoints) {
            pose.keypoints.forEach(keypoint => {
                if(keypoint.score>0.6){
                    const x = keypoint.position.x;
                    const y = keypoint.position.y;

                    ctx.beginPath();

                    ctx.fillStyle = 'blue'; // 使用填充颜色而不是描边颜色
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fill(); // 填充圆形点
                }
             });
        }
    })
    .catch(error => console.error('姿势检测错误', error));
}

// 处理 'touchstart' 和 'mousedown' 事件
function handleButtonStart(e) {
    e.preventDefault();
    e.stopPropagation();

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
        const can=document.getElementById('canvas')

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
    },10)
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
        detectPoseInRealTime(poseNetmode,video,'canvas');
    }, 200); // 10 FPS
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
let model =createModel();
function createModel() {
    const model = tf.sequential();

    model.add(tf.layers.dense({inputShape: [51], units: 128, activation: 'relu'}));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    model.add(tf.layers.dense({units: SUM_CLASS, activation: 'softmax'}));
    const optimizer = tf.train.adam(0.001);
    model.compile({optimizer: optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy']});

    return model;
}

/*训练模型*/
async function trainModel() {
    console.log(data)
    const processedData = preprocessData(data);
    const xs = tf.concat(processedData.map(d => d.x));
    const ys = tf.oneHot(data.map(e => parseInt(e.label)), SUM_CLASS);

    await model.fit(xs, ys, {
        epochs: 50,//训练 50 个周期
        batchSize: 32,//每次梯度更新使用 32 个样本
        callbacks: {
            onEpochEnd: (epoch, logs) =>{//在每个训练周期结束时触发
                progressText.text (`训练进度 ${(epoch+1)*2} %`);
                barTrain.css('width', `${(epoch+1)*2}%`);
            }
        }
    });

    isTrain=true;
    className();//获取类名并修改展示标题
    startShow();//进行检测

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
    $('#exportModel').text("停止测试");

    /*打开相机*/
    // videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    // show_video.srcObject = videoStream;
    channelVideo.postMessage(show_video.id)
    var trainModel_classNUM = SUM_CLASS;
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
    for(let i=0;i<num;i++){
        var card = document.getElementById('class_show_card_'+i);
        document.querySelector('#class_show_card_'+i+' .class_show_num').innerHTML=`${(poseClass[0][i]*100).toFixed(0)}%`;
        document.querySelector('#class_show_card_'+i+' .class_show_barTrain').style.width=`${(poseClass[0][i]*100).toFixed(0)}%`;
    }
}
/*结束展示*/
function endShow(){console.log("结束识别");
    playModelType = false;
    $('#exportModel').text("测试模型");
    /*打开相机*/
    // 停止所有视频流
    if(show_video.srcObject) show_video.srcObject = null;
    if(show_video.src) show_video.src = null
    clearInterval(showInterval);
    $('#showLoad').css('display', 'block');
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
                card.innerHTML = `
                    <div class="card_top" ></div>
                    <input type="text"  value="${image[i].labelName}" />
                    <button class="delete" onclick="deleteCard(this)">×</button>
                    <button class="camera" onclick="openCamera(this)"></button>
                    <button class="upload gray" onmousedown="handleButtonStart(event)" onmouseup="handleButtonEnd(event)" ontouchstart="handleButtonStart(event)" ontouchend="handleButtonEnd(event)"></button>
                    <p class="card_numText"><span class="card_numText_n">0</span>个图像样本</p>
                    <div class="photoLibrary"> </div>
                `;
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
    }catch(e){
        console.log(e);
        console.log(JSON.stringify(e));
    }
}


/*保存项目*/
function saveProject(down){
    var saveMname=$('#tilt').text();
    var saveExplain=$('#explain').val();
    if(saveMname==""){
        alert("项目名称不能为空")
        return
    }else if(saveMname.includes('-')){
        alert("项目名称含有非法字符-")
        return
    }else if(saveExplain.includes('-')){
       alert("非法字符-")
       return
    }else if(saveMname.includes(' ')){
        alert("项目名称不能使用空格")
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

    let projectName=saveMname+'-'+$('#explain').val()+'-'+y+m+d+h+mn+s+'.icPMP';
    // 保存项目 JSON 文件
    p.writeMPFile(oldProjectName,projectName,imageDATA,down);
    oldProjectName = projectName;//新老更替
}

/*保存模型*/
async function saveModel(){
    var saveMname=$('#tilt').text();
    if(saveMname==""){
        alert("项目名称不能为空")
        return
    }else if(saveMname.includes('-')){
        alert("项目名称含有非法字符-")
        return
    }else if(saveMname.includes(' ')){
        alert("项目名称不能使用空格")
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

    await model.save('localstorage://'+modelName)
    let dataModel=[]
    let modelTopology='tensorflowjs_models/'+modelName+'/model_topology'
    let weightData='tensorflowjs_models/'+modelName+'/weight_data'
    let weightSpecs='tensorflowjs_models/'+modelName+'/weight_specs'
    let info='tensorflowjs_models/'+modelName+'/info'
    let modelMetadata='tensorflowjs_models/'+modelName+'/model_metadata'
    dataModel.push({
      key:modelTopology,
      value:localStorage.getItem(modelTopology)
    })
    dataModel.push({
      key:weightData,
      value:localStorage.getItem(weightData)
    })
    dataModel.push({
      key:weightSpecs,
      value:localStorage.getItem(weightSpecs)
    })
    dataModel.push({
      key:info,
      value:localStorage.getItem(info)})
    dataModel.push({
      key:modelMetadata,
      value:localStorage.getItem(modelMetadata)})
    dataModel.push({
      key:"class",
      value:classData})
    //console.log(dataModel);

    p.writeModel(modelName,dataModel);
}
