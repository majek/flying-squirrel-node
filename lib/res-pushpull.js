var $ = require('jquery');
var utils = require('./utils');

var queues = exports.queues = {};

var Queue = exports.Queue = function() {
    this.queue = [];
    this.push_handles = {};
    this.pull_keys = [];
    this.pull_handles = {};
};

Queue.prototype = {
    'push_handle_add': function(do_send) {
        var rhandle = utils.random_string(128);
        this.push_handles[rhandle] = do_send;
        return rhandle;
    },
    'push_handle_del': function(rhandle) {
        delete this.push_handles[rhandle];
        return this._is_unused();
    },
    'pull_handle_add': function(do_send_fun) {
        var that = this;
        var rhandle = utils.random_string(128);
        this.pull_handles[rhandle] = do_send_fun;
        this.pull_keys.push(rhandle);
        process.nextTick(function() {
                             that._try_deliver();
                         });
        return rhandle;
    },
    'pull_handle_del': function(rhandle) {
        delete this.pull_handles[rhandle];
        this.pull_keys = utils.array_skip(this.pull_keys, rhandle);
        return this._is_unused();
    },
    'push': function(msg) {
        this.queue.push(msg);
        this._try_deliver();
    },
    '_try_deliver': function() {
        while (this.queue.length > 0 && this.pull_keys.length > 0) {
            var msg = this.queue.shift();
            var rhandle = utils.array_rotate(this.pull_keys);
            this.pull_handles[rhandle](msg);
        }
    },
    '_is_unused': function() {
        if (utils.object_empty(this.push_handles) &&
            utils.object_empty(this.pull_handles)) {
            return true;
        }
        return false;
    }
};

Queue.connect_push = function(rname, opts, do_send) {
    if (!(rname in queues)) {
        queues[rname] = new Queue();
    }
    return queues[rname].push_handle_add(do_send);
};

Queue.disconnect_push = function(rname, opts, rhandle) {
    if (queues[rname].push_handle_del(rhandle) === true) {
        delete queues[rname];
    };
};

Queue.publish_push = function(rname, opts, rhandle, msg) {
    queues[rname].push(msg);
};

exports.connect_push = Queue.connect_push;
exports.disconnect_push = Queue.disconnect_push;
exports.publish_push = Queue.publish_push;

Queue.connect_pull = function(rname, opts, do_send) {
    if (!(rname in queues)) {
        queues[rname] = new Queue();
    }
    return queues[rname].pull_handle_add(do_send);
};
Queue.disconnect_pull = function(rname, opts, rhandle) {
    if (queues[rname].pull_handle_del(rhandle) === true) {
        delete queues[rname];
    };
};
Queue.publish_pull = function() {};

exports.connect_pull = Queue.connect_pull;
exports.disconnect_pull = Queue.disconnect_pull;
exports.publish_pull = Queue.publish_pull;
