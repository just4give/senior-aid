import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Storage } from  '@ionic/storage';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page implements OnInit{

  user:any;
  devices:any;
  device:any;
  medicines:any[];
  when:any[]=[
    {label:'00AM',tag:0},{label:'01AM',tag:1},{label:'02AM',tag:2},{label:'03AM',tag:3},{label:'04AM',tag:4},{label:'05AM',tag:5},
    {label:'06AM',tag:6},{label:'07AM',tag:7},{label:'08AM',tag:8},{label:'09AM',tag:9},{label:'10AM',tag:10},{label:'11AM',tag:11},
    {label:'12PM',tag:12},{label:'01PM',tag:13},{label:'02PM',tag:14},{label:'03PM',tag:15},{label:'04PM',tag:16},{label:'05PM',tag:17},
    {label:'06PM',tag:18},{label:'07PM',tag:19},{label:'08PM',tag:20},{label:'09PM',tag:21},{label:'10PM',tag:22},{label:'11PM',tag:23}
  ]

  newMed:any={};

  often:any[]=['MON','TUE','WED','THU','FRI','SAT','SUN'];

  constructor(public apiService:ApiService,public storage:Storage,public navCtrl:NavController) {}

  async ngOnInit(){
    this.user = await this.storage.get("user");
    this.devices = await this.storage.get("devices")
    //console.log(this.user);
    if(this.devices && this.devices.length>0){
      this.device = this.devices[0];
      this.medicines = await this.apiService.medicines(this.devices[0].ID).toPromise();
      console.log(this.medicines);
    }
    
  }

  async ionViewWillEnter(){
    
  }

  async showEdit(m:any){
    this.newMed = m;
  }

  async create(med:any){
    console.log(med);

    if(med.ID){
      await this.apiService.updateMedicine(med).toPromise();
    }else{
      med.DEVICE_ID = this.device.ID;
      med.USER_ID = this.user.ID;
      await this.apiService.addMedicine(med).toPromise();
    }
    this.newMed ={};
    this.medicines = await this.apiService.medicines(this.device.ID).toPromise();
  }

  async delete(med:any){
    await this.apiService.deleteMedicine(med).toPromise();
    this.medicines = await this.apiService.medicines(this.device.ID).toPromise();
  }

}
