// import VideoProvider from '../../../../../node_modules/scratch-gui/src/lib/video/video-provider'; 
$('#load').text(window.parent.block_msg_load_model);
$('#nameTilt').text(window.parent.block_msg_name);
$('#instructionsTilt').text(window.parent.block_msg_instructions);
$('#addClass').text(window.parent.block_msg_addClass);
$('#trainingModel').text(window.parent.block_msg_trainingModel);
$('#exportModel').text(window.parent.block_msg_exportModel);
$('#playModel').text(window.parent.block_msg_playModel);
// $('#c1').val(window.parent.block_msg_class+" 1");
// $('#c2').val(window.parent.block_msg_class+" 2");
$('#n1').text(window.parent.block_msg_sample_num);
$('#n2').text(window.parent.block_msg_sample_num);



// const allLocalStorage = {};
// for (let i = 0; i < localStorage.length; i++) {
//   const key = localStorage.key(i);
//   allLocalStorage[key] = localStorage.getItem(key);
// }
// console.log(allLocalStorage);

let whatCamera='local'
let ip=''

let isTraining=false

let robotCameraTimer

let recordFps=100

// const waitLoad = document.getElementById('waitLoad');

const channelOpenCamera = new BroadcastChannel('open-camera')

const stopAll=new BroadcastChannel('stopAll')
// 动态创建弹窗
function createCameraSelectionModal() {
    const modal = document.createElement('div');
    modal.id = 'cameraSelectionModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        width: 390px;
        box-sizing: border-box;

        background: #fdfdfd;

        border: 1px solid #e2e5e9;
        border-radius: 14px;

        padding: 26px 28px 24px;

        z-index: 9999;

        display: flex;
        flex-direction: column;

        box-shadow:
            0 18px 45px rgba(0, 0, 0, 0.13),
            0 4px 12px rgba(0, 0, 0, 0.05);

        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;
    `;

    modal.innerHTML = `
        <!-- 顶部标题 -->
        <div
            style="
                display: flex;
                align-items: center;
                margin-bottom: 22px;
            "
        >
            <div
                style="
                    width: 4px;
                    height: 20px;
                    border-radius: 4px;
                    background: #9aa1aa;
                    margin-right: 11px;
                "
            ></div>

            <h3
                id="selectTitle"
                style="
                    margin: 0;
                    padding: 0;

                    font-size: 19px;
                    font-weight: 600;
                    line-height: 1.4;

                    color: #30343a;

                    letter-spacing: 0.1px;
                "
            >
                选择摄像头类型
            </h3>
        </div>


        <!-- 摄像头选择区域 -->
        <div
            style="
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 18px;
            "
        >

            <!-- 本地摄像头 -->
            <label
                style="
                    position: relative;

                    display: flex;
                    align-items: center;

                    min-height: 48px;
                    padding: 0 13px;

                    box-sizing: border-box;

                    border: 1px solid #e3e6ea;
                    border-radius: 9px;

                    background: #ffffff;

                    cursor: pointer;

                    color: #4a5058;
                    font-size: 14px;

                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        box-shadow 0.18s ease,
                        transform 0.15s ease;
                "
                onmouseover="
                    if (!this.querySelector('input').checked) {
                        this.style.backgroundColor='#fafbfc';
                        this.style.borderColor='#d7dbe0';
                    }
                "
                onmouseout="
                    if (!this.querySelector('input').checked) {
                        this.style.backgroundColor='#ffffff';
                        this.style.borderColor='#e3e6ea';
                    }
                "
            >
                <input
                    type="radio"
                    name="cameraType"
                    value="local"
                    checked
                    style="
                        width: 17px;
                        height: 17px;

                        margin: 0 11px 0 0;

                        accent-color: #6d737b;

                        cursor: pointer;
                        flex-shrink: 0;
                    "
                >

                <span
                    id="local"
                    style="
                        font-weight: 500;
                    "
                >
                    本地摄像头
                </span>
            </label>


            <!-- 网络摄像头 -->
            <label
                style="
                    position: relative;

                    display: flex;
                    align-items: center;

                    min-height: 48px;
                    padding: 0 13px;

                    box-sizing: border-box;

                    border: 1px solid #e3e6ea;
                    border-radius: 9px;

                    background: #ffffff;

                    cursor: pointer;

                    color: #4a5058;
                    font-size: 14px;

                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        box-shadow 0.18s ease,
                        transform 0.15s ease;
                "
                onmouseover="
                    if (!this.querySelector('input').checked) {
                        this.style.backgroundColor='#fafbfc';
                        this.style.borderColor='#d7dbe0';
                    }
                "
                onmouseout="
                    if (!this.querySelector('input').checked) {
                        this.style.backgroundColor='#ffffff';
                        this.style.borderColor='#e3e6ea';
                    }
                "
            >
                <input
                    type="radio"
                    name="cameraType"
                    value="network"
                    style="
                        width: 17px;
                        height: 17px;

                        margin: 0 11px 0 0;

                        accent-color: #6d737b;

                        cursor: pointer;
                        flex-shrink: 0;
                    "
                >

                <span
                    id="network"
                    style="
                        font-weight: 500;
                    "
                >
                    网络摄像头
                </span>
            </label>


            <!-- ICrobot 摄像头 -->
            <label
                style="
                    position: relative;

                    display: flex;
                    align-items: center;

                    min-height: 48px;
                    padding: 0 13px;

                    box-sizing: border-box;

                    border: 1px solid #e3e6ea;
                    border-radius: 9px;

                    background: #ffffff;

                    cursor: pointer;

                    color: #4a5058;
                    font-size: 14px;

                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        box-shadow 0.18s ease,
                        transform 0.15s ease;
                "
                onmouseover="
                    if (!this.querySelector('input').checked) {
                        this.style.backgroundColor='#fafbfc';
                        this.style.borderColor='#d7dbe0';
                    }
                "
                onmouseout="
                    if (!this.querySelector('input').checked) {
                        this.style.backgroundColor='#ffffff';
                        this.style.borderColor='#e3e6ea';
                    }
                "
            >
                <input
                    type="radio"
                    name="cameraType"
                    value="robot"
                    style="
                        width: 17px;
                        height: 17px;

                        margin: 0 11px 0 0;

                        accent-color: #6d737b;

                        cursor: pointer;
                        flex-shrink: 0;
                    "
                >

                <span
                    id="robot"
                    style="
                        font-weight: 500;
                    "
                >
                    ICrobot摄像头
                </span>
            </label>

        </div>


        <!-- 网络摄像头 IP -->
        <div
            id="networkCameraInput"
            style="
                margin-bottom: 18px;
                display: none;
            "
        >
            <div
                style="
                    font-size: 12px;
                    color: #8a9098;
                    margin-bottom: 7px;
                "
            >
                IP Address
            </div>

            <input
                type="text"
                id="cameraIp"
                placeholder="请输入网络摄像头IP地址"
                style="
                    width: 100%;
                    height: 40px;

                    padding: 0 13px;

                    box-sizing: border-box;

                    border: 1px solid #dfe3e7;
                    border-radius: 8px;

                    outline: none;

                    background: #f8f9fa;

                    color: #424850;

                    font-size: 14px;

                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        box-shadow 0.18s ease;
                "
                onfocus="
                    this.style.backgroundColor='#ffffff';
                    this.style.borderColor='#c9ced4';
                    this.style.boxShadow='0 0 0 3px rgba(80, 85, 92, 0.07)';
                "
                onblur="
                    this.style.backgroundColor='#f8f9fa';
                    this.style.borderColor='#dfe3e7';
                    this.style.boxShadow='none';
                "
            >
        </div>


        <!-- 分割线 -->
        <div
            style="
                height: 1px;
                background: #eceef0;
                margin: 2px 0 18px;
            "
        ></div>


        <!-- 底部按钮 -->
        <div
            style="
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 9px;
            "
        >

            <!-- 取消 -->
            <button
                id="cameraSelectCancel"
                style="
                    height: 37px;
                    min-width: 76px;

                    padding: 0 17px;

                    box-sizing: border-box;

                    border: 1px solid #dfe2e6;
                    border-radius: 8px;

                    background: #ffffff;
                    color: #626870;

                    font-size: 14px;
                    font-weight: 500;

                    cursor: pointer;

                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        box-shadow 0.18s ease;
                "
                onmouseover="
                    this.style.backgroundColor='#f7f8f9';
                    this.style.borderColor='#d4d8dd';
                "
                onmouseout="
                    this.style.backgroundColor='#ffffff';
                    this.style.borderColor='#dfe2e6';
                "
            >
                取消
            </button>


            <!-- 确定 -->
            <button
                id="cameraSelectConfirm"
                style="
                    height: 37px;
                    min-width: 76px;

                    padding: 0 17px;

                    box-sizing: border-box;

                    border: 1px solid #cfd3d8;
                    border-radius: 8px;

                    background: #e9ebed;
                    color: #3f444a;

                    font-size: 14px;
                    font-weight: 600;

                    cursor: pointer;

                    transition:
                        background-color 0.18s ease,
                        border-color 0.18s ease,
                        box-shadow 0.18s ease;
                "
                onmouseover="
                    this.style.backgroundColor='#e1e4e7';
                    this.style.borderColor='#c5c9ce';
                    this.style.boxShadow='0 3px 8px rgba(0,0,0,0.07)';
                "
                onmouseout="
                    this.style.backgroundColor='#e9ebed';
                    this.style.borderColor='#cfd3d8';
                    this.style.boxShadow='none';
                "
            >
                确定
            </button>

        </div>
    `;
    document.body.appendChild(modal);

    let langT = localStorage.getItem('tw:language') || 'zh-cn';

    // 如果存储的语言不存在 languageDate，则回退中文
    if (!languageDate[langT]) {
        langT = 'zh-cn';
    }

    // 更新页面文本
    document.getElementById('selectTitle').textContent = languageDate[langT]['selectTitle'];
    document.getElementById('local').textContent = languageDate[langT]['local'];
    document.getElementById('network').textContent = languageDate[langT]['network'];
    document.getElementById('robot').textContent = languageDate[langT]['robot'];
    document.getElementById('cameraIp').placeholder = languageDate[langT]['cameraIp'];
    document.getElementById('cameraSelectConfirm').textContent = languageDate[langT]['cameraSelectConfirm'];
    document.getElementById('cameraSelectCancel').textContent = languageDate[langT]['cameraSelectCancel'];

    // 监听选择变化
    modal.querySelectorAll('input[name="cameraType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'network') {
                modal.querySelector('#networkCameraInput').style.display = 'block';
            } else {
                modal.querySelector('#networkCameraInput').style.display = 'none';
            }
        });
    });

    // 点击确定
    modal.querySelector('#cameraSelectConfirm').addEventListener('click', async function() {
        const selectedType = modal.querySelector('input[name="cameraType"]:checked').value;

        if (selectedType === 'local') {
            if(whatCamera=='robot'){
                channelOpenCamera.postMessage(false)
            }
            whatCamera = 'local';
            ip = '';
        } else if(selectedType === 'network'){
            const inputIp = modal.querySelector('#cameraIp').value.trim();
            if (!inputIp) {
                alert(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['cameraIp']);
                return;
            }
            if(whatCamera=='robot'){
                channelOpenCamera.postMessage(false)
            }
            whatCamera = 'network';
            ip = inputIp;
        }else if(selectedType === 'robot'){
            //  let jsonData={
            //     "command":"camera",
            //     "params":{
            //         "mode":1
            //     }
            // }
            // // let str = `robot.start_camera()\r`;
            // let str=JSON.stringify(jsonData)
            // const socket = new WebSocket(`ws://192.168.4.1:8083`);
            // console.log(socket)
            // // socket.binaryType = 'arraybuffer';
            // socket.addEventListener('open', async (event) => {
            //     showToast('socket连接成功！！')
            //     console.log('WebSocket connection opened');
            //     socket.send(str)
            //     ip='192.168.4.1'
            // });

            waitLoad.classList.remove('hidden'); // 显示加载动画
            
            stopAll.postMessage(true)
            await new Promise(resolve => setTimeout(resolve, 600));
            robotCameraTimer=setTimeout(()=>{
                waitLoad.classList.add('hidden');
                showToast('加载超时,请检查摄像头')
            },5000)
            channelOpenCamera.postMessage(true)
            
            channelOpenCamera.addEventListener('message',handleReciveIp)
            
            
            
        }

        // 移除弹窗
        document.body.removeChild(modal);


    });

    // 点击取消
    modal.querySelector('#cameraSelectCancel').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
}

