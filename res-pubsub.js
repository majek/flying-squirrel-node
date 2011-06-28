var $ = require('jquery');
var utils = require('./utils');


var exchanges = {};

exports.connect_sub = function(rname, opts, do_send) {
    if (!(rname in exchanges)) {
        exchanges[rname] = {};
    }
    var rhandle = utils.random_string(128);
    exchanges[rname][rhandle] = do_send;
    return rhandle;
};
exports.disconnect_sub = function(rname, opts, rhandle) {
    delete exchanges[rname][rhandle];
};
exports.publish_sub = function(rname, opts, rhandle, msg) {};

exports.connect_pub = function(rname, opts, do_send) {};
exports.disconnect_pub = function(rname, opts, rhandle) {};
exports.publish_pub = function(rname, opts, rhandle, msg) {
    if (rname in exchanges) {
        $.each(exchanges[rname], function(rhandle, do_send){
                   do_send(msg);
               });
    }
};
