import React from 'react';

import CollectionManagement from './client/CollectionManagement';
import ExportPage from './client/ExportPage';

let DynamicRoutes = [{
  'name': 'Export',
  'path': '/export-data',
  'element': <ExportPage />
}];

let AdminSidebarElements = [{
  primaryText: "Data Export",
  to: "/export-data",
  iconName: "fire" ,
  excludeDevice: ['iPhone', 'iPad'],
  requireAuth: true
}, {
  primaryText: "Data Export",
  to: "/data-export",
  iconName: "fire" ,
  excludeDevice: ['iPhone', 'iPad'],
  requireAuth: true
}];


let AdminDynamicRoutes = DynamicRoutes;

export { 
  DynamicRoutes, 
  AdminDynamicRoutes,
  AdminSidebarElements,

  ExportPage,

  CollectionManagement
};

