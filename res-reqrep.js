var $ = require('jquery');
var utils = require('./utils');

var pushpull = require('./res-pushpull.js');
var Queue = pushpull.Queue;

exports.connect_req = Queue.connect_push;
exports.disconnect_req = Queue.disconnect_push;
exports.publish_req = function(rname, opts, rhandle, msg) {
    msg['reply-to'] = rhandle;
    return Queue.publish_push(rname, opts, rhandle, msg);
};

exports.connect_rep = Queue.connect_pull;
exports.disconnect_rep = Queue.disconnect_pull;
exports.publish_rep = function(rname, opts, rhandle, msg) {
    if ('reply-to' in msg) {
        var thandle = msg['reply-to'];
        if (thandle in pushpull.queues[rname].push_handles) {
            pushpull.queues[rname].push_handles[thandle](msg);
        }
    }
};
