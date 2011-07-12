var http = require('http');
var url = require('url');
var events = require('events');
var sys = require('sys');

var $ = require('jquery');

var connections = require('./connections');
var utils = require('./utils');
var hooks = require('./proto-hooks');


function Connection(token, callback_url, key) {
    this.location = hooks.get_url(token) + '/' + utils.safe_md5(callback_url);
    this.queue = [];
    this.token = token;
    this.callback_url = callback_url;
    this.key = key;
    this.in_progress = false;
    this.on('disconnect', this._disconnect);
}
sys.inherits(Connection, events.EventEmitter);

Connection.prototype.send = function(msg) {
    // ugly hack
    if (msg.connect === 'ok') return;

    this.queue.push(JSON.stringify(msg));
    this._try_deliver();
};

Connection.prototype._try_deliver = function() {
    var that = this;
    if (this.in_progress === false && this.queue.length > 0) {
        this.in_progress = true;
        var msg = this.queue[0];
        var u = url.parse(this.callback_url);
        var opts = {
            method: 'POST',
            host: u.hostname,
            port: u.port,
            path: u.pathname + (u.search ? u.search : ''),
            headers: {'Content-length': msg.length}
        };
        if (this.x_hooks_key) {
            opts.headers['x-hooks-key'] = this.x_hooks_key;
        }
        var req = http.request(opts, function(a){that._req_success(a);});
        req.on('error', function(a,b){that._req_error(a,b);});
        console.log('_req_send:', msg);
        req.write(msg);
        req.end();
    };
};

Connection.prototype._req_success = function(req) {
    var that = this;
    console.log('_req_success', req.statusCode);
    if (req.statusCode === 200 || req.statusCode === 204) {
        // ok
        this.queue.shift();
        this.in_progress = false;
        this._try_deliver();
    } else if (req.statusCode === 404 || req.statusCode === 410) {
        // permanent failure
        this.emit('disconnect');
        return;
    } else {
        this.in_progress = true;
        this.tref = setTimeout(function(){that._on_timer();}, 500);
    }
};
Connection.prototype._req_error = function(req) {
    console.log('_req_error');
    this.in_progress = false;
    this._try_deliver();
};
Connection.prototype._on_timer = function() {
    this.in_progress = false;
    this._try_deliver();
}

Connection.prototype._disconnect = function() {
    delete collection[this.key];
    this.queue = [];
    this.callback_url = '';
    this.key = '';
};




var collection = {};

var app = exports.app = {};

app.new_connection = function(req, res, data) {
    if (!$.type(data) === "object" || !('connect' in data)
        || !('callback_url' in data)) {
        throw {status: 500,
               message: "'connect' and 'callback_url' fields expected."};
    }
    var ticket = data['connect'];
    var callback_url = data['callback_url'];

    var key = req.token + '/' + utils.safe_md5(callback_url);

    if (!(key in collection)) {
        var conn = new Connection(req.token, callback_url, key);
        connections.open_connection(data, req.token, conn);
        collection[key] = conn;
    }
    var conn = collection[key];
    conn.x_hooks_key = data['key'] || '';

    res.writeHead(201, {'Content-Type': 'text/plain',
                        'Location': conn.location});
    res.end('');
    return true;
};

app.find_conn = function(req, res, data) {
    var key = req.token + '/' + req.conn_url_md5;
    if (key in collection) {
        req.conn = collection[key];
        if (req.conn.x_hooks_key &&
            req.headers['x-hooks-key'] !== req.conn.x_hooks_key) {
            throw {status: 412,
                   message: "Unauthorized (invalid x-hooks-key)."};
        }
        return data;
    }
    throw {status: 404};
};

app.post_message = function(req, res, data) {
    if ($.type(data) !== "object") {
        throw {status: 500,
               message: "Valid json expected."};
    }
    req.conn.emit('message', data);

    res.writeHead(204, {'Content-Type': 'text/plain'});
    res.end('');
};

app.delete_connection = function(req, res) {
    var key = req.token + '/' + req.conn_url_md5;
    req.conn.emit('disconnect', true);

    res.writeHead(204, {'Content-Type': 'text/plain'});
    res.end('');
};