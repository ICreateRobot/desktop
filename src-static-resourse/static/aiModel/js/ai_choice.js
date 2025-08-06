var openFileName = GetQueryString("name")+'';
var p = window.parent;
var currentPage = "ai_choice";

// 页面加载时默认显示模型选择界面
$('#modelSelection').css('display', 'flex');
//alert(openFileName)


function GetQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg); //获取url中"?"符后的字符串并正则匹配
    var context = "";
    if (r != null)
        context = decodeURIComponent(r[2]);
    reg = null;
    r = null;
    return context == null || context == "" || context == "undefined" ? "" : context;
}

let typeI=[]
let typeG=[]
let typeP=[]

// fetch('http://localhost:3000/get-projects')
//   .then(response => {
//     if (!response.ok) {
//       throw new Error('网络响应错误');
//     }
//     return response.json();
//   })
//   .then(data => {

//     data.forEach(project => {
//       const name = project.projectName;
//       if (!name || typeof name !== 'string') return;

//       const lastChar = name.slice(-1).toUpperCase();
//       if (lastChar === 'I') {
//         typeI.push(project);
//       } else if (lastChar === 'G') {
//         typeG.push(project);
//       } else if (lastChar === 'P') {
//         typeP.push(project);
//       }
//     });

//     console.log('I 类型项目:', typeI);
//     console.log('G 类型项目:', typeG);
//     console.log('P 类型项目:', typeP);

//     // 可进一步处理这些数组，例如渲染到页面上
//   })
//   .catch(error => {
//     console.error('获取项目失败:', error);
//   });

const language = {
    "zh-cn": {
      "back": "返回",
      "topBar_tilt": "训练模型",
      "back_less": "分类",
      "recognize1": "图像识别",
      "recognize2": "手势识别",
      "recognize3": "姿态识别",
      "recognize4": "语音识别",
      "newProject": "新建项目",
      "importProject": "导入项目",
      'manageProject':"项目管理",

      "title": "选择模型训练界面",
      "image_alt": "图像识别",
      "gesture_alt": "手势识别",
      "posture_alt": "姿态识别",
      "sound_alt": "语音识别",
      "createImg_alt": "新建项目",
      "importImg_alt": "导入项目"
    },
    "en": {
      "back": "Back",
      "topBar_tilt": "Training Model",
      "back_less": "Classification",
      "recognize1": "Image Recognition",
      "recognize2": "Gesture Recognition",
      "recognize3": "Pose Recognition",
      "recognize4": "Speech Recognition",
      "newProject": "New Project",
      "importProject": "Import Project",
      'manageProject':"project management",

        "title": "Model Training Selection Interface",
        "image_alt": "Image Recognition",
        "gesture_alt": "Gesture Recognition",
        "posture_alt": "Pose Recognition",
        "sound_alt": "Speech Recognition",
        "createImg_alt": "New Project",
        "importImg_alt": "Import Project"
    }
}

function changeLanguageChoice(){
    const lang = localStorage.getItem('tw:language') === 'en' ? 'en' : 'zh-cn';
    document.getElementById('topBar_tilt').textContent = language[lang]['topBar_tilt'];
    document.getElementById('back_less').textContent = language[lang]['back_less'];
    document.getElementById('recognize1').textContent = language[lang]['recognize1'];
    document.getElementById('recognize2').textContent = language[lang]['recognize2'];
    document.getElementById('recognize3').textContent = language[lang]['recognize3'];
    document.getElementById('recognize4').textContent = language[lang]['recognize4'];
    // document.getElementById('newProject').textContent = language[lang]['newProject'];
    document.getElementById('importProject').textContent = language[lang]['importProject'];

}

changeLanguageChoice()




/*返回*/
$('#back').click(function() {
    if(currentPage != 'ai_choice'){
        showmodelSelection();
        return;
    }
    p.page= 'index';
    var FileName = openFileName+".bricksm";
    var spname = FileName.split('-');
    if(spname.length>8){
        console.log('11111')
        var modelname = spname[7]+'-'+spname[8].slice(0, -8);
        location.replace("../play_M1.html?type=o&name="+FileName+"&MdType="+modelname[modelname.length-2]+"&modelName="+modelname)
    }else{
        console.log('22222')
        // location.replace("../play_M1.html?type=o&name="+FileName);
        const channelTrain=new BroadcastChannel('channelTrain')
        channelTrain.postMessage(false)
    }
    //location.replace("../play_M1.html?type=o&name="+openFileName+".bricksm");
});

