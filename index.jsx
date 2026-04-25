import React from 'react';

import CollectionManagement from './client/CollectionManagement';
import ExportPage from './client/ExportPage';
import ExportPageNew from './client/ExportPageNew';
import ExportPageLegacy from './client/ExportPageLegacy';

let DynamicRoutes = [{
  'name': 'Export',
  'path': '/export-data',
  'element': <ExportPageNew />
}, {
  'name': 'ExportLegacy',
  'path': '/export-data-legacy',
  'element': <ExportPageLegacy />
}];

let AdminSidebarElements = [{
  primaryText: "Data Export",
  to: "/export-data",
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
  ExportPageNew,
  ExportPageLegacy,

  CollectionManagement
};

