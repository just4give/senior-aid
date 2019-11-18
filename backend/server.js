const express = require("express");
const bodyParser = require('body-parser');
const cors = require('cors')
const DBHelper = require('./db-helper');
const db_helper = new DBHelper();
const app = express();
const crypto = require('crypto');
const AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var pinpointsmsvoice = new AWS.PinpointSMSVoice({apiVersion: '2018-09-05'});
var pinpoint = new AWS.Pinpoint();
var OriginationPhoneNumber= '+12015819432';
const cron = require("node-cron");

var voiceMessage = "<speak>"
    + "This is an emergency call from <emphasis>Seniod Aid Fall Detection System</emphasis> "
    + "<break strength='weak'/>Device has detected a fall and your attention is needed!"
    + "<amazon:effect phonation='soft'>Thank you for listening."
    + "</amazon:effect>"
    + "</speak>";

var textMessage ="This is an emergency message from Senior Aid Fall Detection System. "
    + "Device has detected a fall and your attention is needed!";

var textMessagePanic ="This is a message from Senior Aid Fall Detection System. "
    + "Someone pressed panic button and seek your attention.";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.use(function(error, req, res, next) {
    res.json({ message: error.message });
});
  

const PORT = process.env.PORT = 5000;

let router = express.Router();


cron.schedule("*/30 * * * *", async function() {
    console.log("running a task every two minutes "+new Date().toString());
    let pendingAck = await db_helper.all(`SELECT *  FROM ACTIVITY WHERE TYPE IN('FALL','PANIC') AND ACK IS NULL AND LEVEL=1`,
    []);
    console.log(pendingAck);
    pendingAck.forEach(async (item)=>{
        var user = await db_helper.get(`SELECT * FROM OWNER WHERE ID=? `,
        [item.USER_ID]);
        console.log("Second phone", user.SECOND_PHONE);

        if(item.TYPE==='FALL'){
            await triggerCall({'PhoneNumber': "+1"+user.SECOND_PHONE ,'Message':voiceMessage})
            await triggerText({'PhoneNumber': "+1"+user.SECOND_PHONE ,'Message':textMessage})
        }else if(item.TYPE==='PANIC'){
            await triggerText({'PhoneNumber': "+1"+user.SECOND_PHONE ,'Message':textMessagePanic})
        }
        await db_helper.run(`UPDATE ACTIVITY SET LEVEL=? WHERE ID=?`,
        [2,item.ID]);
    })

});

router.post('/signup/owner',async function(req,res){
    
    db_helper.run(`INSERT INTO OWNER (USERNAME,PASSWORD,FISRT_PHONE,SECOND_PHONE) VALUES (?,?,?,?)`,
    [req.body.USERNAME,req.body.PASSWORD,req.body.FISRT_PHONE,req.body.SECOND_PHONE]);

    let user = await db_helper.get(`SELECT * FROM OWNER WHERE USERNAME=? AND PASSWORD=?`,
    [req.body.USERNAME,req.body.PASSWORD]);

    res.json(user);
});



router.post('/login/owner',async function(req,res){
    
    let user = await db_helper.get(`SELECT * FROM OWNER WHERE USERNAME=? AND PASSWORD=?`,
    [req.body.USERNAME,req.body.PASSWORD]);

    console.log(user);
    if(!user){
        res.status(401).json({ error: 'Login failed.' });
    }
    res.json(user);
    
});



router.post('/register/device',async function(req,res){
    
    
    db_helper.run(`DELETE FROM DEVICE WHERE DEVICE_UUID=?`,
    [req.body.deviceId]);
     
    db_helper.run(`INSERT INTO DEVICE (USER_ID,DEVICE_UUID,DEVICE_MAC,METADATA) VALUES (?,?,?,?)`,
    [req.body.USER_ID,req.body.DEVICE_UUID.split(" ").join("").toUpperCase(),req.body.DEVICE_MAC.toUpperCase(),JSON.stringify({})]);

    res.json({'message' : 'Device registered.'});
});

router.get('/devices/:userId',async function(req,res){
    var userId = req.params.userId;
    
    let devices = await db_helper.all(`SELECT *  FROM DEVICE WHERE USER_ID=?`,
    [userId]);
    res.json(devices);
    
});



router.get('/activity/:deviceId',async function(req,res){
    var deviceId = req.params.deviceId;
    
    let activities = await db_helper.all(`SELECT *  FROM ACTIVITY WHERE DEVICE_ID=? ORDER BY TS DESC`,
    [deviceId]);
    res.json(activities);
    
});

