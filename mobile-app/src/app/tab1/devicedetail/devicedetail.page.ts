import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { async } from '@angular/core/testing';
import { Storage } from  '@ionic/storage';
import { ViewEncapsulation } from '@angular/compiler/src/core';



@Component({
  selector: 'app-devicedetail',
  templateUrl: './devicedetail.page.html',
  styleUrls: ['./devicedetail.page.scss']
})
export class DevicedetailPage implements OnInit {

  private deviceId:string;
  
  private balance:any="0";
  private messages:any[];
  private interval;
  private seedJson:any={};
  private showQRCode:boolean = false;
  constructor(private route: ActivatedRoute, private apiService:ApiService,private storage:Storage) { }

  async ngOnInit() {
    let that = this;
    this.deviceId = this.route.snapshot.paramMap.get('id');
    console.log(this.deviceId);
    let user = await this.storage.get("user");
    let devices = await this.apiService.devices(user.id).toPromise();
    let device = devices.filter((m)=>{ return m.DEVICE_ID == this.deviceId})[0];
    
    this.seedJson = JSON.parse(device.SEED_JSON);
    console.log("devices", this.seedJson);
    let mamResponse = await this.apiService.getMamMessages(this.deviceId).toPromise();
    let messages = mamResponse.messages;
    // let messages=[
    //   {id:1, message:'Charged 10%',timestamp: new Date().getTime()},
    //   {id:2, message:'Ride Shared',timestamp: new Date().getTime()},
    //   {id:3, message:'Car Washed',timestamp: new Date().getTime()}
    // ];


    
    that.messages=[];

    for (let i = 0; i < messages.length; i++) {
      setTimeout(function() {
          that.messages.push(messages[i]);
      }, 500 * i);
    }

    //do it once on load then in interval
    let balance = await this.apiService.getBalance(this.deviceId).toPromise();
    that.balance = balance.balance;
    
    this.interval = setInterval(async ()=>{
      
      let balance = await this.apiService.getBalance(this.deviceId).toPromise();
      
      that.balance = balance.balance;

      let mamResponse = await this.apiService.getMamMessages(this.deviceId).toPromise();
      let messages = mamResponse.messages;

      let ids = that.messages.map(m=>m.timestamp);
      let filtered = messages.filter(m=> !ids.includes(m.timestamp));
      //console.log(filtered);
      for (let i = 0; i < filtered.length; i++) {
        setTimeout(function() {
            that.messages.push(filtered[i]);
        }, 500 * i);
      }

    },60000)
  }

  async generateAddress(){
    let address = this.apiService.genAddress(this.deviceId).toPromise();
    this.seedJson.receivingAddress = address.address;
  }

  async ionViewWillEnter(){
    
    
}

  ionViewWillLeave(){
    clearInterval(this.interval);
    
  }


}
