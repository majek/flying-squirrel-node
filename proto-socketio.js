var socketio = require('socket.io');  // socket.io 0.6
var url = require('url');
var http = require('http');
var sys = require('sys');
var events = require('events');

var connections = require('./connections');
var config = require('./config');
// Config must provide:
//   config.socketio.host
//   config.socketio.port

var mock_server;

// Socket.io 0.6 doesn't handle multiple listeners. You can't listen
// to multiple resources at a time. Let's mock up a http server
// implementation to fix that. Ugly.
function MockServer(server) {
    this.server = server;
}
MockServer.prototype = {
    listeners: function() {return [];},
    addListener: function() {},
    removeAllListeners: function() {},
    on: function(action, fun) {
        console.log("unsupported action ",action);
    },
    socketio_is_broken: function(resource, listener) {
        var that = this;
        this.server.listeners('request').unshift(
            function(req, res) {
                if (that.path_matches(req, resource)) {
                    req.x_done = true;
                    listener.check(req, res);
                }
            });
        this.server.listeners('upgrade').unshift(
            function(req, res, head) {
                if (that.path_matches(req, resource)) {
                    req.x_done = true;
                    listener.check(req, res, true, head);
                }
            });
    },
    path_matches: function(req, resource) {
        var path = url.parse(req.url).pathname;
        return (path.indexOf('/' + resource) === 0);
    }
};

exports.register = function(protocol_list) {
    protocol_list['socket.io'] = {url: get_url};

    var server = http.createServer(
        function(req, res){
            if (!('x_done' in req)) {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('Welcome to socket.io');
            }
        });
    server.listen(config.socketio.port, "0.0.0.0");
    mock_server = new MockServer(server);
};

var get_url = function(token) {
    // TODO: this is quite innefficient to create a new listener for every
    // endpoint, but there is no better way without touching socket.io.
    var io = socketio.listen(mock_server, {resource: token});
    mock_server.socketio_is_broken(token, io);
    io.on('connection', function (client) {
              return on_connection(client, token);
          });
    return ("http://" + config.socketio.host + ':' +
                       config.socketio.port + '/' + token);
};


function Protocol(io) {
    var that = this;
    this.io = io;
    this.io.removeAllListeners('message');
    this.io.removeAllListeners('disconnect');

    this.io.on('message', function (raw_msg) {
                   that.emit('message', JSON.parse(raw_msg));
               });
    this.io.on('disconnect', function () {
                   that.emit('disconnect');
               });
};
sys.inherits(Protocol, events.EventEmitter);

Protocol.prototype.send = function(msg) {
        this.io.send(JSON.stringify(msg));
    };
Protocol.prototype.disconnect = function() {
        console.log('socket.io doesn\'t support on-demand disconnection.');
        this.io.removeAllListeners('message');
        this.io.removeAllListeners('disconnect');
        this.removeAllListeners('message');
        this.removeAllListeners('disconnect');
        this.io = null;
    };


var on_connection = function(io, token) {
    console.log('connection');
    io.on('message', function (raw_msg) {
              var msg = JSON.parse(raw_msg);
              connections.open_connection(msg, token, new Protocol(io));
          });
};

