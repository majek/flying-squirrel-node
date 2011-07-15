var socketio = require('socket.io');  // socket.io 0.6
var url = require('url');
var http = require('http');
var sys = require('sys');
var events = require('events');

var connections = require('./connections');
var config = require('./protocols').config;
// Config must provide:
//   config.socketio.host
//   config.socketio.port
//   config.socketio.listenip (optional)

// Socket.io 0.6 doesn't handle multiple listeners. You can't listen
// to multiple resources at a time. Monkeypatch to fix it. Ugly.
// https://github.com/LearnBoost/socket.io/blob/06/lib/socket.io/listener.js#L68
var transports = ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart',
                 'xhr-polling', 'jsonp-polling'];
socketio.Listener.prototype.check = function(req, res, httpUpgrade, head){
    var parts, cn;
    var m = url.parse(req.url).pathname.match(/[/]([^/]*)(.*)/);
    // Let's save resource somewhere.
    req.connection.token = m[1];

    console.log(req.method, req.url, req.connection.token);

    if (req.connection.token) {
        parts = m[2].slice(1).split('/');
        if (this._serveClient(parts.join('/'), req, res)) return true;
        if (transports.indexOf(parts[0]) === -1) return false;
        if (parts[1]){
            cn = this.clients[parts[1]];
            if (cn){
                cn._onConnect(req, res);
            } else {
                req.connection.end();
                req.connection.destroy();
                this.options.log('Couldnt find client with session id "' + parts[1] + '"');
            }
        } else {
            this._onConnection(parts[0], req, res, httpUpgrade, head);
        }
        return true;
    }
    return false;
};


exports.register = function(protocol_list) {
    protocol_list['socket.io'] = {url: get_url};

    var server = http.createServer(
        function(req, res){
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Welcome to socket.io');
        });
    var io = socketio.listen(server);
    io.on('connection', on_connection);
    server.listen(config.socketio.port,
                  config.socketio.listenip || "0.0.0.0");
};

var get_url = function(token) {
    return ("http://" + config.socketio.host + ':' +
                        config.socketio.port + '/' + token);
};


function Protocol(io) {
    var that = this;
    this.io = io;
    this.token = io.request.connection.token;
    this.io.removeAllListeners('message');
    this.io.removeAllListeners('disconnect');

    this.io.on('message', function (raw_msg) {
                   that.emit('message', JSON.parse(raw_msg));
               });
    this.io.on('disconnect', function () {
                   console.log(' [-] Disonnection', that.token);
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

var on_connection = function(io) {
    if (io === null) {
        console.log("why io == null. ?");
        return;
    }
    var token = io.connection.token;
    console.log(' [+] Connection  ', token);
    io.on('message', function (raw_msg) {
              var msg = JSON.parse(raw_msg);
              connections.open_connection(msg, token,
                                          new Protocol(io));
          });
};

