//declare required modules
var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , static = require('node-static')
  , sys = require('sys')
  , sleep = require('sleep')
  , blaster = require('pi-blaster.js')
  , shellexecute = require('child_process').exec
  , argv = require('optimist').argv
  app.listen(8090);


var file = new(static.Server)();
function handler(request, response) {
  console.log("got request for: "+request.url);
  if(request.url == "/"){
    request.url = "/socket.html";
  }
  console.log('serving file',request.url)
  file.serve(request, response);
};

console.log('server listening on port 8090 visit http://ipaddress:8090/socket.html');
var child = shellexecute('echo "server. listening. on. port. 80. 90" | festival --tts', function(error, stdin, stdout){});

function setgpio(pin, value){ //value should be between 0 and 1
        blaster.setPwm(pin, value);
}

var rightwheel = [4, 17];
var leftwheel = [22, 23]; //22, 27
var flash = 24

var leftwheelpowergraph = [[0, 100], [90, 100], [120, 0], [180, -100], [270, -100], [300, 0], [360, 100]]; 
var rightwheelpowergraph = [[0, 100], [60, 0], [90, -100], [180, -100], [240, 0], [270, 100], [360, 100]];

//power should be a number between -1 and 1
function setwheelpower(wheel, power){
  if(power>0){
    setgpio(wheel[0], power);
    setgpio(wheel[1], 0);
  }
  else{
    setgpio(wheel[1], Math.abs(power));
    setgpio(wheel[0], 0);
  }
}

function setFlash(value){
  if(value){
    setgpio(flash, 1);
  }else{
    setgpio(flash, 0);
  }
}


//converts radians to degrees
function toDegrees (angle) {
  return angle * (180 / Math.PI);
}

//calculates the angle the joystick is pointed at
function calculateangle(x, y){
  return (360+toDegrees(Math.atan2(x, y)))%360;
}

//calculates the y value at point x on the line between the pair of points
function calculatelocation(xlocation, pairofpoints){
  p1 = pairofpoints[0];
  p2 = pairofpoints[1];
  gradient = (p2[1]-p1[1])/(p2[0]-p1[0]);
  return p1[1] + (xlocation-p1[0])*gradient;
}

//looks up the value of y at the point x for the graph described by "pointlist"
function lookupvalue(x, pointlist){
  for(i=0; i < pointlist.length; i++){
    if (x<pointlist[i][0]){
      return calculatelocation(x,[pointlist[i-1], pointlist[i]]);
    }
  }
}

function getdirectiontext(x, y){
  if(Math.sqrt(Math.pow(x, 2)+Math.pow(y, 2)) < 20){
    return "CENTRE";   
  }

  if(x==0){
    x=0.00001 //to avoid dividing by zero error  
  }

  var sidesratio=y/x;

  if(Math.abs(sidesratio) < 0.75){ //if the gradient of the line is <0.75, we must be pointing in either the left or right direction
    if(x>0){
      return "RIGHT";    
    }else{
      return "LEFT";    
    }
  }else{//if the sides ratio is over a certain amount then we must be either going forwrd or backward
    if(y>0){
      return "BACKWARD";    
    }else{
      return "FORWARD";    
    }
  }
    
}

//calculates a number between 0 and 1, dependent on how actuated the joystick is, compared to its maximum value.
var joystickradius = 70.0;
function calculatepowercoefficient(direction){
    var x = direction[0];
    var y = direction[1];
    var hypot = Math.sqrt(x*x + y*y);

    return hypot / joystickradius;
}

//goes in the direction specified by a list of form [x component, y component]
function goindirection(direction){
  if(direction[0] > joystickradius){direction[0] = joystickradius;}
  if(direction[1] > joystickradius){direction[1] = joystickradius;}
  if(direction[0] < -joystickradius){direction[0] = -joystickradius;}
  if(direction[1] < -joystickradius){direction[1] = -joystickradius;}

  var joystickangle = calculateangle(direction[0], direction[1]);
  var leftwheelpower = lookupvalue(joystickangle, leftwheelpowergraph);
  var rightwheelpower = lookupvalue(joystickangle, rightwheelpowergraph);
  var power = calculatepowercoefficient(direction);

  if(direction[0]==0 && direction[1]==0){
    leftwheelpower = rightwheelpower = 0;
  }

  setwheelpower(leftwheel, (leftwheelpower/100) * power);
  setwheelpower(rightwheel, (rightwheelpower/100) * power);

  console.log("direction is: " + direction.toString() +
                " (" + getdirectiontext(direction) + ")"+
                "  lwheel: " + leftwheelpower.toString()+
                "  rwheel: " + rightwheelpower.toString());    
}


var d = new Date();
var lastcommandtime = d.getTime();

setInterval(function(){
        if (d.getTime() - lastcommandtime > 1000){
            //SWITCH OFF THE MOTORS
            console.log("Have not recieved command in over a second, so stopping bot.");
        }
}, 500); //every second check if we haven't had a new command in a while. if we haven't, stop the robot. NOTE: I HAVE A FEELING THIS PIECE OF CODE DOESN'T WORK.

//fire up a web socket server
io.sockets.on('connection', function (socket) {
  socket.on('fromclient', function (data) {
    console.log("Got message of type: "+data.commandtype);
    if(data.commandtype=="move"){
        lastcommandtime = d.getTime();
        var x = data.joystickX;
        var y = -data.joystickY; //inverting the y value

        goindirection([x, y]);
    }
    else if(data.commandtype=="speech"){
        //running the bash command for text to speech
        phrase = 'echo "'+data.text+'" | festival --tts';
        console.log("Executing text to speech: "+phrase);
        child = shellexecute(phrase, function(error, stdin, stdout){});

    }
    else if(data.commandtype=="flashlight"){
        setFlash(data.value);
    }
  });
});

process.on('SIGINT', function() {
  gpio.destroy();
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  return process.exit();
});
