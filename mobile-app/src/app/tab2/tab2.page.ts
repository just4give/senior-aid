import { Component, ElementRef, ViewChild, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';

import { ApiService } from '../services/api.service';
import { MqttService, IMqttMessage } from 'ngx-mqtt';
import { Subscription } from 'rxjs';
import * as d3 from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3Array from 'd3-array';
import * as d3Axis from 'd3-axis';
import * as d3Shape from 'd3-shape';
import {transition} from 'd3-transition';



@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  width: number;
  height: number;
  svg:any;
  x: any;
  y: any;
  
 

  private subscription: Subscription;

  
  constructor(public zone: NgZone, public apiService:ApiService,private _platform: Platform,
    public _mqttService: MqttService,private _elem: ElementRef) {
      this.width= _platform.width();
      this.height = _platform.height();
      console.log(this.width,this.height);
    
  }

  async ionViewWillEnter(){
    let that = this;
    this.subscription = this._mqttService.observe('/senior-aid/ibeacon').subscribe((message: IMqttMessage) => {
      
      console.log('messsage received ',message.payload.toString());
      var distance = JSON.parse(message.payload.toString()).dist;
      
      var motion = this.svg.select("#beacon");
      transition(motion);

      motion
      .transition()
      .duration(2000)
      .attr("y", that.y(distance))
      
    });

  }
  
  async ionViewDidEnter(){
    console.log('enetered ionViewDidEnter');
    let that = this;
    this.x = d3Scale.scaleLinear().rangeRound([0, this.width]).domain([0,4]);
    this.y = d3Scale.scaleLinear().rangeRound([0, this.height]).domain([0,20]);
    

    console.log(this.y(3));
    var jsonCircles = [
      { "x_axis": this.width/2, "y_axis": 0, "radius": 3, "color": "cyan" },
      { "x_axis": this.width/2, "y_axis": 0, "radius": 8, "color": "cyan" },
      { "x_axis": this.width/2, "y_axis": 0, "radius": 15, "color": "cyan" }];

    this.svg = d3.select('#floor')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100vh')
      .style('background-image', 'linear-gradient(#633ce0, purple)');

    var circles = this.svg.selectAll("circle")
          .data(jsonCircles)
          .enter()
          

    var circleAttributes = circles.append("circle")
          .attr("cx", function (d) { return d.x_axis; })
          .attr("cy", function (d) { return d.y_axis; })
          .attr("r", function (d) { return that.y(d.radius); })
          .style("stroke",function (d) { return d.color; })
          .style("stroke-width", 2)
          .style("fill", "none");

    circles.append("text")
          .text(function(d){return d.radius+"m"})
          .attr("dy",function(d){return that.y(d.radius)-10; })
          .attr("dx",function(d){return that.width/2-25; })
          .attr("text-anchor", "middle")
          .attr("font-size", "15")
          .style("fill", "cyan");

    this.svg.append("rect")
          .attr("id","base")
          .attr("x", (d)=>{return that.width/2-25})
          .attr("y", 0)
          .attr("width", 50)
          .attr("height", 50)
          .attr("fill", "#138ac1")
          .attr("rx","3")
          .style("stroke-width", 3)
          .attr("stroke", "#5bd3f0b5");

    var rect = this.svg.append("rect")
          .attr("id","beacon")
          .attr("x", (d)=>{return that.width/2-10})
          .attr("y", 10)
          .attr("width", 20)
          .attr("height", 20)
          .attr("fill", "#e0b500")
          .attr("rx","5")
          .style("stroke-width", 1)
          .attr("stroke", "#ffd31a");

      //TweenMax.to("#beacon", {rotation: 0, y: 0, duration: 0.1, ease: "easeOutExpo" });
      //TweenMax.to("#beacon", {rotation: 360, y: this.height-80, duration: 10, ease: "easeOutExpo" });
  }

  ionViewWillLeave(){
    //clearInterval(this.interval);
    //this._mqttService.unsafePublish(topic, message, {qos: 1, retain: true});
    this.subscription.unsubscribe();
  }

}
