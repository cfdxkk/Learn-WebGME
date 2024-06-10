'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

// Add/overwrite any additional settings here
// config.server.port = 8080;
config.mongo.uri = 'mongodb://root:123456@127.0.0.1:27017';
config.plugin.allowServerExecution = true
validateConfig(config);
module.exports = config;
