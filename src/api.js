// We need this to build our post string
let Q = require('q');
let buss = undefined;
var cribLog = require('../../crib-log/src/api');
const log = cribLog.createLogger('crib-hue','debug');

exports.init = (_buss) => {
    log.info('Initializing buss');
    buss = _buss;
};

exports.recallScene = function(scene){
    log.info('Recall scene called by client buss for scene: ',scene);

    buss.emit('HUE_RECALL', [scene]);
};
