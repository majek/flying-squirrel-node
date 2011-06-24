var crypto = require('crypto');
var $ = require('jquery');
var utils = require('./utils');

var app = exports.app = {};
app.post_ticket = function(req, res, data) {
    if (!$.type(data) === "object") {
        throw {status: 500,
               message: "JSON object expected."};
    }
    var timeout = 'timeout' in data ? Number(data.timeout) : 60*60*2;
    var identity = data.identity;

    var expiry = Math.floor((new Date()).getTime() / 1000.0 + timeout);
    if (expiry > Math.pow(2, 32) - 1) {
        expiry = Math.pow(2, 32) - 1;
    }
    var	buf = new Buffer(256);
    write_uint32(buf, expiry, 0, 'big');
    var len = 4 + buf.write(identity, 4);

    var data1 = buf.slice(0, len);
    var data2 = sha_mac(req.endpoint.key, data1);
    var ticket = safe_encode(buf_concat(data2, data1));
    return {ticket: ticket, v:validate_ticket(ticket, req.endpoint.key)};
};


function validate_ticket(ticket, key) {
    var bin = safe_decode(ticket);
    var data2 = bin.slice(0, 20);
    var data1 = bin.slice(20);
    // Node can't compare buffers.
    if (data2.toString('base64') === sha_mac(key, data1).toString('base64')) {
        var now = Math.floor((new Date()).getTime() / 1000.0);
        var expiry = read_uint32(data1, 0, 'big');
        if (expiry > now) {
            var identity = data1.slice(4);
            return identity.toString();
        }
        return false;
    }
    return false;
}

function sha_mac(key, data) {
    return new Buffer(crypto.createHmac('sha1', key).update(data).digest('base64'), 'base64');
}

function buf_concat(a,b) {
    var c = new Buffer(a.length + b.length);
    a.copy(c);
    b.copy(c, a.length);
    return c;
}

function write_uint32(buffer, value, offset, endian) {
    if (endian == 'big') {
        buffer[offset] = (value >>> 24) & 0xff;
        buffer[offset + 1] = (value >>> 16) & 0xff;
        buffer[offset + 2] = (value >>> 8) & 0xff;
        buffer[offset + 3] = value & 0xff;
    } else {
        buffer[offset + 3] = (value >>> 24) & 0xff;
        buffer[offset + 2] = (value >>> 16) & 0xff;
        buffer[offset + 1] = (value >>> 8) & 0xff;
        buffer[offset] = value & 0xff;
    }
}

function read_uint32(buffer, offset, endian) {
    var val = 0;
    if (endian == 'big') {
        val = buffer[offset + 1] << 16;
        val |= buffer[offset + 2] << 8;
        val |= buffer[offset + 3];
        val = val + (buffer[offset] << 24 >>> 0);
    } else {
        val = buffer[offset + 2] << 16;
        val |= buffer[offset + 1] << 8;
        val |= buffer[offset];
        val = val + (buffer[offset + 3] << 24 >>> 0);
    }
    return val;
}

function safe_encode(bin) {
    var b = (new Buffer(bin)).toString('base64');
    b.replace('/', '-');
    b.replace('+', '_');
    return b;
}

function safe_decode(str) {
    var b = str.slice(0);
    b.replace('-', '/');
    b.replace('_', '+');
    return new Buffer(b, "base64");
}
