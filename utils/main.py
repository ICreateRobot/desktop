import icrobot
import time
import _thread
import gc
import sys
import ujson
from machine import Pin,reset,Timer,unique_id
import module
import esp_audio
import esp_camera
import esp_who
import esp32ota
timeout = 10  # 设定10秒的超时时间
last_pressed_time = None  # 记录按键按下的时间
power = Pin(6, Pin.IN, Pin.PULL_UP)
file_id = None
low_power_flag = False
with open("/set.txt", "r") as f:
    mode =  f.read().strip()
def battery_check(timer):
    global low_power_flag
    try:
        if icrobot.uart_receive.power == 1 and icrobot.uart_receive.is_charging == 0:
            low_power_flag = True
    except Exception as e:
        print("电量检测异常:", e)

def execute_file(filename):
    try:
        with open(filename, 'r') as file:
            code = file.read()
        icrobot.start_execution()
        time.sleep_ms(100)
        exec(code, globals())
    except Exception as e:
        print(e)

def power_callback(pin):
    if power.value() == 0:
        icrobot.ota_quit = True
        icrobot.mode_flag = True
        icrobot.file_start_flag = not icrobot.file_start_flag
    if power.value() == 1:
        icrobot.mode_flag = False

def get_mac_address():
    uid = unique_id()
    mac_str = ':'.join('{:02X}'.format(b) for b in uid)  # 格式化为 MAC 地址
    return mac_str  
if mode == "test2" or mode == "test1":
    old_test = False
    def dianji():
        global old_test
        while True:
            if old_test:  
                time.sleep(0.1)
                continue
            icrobot.motor.move_forward(50,duration=-1,distance=-1)
            time.sleep(5)
            icrobot.motor.move_stop()
            time.sleep(1)
            icrobot.motor.move_backward(50,duration=-1,distance=-1)
            time.sleep(5)
            icrobot.motor.move_stop()
            time.sleep(1)
if mode == "test1":
    def test1():
        while True:
            message = sys.stdin.readline().strip()
            if message:
                print(message)
                if message =="测试成功":
                    with open("/set.txt", "w") as f:
                        f.write("test2")
                    icrobot.power.shuts_down()
                    reset()
                if message.startswith("WIFI:"):
                    try:
                        wifi_info = message[5:-2]  # 去掉 "WIFI:" 和 结尾的 ";;"
                        wifi_dict = dict(item.split(":") for item in wifi_info.split(";") if ":" in item)
                        ssid = wifi_dict.get("S", "")
                        password = wifi_dict.get("P", "")
                        if ssid:
                            if not icrobot.wifi.sta.active():
                                icrobot.wifi.sta.active(True)
                            icrobot.wifi.sta.connect(ssid,password)
                            
                            start_time = time.ticks_ms()  # 记录WiFi连接开始时间
                            while not icrobot.wifi.sta.isconnected():
                                if time.ticks_diff(time.ticks_ms(), start_time) > 8000:  # 连接超时
                                    icrobot.speaker.play_music_until_done("/flash/wif_failed.wav")
                                    icrobot.wifi.sta.active(False)
                                    time.sleep(1)
                                    icrobot.wifi.sta.active(True)
                                    time.sleep(0.5)
                                    break  # 重新扫描

                            if icrobot.wifi.sta.isconnected():  # 连接成功才播放提示音
                                icrobot.speaker.play_music_until_done("/flash/wifi_success.wav")
                                print("00"+icrobot.wifi.sta.ifconfig()[0]+"00")
                                icrobot.camera.web_open()
                                host = "0.0.0.0"
                                icrobot.video_start(host)
                                continue # 连接成功，退出函数
                    except Exception as e:
                        print("error:", e)
if mode =="test2":
    def xianshi():
        global old_test
        while True:
            if old_test:  
                time.sleep(0.1)
                continue
            for y in range(9):  # 从上到下 (0 → 7)
                for x in range(25): 
                    icrobot.display.add_pixel(x-1, y-1)
                    time.sleep(0.01)
                time.sleep(0.01)  # 每列延时
            for y in range(9):  # 从上到下 (0 → 7)
                for x in range(25): 
                    icrobot.display.clear_pixel(x-1, y-1)
                    time.sleep(0.01)
                time.sleep(0.01)  # 每列延时
    def test2():
        global old_test
        while True:
            if old_test:
                time.sleep(0.1)
                continue
            # 摄像头初始化
            cam = None
            while not cam:
                try:
                    cam = esp_camera.init(0, framesize=esp_camera.FRAME_VGA)
                    if cam:
                        icrobot.speaker.play_music_until_done("/flash/car.wav")
                        break
                except Exception as e:
                    print("摄像头初始化失败:", e)
                    time.sleep(1)  # 重试前延时

            # 摄像头关闭
            cam_deinit_success = False
            while not cam_deinit_success:
                try:
                    cam_d = esp_camera.deinit()
                    if cam_d:
                        cam_deinit_success = True
                        icrobot.speaker.play_music_until_done("/flash/dog.wav")
                        break
                except Exception as e:
                    print("摄像头关闭失败:", e)
                    time.sleep(1)  # 重试前延时

            time.sleep(2)  # 整体循环间隔