function handleReciveIp(event){
    ip=event.data
    whatCamera='robot'
    clearTimeout(robotCameraTimer)
    console.log('---------------------------------')
    waitLoad.classList.add('hidden'); // 隐藏加载动画
    channelOpenCamera.removeEventListener('message',handleReciveIp)
}


document.getElementById('select-camera').addEventListener('click',()=>{
    createCameraSelectionModal()
})
// const videoProvider = new VideoProvider();

const getUserMedia = window.getUserMedia;
var openFileName = GetQueryString("name");//编程项目名称
var opennum = GetQueryString("opennum");//打开项目的下标
var MType = GetQueryString("MType");//当前项目类型
// console.log(MType)



const languageDate = {
"zh-cn": {
    "tilt_G": "手势训练",
    "tilt_I": "图像训练",
    "tilt_P": "姿态训练",
    getCategoryName: (index) => `类别 ${index}`,
    getSampleText: (index) => `个图像样本`,
    "addClass":  `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="vertical-align: middle; margin-right:6px;">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M8 12h8"></path>
        <path d="M12 8v8"></path>
    </svg>
    添加一个类别`,
    "trainText": "训练",
    "progressText": "0%",
    "epo": "周期数：",
    "batch": "批次大小：",
    "speed": "学习速率：",
    "saveProject": "导出项目",
    "select-camera": "选择摄像头",
    "preview_title": "预览",
    "exportModel": "测试模型",
    "playModel": "使用模型",
    "nameTilt": "名称:",
    "instructionsTilt": "说明:",
    "keepPhoto":"按住即可录制",
    "highLevel":"高级",
    "reset":"重置为默认设置",
    "deepLearn":"深入了解",
    "startTrain":"开始训练",
    "selectTitle": "选择摄像头类型",
    "local": "本地摄像头",
    "network": "网络摄像头",
    "robot": "ICrobot摄像头",
    "cameraIp": "请输入网络摄像头IP地址",
    "cameraSelectConfirm": "确定",
    "cameraSelectCancel": "取消",
    'retrain':'再次训练',
    'completed':'已完成',
    'nameNotNull':'项目名称不能为空',
    'illeglStr':'存在非法字符 -',
    'stopTest':'停止测试',
    'webcamSpan':'设置',
    'save':'保存',
    'cancel':'取消',
    'noHand':'当前图像没有检测到手势',
    'notSupport':'暂不支持',
    'modelEqule':'请确保选择的模型与当前模式匹配',
    'fileFailed':'文件解析失败'
},
"en": {
    "tilt_G": "Gesture Training",
    "tilt_I": "Image Training",
    "tilt_P": "Pose Training",
    getCategoryName: (index) => `Category ${index}`,
    getSampleText: (index) => ` image samples`,
    "addClass": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="vertical-align: middle; margin-right:6px;">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M8 12h8"></path>
        <path d="M12 8v8"></path>
    </svg>
    Add a category`,
    "trainText": "Training",
    "progressText": "0%",
    "epo": "Epochs:",
    "batch": "Batch size:",
    "speed": "Learning rate:",
    "saveProject": "Export project",
    "select-camera": "Select camera",
    "preview_title": "Preview",
    "exportModel": "Test model",
    "playModel": "Use model",
    "nameTilt": "Name:",
    "instructionsTilt": "Description:",
    "keepPhoto":"Hold to record",
    "highLevel":"Advanced",
    "reset":"Reset to default",
    "deepLearn":"Learn more",
    "startTrain":"Start training",
    "selectTitle": "Select Camera Type",
    "local": "Local Camera",
    "network": "Network Camera",
    "robot": "ICrobot Camera",
    "cameraIp": "Please enter network camera IP address",
    "cameraSelectConfirm": "Confirm",
    "cameraSelectCancel": "Cancel",
    'retrain':'Retrain',
    'completed':'Completed',
    'nameNotNull':'The project name cannot be empty',
    'illeglStr':'Presence of illegal characters -',
    'stopTest':'Stop testing',
    'webcamSpan':'Settings',
    'save':'Save',
    'cancel':'Cancel',
    'noHand':'No gesture detected in the current image',
    'notSupport':'Not supported yet',
    'modelEqule':'Please ensure that the selected model matches the current mode',
    'fileFailed':'Failed to parse the file'
},
"pl": {
    "tilt_G": "Trenowanie gestów",
    "tilt_I": "Trenowanie obrazu",
    "tilt_P": "Trenowanie pozy",

    getCategoryName: (index) => `Kategoria ${index}`,
    getSampleText: (index) => ` próbek obrazu`,

    "addClass": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="vertical-align: middle; margin-right:6px;">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M8 12h8"></path>
        <path d="M12 8v8"></path>
    </svg>
    Dodaj kategorię`,
    "trainText": "Trenowanie",
    "progressText": "0%",
    "epo": "Epoki:",
    "batch": "Rozmiar partii:",
    "speed": "Współczynnik uczenia:",

    "saveProject": "Eksportuj projekt",
    "select-camera": "Wybierz kamerę",
    "preview_title": "Podgląd",
    "exportModel": "Testuj model",
    "playModel": "Użyj modelu",

    "nameTilt": "Nazwa:",
    "instructionsTilt": "Opis:",

    "keepPhoto": "Przytrzymaj, aby nagrywać",
    "highLevel": "Zaawansowane",
    "reset": "Przywróć ustawienia domyślne",
    "deepLearn": "Dowiedz się więcej",
    "startTrain": "Rozpocznij trenowanie",

    "selectTitle": "Wybierz typ kamery",
    "local": "Kamera lokalna",
    "network": "Kamera sieciowa",
    "robot": "Kamera ICrobot",
    "cameraIp": "Wprowadź adres IP kamery sieciowej",
    "cameraSelectConfirm": "Potwierdź",
    "cameraSelectCancel": "Anuluj",

    "retrain": "Trenuj ponownie",
    "completed": "Zakończono",
    "nameNotNull": "Nazwa projektu nie może być pusta",
    "illeglStr": "Zawiera niedozwolone znaki -",
    "stopTest": "Zatrzymaj test",
    'webcamSpan':'Ustawienia',
    'save':'Zapisz',
    'cancel':'Anuluj',
    'noHand':'Nie wykryto gestu na bieżącym obrazie',
    'notSupport':'Obecnie nieobsługiwane',
    'modelEqule':'Upewnij się, że wybrany model jest zgodny z bieżącym trybem',
    'fileFailed':'Nie udało się przetworzyć pliku'
    },
    "ru": {
    "tilt_G": "обучение жестам",
    "tilt_I": "обучение изображениям",
    "tilt_P": "обучение позам",

    getCategoryName: (index) => `категория ${index}`,
    getSampleText: (index) => ` образцов изображений`,

    "addClass": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="vertical-align: middle; margin-right:6px;">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M8 12h8"></path>
        <path d="M12 8v8"></path>
    </svg>
    добавить категорию`,
    "trainText": "обучение",
    "progressText": "0%",
    "epo": "эпохи:",
    "batch": "размер пакета:",
    "speed": "скорость обучения:",

    "saveProject": "экспорт проекта",
    "select-camera": "выбор камеры",
    "preview_title": "предпросмотр",
    "exportModel": "тестировать модель",
    "playModel": "использовать модель",

    "nameTilt": "название:",
    "instructionsTilt": "описание:",

    "keepPhoto": "Нажмите и удерживайте, чтобы записать",
    "highLevel": "расширенные",
    "reset": "сбросить к настройкам по умолчанию",
    "deepLearn": "узнать больше",
    "startTrain": "начать обучение",

    "selectTitle": "выбор типа камеры",
    "local": "локальная камера",
    "network": "сетевая камера",
    "robot": "камера ICrobot",
    "cameraIp": "введите IP-адрес сетевой камеры",
    "cameraSelectConfirm": "подтвердить",
    "cameraSelectCancel": "отмена",

    "retrain": "повторное обучение",
    "completed": "завершено",
    "nameNotNull": "название проекта не может быть пустым",
    "illeglStr": "содержит недопустимые символы -",
    "stopTest": "остановить тестирование",
    'webcamSpan':'Настройки',
    'save':'Сохранить',
    'cancel':'Отмена',
    'noHand':'Жест в текущем изображении не обнаружен',
    'notSupport':'Пока не поддерживается',
    'modelEqule':'Убедитесь, что выбранная модель соответствует текущему режиму',
    'fileFailed':'Не удалось разобрать файл'
},
"zh-tw": {
    "tilt_G": "手勢訓練",
    "tilt_I": "影像訓練",
    "tilt_P": "姿態訓練",

    getCategoryName: (index) => `類別 ${index}`,
    getSampleText: (index) => ` 個影像樣本`,

    "addClass": `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="vertical-align: middle; margin-right:6px;">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M8 12h8"></path>
        <path d="M12 8v8"></path>
    </svg>
    新增一個類別`,
    "trainText": "訓練",
    "progressText": "0%",
    "epo": "週期數：",
    "batch": "批次大小：",
    "speed": "學習速率：",

    "saveProject": "匯出專案",
    "select-camera": "選擇攝影機",
    "preview_title": "預覽",
    "exportModel": "測試模型",
    "playModel": "使用模型",

    "nameTilt": "名稱：",
    "instructionsTilt": "說明：",

    "keepPhoto": "按住即可錄製",
    "highLevel": "進階",
    "reset": "重置為預設設定",
    "deepLearn": "深入了解",
    "startTrain": "開始訓練",

    "selectTitle": "選擇攝影機類型",
    "local": "本地攝影機",
    "network": "網路攝影機",
    "robot": "ICrobot 攝影機",
    "cameraIp": "請輸入網路攝影機 IP 位址",
    "cameraSelectConfirm": "確定",
    "cameraSelectCancel": "取消",

    "retrain": "再次訓練",
    "completed": "已完成",
    "nameNotNull": "專案名稱不能為空",
    "illeglStr": "存在非法字元 -",
    "stopTest": "停止測試",
    'webcamSpan':'設定',
    'save':'儲存',
    'cancel':'取消',
    'noHand':'目前影像未偵測到手勢​',
    'notSupport':'暫不支援',
    'modelEqule':'請確保選擇的模型與目前模式相符',
    'fileFailed':'檔案解析失敗'
    }
};

// Determine title key based on MType
const titleKey = `tilt_${MType}`;

function changeLanguage(){
    // if(localStorage.getItem('tw:language')=='en'){
    //     document.getElementById('tilt').textContent = languageDate['en'][titleKey];
    //     document.getElementById('c1').value = languageDate['en'].getCategoryName(1);
    //     document.getElementById('n1').textContent = languageDate['en'].getSampleText(1);
    //     document.getElementById('c2').value = languageDate['en'].getCategoryName(2);
    //     document.getElementById('n2').textContent = languageDate['en'].getSampleText(2);
    //     document.getElementById('addClass').textContent = languageDate['en']['addClass'];
    //     document.getElementById('trainText').textContent = languageDate['en']['trainText'];
    //     document.getElementById('progressText').textContent = languageDate['en']['progressText'];
    //     document.getElementById('epo').previousElementSibling.textContent = languageDate['en']['epo'];
    //     document.getElementById('batch').previousElementSibling.textContent = languageDate['en']['batch'];
    //     document.getElementById('speed').previousElementSibling.textContent = languageDate['en']['speed'];
    //     document.getElementById('saveProject').textContent = languageDate['en']['saveProject'];
    //     document.getElementById('select-camera').textContent = languageDate['en']['select-camera'];
    //     document.querySelector('.preview_title').textContent = languageDate['en']['preview_title'];
    //     document.getElementById('exportModel').textContent = languageDate['en']['exportModel'];
    //     document.getElementById('playModel').textContent = languageDate['en']['playModel'];
    //     document.getElementById('nameTilt').textContent = languageDate['en']['nameTilt'];
    //     document.getElementById('instructionsTilt').textContent = languageDate['en']['instructionsTilt'];

        

    //     const uploadButtons = document.querySelectorAll('.upload');
    //     uploadButtons.forEach(button => {
    //         button.textContent = languageDate['en']['keepPhoto'];
    //     });
        
    //     // Update advanced options
    //     document.querySelector('.advanced-toggle').textContent = languageDate['en']['highLevel'];
    //     document.querySelector('.reset-button').textContent = languageDate['en']['reset'];
    //     document.querySelector('.learn-more-button').textContent =languageDate['en']['deepLearn'];
        
    //     // Update training button
    //     document.getElementById('trainingModel').textContent = languageDate['en']['startTrain'];
    // }else{
    //     document.getElementById('tilt').textContent = languageDate['zh-cn'][titleKey];
    //     document.getElementById('c1').value = languageDate['zh-cn'].getCategoryName(1);
    //     document.getElementById('n1').textContent = languageDate['zh-cn'].getSampleText(1);
    //     document.getElementById('c2').value = languageDate['zh-cn'].getCategoryName(2);
    //     document.getElementById('n2').textContent = languageDate['zh-cn'].getSampleText(2);
    //     document.getElementById('addClass').textContent = languageDate['zh-cn']['addClass'];
    //     document.getElementById('trainText').textContent = languageDate['zh-cn']['trainText'];
    //     document.getElementById('progressText').textContent = languageDate['zh-cn']['progressText'];
    //     document.getElementById('epo').previousElementSibling.textContent = languageDate['zh-cn']['epo'];
    //     document.getElementById('batch').previousElementSibling.textContent = languageDate['zh-cn']['batch'];
    //     document.getElementById('speed').previousElementSibling.textContent = languageDate['zh-cn']['speed'];
    //     document.getElementById('saveProject').textContent = languageDate['zh-cn']['saveProject'];
    //     document.getElementById('select-camera').textContent = languageDate['zh-cn']['select-camera'];
    //     document.querySelector('.preview_title').textContent = languageDate['zh-cn']['preview_title'];
    //     document.getElementById('exportModel').textContent = languageDate['zh-cn']['exportModel'];
    //     document.getElementById('playModel').textContent = languageDate['zh-cn']['playModel'];
    //     document.getElementById('nameTilt').textContent = languageDate['zh-cn']['nameTilt'];
    //     document.getElementById('instructionsTilt').textContent = languageDate['zh-cn']['instructionsTilt'];

       

    //     const uploadButtons = document.querySelectorAll('.upload');
    //     uploadButtons.forEach(button => {
    //         button.textContent = languageDate['zh-cn']['keepPhoto'];
    //     });
        
    //     // Update advanced options
    //     document.querySelector('.advanced-toggle').textContent = languageDate['zh-cn']['highLevel'];
    //     document.querySelector('.reset-button').textContent = languageDate['zh-cn']['reset'];
    //     document.querySelector('.learn-more-button').textContent =languageDate['zh-cn']['deepLearn'];
        
    //     // Update training button
    //     document.getElementById('trainingModel').textContent = languageDate['zh-cn']['startTrain'];
    // }

     const lang = localStorage.getItem('tw:language') || 'zh-cn';
    const data = languageDate[lang] || languageDate['zh-cn'];

    document.getElementById('tilt').textContent = data[titleKey];
    document.getElementById('c1').value = data.getCategoryName(1);
    document.getElementById('n1').textContent = data.getSampleText(1);
    document.getElementById('c2').value = data.getCategoryName(2);
    document.getElementById('n2').textContent = data.getSampleText(2);

    document.getElementById('addClass').innerHTML = data.addClass;
    document.getElementById('trainText').textContent = data.trainText;
    // document.getElementById('progressText').textContent = data.progressText;
    document.getElementById('epo').previousElementSibling.textContent = data.epo;
    document.getElementById('batch').previousElementSibling.textContent = data.batch;
    // document.getElementById('speed').previousElementSibling.textContent = data.speed;

    document.getElementById('saveProject').textContent = data.saveProject;
    document.getElementById('select-camera').textContent = data['select-camera'];
    document.querySelector('.preview_title').textContent = data.preview_title;
    document.getElementById('exportModel').textContent = data.exportModel;
    document.getElementById('playModel').textContent = data.playModel;
    document.getElementById('nameTilt').textContent = data.nameTilt;
    document.getElementById('instructionsTilt').textContent = data.instructionsTilt;

    document.querySelectorAll('.upload').forEach(btn => {
        btn.textContent = data.keepPhoto;
    });

    document.querySelectorAll('.settingsCancel').forEach(btn => {
        btn.textContent = data.cancel;
    });
    document.querySelectorAll('.settingsSave').forEach(btn => {
        btn.textContent = data.save;
    });
    // document.querySelector('.advanced-toggle').textContent = data.highLevel;
    document.getElementById('highLevel').textContent=data.highLevel
    document.querySelector('.reset-button').textContent = data.reset;
    // document.querySelector('.learn-more-button').textContent = data.deepLearn;
    document.getElementById('trainingModel').textContent = data.startTrain;
}
changeLanguage()

let isLoad = GetQueryString("isLoad");
let projectJson=''
console.log(isLoad)

function getExtension(str) {
    let index = str.lastIndexOf(".");
    return index !== -1 ? str.slice(index + 1) : ""; // 如果找到点，截取后面的部分，否则返回空字符串
}
// if(isLoad=='true'){
    // var input = document.createElement("input");
    // input.type = "file";
    // input.accept = ".json"; // 只接受 JSON 文件
    
    // // 监听文件选择事件
    // input.addEventListener("change", function(event) {
    //     var file = event.target.files[0]; // 获取选择的文件
    
    //     if (!file) return;
    
    //     var reader = new FileReader();
    
    //     reader.onload = function(e) {
    //         try {
    //             // 解析 JSON 数据
    //             var jsonData = JSON.parse(e.target.result);
    //             console.log("读取的 JSON 内容:", jsonData);
    //             projectJson=jsonData
    //             if(getExtension(projectJson.projectName)==MType){
    //                 INIpage(projectJson.projectName,projectJson.imageDATA)
    //             }else{
    //                 alert('请确保选择的模型与当前模式匹配')
    //             }
    
                
                
    //         } catch (error) {
    //             console.error("JSON 解析失败:", error);
    //             alert("文件内容格式错误！");
    //         }
    //     };
    
    //     // 读取文件为文本
    //     reader.readAsText(file);
    // });
    
    // // 触发文件选择框的打开
    // input.click();

    
// }

// window.addEventListener("load", function () {

//     if(isLoad=='true'){
//         let data = localStorage.getItem("importProjectJson");

//         if(data){
//             try{
//                 // console.log(data)

//                 let jsonData = JSON.parse(data);
//                 projectJson = jsonData;

//                 if(getExtension(projectJson.projectName)==MType){
//                     INIpage(projectJson.projectName,projectJson.imageDATA)
//                 }else{
//                     alert('请确保选择的模型与当前模式匹配')
//                 }

//                 localStorage.removeItem("importProjectJson");

//             }catch(e){
//                 console.log(e)
//                 alert("文件解析失败");
//             }
//         }
//     }

// });
window.addEventListener("load", function () { 
 
    if(isLoad=='true'){ 
        console.log('---------') 

        // ✅ 从 IndexedDB 读取
        new Promise((resolve, reject) => {
            const request = indexedDB.open("ProjectDB", 1);

            request.onupgradeneeded = function(event) {
                const db = event.target.result;

                if (!db.objectStoreNames.contains("projects")) {
                    db.createObjectStore("projects");
                }
            };

            request.onsuccess = function(event) {
                resolve(event.target.result);
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        }).then(async (db) => {

            try {

                const data = await new Promise((resolve, reject) => {

                    const transaction = db.transaction(
                        "projects",
                        "readonly"
                    );

                    const store = transaction.objectStore("projects");

                    const request = store.get(
                        "importProjectJson"
                    );

                    request.onsuccess = function() {
                        resolve(request.result);
                    };

                    request.onerror = function(event) {
                        reject(event.target.error);
                    };

                });

                if(data){ 
                    try{ 
                        // console.log(data) 
 
                        // ✅ IndexedDB 里面已经直接存的是对象
                        let jsonData = data; 
                        projectJson = jsonData; 
 
                        if(getExtension(projectJson.projectName)==MType){ 
                            INIpage(projectJson.projectName,projectJson.imageDATA) 
                        }else{ 
                            showToast(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['modelEqule']) 
                        } 
 
                        // ✅ 删除 IndexedDB 中的数据
                        await new Promise((resolve, reject) => {

                            const transaction = db.transaction(
                                "projects",
                                "readwrite"
                            );

                            const store = transaction.objectStore(
                                "projects"
                            );

                            const request = store.delete(
                                "importProjectJson"
                            );

                            request.onsuccess = function() {
                                resolve();
                            };

                            request.onerror = function(event) {
                                reject(event.target.error);
                            };

                        });

                    }catch(e){ 
                        console.log(e) 
                        showToast(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['fileFailed']) 
                    } 
                }

                db.close();

            } catch(e) {
                console.log(e);
            }

        }).catch(function(error) {
            console.log(error);
        });
    } 
 
});


var  oldProjectName='';
var p = window.parent;
let NUM_CLASS = 2;//新增类数量
let SUM_CLASS = NUM_CLASS;//所有类之和

let NUM_IMG = 0;//新增图片累计数量

let sampleSize = 0;//所有样本数量
let MINsampleSize = 10;//最小训练数量

let imageDATA=[];//图像数据
let cameraType1 = false;

let playModelType = false;
let openFileEnd='T';//判断打开文件成功与否

const channelVideo = new BroadcastChannel('channelVideo')
const channelTrain=new BroadcastChannel('channelTrain')


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

if(opennum>=0){//打开的项目
    openFileEnd="F";
    //p.openMP(opennum);//会跳转去初始化
}




/*const*/
let classChecked_div;//当前选中的div（类）

// let video = document.getElementById('cameraView');//相机视图
let video
let canvasId='canvas1'

let trainingModel = $('#trainingModel');//训练按钮
// let trainingModel_progress = $('#trainingModel_progress');//训练进度条整体
// let progressText = $('#progressText');//进度条文本描述
// let barTrain = $('#barTrain');//进度条块

let show_video = document.getElementById('show_cameraView');//展示视图

const cardContainer = document.getElementById('cards-container');

/*点击返回上一界面*/
$('#back').click(function() {
    // console.log(window.parent)
    console.log('###########################')
    channelVideo.postMessage('close')
    if(whatCamera=='robot'){
        channelOpenCamera.postMessage(false)
    }
    if(video){
        video.srcObject = null;
        videoStream = null;
    }
    
    // saveProject(false);
    p.page= 'ai_choice';
    location.replace("ai_choice.html?name="+openFileName);
});

/*点击标题*/
$('#tilt').click(function() {
    openEdit_win();
});
/*点击编辑标题按钮*/
$('#tiltEdit').click(function() {
    openEdit_win();
});

/*点击遮罩层*/
$('#maskLayer').click(function() {
    $('#tilt').text( $('#name').val() );
    closeEdit_win()
});
/*点击导出项目*/
$('#exportProject').click(function() {
    saveProject(true);
});

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

/*点击开始训练*/
$('#trainingModel').click(function() {
    if(sampleSize < MINsampleSize) return;//超出无功能
    var canTrain = true;
    $("#cards-container").find(".card_numText_n").each(function(index, element) {//空类不允许训练
        var value = $(element).text();
        //console.log("Card " + (index + 1) + " 的样本数量是: " + value);
        if(parseInt(value)<=0){
            // alert("样本数量不能为空")
            showToast("样本数量不能为空")
            canTrain = false;
            return false;
        }
    });
    if(!canTrain) return;


    //createModel()
    // trainingModel.css('display', 'none');
    // trainingModel_progress.css('display', 'block');
    // 强制重新渲染再执行 trainModel
    setTimeout(function() {
        trainModel();
    }, 100);
});
/*点击导出模型*/
$('#exportModel').click(function() {
console.log(!isTrain)
    if(!isTrain) return;
    //alert('导出模型--功能暂未开放')

    if(playModelType){
        endShow();
    }else{
        startShow();
    }

});
/*点击使用模型*/
$('#playModel').click(async function() {
    if(!isTrain) return;
    // saveProject(false);//保存模型项目文件
    saveModel();//保存模型
    await new Promise(resolve => setTimeout(resolve, 200));
    if(whatCamera=='robot'){
        channelOpenCamera.postMessage(false)
    }
    
    channelTrain.postMessage(false)
    channelVideo.postMessage('close')
    video.srcObject = null;
    videoStream = null;
});

$('#saveProject').click(async function(){
    saveProject(false)
})
function goPlay(name){//跳转编程界面
    p.page= 'index';
    location.replace("../tests/play_M1.html?type=o&name="+openFileName+".bricksm&MdType="+MType+"&modelName="+name);
}

/*点击翻转相机*/
$('#cameraWinButton_cut').click(function() {
    closeCamera(); // 关闭当前摄像头
    cameraType1 = !cameraType1; // 切换摄像头类型
    setupCamera(); // 重新打开摄像头
});
/*拍摄按钮开始点击*/
$('#cameraWinButton_shoot').on('touchstart mousedown', function(e) {
    handleButtonStart(e);
});
/*拍摄按钮结束点击*/
$('#cameraWinButton_shoot').on('touchend mouseup', function(e) {
    handleButtonEnd(e);
    /*e.preventDefault();
    e.stopPropagation();
    clearInterval(shootTime);*/
});

$('.reset-button').click(function() {
    epo=50
    batch=32
    document.getElementById('epo').value=50
    document.getElementById('batch').value=16
})

function handleButtonEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    // 移除监听器，避免重复绑定
    document.removeEventListener('mouseup', handleButtonEnd);
    document.removeEventListener('touchend', handleButtonEnd);
    clearInterval(shootTime);
}
/*点击关闭相机窗口*/
$('.cameraWinButton_close').click(function() {
    closeCameraWin();
});

/*打开标题编辑窗口*/
function openEdit_win(){
    $('#name').val( $('#tilt').text() );
    $('#maskLayer').css('display', 'block');
    $('#editWin').css('display', 'block');
}
/*关闭标题编辑窗口*/
function closeEdit_win(){
    $('#maskLayer').css('display', 'none');
    $('#editWin').css('display', 'none');
}
/*新增类*/
function addCard() {
    NUM_CLASS++;
    SUM_CLASS++;//类之和累加

    console.log('添加的id',NUM_CLASS-1)
    const card = document.createElement('div');
    card.classList.add('card');
    card.id = 'card-'+NUM_CLASS;
    // card.innerHTML = `
    //      <div class="card_top" id="card-${NUM_CLASS}"></div>
    //               <input type="text" id="c${NUM_CLASS}" value="类别 ${NUM_CLASS}" />
    //               <button class="delete" onclick="deleteCard(this)">×</button>
    //               <div style="height: 1px; width: 100%; border-bottom: 1px solid black;"></div>
    //               <div class="cameraBn" style="display: flex;">
    //                 <button class="camera" onclick="openCamera(this)"></button>
    //                 <button class="upFile" onclick="openFile(this)"></button>
    //               </div>
    //               <div class="cameraWin" id="cameraWin${NUM_CLASS}">
    //                 <video class="cameraView" width="320" height="240" id="cameraView${NUM_CLASS}"  autoplay muted></video>
    //                  <img class="netCamera"  crossorigin="anonymous" id="netCamera${NUM_CLASS}">
    //                 <canvas class="cameraView" width="320" height="240" id="canvas${NUM_CLASS}" ></canvas>
            
    //                 <button class="cameraWinButton_close">×</button>
    //               </div>
    //               <button class="upload gray" onmousedown="handleButtonStart(event)" onmouseup="handleButtonEnd(event)" ontouchstart="handleButtonStart(event)" ontouchend="handleButtonEnd(event)">按住即可录制</button>
    //               <p class="card_numText"><span class='card_numText_n'>0</span><span id="n${NUM_CLASS}">个图像样本</span></p>
    //               <div class="photoLibrary"> </div>

    // `;
    card.innerHTML=`
        <span class="input-wrap">
        <input type="text" id="c${NUM_CLASS}" value="类别 ${NUM_CLASS}" />
        
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
    <div class="cameraLeft" id="cameraLeft${NUM_CLASS}">
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
        <!--<div class="settingItem">
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
    
    <div class="cameraWin" id="cameraWin${NUM_CLASS}">
        <video class="cameraView" width="320" height="240" id="cameraView${NUM_CLASS}"  autoplay muted></video>
        <img class="netCamera"  crossorigin="anonymous" id="netCamera${NUM_CLASS}">
        <canvas class="cameraView" width="320" height="240" id="canvas${NUM_CLASS}" ></canvas>

        
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
    <p class="card_numText"><span class='card_numText_n'>0</span><span id='n${NUM_CLASS}'>个图像样本</span></p>
    <div class="photoLibrary"> </div>
    </div>
    `
    cardContainer.appendChild(card);
    if(MType=='I'){
        createModel();//重新创建训练模型
    }else{
        model = createModel();//重新创建训练模型
    }

    // 自动滚动到父级 class_add 的最底部
    const classAdd = document.querySelector('.class_add');
    classAdd.scrollTop = classAdd.scrollHeight;
    $('.cameraWinButton_close').click(function() {
        closeCameraWin();
    });

    document.querySelectorAll('.uploadSetting').forEach(btn=>{
        btn.removeEventListener('click',uploadSettingFun)
        btn.addEventListener('click', uploadSettingFun);
      });

    const data =
    languageDate[localStorage.getItem('tw:language')] ||
    languageDate['zh-cn'];

    document.getElementById(`c${NUM_CLASS}`).value =
    data.getCategoryName(NUM_CLASS);
    document.getElementById(`n${NUM_CLASS}`).textContent =
    data.getSampleText(NUM_CLASS);

    document.querySelectorAll('.upload').forEach(button => {
    button.textContent = data.keepPhoto;
    });
    document.querySelectorAll('.settingsCancel').forEach(btn => {
        btn.textContent = data.cancel;
    });
    document.querySelectorAll('.settingsSave').forEach(btn => {
        btn.textContent = data.save;
    });
    drawKittenLines();
    // if(localStorage.getItem('tw:language')=='en'){
    //     document.getElementById(`c${NUM_CLASS}`).value=languageDate['en'].getCategoryName(NUM_CLASS)
    //     document.getElementById(`n${NUM_CLASS}`).textContent=languageDate['en'].getSampleText(NUM_CLASS)
    //     const uploadButtons = document.querySelectorAll('.upload');
    //     uploadButtons.forEach(button => {
    //         button.textContent = languageDate['en']['keepPhoto'];
    //     });
    // }else{
    //     document.getElementById(`c${NUM_CLASS}`).value=languageDate['zh-cn'].getCategoryName(NUM_CLASS)
    //     document.getElementById(`n${NUM_CLASS}`).textContent=languageDate['zh-cn'].getSampleText(NUM_CLASS)
    //     const uploadButtons = document.querySelectorAll('.upload');
    //     uploadButtons.forEach(button => {
    //         button.textContent = languageDate['zh-cn']['keepPhoto'];
    //     });
    // }
}

/*删除卡片*/
function deleteCard(button) {
    if(cameraType) {
        showToast('请先关闭摄像头')
        return
    }else{
        console.log('删除了一个卡片')
        // var card = button.parentElement;
        var card = button.closest('.card');
        var dellab = parseInt(card.id.split('-')[1])-1;
        console.log('删除的id',dellab)
        //删除数据
        data.forEach((da,index)=>{
        if(da.label==dellab){
            data.splice(index,1)
        }
        })
        labelClass.forEach((lab,index)=>{
            if(dellab==lab){
                labelClass.splice(index,1)
            }
        })

        for(let i = data.length - 1; i >= 0; i--){
            var da = data[i]
            if(da.label==dellab){
            data.splice(i,1)
            }
        }
        for(let i = imageDATA.length - 1; i >= 0; i--){
            var con = imageDATA[i]
            if(con.data.label==dellab){
            imageDATA.splice(i,1)
            }
        }
        //删除card
        card.remove();
        //样本总量减少
        sampleSize -= parseInt($(card).find('.card_numText_n').text());
        SUM_CLASS -= 1;//类之和减少
        drawKittenLines();
        /*if(MType=='I'){
            createModel();//重新创建训练模型
        }else{
            model = createModel();//重新创建训练模型
        }*/
    }
    
}


function getCurrentCard(element) {
    return element.closest(".card");
}

function setPhotoLibraryMode(card, mode) {
    const library = card.querySelector(".photoLibrary");
    if (!library) return;

    if (mode === "horizontal") {
        library.classList.add("single-line");
    } else {
        library.classList.remove("single-line");
    }
}


/*展开相机窗口*/
function openCamera(button) {
    console.log('---------------')
   
    // document.getElementById('cameraBn').style.display='none'
    closeAllCamera()
    // closeCameraWin();
    if(classChecked_div){//如果摄像头打开，再次点击该按键，关闭摄像头
        console.log('有打开的窗口')
        closeCameraWin();
    }
    if(cameraType==false){//如果相机未打开，直接打开
        const card = getCurrentCard(button);

        // 打开摄像头 → 强制竖向滚动
        setPhotoLibraryMode(card, "vertical");
        classChecked_div = button.parentNode.parentNode;
        classChecked_div.querySelector('.cameraBn').style.display='none'

        
        // let lastChar = classChecked_div.id.charAt(classChecked_div.id.length - 1);
        let lastChar = classChecked_div.id.match(/\d+$/);
        if(whatCamera!='local'){
            classChecked_div.querySelector(`#cameraLeft${lastChar}`).style.display='block'
            classChecked_div.querySelector(`.cameraWin #netCamera${lastChar}`).style.display='block'
            classChecked_div.querySelector(`.cameraWin #canvas${lastChar}`).style.display='block'
            // classChecked_div.querySelector(`.cameraWin #canvas${lastChar}`).style.zIndex='100'
            document.getElementById(`netCamera${lastChar}`).crossOrigin = "anonymous"; 
            if(whatCamera=='network'){
                document.getElementById(`netCamera${lastChar}`).src=`http://${ip}:81/stream`
            }else{
                document.getElementById(`netCamera${lastChar}`).src=`http://${ip}:8081/video_feed`
            }
            
            document.getElementById(`netCamera${lastChar}`).onload=()=>{
                console.log('连接成功')
            }
            video=document.getElementById(`netCamera${lastChar}`)
            canvasId=`canvas${lastChar}`
        }else{
            console.log(classChecked_div)
            console.log(document.getElementById(`netCamera${lastChar}`))
            classChecked_div.querySelector(`#cameraLeft${lastChar}`).style.display='block'
            classChecked_div.querySelector(`.cameraWin #cameraView${lastChar}`).style.display='block'
            classChecked_div.querySelector(`.cameraWin #canvas${lastChar}`).style.display='block'
            video=classChecked_div.querySelector(`.cameraWin #cameraView${lastChar}`)
           
    
            console.log(video)
            console.log(classChecked_div)
            canvasId=`canvas${lastChar}`
        }

        
        
        cameraShow();  // 打开相机
        drawKittenLines()
    }

}
/*关闭相机窗口*/
function closeCameraWin() {
    console.log('关闭所有窗口')
    document.querySelectorAll(".photoLibrary").forEach(el => {
        el.classList.add("single-line");
    });

    // let box = this.closest('.cameraLeft');

    // 关闭整个面板
    // box.style.display = 'none';

    // 关键：重置状态
    // document.querySelectorAll(".cameraSettings").forEach(el => {
    //     el.style.display = 'none';
    // })
    // document.querySelectorAll(".cameraSettings").forEach(el => {
    //     el.style.display = 'none';
    // })
    classChecked_div.querySelector('.cameraSettings').style.display = 'none';
    classChecked_div.querySelector('.cameraWin').style.display = 'block';
    classChecked_div.querySelector('.upload').style.display = 'block';
    classChecked_div.querySelector('.uploadSetting').style.display = 'block';
    classChecked_div.querySelector('.webcamSpan').textContent='webcam'
    console.log('################')
    //  document.getElementById('cameraBn').style.display='flex'
    closeCamera();  // 关闭相机
    // $('#cameraWin').css('display', 'none');//隐藏窗口
    classChecked_div.querySelector(`.cameraLeft`).style.display='none'
    classChecked_div.querySelector('.cameraWin').style.display='none'
    cameraType = false;
    stopDetection();//停止检测

    classChecked_div.querySelector('.cameraBn').style.display='flex'
    classChecked_div.querySelector('.photoLibrary').classList.remove('photoLibrary_b');//移除边框
    classChecked_div.querySelector('.upload').classList.add('gray');//增加禁用
    classChecked_div.querySelector('.upload').style.display='none';//增加禁用
    drawKittenLines()
}

function closeAllCamera(){
    endShow()
    for(let i=1;i<=NUM_CLASS;i++){
       try{
            let dom=document.getElementById(`card-${i}`)
            closeCamera();  // 关闭相机
            // $('#cameraWin').css('display', 'none');//隐藏窗口
            dom.querySelector('.cameraWin').style.display='none'
            cameraType = false;
            stopDetection();//停止检测
        
            dom.querySelector('.cameraBn').style.display='flex'
            dom.querySelector('.photoLibrary').classList.remove('photoLibrary_b');//移除边框
            dom.querySelector('.upload').classList.add('gray');//增加禁用
            dom.querySelector('.upload').style.display='none';//增加禁用
       }catch(e){
        console.log(e)
       }
    }
}


// 成功回调
function onSuccess(imageURI) {
    // 显示导入的图片
    /*var img = document.getElementById('importedImage');
    img.src = imageURI;
    img.style.display = 'block'; // 显示图像*/
    alert('选择图像成功: ');
}

// 失败回调
function onFail(message) {
    alert('选择图像失败: ' + message);
}

let videoStream = null;
var cameraType = false;
async function cameraShow() {
      endShow();//关闭模型测试
      const canvas = document.getElementById("show_canvas");
    const ctx = canvas.getContext("2d");

    // 清空整个画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      cameraType1 = false;//摄像头类型
      if (cameraType) return;
     // 首先检查是否已经授予了摄像头权限
     try {
//         const permissionStatus = await navigator.permissions.query({ name: 'camera' });
//         if (permissionStatus.state === 'granted') {// 已授予权限，直接调用摄像头
//             await setupCamera();
//         } else if (permissionStatus.state === 'prompt') {// 未请求过权限，主动请求
//             await setupCamera();
//         } else if (permissionStatus.state === 'denied') {
//             alert("您已拒绝摄像头权限，请前往设置中启用相机权限。");
//         }
          p.checkCameraPermission()
     } catch (error) {
         console.log('无法检查权限状态：', error);
         // 直接尝试打开摄像头
         await setupCamera();
     }
}

const requestStack = [];
const requestVideoStream = videoDesc => {
    let streamPromise;
    if (requestStack.length === 0) {
        streamPromise = getUserMedia({
            audio: false,
            video: videoDesc
        });
        requestStack.push(streamPromise);
    } else if (requestStack.length > 0) {
        streamPromise = requestStack[0];
        requestStack.push(true);
    }
    return streamPromise;
};
// 设置相机并处理视频流
async function setupCamera() {
    try {
         // const constraints = {
        //     video: {
        //         facingMode: cameraType1 ? 'environment' : 'user' // 根据 cameraType 设置前置或后置摄像头
        //     }
        // };
        if(whatCamera=='local'){
            console.log(video.id)
            channelVideo.postMessage(video.id)
        }
        

        // const constraints = {
        //     video: true
        // };
        // videoStream = await navigator.mediaDevices.getUserMedia(constraints);//{ video: true }
        // video.srcObject = videoStream
        

        // videoProvider.enableVideo()
        // .then(() => {
        //     console.log('摄像头已开启');
        //     video = videoProvider.video;

        // })
        // .catch(error => {
        //     console.error('摄像头开启失败:', error);
        // });
        // $('#cameraWin').css('display', 'block');//显示窗口
        classChecked_div.querySelector('.cameraWin').style.display='block'
        cameraType = true;
        console.log(classChecked_div)
        classChecked_div.querySelector('.photoLibrary').classList.add('photoLibrary_b');//增加边框
        classChecked_div.querySelector('.upload').classList.remove('gray');//移除禁用
        classChecked_div.querySelector('.upload').style.display='block';//增加禁用

        startDetection();//开启检测

    } catch (error) {
        console.error('摄像头错误', error);
        //alert("无法打开摄像头，请检查相机权限是否已启用。");
    }
}
//关闭摄像头
function closeCamera() {
    // 停止所有视频流
    if(video){
         if (video.srcObject) {
            // videoStream.getTracks().forEach(track => track.stop());
            channelVideo.postMessage('close')
            video.srcObject = null;
            videoStream = null;//
        }else if(video.src){
            video.src=null
        }
    }
   
}

/*训练结束，恢复样式*/
function trainModel_end(){
    //显示两个模型按钮
    $('#exportModel').removeClass('exportGray');
    $('#playModel').removeClass('playGray');

    //恢复中间训练按钮
    trainingModel.text(languageDate[localStorage.getItem('tw:language') || 'zh-cn']['retrain']);//"再次训练"
    // trainingModel.css('display', 'block');
    // trainingModel_progress.css('display', 'none');
    // progressText.text ('0%');
    // barTrain.css('width', '0%');

}

// 实时监测样本数量变化
setInterval(() => {
    checkSampleSize();
}, 100);
//检测样本数量，改变训练按钮
function checkSampleSize() {
    if (sampleSize >= MINsampleSize) {
        trainingModel.removeClass('trainGray');
    } else {
        trainingModel.addClass('trainGray');
    }
}


/*----------------------------------------------------------声音----------------------------------------------------*/
let audioContext, analyser, microphone, dataArray;
let canvasWidth, canvasHeight, centerY, totalFrames;
let recordingComplete = false;
var drawInterval;
var isLiveInput = false; // 录制状态
var mediaStreamSource = null;
var audioStream = null;
var waveCanvas, wavectx;

var dh = 5;
const fftSize = 4096;
var baseNoteF;
var chartHeight = 0;

var scrollSpeed = 2; // 滚动速度
var scrollPos = 0; // 滚动的位置
var recordTimeout = null; // 录制计时器

//数据
// One frame is ~23ms of audio.
const NUM_FRAMES = 33;
let centExamples=[]

const spectrogramDiv = document.getElementById('spectrogram');
const Micro_record = document.getElementById('Micro_record');

//打开录音
function openMicro(button) {
   /*if(cameraType==true && classChecked_div==button.parentNode){//如果摄像头打开，再次点击该按键，关闭摄像头
          closeCameraWin();
      }else if(cameraType==false){//如果相机未打开，直接打开
          classChecked_div = button.parentNode;
          cameraShow();  // 打开相机
      }*/
   //startRecord();


   $('#Micro_record').text("记录20秒");
   spectrogramDiv.innerHTML = '<canvas id="spectrumCanvas"></canvas>';
   $('#cameraWin').css('display', 'block');//显示窗口
}
var recordType=false;
/*点击录制按钮*/
$('#Micro_record').click(function() {
    if(recordType) return;
    spectrogramDiv.innerHTML = '<canvas id="spectrumCanvas"></canvas>';
    startRecord();
});

/*录制准备*/
async function startRecord() {
    waveCanvas = document.getElementById("spectrumCanvas");
    wavectx = waveCanvas.getContext("2d");
    wavectx.strokeStyle = "black";
    wavectx.lineWidth = 1;
    wavectx.font = "12px monospace";

    chartHeight = 60;
    waveCanvas.height = chartHeight;
    waveCanvas.scrollIntoView(false);

    let baseFreq = 27.5 * Math.pow(2, 7);
    baseNoteF = notefFromPitch(baseFreq);

   startPitchDetect();

}

// 停止录制
function stopPitchDetect() {
    if (isLiveInput) {
        isLiveInput = false;
        window.cancelAnimationFrame(rafID);

        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        if (recognizer.isListening()) {
            recognizer.stopListening();
        }

        drawSplitLine(); // 录制结束后，画分割线
    }
}

// 开始录制
function startPitchDetect() {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    centExamples=[];//清空数据
    let flagNum=0


    /*navigator.mediaDevices.getUserMedia({
        "audio": {
            deviceId: { exact: 'default' },
            noiseSuppression: { exact: true },
            echoCancellation: { exact: false },
            autoGainControl: { exact: false }
        },
    }).then((stream) => {
        // **清空画布**
        wavectx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
        scrollPos = 0; // 重新从头开始绘制
        scrollSpeed = 0; // **初始不滚动**
        setTimeout(() => { scrollSpeed = 2.5; }, 400); // **400ms 后开始滚动**

        audioStream = stream;
        mediaStreamSource = audioContext.createMediaStreamSource(stream);

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 100;

        analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;

        mediaStreamSource.connect(gainNode);
        gainNode.connect(analyser);

        isLiveInput = true;
        updatePitch();

        // **2秒后自动停止**
        recordTimeout = setTimeout(stopPitchDetect, 2000);

    }).catch((err) => {
        console.error(`${err.name}: ${err.message}`);
        alert('Stream generation failed.');
    });*/
}

var rafID = null;
var buf_freq = null;

function generateRainbowColors() {
    const colors = [];
    for (let i = 0; i < 256; i++) {
        const minHue = 240, maxHue = 0;
        let curPercent = i / 255;
        let colString = "hsl(" + ((curPercent * (maxHue - minHue)) + minHue) + ",100%,50%)";
        colors.push(colString);
    }
    return colors;
}

const rainbowColors = generateRainbowColors();

function notefFromPitch(frequency) {
    var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return noteNum;
}

// 绘制声波瀑布
function drawWaterfall() {
    if (!analyser) return;
    const buf_size = analyser.frequencyBinCount;
    if (!buf_freq) {
        buf_freq = new Uint8Array(buf_size);
    }
    analyser.getByteFrequencyData(buf_freq);

    const max_freq = audioContext.sampleRate / 2;

    for (var i = 0; i < buf_size; i++) {
        const v = buf_freq[i];
        if (v > 0) {
            const f = i / buf_size * max_freq;
            let _p = notefFromPitch(f);
            let _y = Math.floor(chartHeight - (_p - baseNoteF) * dh);
            wavectx.fillStyle = rainbowColors[v];
            wavectx.fillRect(scrollPos, _y, 2, dh);
        }
    }

    // **更新滚动位置**
    scrollPos += scrollSpeed;
}

// **绘制分割线**
function drawSplitLine() {
    if (scrollPos === 0) return; // 没有绘制数据时不分割

    let halfWidth = scrollPos / 2; // **1秒钟的宽度**

    wavectx.strokeStyle = "#fff";
    wavectx.lineWidth = 2;

    // **在1秒钟的位置画一条竖线**
    wavectx.beginPath();
    wavectx.moveTo(halfWidth, 0);
    wavectx.lineTo(halfWidth, waveCanvas.height);
    wavectx.stroke();
}

function updatePitch() {
    if (!isLiveInput) return;
    drawWaterfall();
    rafID = window.requestAnimationFrame(updatePitch);
}









function splitIntoSegments() {
    const segmentWidth = canvasWidth / 20;

    for (let i = 0; i < 20; i++) {
        const segmentCanvas = document.createElement('canvas');
        const segmentCtx = segmentCanvas.getContext('2d');
        segmentCanvas.width = segmentWidth;
        segmentCanvas.height = canvasHeight;

        segmentCtx.drawImage(
            spectrumCanvas,
            i * segmentWidth, 0, segmentWidth, canvasHeight,
            0, 0, segmentWidth, canvasHeight
        );

        const segmentDiv = document.createElement('div');
        segmentDiv.classList.add('segment');
        segmentDiv.style.backgroundImage = `url(${segmentCanvas.toDataURL()})`;
        segmentDiv.style.backgroundSize = 'cover';

        spectrogramDiv.appendChild(segmentDiv);
    }
    spectrogramDiv.removeChild(spectrogramDiv.children[0]);//去除老画布
    $('#Micro_record').text("记录20秒")
    $('#Micro_record').css("background","#38ceb1");
    recordType = false;//录制状态--结束
}

/*点击提取按钮*/
$('#Micro_withdraw').click(function() {
    //startRecord();
});
/*录音关闭按钮*/
$('#MicroWinButton_close').click(function() {
    // 停止录制和绘制
    clearInterval(drawInterval);
    if (audioContext) {
        audioContext.close(); // 关闭音频上下文
    }
    /*if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop()); // 停止所有音轨
    }*/

    // 重置录制按钮和状态
    $('#Micro_record').css("background","#38ceb1");
    recordType = false;

    // 隐藏窗口
    $('#cameraWin').css('display', 'none');
});


// function drawKittenLines() {
//     const svg = document.getElementById("linkSvg");
//     if (!svg) return;
//     const main = document.querySelector(".main");
//     if (!main) return;

//     svg.innerHTML = "";

//     const cards = document.querySelectorAll(".card");
//     const target = document.querySelector(".trainingModel_bg");

//     if (!target || cards.length === 0) return;

//     const tRect = target.getBoundingClientRect();

//     // const scrollX = window.scrollX;
//     // const scrollY = window.scrollY;
//     const mainRect = main.getBoundingClientRect();

//     // const endX = tRect.left + scrollX;
//     // const endY = tRect.top + tRect.height / 2 + scrollY;
//     const endX = tRect.left - mainRect.left + main.scrollLeft;
//     const endY = tRect.top - mainRect.top + tRect.height / 2 + main.scrollTop;

//     cards.forEach(card => {
//         const cRect = card.getBoundingClientRect();

//         const startX = cRect.right + scrollX;
//         const startY = cRect.top + cRect.height / 2 + scrollY;

//         const midX = startX + 60;

//         const pathData = `
//             M ${startX} ${startY}
//             C ${midX} ${startY},
//               ${midX} ${endY},
//               ${endX} ${endY}
//         `;

//         const path = document.createElementNS(
//             "http://www.w3.org/2000/svg",
//             "path"
//         );

//         path.setAttribute("d", pathData);
//         path.setAttribute("stroke", "#BDC1C6");
//         path.setAttribute("stroke-width", "2");
//         path.setAttribute("fill", "none");

//         svg.appendChild(path);
//     });
// }
function drawKittenLines() {
    const svg = document.getElementById("linkSvg");
    const main = document.querySelector(".main");

    if (!svg || !main) return;

    // 根据滚动内容大小设置 SVG 尺寸
    svg.setAttribute("width", main.scrollWidth);
    svg.setAttribute("height", main.scrollHeight);

    // 清空旧的连线
    svg.innerHTML = "";

    const cards = document.querySelectorAll(".card");
    const target = document.querySelector(".trainingModel_bg");

    if (!target || cards.length === 0) return;

    // main 在视口中的位置
    const mainRect = main.getBoundingClientRect();

    // 目标位置
    const tRect = target.getBoundingClientRect();

    const endX =
        tRect.left - mainRect.left + main.scrollLeft;

    const endY =
        tRect.top -
        mainRect.top +
        tRect.height / 2 +
        main.scrollTop;

    cards.forEach(card => {
        const cRect = card.getBoundingClientRect();

        const startX =
            cRect.right -
            mainRect.left +
            main.scrollLeft;

        const startY =
            cRect.top -
            mainRect.top +
            cRect.height / 2 +
            main.scrollTop;

        const midX = startX + 60;

        const pathData = `
            M ${startX} ${startY}
            C ${midX} ${startY},
              ${midX} ${endY},
              ${endX} ${endY}
        `;

        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );

        path.setAttribute("d", pathData);
        path.setAttribute("stroke", "#BDC1C6");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");

        svg.appendChild(path);
    });
}

