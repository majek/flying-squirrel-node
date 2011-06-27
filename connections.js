var endpoints = require('./endpoints');


function Connection(endpoint, proto) {
    this.endpoint = endpoint;
    this.proto = proto;
    this.proto.on('message', function(msg) {
                      console.log("conn got", msg);
                  });
    this.proto.on('disconnect', function() {
                      console.log("disconnect");
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