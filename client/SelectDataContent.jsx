// packages/data-exporter/client/SelectDataContent.jsx
//
// "Select Data" tab content for the Export page.
// Two-column layout: left column has patient card + resource checkboxes;
// right column shows selected resources summary.
// Adapted from merkalis SelectDataContent — no ViewerStoreContext, no merkle storage.

import React from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { useTracker } from 'meteor/react-meteor-data';
import { get } from 'lodash';

import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Alert
} from '@mui/material';

import ExportResourceAccordion from './ExportResourceAccordion.jsx';

export function SelectDataContent() {
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

  var cardSx = {
    bgcolor: isDark ? '#1e1e1e' : '#ffffff',
    color: isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)',
    '& .MuiCardHeader-title': { color: isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)' }
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var selectedPatient = useTracker(function() {
    return Session.get('selectedPatient');
  }, []);

  var exportSelectedIds = useTracker(function() {
    return Session.get('exportSelectedResourceIds') || {};
  }, []);

  var totalSelected = Object.keys(exportSelectedIds).length;

  // ---------------------------------------------------------------------------
  // Patient Card (optional, rendered via Meteor.PatientCard if available)
  // ---------------------------------------------------------------------------
  var patientCardElement = null;
  if (selectedPatient && Meteor.PatientCard) {
    var PatientCard = Meteor.PatientCard;
    patientCardElement = (
      <Box sx={{ mb: 2 }}>
        <PatientCard patient={selectedPatient} />
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box sx={{
      height: '100%',
      overflow: 'hidden',
      p: 2,
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      gap: 2
    }}>
      {/* Left column: patient card + resource checkboxes */}
      <Box sx={{
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Patient Card */}
        {patientCardElement}

        {/* Select Data Card */}
        <Card sx={cardSx}>
          <CardHeader title="Select Data to Export" />
          <CardContent sx={{ maxHeight: 500, overflow: 'auto' }}>
            <ExportResourceAccordion />
          </CardContent>
        </Card>
      </Box>

      {/* Right column: selection summary */}
      <Box sx={{
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <Card sx={cardSx}>
          <CardHeader title="Selection Summary" />
          <CardContent>
            {totalSelected > 0 ? (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  {totalSelected} resource{totalSelected !== 1 ? 's' : ''} selected for export.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Proceed to the File System tab to prepare and download your data.
                </Typography>
              </>
            ) : (
              <Alert severity="info">
                Use the checkboxes on the left to select which resources to include in your export.
                You can select individual resources or entire resource types.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default SelectDataContent;
