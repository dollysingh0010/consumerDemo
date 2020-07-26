var express         = require('express');
var app             = express();
const { Client }    = require('@sap/xb-msg-amqp-v100');
var bodyParser      = require('body-parser')
var activeMQConnect = null;
var connectionState = false;
var reconnectCount  = 1;
var xsenv           = require("@sap/xsenv");
var maxReconnectCount = process.env.MAX_RECONNECT_COUNT;
var PORT            = process.env.PORT || 4000;
var timeInterval    = process.env.RECONNECTION_INTERVAL;
var fs              = require("fs")

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
xsenv.loadEnv();

function setOptions() {
    console.log("<<< Inside setOptions method in producer services---")
    var creds = xsenv.serviceCredentials({ tag: 'messaging-service', name : "activemq"});
    console.log(creds);
    var temp = creds.url.split("//");
    var temp1 = temp[1].split(":");
    
    var options = {};
    options.net = {
        host :  "localhost",//temp1[0],
        port :  5672//temp1[1]
    };
    options.sasl =  {
        mechanism  : 'PLAIN',
        user: "guestjkgkjg",//creds.user,
        password: "khoiguest"//creds.password
    }

    return options;
}


app.listen(PORT,function(){
   
   console.log("<<<<server started at port---",PORT)
   activeMQConnect = new Client();
   activeMQConnect.connect(setOptions());
   activeMQConnect
    .on('connected',(destination, peerInfo) => {
        console.log('<<<< connected', peerInfo.description);
        connectionState = true;
        console.log("<<<<< state in connected--",connectionState);
        reconnectCount = 1;
    })
    .on('error', (error) => {
        console.log("<<<< error is---",error.message);
        connectionState = false;
        console.log("<<<< state in error---",connectionState)
    })
    .on('reconnecting', (destination) => {
        console.log('<<<<reconnecting, using destination ' + destination);
        connectionState = true;
        console.log("<<<< state in reconnecting--",connectionState)

    })
    .on('disconnected', (hadError, byBroker, statistics) => {
        console.log('<<<< disconnected',hadError,byBroker,statistics);
        reconnectCount++;
        connectionState = false;
        console.log("<<<< state in disconnected--",connectionState)

        if(!connectionState && reconnectCount<maxReconnectCount) {
            var retryConnection = setInterval(function() {
                console.log("<<<< inside interval--",reconnectCount)
                activeMQConnect.connect();
                if(connectionState || reconnectCount>maxReconnectCount) {
                    console.log("<<< clearing setInterval--",reconnectCount)
                    clearInterval(retryConnection);
                }
            },timeInterval)
        }  
    })
    subscribe();
})

function subscribe() {
    console.log("<<<<<Inside subscribe method ----")
    var stream = activeMQConnect.receiver('receiverName').attach('test');
    stream.on('data',function(message) {
        var temp = message.payload;
        var str = JSON.parse(temp.toString());
        console.log("<<<< message is---",JSON.stringify(str))
            fs.appendFile('consumer.txt',JSON.stringify(str)+"\n", function (err) {
                if (err) throw err;
                console.log('added in file');
                message.done();
            });
    });
}






