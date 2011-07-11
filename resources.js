var $ = require('jquery');

var pubsub = require('./res-pubsub');
var pushpull = require('./res-pushpull');
var reqrep = require('./res-reqrep');

$.extend(exports, pubsub, pushpull, reqrep);
