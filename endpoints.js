var $ = require('jquery');
var utils = require('./utils');
var protocols = require('./protocols');

var endpoints = {};

function Endpoint(name, definition) {
    this.name = name;
    this.definition = definition;
    this.token = utils.random_string(128);
    this.key = utils.random_string(128);
    this.protocols = protocols.urls(this.token);
    endpoints[name] = this;
}

Endpoint.prototype = {
    serialize: function () {
        return {
            endpoint_name: this.name,
            key: this.key,
            definition: this.definition,
            protocols: this.protocols
        };
    },
    free: function () {
        delete endpoints[this.name];
    },
    validate_ticket: function(ticket) {
        return utils.validate_ticket(ticket, this.key);
    }
};

exports.get_endpoint_by_token = function(token) {
    var e = null;
    $.each(endpoints, function (_k, endpoint) {
               if (endpoint.token === token) {
                   e = endpoint;
                   return false;
               }
               return true;
           });
    return e;
};

var app = exports.app = {};
app.list_endpoints = function() {
    var r = [];
    $.each(endpoints, function (_i, e) {r.push( e );});
    return r;
};

app.find_endpoint = function(req, res, data) {
    if (req.endpoint_name in endpoints) {
        req.endpoint = endpoints[req.endpoint_name];
        return data;
    }
    throw {status:404};
}

app.get_endpoint = function(req) {
    return req.endpoint;
};

app.put_endpoint = function(req, res, data) {
    if (!$.type(data) === "object" || !('definition' in data)) {
        throw {status: 500,
               message: "Endpoint definition expected."};
    }
    var endpoint;
    if (req.endpoint_name in endpoints) {
        endpoint = endpoints[req.endpoint_name];
        // TODO: use a decent "equiv" method
        var a = JSON.stringify(endpoint.definition);
        var b = JSON.stringify(data.definition);
        if (a !== b) {
            throw {status: 409};
        }
    } else {
        endpoint = new Endpoint(req.endpoint_name, data.definition);
    }
    return endpoint;
};

app.delete_endpoint = function(req, res, data) {
    req.endpoint.free();
    return "ok";
};


app.expose_endpoint = function(req, res, data) {
    var o;
    if ($.type(data) === "array") {
        o = [];
        $.each(data, function (_i, e) {o.push( e.serialize() );});
    } else {
        o = data.serialize();
    }
    return this.expose_json(req, res, o);
};

// Prepare data
new Endpoint('test', {'recv':["sub", "a"]});
new Endpoint('asd', {'pub':["pub", "a"]});