router.post('/activity',async function(req,res){
    console.log(req.body)
    let device = await db_helper.get(`SELECT *  FROM DEVICE WHERE DEVICE_MAC=?`,
    [req.body.DEVICE_MAC]);

    db_helper.run(`INSERT INTO ACTIVITY (USER_ID,DEVICE_ID,TYPE,MESSAGE,TS,LEVEL) VALUES (?,?,?,?,?,?)`,
    [device.USER_ID,device.ID,req.body.TYPE,req.body.MESSAGE,new Date().getTime(),1]);
    let user = await db_helper.get(`SELECT * FROM OWNER WHERE ID=? `,
    [device.USER_ID]);

    if(req.body.TYPE==='FALL'){
        //trigger call to emergency contact person
        console.log("fall detected");
        await triggerCall({'PhoneNumber': "+1"+user.FISRT_PHONE ,'Message':voiceMessage})
        await triggerText({'PhoneNumber': "+1"+user.FISRT_PHONE ,'Message':textMessage})
    }else if(req.body.TYPE==='PANIC'){
        console.log("panic detected");
        await triggerText({'PhoneNumber': "+1"+user.FISRT_PHONE ,'Message':textMessagePanic})
    }
    

    res.json({'message' : 'Activity posted.'});
    
});



function triggerCall (eventData) {
    return new Promise (resolve => {
        var parms = {
            Content: {
                SSMLMessage: {
                    LanguageCode : 'en-US',
                    Text : eventData.Message,
                    VoiceId: 'Joanna'
                }
            },
            OriginationPhoneNumber: OriginationPhoneNumber,
            DestinationPhoneNumber: eventData.PhoneNumber
        };

        console.log ("Call Parameters: ", JSON.stringify(parms));
        pinpointsmsvoice.sendVoiceMessage (parms, function (err, data) {
            if (err) {
                console.log ("Error : "+ err.message);
                resolve(eventData.PhoneNumber + " " + err.message);
            }
            else {
                console.log (data);
                resolve(eventData.PhoneNumber + " OK");
            }
        });
    });
}

function triggerText (eventData) {
    return new Promise (resolve => {
        var params = {
            ApplicationId: '80fcd395874d44b9a32a9d4198c8a18c',
            MessageRequest: {
              Addresses: {
                [eventData.PhoneNumber]: {
                  ChannelType: 'SMS'
                }
              },
              MessageConfiguration: {
                SMSMessage: {
                  Body: eventData.Message,
                  MessageType: 'TRANSACTIONAL',
                  OriginationNumber: OriginationPhoneNumber
                }
              }
            }
          };

        pinpoint.sendMessages(params, function (err, data) {
            if (err) {
                console.log ("Error : "+ err.message);
                resolve(eventData.PhoneNumber + " " + err.message);
            }
            else {
                console.log (data);
                resolve(eventData.PhoneNumber + " OK");
            }
        });
    });
}

router.put('/fall/ack/:id',async function(req,res){
 
    var id = req.params.id;
    await db_helper.run(`UPDATE ACTIVITY SET ACK=? WHERE ID=?`,
    ['Y',id]);

    res.json({message:'acknowledged'});
    
});

router.get('/medicine/:deviceId',async function(req,res){
    try {
        var deviceId = req.params.deviceId;
    
        let medicines = await db_helper.all(`SELECT *  FROM MEDICINE WHERE DEVICE_ID=?`,
        [deviceId]);
        medicines = medicines.map((m)=>{ m.FREQ = JSON.parse(m.FREQ); return m});
        res.json(medicines);
        
    } catch (error) {
        console.log(error);
    }
    
    
});
router.get('/medicine-by-mac/:deviceMac',async function(req,res){
    var deviceMac = req.params.deviceMac;
    
    let medicines = await db_helper.all(`SELECT *  FROM MEDICINE WHERE DEVICE_ID=(SELECT ID FROM DEVICE WHERE DEVICE_MAC=?)`,
    [deviceMac]);
    console.log(medicines);
    res.json(medicines);
    
});

router.post('/medicine',async function(req,res){
    
    db_helper.run(`INSERT INTO MEDICINE (USER_ID,DEVICE_ID,HOUR,MESSAGE,QTY,FREQ) VALUES (?,?,?,?,?,?)`,
    [req.body.USER_ID,req.body.DEVICE_ID,req.body.HOUR,req.body.MESSAGE,req.body.QTY,JSON.stringify(req.body.FREQ)]);

    res.json({'message' : 'Medicine posted.'});
    
});

router.put('/medicine',async function(req,res){
 
    await db_helper.run(`UPDATE MEDICINE SET HOUR=?,MESSAGE=?,QTY=?,FREQ=? WHERE ID=?`,
    [req.body.HOUR,req.body.MESSAGE,req.body.QTY,JSON.stringify(req.body.FREQ),req.body.ID]);

    res.json(req.body);
    
});

router.delete('/medicine/:id',async function(req,res){

    var id = req.params.id;
     
    db_helper.run(`DELETE FROM MEDICINE WHERE ID=?`,
    [id]);

    res.json({});
    
});


app.use('/api',router);

function decrypt(text,password){
    var decipher = crypto.createDecipher('aes-192-cbc',password)
    var dec = decipher.update(text,'base64','utf8')
    dec += decipher.final('utf8');
    return dec;
}

function encrypt(text,password){
    var cipher = crypto.createCipher('aes-192-cbc',password)
    var crypted = cipher.update(text,'utf8','base64')
    crypted += cipher.final('base64');
    return crypted;
}


app.listen(PORT,function(){
  console.log('Server is running at PORT:',PORT);
});