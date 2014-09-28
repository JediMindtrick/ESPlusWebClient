
/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var uuid = require('node-uuid');


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.engine('html', require('ejs').renderFile);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
    res.render('index.html');
  });




function createEntity(_entity){
    var __id = uuid.v4();

    _entity.Id = __id;

    return {
        eventId: __id,
        eventType: 'ES.EntityCollection.EntityCreatedEvent<Entity1>',
        data: {
            orgName: "Org1",
            entityName: "Entity1",
            entity: _entity,
            metadata: 'eventstore metadata here'
        }
    };
}

function updateEntity(_entity){
    var __id = uuid.v4();

    return {
        eventId: __id,
        eventType: 'ES.EntityCollection.EntityUpdatedEvent<Entity1>',

        data: {
            orgName: "Org1",
            entityName: "Entity1",
            entity: _entity,
            metadata: 'eventstore metadata here'
        }
    };
}

var pushToStream = function(msg){

    var serializedMsg = JSON.stringify(msg);
    var headers = {
        'Content-Type': 'application/vnd.eventstore.events+json',
        'Content-Length': serializedMsg.length
    };

    var options = {
      host: '192.168.164.142',
      port: 2113,
      path: '/streams/Sandbox-Entity1-f',
      method: 'POST',
      headers: headers,
      auth: 'admin:changeit'
    };

    // Setup the request.  The options parameter is
    // the object we defined above.
    var req = http.request(options, function(res) {
      res.setEncoding('utf-8');

      var responseString = '';

      res.on('data',function(){
          console.log('data');
      });

      res.on('end', function(data) {
          console.log('entity create pushed onto stream');
      });
    });

    req.on('error', function(e) {
      // TODO: handle error.
      console.log('error');
    });

    req.write(serializedMsg);
    req.end();

};


app.post('/Entity1', function(req, res){
  console.log('create: ' +  req.body);

  var _entity = createEntity(req.body);

  var _msg = [_entity];

  pushToStream(_msg);

  res.send(_entity.id);
});

app.put('/Entity1', function(req, res){
  console.log('update: ' + req.body);

  var _entity = updateEntity(req.body);

  var _msg = [_entity];

  pushToStream(_msg);

  res.send(_entity.id);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