// 显示项目管理界面
function showProjectManagement(type) {
    currentPage = type;
    // if(currentPage=='posture'){//姿态
    //     p.refreshDirMP('.icPMP');
    // }else if(currentPage=='gesture'){//手势
    //     p.refreshDirMP('.icGMP');
    // }else if(currentPage=='image'){//图像
    //     p.refreshDirMP('.icIMP');
    // }else if(currentPage=='sound'){//声音
    //        // alert("敬请期待")
    //        // return
    //     p.refreshDirMP('.icSMP');
    // }else{
    //     alert("敬请期待")
    //     return
    // }
    const lang = localStorage.getItem('tw:language') === 'en' ? 'en' : 'zh-cn';
    setTimeout(() => {//增加一段延时，项目加载一会
        $('#modelSelection').css('display', 'none');
        $('#projectManagement').css('display', 'flex');
        $('#topBar_tilt').text(language[lang]['manageProject']);//'项 目 管 理'
        $('#back_less').text(language[lang]['importProject']);

        // 渲染当前类型项目
        // renderProjectCards();
    }, 200);

}



function renderProjectCards() {
    const container = document.getElementById('projectContainer');
    container.innerHTML = ''; // 清空旧内容

    let projects = [];
    if (currentPage === 'image') {
        projects = typeI;
    } else if (currentPage === 'gesture') {
        projects = typeG;
    } else if (currentPage === 'posture') {
        projects = typeP;
    }

    projects.forEach((project, index) => {
        const name = project.projectName || '未命名项目';
        const desc = project.description || ''; // 假设项目有 description 字段
        addCardToUI(name, desc, index);
    });
}

// 显示模型选择界面
function showmodelSelection() {
    const lang = localStorage.getItem('tw:language') === 'en' ? 'en' : 'zh-cn';
    currentPage = "ai_choice";
    $('#modelSelection').css('display', 'flex');
    $('#projectManagement').css('display', 'none');
    $('#topBar_tilt').text(language[lang]['topBar_tilt']);//'训 练 模 型'
    $('#back_less').text(language[lang]['back_less']);
}

/*新建项目*/
$('#newProject').click(function() {
    
    goLearn(-1,false);

    
});


/*上传项目*/
$('#uploadingProject').click(function() {

    goLearn(-1,true);
    // alert("敬请期待")
   


});



/*跳转学习界面*/
function goLearn(num,isLoad){
    if(currentPage=='posture'){//姿态
        p.page="learn_posture";
        location.replace("learn.html?name="+openFileName+"&opennum="+num+"&MType=P"+"&isLoad="+isLoad);
    }else if(currentPage=='gesture'){//手势
        p.page="learn_gesture";
        location.replace("learn_g.html?name="+openFileName+"&opennum="+num+"&MType=G"+"&isLoad="+isLoad);
    }else if(currentPage=='image'){//图像
        p.page="learn_image";
        location.replace("learn_i.html?name="+openFileName+"&opennum="+num+"&MType=I"+"&isLoad="+isLoad);
    }else if(currentPage=='sound'){//声音
        p.page="learn_sound";
        location.replace("learn_s.html?name="+openFileName+"&opennum="+num+"&MType=S"+"&isLoad="+isLoad);
    }
}


// 获取卡片容器
const cardContainer = document.getElementById('projectContainer');
/*创建项目卡片*/
function addCardToUI(projectName, projectDescription,num) {
    // 创建卡片的外部div
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');

    // 创建图像元素
    const img = document.createElement('img');
    img.src = "../../img/AI/pg_"+currentPage+".svg"; // 设置图像路径
    //img.alt = "项目图标";

    // 创建标题div（项目名称）
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('card_title');
    titleDiv.textContent = projectName; // 设置项目名称

    // 创建底部div
    const bottomDiv = document.createElement('div');
    bottomDiv.classList.add('card_bottom');

    // 创建编辑按钮
    const editButton = document.createElement('button');
    editButton.classList.add('edit_button');
    editButton.textContent = '编辑';//"编 辑"
    // 添加点击事件监听器
    editButton.addEventListener('click', function() {
        goLearn(num)
    });

    // 将按钮添加到底部div
    bottomDiv.appendChild(editButton);

    // 创建删除按钮
    // const delDiv = document.createElement('div');
    // delDiv.classList.add('card_del');
    // delDiv.textContent = "×";
    // // 添加点击事件监听器
    // delDiv.addEventListener('click', function() {
    //     p.delProject(num);
    //     cardContainer.removeChild(this.parentElement);
    // });

    // 将所有元素添加到卡片div中
    cardDiv.appendChild(img);
    cardDiv.appendChild(titleDiv);
    cardDiv.appendChild(descDiv);
    cardDiv.appendChild(bottomDiv);
    cardDiv.appendChild(delDiv);

    // 将卡片添加到容器中
    cardContainer.appendChild(cardDiv);
}


