var hue = require('./src/api.js');
var fs = require('fs');

var cribMq = require('../crib-mq');
var buss = cribMq.register('crib-hue-test');

hue.init(buss);
//
var cribLog = require('../crib-log/src/api');
var log = cribLog.createLogger('crib-hue-test','debug');


hue.recallScene('KnutAway on 0');