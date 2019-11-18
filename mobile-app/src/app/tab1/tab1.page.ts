import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Storage } from  '@ionic/storage';
import { NavController } from '@ionic/angular';
import { MqttService, IMqttMessage } from 'ngx-mqtt';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit{

  private user:any={};
  private devices:any[];
  device:any;
  activities:any[];
  private subscription: Subscription;
  timestamp:number;
  online:boolean =  false;

  constructor(public apiService:ApiService,public storage:Storage,public navCtrl:NavController,
    public _mqttService: MqttService) {
      this.timestamp = new Date().getTime();
    }

  
  async ngOnInit(){
    let that = this;
    setInterval(()=>{
      if(new Date().getTime()-that.timestamp >10000){
        that.online = false;
      }
    },5000)
  }

  async ionViewWillEnter(){
    let that = this;
    this.user = await this.storage.get("user");
    console.log(this.user);
    this.devices = await this.apiService.devices(this.user.ID).toPromise();
    await this.storage.set("devices",this.devices);
    console.log(this.devices);

    if(this.devices && this.devices.length>0){
      this.device = this.devices[0];
      this.activities = await this.apiService.activities(this.devices[0].ID).toPromise();
      console.log(this.activities);
    }

    this.subscription = this._mqttService.observe('/senior-aid/ibeacon').subscribe((message: IMqttMessage) => {
      
      console.log('messsage received ',message.payload.toString());
      that.timestamp = new Date().getTime();
      that.online = true;
      
    });
  }

  async viewDetail(device){
    this.navCtrl.navigateForward('/devicedetail/'+device.id);
  }

  ionViewWillLeave(){
    this.subscription.unsubscribe();
  }

  async ack(m:any){
    await this.apiService.ack(m.ID).toPromise();
    this.activities = await this.apiService.activities(this.device.ID).toPromise();
  }
}
