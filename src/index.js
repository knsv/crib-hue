/**
 * Created by knut on 2016-04-17.
 */
var cribMq = require('../../crib-mq');
var storage = require('../../crib-storage/src/api');
var cribLog = require('../../crib-log/src/api');
var log = cribLog.createLogger('crib-hue','debug');

const _ = require('lodash');

var buss = cribMq.register('crib-hue');

storage.init(buss);
var db = {};

var hue = require('node-hue-api');
var Q = require('q');
var fs = require('fs');

var displayResults = function(result) {
    console.log(JSON.stringify(result, null, 2));
};
// --------------------------
// Using a promise
var init = function(){
    var deferred = Q.defer();
    lightState = hue.lightState;
    hue.nupnpSearch().then(function(bridge){
        var hostname = bridge[0].ipaddress;
        //var hostname = '192.168.2.126';
        var username = process.env.CRIB_HUE_USERNAME;

        api = new hue.HueApi(hostname, username);

        deferred.resolve();

    }).done();

    return deferred.promise;
};


var initCheck = function(fun){
    if(typeof api === 'undefined'){
        var deferred = Q.defer();

        init().then(function(){
            log.info('Initialized hue bridge connection');
            fun().then(function(r){
                deferred.resolve(r);
            });
        });

        return deferred.promise;
    }
    else{
        return fun();
    }
};

const recallScene = function(name){
    return initCheck(function(){
        var deferred = Q.defer();
        var scenesRead = deferred.promise;


        var storeScenes = function(result) {
            var sceneDb = {
                oldIds : [],
                scenes : {
                    // name:id
                }
            };
            var deferred = Q.defer();

            // Check file
            storage.get('scenes').then((scenes) => {

                let scenesDb = scenes;
                if(!scenesDb){
                    log.info('Found no existing scenes.json file during recall attempt');
                    // create empty object
                    sceneDb = {
                        oldIds : [],
                        scenes : {
                            // name:id
                        }
                    };
                }else{
                    if(_.isEmpty(scenes)){
                        log.info('Found no existing scenes.json file during recall attempt');
                        // create empty object
                        sceneDb = {
                            oldIds : [],
                            scenes : {
                                // name:id
                            }
                        };
                    }
                }

                log.trace('This is scenes db: ',scenesDb);

                var keys = Object.keys(result.scenes);

                try {
                    keys.forEach(function(id){
                        var scene = result.scenes[id];
                        log.trace('Scene id = ',id);
                        log.trace(scene.name,' ', id, scene.lights);
                        if(scenesDb.oldIds.indexOf(id)<0){
                            // New scene encountered
                            scenesDb.scenes[scene.name] = id;
                            scenesDb.oldIds.push(id);
                        }

                    });
                }
                catch(ex){
                    log.error(ex);
                    log.error(ex);
                }

                // The scenesDb is updated
                storage.set('scenes',scenesDb);
                deferred.resolve(scenesDb);
            });

            return deferred.promise;
        };

        const recallScene = (scenesDb) => {

            log.info('Recalling ',name,' with id ',scenesDb.scenes[name]);

            api.activateScene(scenesDb.scenes[name])
                .then(displayResults)
                .done();
        };

        api.getFullState()
            .then(storeScenes)
            .then(recallScene)
            .done();

    });

};

buss.on('HUE_RECALL',function(data){
    log.info('Recalling scene ',data);
    recallScene(data[0]);
});

module.exports = function (config) {

};