// window.addEventListener("load", drawKittenLines);
// window.addEventListener("resize", drawKittenLines);
// window.addEventListener("scroll", drawKittenLines);

// document.querySelector('.main').addEventListener("resize", drawKittenLines);
// document.querySelector('.main').addEventListener("scroll", drawKittenLines);

window.addEventListener("load", () => {
    drawKittenLines();

    const main = document.querySelector(".main");
    if (main) {
        main.addEventListener("scroll", drawKittenLines);
    }
});

window.addEventListener("resize", drawKittenLines);

function focusInput(svg) {
    console.log('111111111111111')
    const input = svg.parentElement.querySelector("input");
    input.focus();   // 让 input 获取焦点
}

// 打开/关闭菜单
function toggleMenu(btn) {
    const menu = btn.parentElement.querySelector('.menu');

    // 先关闭所有菜单
    document.querySelectorAll('.menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
    });

    // 切换当前
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

// 点击页面其他地方关闭
document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-wrap')) {
        document.querySelectorAll('.menu').forEach(m => {
            m.style.display = 'none';
        });
    }
});

function updatePhotoLibraryScroll(container) {
    // 先恢复默认（多行）
    container.classList.remove("single-line");

    // 等浏览器渲染完成再判断
    requestAnimationFrame(() => {
        if (container.scrollHeight <= container.clientHeight + 5) {
            // ⭐ 说明只有一行
            container.classList.add("single-line");
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".photoLibrary").forEach(el => {
        el.classList.add("single-line");
    });
});

function uploadSettingFun(){
    const lang = localStorage.getItem('tw:language') || 'zh-cn';
    const dataLang = languageDate[lang] || languageDate['zh-cn'];

    let card = this.closest('.cameraLeft');
  
      card.querySelector('.cameraWin').style.display = 'none';
      card.querySelector('.upload').style.display = 'none';
      card.querySelector('.uploadSetting').style.display = 'none';
  
      card.querySelector('.cameraSettings').style.display = 'block';
      card.querySelector('.webcamSpan').textContent=dataLang.webcamSpan
      card.querySelector('#fpsInput1').value=recordFps
}
document.querySelectorAll('.uploadSetting').forEach(btn=>{
    btn.addEventListener('click', uploadSettingFun);
});

  function changeFPS(btn, step){
    let input = btn.closest('.numberBox').querySelector('input');
    let val = parseInt(input.value) || 0;
  
    val += step;
    if(val > 100) val = 100;
    if(val < 1) val = 1;
  
    input.value = val;
  }

  function cancelSetting(btn){
    let box = btn.closest('.cameraLeft');
  
    box.querySelector('.cameraSettings').style.display = 'none';
    box.querySelector('.cameraWin').style.display = 'block';
    box.querySelector('.upload').style.display = 'block';
    box.querySelector('.uploadSetting').style.display = 'block'; 
    document.querySelector('.webcamSpan').textContent='webcam'
  }

  function saveSetting(btn){
    let box = btn.closest('.cameraLeft');
  
    let fps = box.querySelector('#fpsInput1').value;
    let hold = box.querySelector('#holdRecord1').checked;
  
    recordFps=fps
    console.log("FPS:", fps);
    console.log("按住录制:", hold);
  
    // 👉 这里你可以把参数传给模型或摄像头逻辑
  
    // 切回摄像头界面
    cancelSetting(btn);
  }