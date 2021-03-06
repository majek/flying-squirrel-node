var $ = require('jquery');

var protocol_modules = ['./proto-socketio', './proto-hooks'];
var protocol_list = {};

exports.start = function(config) {
    exports.config = config;
    $.map(protocol_modules, function (protocol_module) {
              require(protocol_module).register(protocol_list);
          });
};

exports.urls = function(token) {
    var urls = {};
    $.each(protocol_list, function (name, proto) {
                     urls[name] = proto.url(token);
                 });
    return urls;
};
