import paho.mqtt.client as paho
import time
import json
from datetime import datetime
import RPi.GPIO as GPIO
import boto3
import threading
import requests as requests
import os
import pygame
import io
import os.path
from os import path

#pip3 install paho-mqtt
BACKEND='http://ec2-52-39-24-35.us-west-2.compute.amazonaws.com:5000'
DEVICE_MAC='B827EBB2C244'

polly = boto3.client('polly')

def on_connect(client, userdata, flags, rc):
    print("Connected to mqtt broker")
    client.connected_flag=True

def on_message(client, userdata, message):
    print("message received")
    if message.topic == 'senior-aid/fall/detected':
        blink_red()
        play_mp3('siren.mp3')
        data = {'DEVICE_MAC':DEVICE_MAC,'TYPE':'FALL','MESSAGE':'Fall detection was triggered.'}
        r = requests.post(BACKEND+'/api/activity',data=data, headers={"Accept": "application/json"})
        if r.ok:
                print("activity posted.")

        
    if message.topic == 'senior-aid/med/update':
        print("re-generate alert mp3")
        generate_alert_mp3()

    if message.topic == 'senior-aid/panic/pressed':
        blink_red()
        play_mp3('siren.mp3')
        data = {'DEVICE_MAC':DEVICE_MAC,'TYPE':'PANIC','MESSAGE':'Panic button was triggered'}
        r = requests.post(BACKEND+'/api/activity',data=data, headers={"Accept": "application/json"})
        if r.ok:
                print("activity posted.")
    if message.topic == '/senior-aid/ibeacon':
        GPIO.output(GREEN_LIGHT, True)

    if message.topic == 'senior-aid/device/online':
        GPIO.output(AMBER_LIGHT, True)
        

paho.Client.connected_flag=False
broker = 'broker.hivemq.com'
port = 1883
client = paho.Client()
client.loop_start()
client.on_connect = on_connect
client.connect(broker,port)
while not client.connected_flag:
    time.sleep(1)
client.subscribe('senior-aid/fall/detected')
client.subscribe('senior-aid/panic/pressed')
client.subscribe('senior-aid/med/update')
client.subscribe('senior-aid/device/online')
client.subscribe('/senior-aid/ibeacon')

client.on_message=on_message


GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

RED_LIGHT = 9
AMBER_LIGHT = 10
GREEN_LIGHT = 11

GPIO.setup(RED_LIGHT, GPIO.OUT)
GPIO.setup(AMBER_LIGHT, GPIO.OUT)
GPIO.setup(GREEN_LIGHT, GPIO.OUT)




def blink_red():
    COUNTER=0
    while COUNTER<10:
        COUNTER=COUNTER+1
        GPIO.output(RED_LIGHT, True)
        time.sleep(2)
        GPIO.output(RED_LIGHT, False)
        time.sleep(0.5)

def play_mp3(file):
        pygame.mixer.init()
        pygame.init()
        pygame.mixer.music.load(file)
        pygame.mixer.music.set_endevent(pygame.USEREVENT)
        pygame.event.set_allowed(pygame.USEREVENT)
        pygame.mixer.music.play()
        pygame.event.wait() # play() is asynchronous. This wait forces the speaking to be finished before closing
            
        while pygame.mixer.music.get_busy() == True:
            pass
        print("finished playing file", file)

def generate_alert_mp3():
        r = requests.get(BACKEND+'/api/medicine-by-mac/'+DEVICE_MAC,headers={"Accept": "application/json"})
        if(r.ok):
            jData = json.loads(r.text)
            print(jData)
            for med in jData:
                x = med['HOUR']
                m = x % 12
                tm = str(m)
                if x>12:
                        tm = tm + " PM "
                else:
                        tm = tm + " AM "
                response = polly.synthesize_speech(VoiceId='Salli',
                OutputFormat='mp3', 
                TextType = 'ssml',
                Text = "<speak> Take {} tablet of <prosody volume='loud'> {} </prosody> <break time='.3s'/>at <break time='.5s'/>{} </speak>".format(med['QTY'],med['MESSAGE'],tm))
                file = open("{}.mp3".format(med['ID']), 'wb')
                file.write(response['AudioStream'].read())
                file.close()

def check_for_notifications():
    while True:
        print("check for medicine reminders")
        GPIO.output(RED_LIGHT, False)
        now = datetime.now()
        day = datetime.today().strftime('%a').upper()
        print("current hour",now.hour,day)
        r = requests.get(BACKEND+'/api/medicine-by-mac/'+DEVICE_MAC,headers={"Accept": "application/json"})
        if(r.ok):
            jData = json.loads(r.text)
            print(jData)
            filtered = list(filter(lambda med: med['HOUR']==now.hour and day in med['FREQ'], jData))
            if len(filtered) > 0:
                    GPIO.output(RED_LIGHT, True)
                    play_mp3('beep-2.mp3')
                    play_mp3('reminder-intro.mp3')       
            for x in filtered:
                fileName="{}.mp3".format(x["ID"])
                if path.exists(fileName):
                        play_mp3(fileName) 
                              

        time.sleep(15*60)

def check_for_online():
        while True:
           GPIO.output(GREEN_LIGHT, False)
           GPIO.output(AMBER_LIGHT, False)
           time.sleep(30)   


if __name__ == '__main__':
    try:
        # Start threads
        generate_alert_mp3()
        threading.Thread(target=check_for_notifications,daemon=True).start()
        threading.Thread(target=check_for_online,daemon=True).start()
        while True:
            time.sleep(1)
            

    except KeyboardInterrupt:
        print("Terminated by User")
        GPIO.cleanup()