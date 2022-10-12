Package.describe({
  name: 'symptomatic:data-relay',
  version: '0.10.0',
  summary: 'Data Relay',
  git: 'http://github.com/symptomatic/data-relay',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4');

  api.use('meteor@1.9.3');
  api.use('webapp@1.10.0');
  api.use('ddp@1.4.0');
  api.use('livedata@1.0.18');
  api.use('es5-shim@4.8.0');
  api.use('ecmascript@0.15.0');

  api.use('react-meteor-data@2.1.2');
  api.use('session');

  api.use('clinical:hl7-resource-datatypes');
  api.use('clinical:hl7-fhir-data-infrastructure');

  api.addFiles('server/methods.proxy.js', ['server']);

  api.export('CollectionManagement')

  api.mainModule('index.jsx', 'client');
});


// Npm.depends({
//   "gofsh": "1.3.1"
// });
