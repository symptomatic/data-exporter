// npmPackages/data-exporter/server/index.js
//
// Server entry — the Atmosphere package's only server file was
// api.addFiles('server/methods.proxy.js','server') (an HTTP proxy for export
// operations). methods.proxy.js is self-contained (Meteor/check/HTTP/lodash).

import './methods.proxy.js';
