// packages/data-exporter/client/ExportPageNew.jsx
//
// Tabbed Data Export page with 2 tabs: Current Patient and Clinical Scenario.
// Tabs are always visible regardless of patient selection.
// Adapted from merkalis ExportPageNew — stripped of merkle tabs.

import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { useTracker } from 'meteor/react-meteor-data';
// useSearchParams replaced with Meteor.useLocation + Meteor.useNavigate
// (Atmosphere packages get a separate react-router-dom bundle without Router context)
import {
  Box,
  Typography,
  Tabs,
  Tab
} from '@mui/material';
import {
  CloudDownload as ExportIcon
} from '@mui/icons-material';

import { FileSystemContent } from './FileSystemContent.jsx';
import { ClinicalScenarioContent } from './ClinicalScenarioContent.jsx';

// =============================================================================
// CONSTANTS
// =============================================================================

var TAB_SLUGS = ['current-patient', 'clinical-scenario'];

// =============================================================================
// TAB PANEL
// =============================================================================

function TabPanel(props) {
  var children = props.children;
  var value = props.value;
  var index = props.index;

  if (value !== index) {
    return null;
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {children}
    </Box>
  );
}

// =============================================================================
// EXPORT PAGE
// =============================================================================

function ExportPageNew() {
  var selectedPatient = useTracker(function() {
    return Session.get('selectedPatient');
  }, []);

  var useLocation = Meteor.useLocation;
  var useNavigate = Meteor.useNavigate;
  var location = useLocation ? useLocation() : { search: '' };
  var navigate = useNavigate ? useNavigate() : function() {};

  // Use local state as primary tab-switching mechanism (guaranteed re-render).
  // URL sync is secondary — Meteor.useLocation may not re-render in Atmosphere packages.
  var tabState = useState(function() {
    var sp = new URLSearchParams(location.search);
    var slug = sp.get('tab') || 'current-patient';
    var idx = TAB_SLUGS.indexOf(slug);
    return idx === -1 ? 0 : idx;
  });
  var selectedTab = tabState[0];
  var setSelectedTab = tabState[1];

  // Detect dark mode from app theme
  var isDark = false;
  var useAppTheme;
  if (typeof Meteor !== 'undefined' && Meteor.useTheme) {
    useAppTheme = Meteor.useTheme;
  }
  if (useAppTheme) {
    var appTheme = useAppTheme();
    isDark = appTheme.theme === 'dark';
  }

  var pageBgColor = isDark ? '#121212' : '#f6f6f6';
  var cardTextColor = isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)';
  var dividerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  function handleTabChange(event, newValue) {
    setSelectedTab(newValue);
    navigate('?tab=' + TAB_SLUGS[newValue], { replace: true });
  }

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: pageBgColor,
      color: cardTextColor,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 3,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: dividerColor,
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ExportIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Data Export
          </Typography>
        </Box>
      </Box>

      {/* Tabs — always visible */}
      <Box sx={{
        borderBottom: '1px solid',
        borderColor: dividerColor,
        flexShrink: 0,
        px: 2,
        '& .MuiTab-root': { color: cardTextColor },
        '& .MuiTab-root.Mui-selected': { color: 'primary.main' }
      }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Current Patient" />
          <Tab label="Clinical Scenario" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={selectedTab} index={0}>
        {!selectedPatient ? (
          Meteor.NoPatientSelectedCard ? (
            <Meteor.NoPatientSelectedCard />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No patient selected. Please select a patient from the sidebar.
              </Typography>
            </Box>
          )
        ) : (
          <FileSystemContent />
        )}
      </TabPanel>

      <TabPanel value={selectedTab} index={1}>
        <ClinicalScenarioContent />
      </TabPanel>
    </Box>
  );
}

export { ExportPageNew };
export default ExportPageNew;
