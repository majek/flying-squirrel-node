var $ = require('jquery');

var connections = require('./connections');
var config = require('./config');

var webjs = require('./webjs');
var hooks_conn = require('./proto-hooks-conn');


exports.register = function(protocol_list) {
    protocol_list['webhooks'] = {url: get_url};
};
var get_url = exports.get_url = function(token) {
    return ("http://" + config.hooks.host + ':' +
                        config.hooks.port + '/hooks/' + token);
};


var conns_path = [/[/]hooks[/]([^/]+)[/]?$/, 'token'];
var conn_path = [/[/]hooks[/]([^/]+)[/]([^/]+)[/]?$/, 'token', 'conn_url_md5'];

var dispatcher = [
    ['POST',   conns_path, ['expect_json', 'new_connection']],
    ['POST',   conn_path,  ['expect_json', 'find_conn', 'post_message']],
    ['DELETE', conn_path,  ['find_conn', 'delete_connection']]
];


var app = {};
$.extend(app, webjs.app);
$.extend(app, hooks_conn.app);

var handler = webjs.handler(app, dispatcher);

http.createServer(handler).listen(config.hooks.port,
                                  config.hooks.listenip || "0.0.0.0");
