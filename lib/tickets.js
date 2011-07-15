var $ = require('jquery');
var utils = require('./utils');

var app = exports.app = {};
app.post_ticket = function(req, res, data) {
    if (!$.type(data) === "object") {
        throw {status: 500,
               message: "JSON object expected."};
    }
    var timeout = 'timeout' in data ? Number(data.timeout) : 60*60*2;

    return {ticket: utils.create_ticket(timeout,
                                        data.identity,
                                        req.endpoint.key)};
};


