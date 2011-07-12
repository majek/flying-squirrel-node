var $ = require('jquery');
var endpoints = require('./endpoints');
var resources = require('./resources');


function Connection(endpoint, proto, identity) {
    var that = this;
    this.endpoint = endpoint;
    this.proto = proto;
    this.channels = {};
    this.proto.on('message', function(msg) {
                      msg.identity = identity;
                      that.channels[msg.channel].inbound_message(msg);
                  });

    $.each(endpoint.definition, function (channel_name, opts) {
               opts = opts.slice(0);
               var rtype = opts.shift();
               var rname = opts.shift();
               var rhandle = resources['connect_' + rtype](
                   rname, opts, function(msg) {
                       msg.channel = channel_name;
                       that.proto.send(msg);
                   });
               that.channels[channel_name] = {
                   'destruct': function() {
                       resources['disconnect_' + rtype](rname, opts, rhandle);
                   },
                   'inbound_message': function(msg) {
                       resources['publish_' + rtype](rname, opts, rhandle, msg);
                   }
               };
           });
    this.proto.on('disconnect', function() {
                      $.each(that.channels, function (channel_name, ch) {
                                 ch.destruct();
                             });
                      that.channels = {};
                  });
};

exports.open_connection = function(msg, token, proto) {
    // TODO: handle framing errors
    var ticket = msg.connect;
    var endpoint = endpoints.get_endpoint_by_token(token);
    var identity = endpoint.validate_ticket(ticket);
    if (identity !== false) {
        proto.send({connect: 'ok'});
        new Connection(endpoint, proto, identity);
        return;
    } else {
        proto.send({error: "ticket invalid"});
        proto.disconnect();
        return;
    }
};
