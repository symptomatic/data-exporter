// npmPackages/data-exporter/client.js
//
// Client entry — data / medical-records exporter (collection export, FHIR bundle
// export, de-identification). Migrated from packages/data-exporter (Atmosphere
// clinical:data-exporter) 2026-06-13. The Atmosphere client mainModule was
// index.jsx; this consolidates into a self-contained entry that builds the
// route/sidebar from workflow.json and re-exports the public surface.
//
// LEGACY UI DROPPED: the package shipped a modern ExportPageNew (/export-data) and
// a legacy ExportPageLegacy (/export-data-legacy). The legacy page pulls in
// ExportComponent.jsx, which imports @material-ui (MUI v4) + material-ui/svg-icons
// (MUI v0.x) — neither is installed and porting is out of scope. Only the modern
// ExportPageNew is routed/exported here; the legacy files are kept for reference
// but unbundled.

import React from 'react';
import ExportPageNew from './client/ExportPageNew';
import CollectionManagement from './client/CollectionManagement';
import workflowConfig from './workflow.json';

const DynamicRoutes = workflowConfig.routes.map(function(route) {
  let element = null;
  if (route.component === 'ExportPageNew') {
    element = <ExportPageNew />;
  } else {
    console.warn('[data-exporter] Unknown component in workflow.json: ' + route.component);
  }
  return { name: route.name, path: route.path, element: element, requireAuth: route.requireAuth || false };
});

// data-exporter is an admin tool — kept as AdminDynamicRoutes alias too.
const AdminDynamicRoutes = DynamicRoutes;

const AdminSidebarElements = [{
  primaryText: 'Data Export',
  to: '/export-data',
  iconName: 'Whatshot',
  excludeDevice: ['iPhone', 'iPad'],
  requireAuth: true
}];

export {
  DynamicRoutes,
  AdminDynamicRoutes,
  AdminSidebarElements,
  ExportPageNew,
  CollectionManagement
};

export default {
  name: workflowConfig.name,
  routes: DynamicRoutes,
  sidebarItems: AdminSidebarElements
};
