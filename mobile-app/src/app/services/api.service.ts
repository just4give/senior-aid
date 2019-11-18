import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {environment} from '../../environments/environment';
import { Storage } from  '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient,private storage:Storage) { }

  login(user:any):any{
    return this.http.post(environment.url+'/api/login/owner',user);
  }

  signup(user:any):any{
    return this.http.post(environment.url+'/api/signup/owner',user);
  }

  registerDevice(device:any):any{
    
    return this.http.post(environment.url+'/api/register/device',device);
  }

  genAddress(deviceId:string):any{
    
    return this.http.post(environment.url+'/api/gen-address/car-device/'+deviceId,{});
  }
  devices(userId:number):any{
     
    return this.http.get(environment.url+'/api/devices/'+userId);
  }

  medicines(userId:number):any{
     
    return this.http.get(environment.url+'/api/medicine/'+userId);
  }

  addMedicine(medicine:any):any{
     
    return this.http.post(environment.url+'/api/medicine',medicine);
  }

  updateMedicine(medicine:any):any{
     
    return this.http.put(environment.url+'/api/medicine',medicine);
  }

  deleteMedicine(medicine:any):any{
     
    return this.http.delete(environment.url+'/api/medicine/'+medicine.ID);
  }

  activities(deviceId:number):any{
     
    return this.http.get(environment.url+'/api/activity/'+deviceId);
  }

  ack(id:number):any{
     
    return this.http.put(environment.url+'/api/fall/ack/'+id,{});
  }

}
