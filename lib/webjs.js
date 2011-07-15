var url = require('url');
var $ = require('jquery');


var app = exports.app = {};

app.expose_json = function(req, res, content) {
    var headers = {'Content-Type': 'application/json'};
    res.writeHead(200, headers);
    res.end(JSON.stringify(content, null, 4) + '\n');
};

app.handle_404 = function(req, res) {
    res.writeHead(404, {});
    res.end("404 - Not Found");
};

app.handle_405 = function(req, res, methods) {
    res.writeHead(405, {'Allow': methods.join(', ')});
    res.end("405 - Method Not Alloweds");
};

app.handle_error = function(req, res, x) {
    if ('status' in x) {
        res.writeHead(x.status, {});
        res.end("" + x.status + " " + x.message);
    } else {
        res.writeHead(500, {});
        res.end("500 - Internal Server Error");
        console.log('Caught error on "'+ req.method + ' ' + req.href +
                    '" in filter "' + req.fun +'":\n' + x.stack);
    }
};

app.expect = function(req, res, _data, next_filter) {
    var data = [];
    req.on('data', function(d) {
               data.push(d);
           });
    req.on('end', function() {
               next_filter(data.join(''));
           });
    throw {status:0};
};

app.expect_json = function(req, res, _data, next_filter) {
    app.expect(req, res, _data, function (v) {
                   try {
                       // Verify content-type?
                       next_filter(JSON.parse(v));
                   } catch (x) {
                       app.handle_error(req, res, x);
                   }
               });
}

function execute_request(req, res, v)
{
    try {
        while (req.funs.length > 0) {
            req.fun = req.funs.shift();
            v = req.app[req.fun](req, res, v, req.next_filter);
        }
    } catch (x) {
        if ('status' in x) {
            if (x.status === 0) {
                // Special case, break. It's the previous filter
                // responsibility to call 'next_filter' to continue.
            } else if ('handle_' + x.status in app) {
                app['handle_' + x.status](req, res, x);
            } else {
                app.handle_error(req, res, x);
            }
        } else {
            app.handle_error(req, res, x);
        }
    }
}

exports.handler = function(app, dispatcher) {
    return function(req, res) {
        $.extend(req, url.parse(req.url));
        var found = false;
        var allowed_methods = [];
        $.each(dispatcher, function (_i, row) {
                   var method = row[0], path = row[1], funs = row[2];
                   if ($.type(path) !== "array") {
                       path = [path];
                   }
                   var m = req.pathname.match(path[0]);
                   if (!m) {
                       return true;
                   }
                   if (req.method != method) {
                       allowed_methods.push(method);
                       return true;
                   }
                   found = true;
                   var i;
                   for(i=1; i < path.length; i++) {
                       req[path[i]] = m[i];
                   }
                   req.app = app;
                   req.funs = funs.slice(0);
                   req.next_filter = function(v) {execute_request(req, res, v);};
                   req.next_filter(undefined);
                   return false;
               });
        if (!found) {
            if (allowed_methods.length === 0) {
                app.handle_404(req, res);
            } else {
                app.handle_405(req, res, allowed_methods);
            }
        }
    };
};
