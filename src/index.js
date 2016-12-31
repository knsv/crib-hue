/**
 * Created by knut on 2016-04-17.
 */
var cribMq = require('../../crib-mq');
var storage = require('../../crib-storage/src/api');
var cribLog = require('../../crib-log/src/api');
var log = cribLog.createLogger('crib-hue', 'debug');

const _ = require('lodash');
var lightsDb = {};
const buss = cribMq.register('crib-hue');

storage.init(buss);

var hue = require('node-hue-api');
var Q = require('q');
let api;

var displayResults = function(result) {
  console.log(JSON.stringify(result, null, 2));
};
// --------------------------
// Using a promise
var init = function() {
  var deferred = Q.defer();
  hue.nupnpSearch().then(function(bridge) {
    var hostname = bridge[0].ipaddress;
    //var hostname = '192.168.2.126';
    var username = process.env.CRIB_HUE_USERNAME;

    api = new hue.HueApi(hostname, username);
    // Using a promise
    api.lights()
      .then((lights) => {
        lights.lights.forEach((light) => {
          console.log('Light name', light.name);
          lightsDb[light.name] = light;
        });
      });
    deferred.resolve();

  }).done();

  return deferred.promise;
};

var initCheck = function(fun) {
  if (typeof api === 'undefined') {
    var deferred = Q.defer();

    init().then(function() {
      log.info('Initialized hue bridge connection');
      fun().then(function(r) {
        deferred.resolve(r);
      });
    });

    return deferred.promise;
  } else {
    return fun();
  }
};

const recallScene = function(name) {
  return initCheck(function() {
    var storeScenes = function(result) {
      var deferred = Q.defer();

      // Check file
      storage.get('scenes').then((scenes) => {

        let scenesDb = scenes;
        if (!scenesDb) {
          log.info('Found no existing scenes.json file during recall attempt');
          // create empty object
          scenesDb = {
            oldIds: [],
            scenes: {
              // name:id
            }
          };
        } else {
          if (_.isEmpty(scenes)) {
            log.info('Found no existing scenes.json file during recall attempt');
            // create empty object
            scenesDb = {
              oldIds: [],
              scenes: {
                // name:id
              }
            };
          }
        }

        log.trace('This is scenes db: ', scenesDb);

        var keys = Object.keys(result.scenes);

        try {
          keys.forEach(function(id) {
            var scene = result.scenes[id];
            log.trace('Scene id = ', id);
            log.trace(scene.name, ' ', id, scene.lights);
            if (scenesDb.oldIds.indexOf(id) < 0) {
              // New scene encountered
              scenesDb.scenes[scene.name] = id;
              scenesDb.oldIds.push(id);
            }

          });
        } catch (ex) {
          log.error(ex);
          log.error(ex);
        }

        // The scenesDb is updated
        storage.set('scenes', scenesDb);
        deferred.resolve(scenesDb);
      });

      return deferred.promise;
    };

    const recallScene = (scenesDb) => {

      log.info('Recalling ', name, ' with id ', scenesDb.scenes[name]);

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

const setLight = (lightName, r, g, b, br) => {
  initCheck(function() {
    const lightState = hue.lightState;
    const lamp = lightsDb[lightName];

    //const state = lightState.create().on().rgb(255,222,76).brightness(20);
    if(br < 1){
      const state = lightState.create().on(false);
      api.setLightState(lamp.id, state);
    }else{
      const state = lightState.create().on().rgb(r, g, b).brightness(br);
      api.setLightState(lamp.id, state);      
    }
  });
};

buss.on('HUE_RECALL', function(data) {
  log.info('Recalling scene ', data);
  recallScene(data[0]);
});

buss.on('HUE_SET_LIGHT', function(data) {
  log.info('Recalling scene ', data);
  setLight(data[0], data[1], data[2], data[3], data[4]);
});

module.exports = function(config) {

};

initCheck();