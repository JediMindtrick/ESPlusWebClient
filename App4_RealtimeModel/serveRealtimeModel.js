/**
 * Real-time model "store"
At present it exposes two different endpoints (both in and out), http and websocket
 */
var express = require('express'),
http = require('http'),
path = require('path'),
store = require('./store.js'),
config = require('../config'),
zmq = require('zmq');

var app = express();

// all environments
app.set('port', process.env.PORT || config.realTimeStorePort);
app.use(express.json(false));
app.use(express.urlencoded());
app.use(express.methodOverride());

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

//read
app.get('/Store/*',function(req, res){

    var found = store.get(req.url);
    res.send(JSON.stringify(found));
});

//create
app.post('/Store/*',function(req, res){
    var val = null;

    val = req.body._rawValue;

    var result = store.set(req.url, val);
    res.send(JSON.stringify(result));
});

//update
app.put('/Store/*',function(req, res){
    var val = null;

    val = req.body._rawValue;

    var result = store.set(req.url, val);
    res.send(JSON.stringify(result));
});

//HERE BE WEBSOCKETS!
var io = require('socket.io')(server);

//this is the 'out' channel for the store
//THIS IS VERY IMPORTANT!!!  This is the means by which subscribers are notified of new values!!!
store.setChannel(io);

//subscribe danceroo
//this is for 'listening to a particular path enumeration', i.e. reads
io.on('connection',function(socket){

    console.log('someone connected to socket server');

    //WRITER EVENTS
    socket.on('PUT',function(val){
        store.set(val.path, val.data);
    });

    socket.on('POST',function(val){
        var result = store.set(val.path, val.data);
    });

    //READER SUBSCRIBE
    socket.on('subscribe',function(path){

        console.log('subscribe to ' + path);
        store.setupObservable(path);

        //on connect we want to give caller the current state
        var nsp = io.of(path);

        nsp.on('connection', function(socket){
            console.log('someone connected to ' + path);

            var _val = store.get('/Store' + path);
            //CONSIDER emitting 'read' instead of 'value', which might map to the semantics better
            if(_val != null){
              socket.emit('value',_val);
            }

        });

        socket.emit('subscribed',path);
    });
});


var sock = zmq.socket('pull');

var zmqStore = 'tcp://' + config.zeromqIn + ':' + config.zeromqPort;
sock.bindSync(zmqStore);
console.log('store bound to ' + zmqStore);

sock.on('message', function(msg){

    var val = JSON.parse(msg);
    store.set(val.path, val.data);
});
