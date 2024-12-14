Package.describe({
  name: 'symptomatic:data-relay',
  version: '0.12.2',
  summary: 'Data Relay',
  git: 'http://github.com/symptomatic/data-relay',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('3.0');

  api.use('meteor');
  api.use('webapp');
  api.use('ecmascript');
  api.use('session');
  api.use('mongo');    
  api.use('react-meteor-data@3.0.1');
  api.use('http@1.0.1');    

  api.use('clinical:hl7-resource-datatypes@4.0.7');

  api.addFiles('server/methods.proxy.js', ['server']);

  api.export('CollectionManagement')

  api.mainModule('index.jsx', 'client');
});

// Npm.depends({
//   "xml2js": "0.4.23",
//   "papaparse": "5.4.1"
// });