if __name__ == '__main__':
    mac_info = {
        "mac": get_mac_address()
    }
    esp_audio.I2C_init()
    time.sleep_ms(20)
    esp_audio.audio_I2S_init()
    time.sleep_ms(20)
    num = 1
    es8311 = None
    while True:
        try:
            es8311 = esp_audio.audio_es8311_init()
            if es8311:
                break
            else:
                if num == 100:
                    break
                num = num+1
                time.sleep_ms(20)
                continue
        except Exception as e:
            if num == 100:
                break
            num = num+1
            time.sleep_ms(20)
            continue
    print(num)
    esp_audio.music_vol_set(100)
    print(ujson.dumps(mac_info))
    gc.enable()
    icrobot.start_receive()
    power.irq(trigger=Pin.IRQ_RISING | Pin.IRQ_FALLING, handler=power_callback)
    _thread.start_new_thread(icrobot.scratch.start_usart_send, (),3*1024)
    icrobot.send_command(bytearray([0xaa,0x55,0xfe,0xfe,0xfe,0xfe]))
    icrobot.speaker.play_music_until_done("/flash/startup.wav")
    battery_timer = Timer(-1)  # 软件定时器
    battery_timer.init(period=60000, mode=Timer.PERIODIC, callback=battery_check)
    if mode == "test1":
        time.sleep(3) 
        icrobot.display.clear()
        time.sleep(0.1) 
        for y in range(9):  # 从上到下 (0 → 7)
            for x in range(25): 
                icrobot.display.add_pixel(x-1, y-1)
                time.sleep(0.01)
            time.sleep(0.01)  # 每列延时
        icrobot.rgb_sensor.set_line_mode(2)
        _thread.start_new_thread(test1, (),6*1024)
        _thread.start_new_thread(dianji, (),3*1024)
        while True:
            if icrobot.leftkey.value() == 0:
                while icrobot.leftkey.value() == 0:
                    pass
                icrobot.file_num = icrobot.file_num + 1
                if icrobot.file_num > 6:
                    icrobot.file_num = 1
                icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
            if icrobot.rightkey.value() == 0:
                while icrobot.rightkey.value() == 0:
                    pass
                icrobot.file_num = icrobot.file_num - 1
                if icrobot.file_num < 1:
                    icrobot.file_num = 6
                icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
    if mode == "test2":
        time.sleep(3) 
        icrobot.display.clear()
        time.sleep(0.1) 
        icrobot.rgb_sensor.set_line_mode(2)
        file_id = _thread.start_new_thread(xianshi, (),3*1024)
        _thread.start_new_thread(dianji, (),3*1024)
        _thread.start_new_thread(test2, (),3*1024)
        start_time = time.ticks_ms()
        while True:
            if not old_test:
                if time.ticks_diff(time.ticks_ms(), start_time) > 30 * 60 * 1000:
                    print("运行已超过2小时，即将退出")
                    _thread.delete(file_id)
                    file_id = None
                    icrobot.motor.move_stop()
                    icrobot.display.clear()
                    old_test = True
            if old_test:
                if icrobot.mode_flag:
                    print(icrobot.mode_flag)
                    for y in range(9):  # 从上到下 (0 → 7)
                        for x in range(25): 
                            icrobot.display.add_pixel(x-1, y-1)
                            time.sleep(0.01)
                        time.sleep(0.01)  # 每列延时
                    for y in range(9):  # 从上到下 (0 → 7)
                        for x in range(25): 
                            icrobot.display.clear_pixel(x-1, y-1)
                            time.sleep(0.01)
                        time.sleep(0.01)  # 每列延时
                    time.sleep(1)
                    icrobot.motor.move_forward(50,duration=-1,distance=-1)
                    time.sleep(5)
                    icrobot.motor.move_stop()
                    time.sleep(1)
                    icrobot.motor.move_backward(50,duration=-1,distance=-1)
                    time.sleep(5)
                    icrobot.motor.move_stop()
                    time.sleep(1)
                    cam = None
                    while not cam:
                        try:
                            cam = esp_camera.init(0, framesize=esp_camera.FRAME_VGA)
                            if cam:
                                icrobot.speaker.play_music_until_done("/flash/car.wav")
                                break
                        except Exception as e:
                            print("摄像头初始化失败:", e)
                            time.sleep(1)  # 重试前延时

                    # 摄像头关闭
                    cam_deinit_success = False
                    while not cam_deinit_success:
                        try:
                            cam_d = esp_camera.deinit()
                            if cam_d:
                                cam_deinit_success = True
                                icrobot.speaker.play_music_until_done("/flash/dog.wav")
                                break
                        except Exception as e:
                            print("摄像头关闭失败:", e)
                            time.sleep(1)  # 重试前延时
                    icrobot.display.show_image([0x0,0x1,0x3,0x6,0xFC,0xFC,0x6,0x3,0x1,0x40,0x20,0x10,0x8,0x4,0x2,0x0,0x0,0xFF,0xE,0x1C,0x38,0x70,0xFF,0x0],0)
                    while True:
                        if icrobot.leftkey.value() == 0:
                            while icrobot.leftkey.value() == 0:
                                pass
                            icrobot.power.shuts_down()
                            reset()
                        if icrobot.rightkey.value() == 0:
                            while icrobot.rightkey.value() == 0:
                                pass
                            with open("/set.txt", "w") as f:
                                f.write("test3")
                            icrobot.power.shuts_down()
                            reset()
    if mode == "test3":
        time.sleep(3) 
        icrobot.display.clear()
        time.sleep(0.1) 
        for y in range(9):  # 从上到下 (0 → 7)
            for x in range(25): 
                icrobot.display.add_pixel(x-1, y-1)
                time.sleep(0.01)
            time.sleep(0.01)  # 每列延时
        icrobot.display.show_image([0x0,0x0,0x0,0x0,0x7E,0xFF,0xFF,0xFF,0x7E,0x0,0x0,0x0,0x0,0x0,0x0,0x7E,0xFF,0xFF,0xFF,0x7E,0x0,0x0,0x0,0x0],0)
        while True:
            if icrobot.leftkey.value() == 0:
                while icrobot.leftkey.value() == 0:
                    pass
                icrobot.file_num = icrobot.file_num + 1
                if icrobot.file_num > 6:
                    icrobot.file_num = 1
                icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
            if icrobot.rightkey.value() == 0:
                while icrobot.rightkey.value() == 0:
                    pass
                icrobot.file_num = icrobot.file_num - 1
                if icrobot.file_num < 1:
                    icrobot.file_num = 6
                icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
            if icrobot.mode_flag:
                icrobot.file_flag = False
                icrobot.motor.move_forward(50,duration= -1,distance= 25)
                icrobot.motor.turn_left(50,duration= -1,distance= 90)
                icrobot.motor.move_backward(50,duration= -1,distance= 20)
                icrobot.motor.turn_right(50,duration= -1,distance= 90)
                icrobot.motor.move_forward(50,duration= -1,distance= 25)
                icrobot.camera.open(0)
                icrobot.ai.set_model(icrobot.ai.apriltag_recognition)
                while True:
                    if icrobot.ai.apriltag_isrecognized():
                        if (icrobot.ai.get_apriltag_information()) == 0:
                            icrobot.motor.move_forward(50,duration= -1,distance= 3)
                            icrobot.rgb_sensor.line_flag = True
                            icrobot.rgb_sensor.line_tracking_until(2,[1,1,1,1,1])
                            break
                while True:
                    if icrobot.ai.apriltag_isrecognized():
                        if (icrobot.ai.get_apriltag_information()) == 1:  
                            icrobot.display.show_image([0x0,0x0,0x0,0x0,0x0,0x0,0x18,0x3C,0x7E,0xDB,0x99,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x0,0x0,0x0,0x0,0x0,0x0],1)
                            time.sleep(2)
                            icrobot.display.clear()    
                            icrobot.display.show_image([0x0,0x0,0x0,0x0,0x7E,0xFF,0xFF,0xFF,0x7E,0x0,0x0,0x0,0x0,0x0,0x0,0x7E,0xFF,0xFF,0xFF,0x7E,0x0,0x0,0x0,0x0],0)
                            icrobot.motor.move_forward(50,duration= -1,distance= 3)
                            icrobot.motor.turn_left(50,duration= -1,distance= 90)
                            icrobot.rgb_sensor.line_flag = True 
                            icrobot.rgb_sensor.line_tracking_until(2,[1,1,1,1,1])
                            break
                while True:
                    if icrobot.ai.apriltag_isrecognized():
                        if (icrobot.ai.get_apriltag_information()) == 2:  
                            icrobot.speaker.play_music_until_done("/flash/car.wav") 
                            icrobot.speaker.play_music_until_done("/flash/dog.wav") 
                            icrobot.speaker.play_music_until_done("/flash/cat.wav") 
                            icrobot.motor.move_forward(50,duration= -1,distance= 3)
                            icrobot.motor.turn_right(50,duration= -1,distance= 90)
                            icrobot.rgb_sensor.line_tracking(2) 
                            break   
                while True:
                    if icrobot.ai.apriltag_isrecognized():
                        if (icrobot.ai.get_apriltag_information()) == 3: 
                            icrobot.rgb_sensor.stop_line_tracking()
                            for y in range(5, 0, -1): 
                                icrobot.display.show_text(str(y))
                                time.sleep(1)
                            break
                icrobot.rgb_sensor.line_flag = True    
                icrobot.rgb_sensor.line_tracking_until(2,[1,1,1,1,1])
                icrobot.motor.move_forward(50,duration= -1,distance= 10)
                icrobot.display.show_image([0x0,0x1,0x3,0x6,0xFC,0xFC,0x6,0x3,0x1,0x40,0x20,0x10,0x8,0x4,0x2,0x0,0x0,0xFF,0xE,0x1C,0x38,0x70,0xFF,0x0],0)
                while True:
                    if icrobot.leftkey.value() == 0:
                        while icrobot.leftkey.value() == 0:
                            pass
                        icrobot.power.shuts_down()
                        reset()
                    if icrobot.rightkey.value() == 0:
                        while icrobot.rightkey.value() == 0:
                            pass
                        with open("/set.txt", "w") as f:
                            f.write("sta")
                        icrobot.power.shuts_down()
                        reset()
    if mode == "ap":
        icrobot.speaker.play_music("/flash/wifi_dis.wav")
        icrobot.wifi.start_ap()
        host = "192.168.4.1"
        icrobot.video_start(host)
        _thread.start_new_thread(icrobot.scratch.start_receive,(host,),5*1024)
        _thread.start_new_thread(icrobot.scratch.start_send, (host,),3*1024)
        _thread.start_new_thread(icrobot.scratch.start_mode, (host,),4*1024)
        _thread.start_new_thread(icrobot.scratch.start_speaker, (host,),4*1024)
        # _thread.start_new_thread(icrobot.scratch.start_usart_receive,(),5*1024)
        icrobot.starttime = time.ticks_ms()
        while True:
            gc.collect()
            if low_power_flag:
                icrobot.speaker.play_music_until_done("/flash/battery_low.wav")
                low_power_flag = False
            if icrobot.uart_receive.power_on == 0:
                reset()
            if icrobot.file_flag:
                if not icrobot.start:
                    if time.ticks_diff(time.ticks_ms(), icrobot.starttime) > 10 * 60 * 1000:
                        icrobot.power.shuts_down()
                        reset()
                    if icrobot.leftkey.value() == 0:
                        while icrobot.leftkey.value() == 0:
                            pass
                        icrobot.file_num = icrobot.file_num + 1
                        if icrobot.file_num > 6:
                            icrobot.file_num = 1
                        icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
                        last_pressed_time = time.time()
                        icrobot.starttime = time.ticks_ms()
                    if icrobot.rightkey.value() == 0:
                        while icrobot.rightkey.value() == 0:
                            pass
                        icrobot.file_num = icrobot.file_num - 1
                        if icrobot.file_num < 1:
                            icrobot.file_num = 6
                        icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
                        last_pressed_time = time.time()
                        icrobot.starttime = time.ticks_ms()
                    if last_pressed_time and time.time() - last_pressed_time >= timeout:
                        if not icrobot.file_start_flag:
                            icrobot.file_num = 0
                            icrobot.power.set_status(255)
                        last_pressed_time = None
                if icrobot.file_start_flag and not icrobot.start: 
                    if icrobot.file_num == 0:
                        icrobot.display.show_expression(0xc0)
                        icrobot.speaker.play_music_until_done("/flash/mod_ap.wav")
                        icrobot.file_start_flag = False
                        icrobot.power.set_status(255)
                        continue
                    file_path = icrobot.file_path[icrobot.file_num-1]
                    if icrobot.file_num == 6:
                        time.sleep(0.2)
                        icrobot.start = True
                        execute_file(file_path)
                        icrobot.stop_execution(1)
                        icrobot.start = False
                        icrobot.file_start_flag = False
                    else:
                        file_id = _thread.start_new_thread(execute_file, (file_path,),6*1024)
                        icrobot.start = True
                    icrobot.starttime = time.ticks_ms()
                if not icrobot.file_start_flag and icrobot.start: 
                    icrobot.speaker.music_flag = False
                    icrobot.rgb_sensor.line_flag = False
                    icrobot.ai.ai_start = False
                    _thread.delete(file_id)
                    file_id = None
                    last_pressed_time = None  # 记录按键按下的时间
                    if icrobot.scratch.file_end:
                        icrobot.file_flag = False
                    icrobot.scratch.file_end = False
                    time.sleep(0.5)
                    icrobot.stop_execution(1)
                    icrobot.wifi.start_ap()
                    icrobot.file_start_flag = False
                    icrobot.start = False
                    icrobot.starttime = time.ticks_ms()
            time.sleep(0.1)
    if mode == "sta":
        # _thread.start_new_thread(icrobot.scratch.start_usart_receive,(),5*1024)
        if not icrobot.uart_receive.privacy_switch:
            icrobot.speaker.play_music_until_done("/flash/yinsi_jian.wav")
        _thread.start_new_thread(icrobot.wifi.scan_and_connect_wifi, (),3*1024)
        _thread.start_new_thread(icrobot.wifi.reconnect_wifi, (),3*1024)
        icrobot.starttime = time.ticks_ms()
        while True:
            gc.collect()
            if low_power_flag:
                icrobot.speaker.play_music_until_done("/flash/battery_low.wav")
                low_power_flag = False  
            if icrobot.uart_receive.power_on == 0:
                reset()          
            if icrobot.file_flag:
                if not icrobot.start:
                    if time.ticks_diff(time.ticks_ms(), icrobot.starttime) > 10 * 60 * 1000:
                        icrobot.power.shuts_down()
                        reset()
                    if icrobot.leftkey.value() == 0:
                        while icrobot.leftkey.value() == 0:
                            pass
                        icrobot.file_num = icrobot.file_num + 1
                        if icrobot.file_num > 6:
                            icrobot.file_num = 1
                        icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
                        last_pressed_time = time.time()
                        icrobot.starttime = time.ticks_ms()
                    if icrobot.rightkey.value() == 0:
                        while icrobot.rightkey.value() == 0:
                            pass
                        icrobot.file_num = icrobot.file_num - 1
                        if icrobot.file_num < 1:
                            icrobot.file_num = 6
                        icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
                        last_pressed_time = time.time()
                        icrobot.starttime = time.ticks_ms()
                    if last_pressed_time and time.time() - last_pressed_time >= timeout:
                        # 如果没有进入 `file_start_flag` 判断，就显示另一个表情
                        if not icrobot.file_start_flag:
                            icrobot.file_num = 0
                            icrobot.power.set_status(255)
                            icrobot.wifi.scan_flag = True
                        # 重置 last_pressed_time，防止每次循环都进入超时判断
                        last_pressed_time = None
                if icrobot.file_start_flag and not icrobot.start: 
                    if icrobot.file_num == 0:
                        icrobot.display.show_expression(0xc1)
                        icrobot.speaker.play_music_until_done("/flash/mod_sta.wav")
                        icrobot.file_start_flag = False
                        icrobot.power.set_status(255)
                        continue
                    file_path = icrobot.file_path[icrobot.file_num-1]
                    if icrobot.file_num == 6:
                        icrobot.wifi.scan_flag = False
                        time.sleep(0.2)
                        icrobot.start = True
                        execute_file(file_path)
                        if icrobot.wifi.scaned:
                            icrobot.ai.ai_start = False
                            time.sleep(0.2)
                            icrobot.stop_execution(1)
                        else:
                            time.sleep(0.2)
                            icrobot.stop_execution(0)
                        icrobot.start = False
                        icrobot.file_start_flag = False
                        icrobot.wifi.scan_flag = True
                    else:
                        icrobot.wifi.scan_flag = False
                        file_id = _thread.start_new_thread(execute_file, (file_path,),6*1024)
                        icrobot.start = True
                    starttime = time.ticks_ms()
                if not icrobot.file_start_flag and icrobot.start: 
                    icrobot.speaker.music_flag = False
                    icrobot.rgb_sensor.line_flag = False

                    if icrobot.scratch.file_end:
                        icrobot.file_flag = False
                    icrobot.scratch.file_end = False
                    if icrobot.wifi.scaned:
                        icrobot.ai.ai_start = False
                        _thread.delete(file_id)
                        file_id = None
                        time.sleep(0.5)
                        icrobot.stop_execution(1)
                    else:
                        _thread.delete(file_id)
                        file_id = None
                        time.sleep(0.5)
                        icrobot.stop_execution(0)

                    last_pressed_time = None  # 记录按键按下的时间
                    icrobot.wifi.scan_flag = True
                    icrobot.file_start_flag = False
                    icrobot.start = False
                    icrobot.starttime = time.ticks_ms()
            time.sleep_ms(100)
    if mode == "bluetooth":
        ble = icrobot.ESP32S3_BLE(str(icrobot.wifi.chip_id[-4:]))
        # _thread.start_new_thread(icrobot.scratch.start_usart_receive,(),5*1024)   
        icrobot.starttime = time.ticks_ms() 
        while True:
            gc.collect()
            if low_power_flag:
                icrobot.speaker.play_music_until_done("/flash/battery_low.wav")
                low_power_flag = False  
            if icrobot.uart_receive.power_on == 0:
                reset()          
            if icrobot.file_flag:
                if not icrobot.start:
                    if time.ticks_diff(time.ticks_ms(), icrobot.starttime) > 10 * 60 * 1000:
                        icrobot.power.shuts_down()
                        reset()
                    if icrobot.leftkey.value() == 0:
                        while icrobot.leftkey.value() == 0:
                            pass
                        icrobot.file_num = icrobot.file_num + 1
                        if icrobot.file_num > 6:
                            icrobot.file_num = 1
                        icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
                        last_pressed_time = time.time()
                        icrobot.starttime = time.ticks_ms()
                    if icrobot.rightkey.value() == 0:
                        while icrobot.rightkey.value() == 0:
                            pass
                        icrobot.file_num = icrobot.file_num - 1
                        if icrobot.file_num < 1:
                            icrobot.file_num = 6
                        icrobot.display.show_expression((icrobot.file_num-1)|0xd0)
                        last_pressed_time = time.time()
                        icrobot.starttime = time.ticks_ms()
                    if last_pressed_time and time.time() - last_pressed_time >= timeout:
                        # 如果没有进入 `file_start_flag` 判断，就显示另一个表情
                        if not icrobot.file_start_flag:
                            icrobot.file_num = 0
                            icrobot.power.set_status(255)
                        # 重置 last_pressed_time，防止每次循环都进入超时判断
                        last_pressed_time = None
                if icrobot.file_start_flag and not icrobot.start: 
                    if icrobot.file_num == 0:
                        icrobot.display.show_expression(0xc2)
                        icrobot.speaker.play_music_until_done("/flash/mod_ble.wav")
                        icrobot.file_start_flag = False
                        icrobot.power.set_status(255)
                        continue
                    file_path = icrobot.file_path[icrobot.file_num-1]
                    if icrobot.file_num == 6:
                        time.sleep(0.2)
                        icrobot.start = True
                        execute_file(file_path)
                        icrobot.stop_execution(1)
                        icrobot.start = False
                        icrobot.file_start_flag = False
                        ble = icrobot.ESP32S3_BLE(str(icrobot.wifi.chip_id[-4:]))
                    else:
                        file_id = _thread.start_new_thread(execute_file, (file_path,),6*1024)
                        icrobot.start = True
                    icrobot.starttime = time.ticks_ms()
                if not icrobot.file_start_flag and icrobot.start: 
                    icrobot.speaker.music_flag = False
                    icrobot.rgb_sensor.line_flag = False
                    icrobot.ai.ai_start = False
                    icrobot.asr.asr_start = False
                    _thread.delete(file_id)
                    file_id = None
                    if icrobot.scratch.file_end:
                        icrobot.file_flag = False
                    icrobot.scratch.file_end = False
                    last_pressed_time = None  # 记录按键按下的时间
                    time.sleep(0.5)
                    icrobot.stop_execution(1)
                    icrobot.file_start_flag = False
                    icrobot.start = False
                    icrobot.starttime = time.ticks_ms()
            time.sleep(0.2)