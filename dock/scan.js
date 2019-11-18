var noble=require('noble');
var mqtt =require('mqtt');
noble.startScanning([],true);
var addressToTrack = 'b827ebb2c244';
var deviceId='device-123';
mqttClient  = mqtt.connect("mqtt://broker.hivemq.com",{clientId:deviceId});
var last = new Date().getTime();
var arr =[];

mqttClient.on("connect",()=>{	
        console.log("connected to broker.hivemq.com");
       
})

noble.on('discover', function(peripheral) {

  //var macAddress = peripheral.uuid;
  //var rss = peripheral.rssi;
  //var localName = advertisement.localName;
  //console.log('found device: ', peripheral.uuid);
  
    if(peripheral.uuid == addressToTrack){
      var dist = calculateDistance(peripheral.rssi);
      if(arr.length < 4){
        arr.push(dist);
      }else{
        var average = arr.reduce((a, b) => a + b, 0)/4;
        arr =[];
        var deviceData = {mac: peripheral.uuid, dist:average,rssi:peripheral.rssi};
        mqttClient.publish('/senior-aid/ibeacon', JSON.stringify(deviceData));
      }
        
    }
  
  
});

function calculateDistance(rssi) {
  
  var txPower = -59 //hard coded power value. Usually ranges between -59 to -65
  
  if (rssi == 0) {
    return -1.0; 
  }

  var ratio = rssi*1.0/txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio,10);
  }
  else {
    var distance =  (0.89976)*Math.pow(ratio,7.7095) + 0.111;    
    return distance;
  }
}
