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

   deviceId:string;
  
   balance:any="0";
   messages:any[];
   interval;
   seedJson:any={};
   showQRCode:boolean = false;
  constructor(private route: ActivatedRoute, private apiService:ApiService,private storage:Storage) { }

  async ngOnInit() {
  }

  async generateAddress(){
    
  }

  async ionViewWillEnter(){
    
    
}

  ionViewWillLeave(){
    
    
  }


}
