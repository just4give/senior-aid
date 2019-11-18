#!/usr/bin/python
import smbus
import math
import paho.mqtt.client as paho
import time
import json
from datetime import datetime
import threading
import RPi.GPIO as GPIO

#pip3 install paho-mqtt
def on_connect(client, userdata, flags, rc):
    print("Connected to local mqtt broker")
    client.connected_flag=True

def on_message(client, userdata, message):
    print("message received")

paho.Client.connected_flag=False
broker = 'broker.hivemq.com'
port = 1883
client = paho.Client()
client.loop_start()
client.on_connect = on_connect
client.connect(broker,port)
while not client.connected_flag:
    time.sleep(1)
client.subscribe('senior-aid/xxx')
client.on_message=on_message

device="AAABACADAFAGAH"

GPIO.setmode(GPIO.BCM)
GPIO.setup(23, GPIO.IN, pull_up_down=GPIO.PUD_UP)#Button to GPIO23

# Register
power_mgmt_1 = 0x6b
power_mgmt_2 = 0x6c

AcX=0.0
AcY=0.0
AcZ=0.0
Tmp=0.0
GyX=0.0
GyY=0.0
GyZ=0.0
ax=0
ay=0
az=0
gx=0
gy=0
gz=0
fall = False   #stores if a fall has occurred
trigger1=False #stores if first trigger (lower threshold) has occurred
trigger2=False #stores if second trigger (upper threshold) has occurred
trigger3=False #stores if third trigger (orientation change) has occurred

trigger1count=0 #stores the counts past since trigger 1 was set true
trigger2count=0 #stores the counts past since trigger 2 was set true
trigger3count=0 #stores the counts past since trigger 3 was set true
angleChange=0

#def mpu_read():
    

def read_byte(reg):
    return bus.read_byte_data(address, reg)
 
def read_word(reg):
    h = bus.read_byte_data(address, reg)
    l = bus.read_byte_data(address, reg+1)
    value = (h << 8) + l
    return value
 
def read_word_2c(reg):
    val = read_word(reg)
    if (val >= 0x8000):
        return -((65535 - val) + 1)
    else:
        return val
 
def dist(a,b):
    return math.sqrt((a*a)+(b*b))
 
def get_y_rotation(x,y,z):
    radians = math.atan2(x, dist(y,z))
    return -math.degrees(radians)
 
def get_x_rotation(x,y,z):
    radians = math.atan2(y, dist(x,z))
    return math.degrees(radians)
 
bus = smbus.SMBus(1) # bus = smbus.SMBus(0) fuer Revision 1
address = 0x68       # via i2cdetect
 
# Aktivieren, um das Modul ansprechen zu koennen
bus.write_byte_data(address, power_mgmt_1, 0)

def check_panic_button():
    while True:
        button_state = GPIO.input(23)
        if button_state == False:
            print('Panic button Pressed...')
            data={'mac':device,'ts': int(time.time()*1000)}
            client.publish('senior-aid/panic/pressed',json.dumps(data))
            time.sleep(5)
        else:
            time.sleep(0.1)

def check_online():
    while True:
        data={'mac':device,'ts': int(time.time()*1000)}
        client.publish('senior-aid/device/online',json.dumps(data))
        time.sleep(300)

if __name__ == '__main__':
    try:
        threading.Thread(target=check_online,daemon=True).start()
        while True:
            
            #mpu_read()
            AcX=read_word_2c(0x3b)   
            AcY=read_word_2c(0x3d)
            AcZ=read_word_2c(0x3f)
            Tmp=read_word_2c(0x41)
            GyX=read_word_2c(0x43)
            GyY=read_word_2c(0x45)
            GyZ=read_word_2c(0x47)

            #2050, 77, 1947 are values for calibration of accelerometer
            ax = (AcX-2050)/16384.00
            ay = (AcY-77)/16384.00
            az = (AcZ-1947)/16384.00

            #270, 351, 136 for gyroscope
            gx = (GyX+270)/131.07
            gy = (GyY-351)/131.07
            gz = (GyZ+136)/131.07
            
            #calculating Amplitute vactor for 3 axis
            Raw_AM = math.sqrt((ax*ax)+(ay*ay)+(az*az))
            AM = Raw_AM * 10
            print("AM",AM)
            if trigger3==True:
                trigger3count=trigger3count+1
                if trigger3count>=10:
                    angleChange=math.sqrt((gx*gx)+(gy*gy)+(gz*gz))
                    print("angleChange=",angleChange)
                    if angleChange>=0 and angleChange<=10: #if orientation changes remains between 0-10 degrees
                        fall=True
                        trigger3=False
                        trigger3count=0
                    else: #user regained normal orientation
                        trigger3=False
                        trigger3count=0
                        print("TRIGGER 3 DEACTIVATED")
            
            if fall==True:
                print("Fall detected")
                fall=False
                data={'mac':device,'tsstr':datetime.now(),'ts': int(time.time()*1000)}
                client.publish('senior-aid/fall/detected',json.dumps(data))
            
            if trigger2count>=6: #allow 0.5s for orientation change
                trigger2=False
                trigger2count=0
                print("TRIGGER 2 DECACTIVATED")
            
            if trigger1count>=6: #allow 0.5s for AM to break upper threshold
                trigger1=False
                trigger1count=0
                print("TRIGGER 1 DECACTIVATED")

            if trigger2==True:
                trigger2count=trigger2count+1
                angleChange = math.sqrt((gx*gx)+(gy*gy)+(gz*gz))
                if angleChange>=30 and angleChange<=400: #if orientation changes by between 80-100 degrees
                    trigger3=True
                    trigger2=False
                    trigger2count=0
                    print("TRIGGER 3 ACTIVATED=",angleChange)
            
            if trigger1==True:
                trigger1count=trigger1count+1
                if AM>=12: #if AM breaks upper threshold (3g)
                    trigger2=True
                    print("TRIGGER 2 ACTIVATED")
                    trigger1=False
                    trigger1count=0
            
            if AM<=2 and trigger2==False: #if AM breaks lower threshold (0.4g)
                trigger1=True
                print("TRIGGER 1 ACTIVATED")
            
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("Terminated by User")
        
