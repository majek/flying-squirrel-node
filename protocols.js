var $ = require('jquery');

var protocol_modules = ['./dummy'];

var protocols = $.map(protocol_modules, function (protocol_module) {
                          return require(protocol_module);
                      });

exports.start = function() {
    $.map(protocols, function (protocol) {
              protocol.start();
          });
};

exports.urls = function(token) {
    return $.map(protocols, function (protocol) {
                     return protocol.url(token);
                 });
};
