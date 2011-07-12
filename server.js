var http = require('http');
var $ = require('jquery');

require('./protocols').start();

var webjs = require('./webjs');
var endpoints = require('./endpoints');
var tickets = require('./tickets');

var config = require('./config');
// Config must provide:
//   config.server.port
//   config.server.listenip (optional)

var endpoint_path = [/[/]endpoints[/]([^/]+)[/]?$/, 'endpoint_name'];
var ticket_path   = [/[/]endpoints[/]([^/]+)[/]tickets[/]?$/, 'endpoint_name'];

var dispatcher = [
    ['GET',  /[/]endpoints[/]?$/, ['list_endpoints', 'expose_endpoint']],
    ['PUT',    endpoint_path, ['expect_json', 'put_endpoint', 'expose_endpoint']],
    ['GET',    endpoint_path, ['find_endpoint', 'get_endpoint', 'expose_endpoint']],
    ['DELETE', endpoint_path, ['find_endpoint', 'delete_endpoint', 'expose_json']],
    ['POST',   ticket_path,   ['expect_json', 'find_endpoint', 'post_ticket', 'expose_json']]
];

var app = {};
$.extend(app, webjs.app);
$.extend(app, endpoints.app);
$.extend(app, tickets.app);

var handler = webjs.handler(app, dispatcher);

http.createServer(handler).listen(config.server.port,
                                  config.server.listenip || "0.0.0.0");
