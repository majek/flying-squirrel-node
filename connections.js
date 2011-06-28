var $ = require('jquery');
var endpoints = require('./endpoints');
var resources = require('./resources');


function Connection(endpoint, proto) {
    var that = this;
    this.endpoint = endpoint;
    this.proto = proto;
    this.channels = {};
    this.proto.on('message', function(msg) {
                      that.channels[msg.channel].inbound_message(msg);
                  });

    console.log("connect");
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
                      console.log("disconnect");
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
    if (endpoint.validate_ticket(ticket)) {
        proto.send({connect: 'ok'});
        new Connection(endpoint, proto);
        return;
    } else {
        proto.send({error: "ticket invalid"});
        proto.disconnect();
        return;
    }
};
