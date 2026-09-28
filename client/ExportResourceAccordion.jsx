// packages/data-exporter/client/ExportResourceAccordion.jsx
//
// Accordion-based resource picker for the Export "Select Data" tab.
// Reads resources reactively from Minimongo collections, groups by resourceType,
// and provides checkboxes at both the group and individual resource level.
// Syncs selections to Session('toggleExportStates') for type-level compat
// and Session('exportSelectedResourceIds') for individual-level filtering.
// Adapted from merkalis ExportResourceAccordion — no merkle dependencies.

import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { useTracker } from 'meteor/react-meteor-data';
import { get } from 'lodash';

import {
  Box,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Checkbox,
  FormControlLabel,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon
} from '@mui/icons-material';

import { getResourceEmoji, getResourceSummary, getResourceAlertSeverity } from '../lib/resourceSummary.js';

function ExportResourceAccordion(props) {
  var isDark = props.isDark || false;
  var textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  // -------------------------------------------------------------------------
  // Reactive data: load all resources from Minimongo
  // -------------------------------------------------------------------------
  var allResources = useTracker(function() {
    Session.get('lastUpdated');
    var currentPatient = Session.get('selectedPatient');
    var patientMongoId = get(currentPatient, '_id');
    var resources = [];
    if (!Meteor.Collections) return resources;

    Object.keys(Meteor.Collections).forEach(function(pluralName) {
      var collection = Meteor.Collections[pluralName];
      if (collection && typeof collection.find === 'function') {
        try {
          var query = {};
          if (pluralName === 'Patients' && patientMongoId) {
            query = { _id: patientMongoId };
          }
          var records = collection.find(query).fetch();
          if (records.length > 0) {
            resources = resources.concat(records);
          }
        } catch (e) {
          // skip collections that error on find
        }
      }
    });
    return resources;
  }, []);

  // -------------------------------------------------------------------------
  // Grouping by resourceType
  // -------------------------------------------------------------------------
  var groups = {};
  var groupOrder = [];
  allResources.forEach(function(resource) {
    var type = get(resource, 'resourceType', 'Unknown');
    if (!type || type === 'Unknown') return;
    if (!groups[type]) {
      groups[type] = [];
      groupOrder.push(type);
    }
    groups[type].push(resource);
  });

  // -------------------------------------------------------------------------
  // Checkbox state: { [_id]: true }
  // -------------------------------------------------------------------------
  var checkedIdsState = useState({});
  var checkedIds = checkedIdsState[0];
  var setCheckedIds = checkedIdsState[1];

  // Track which accordions are expanded
  var expandedState = useState({});
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];

  // -------------------------------------------------------------------------
  // Sync selections to Session whenever checkedIds changes
  // -------------------------------------------------------------------------
  useEffect(function() {
    var toggleStates = {};
    groupOrder.forEach(function(type) {
      var items = groups[type];
      var checkedCount = 0;
      items.forEach(function(resource) {
        if (checkedIds[resource._id]) {
          checkedCount++;
        }
      });
      toggleStates[type] = checkedCount > 0;
    });

    Session.set('toggleExportStates', toggleStates);
    Session.set('exportSelectedResourceIds', checkedIds);
  }, [checkedIds, allResources.length]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  function handleToggleType(type) {
    var items = groups[type];
    if (!items) return;

    setCheckedIds(function(prev) {
      var next = Object.assign({}, prev);
      var allChecked = items.every(function(r) { return !!prev[r._id]; });

      if (allChecked) {
        items.forEach(function(r) { delete next[r._id]; });
      } else {
        items.forEach(function(r) { next[r._id] = true; });
      }
      return next;
    });
  }

  function handleToggleResource(resourceId) {
    setCheckedIds(function(prev) {
      var next = Object.assign({}, prev);
      if (prev[resourceId]) {
        delete next[resourceId];
      } else {
        next[resourceId] = true;
      }
      return next;
    });
  }

  function handleSelectAll() {
    setCheckedIds(function() {
      var next = {};
      allResources.forEach(function(r) {
        if (r._id) next[r._id] = true;
      });
      return next;
    });
  }

  function handleDeselectAll() {
    setCheckedIds({});
  }

  function toggleAccordion(type) {
    setExpanded(function(prev) {
      var next = Object.assign({}, prev);
      next[type] = !prev[type];
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Derived counts
  // -------------------------------------------------------------------------
  var totalChecked = Object.keys(checkedIds).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (groupOrder.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: textSecondary }}>
          No resources available. Import data first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Select / Deselect All toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ color: textSecondary }}>
          {totalChecked} of {allResources.length} resources selected
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            startIcon={<SelectAllIcon />}
            onClick={handleSelectAll}
            sx={{ textTransform: 'none', color: isDark ? 'rgba(255,255,255,0.7)' : undefined }}
          >
            All
          </Button>
          <Button
            size="small"
            startIcon={<DeselectIcon />}
            onClick={handleDeselectAll}
            sx={{ textTransform: 'none', color: isDark ? 'rgba(255,255,255,0.7)' : undefined }}
          >
            None
          </Button>
        </Box>
      </Box>

      {/* Accordions by resource type */}
      {groupOrder.map(function(type) {
        var items = groups[type];
        var emoji = getResourceEmoji(type);
        var severity = getResourceAlertSeverity(type);

        var checkedCount = 0;
        items.forEach(function(r) {
          if (checkedIds[r._id]) checkedCount++;
        });
        var allChecked = checkedCount === items.length;
        var someChecked = checkedCount > 0 && !allChecked;

        return (
          <Accordion
            key={type}
            expanded={expanded[type] || false}
            onChange={function() { toggleAccordion(type); }}
            disableGutters
            sx={{
              bgcolor: 'transparent',
              '&:before': { display: 'none' },
              boxShadow: 'none'
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : undefined }} />} sx={{ minHeight: 36, px: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  size="small"
                  onClick={function(e) { e.stopPropagation(); }}
                  onChange={function() { handleToggleType(type); }}
                  sx={{ p: 0.25, color: isDark ? 'rgba(255,255,255,0.7)' : undefined }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.87)' : undefined }}>
                  {emoji} {type}
                </Typography>
                <Chip
                  label={checkedCount + '/' + items.length}
                  size="small"
                  color={allChecked ? 'primary' : 'default'}
                  sx={{
                    height: 18,
                    fontSize: '0.7rem',
                    ...(isDark && !allChecked ? {
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.87)'
                    } : {})
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0.5 }}>
              {items.map(function(resource) {
                var summary = getResourceSummary(resource);
                var isChecked = !!checkedIds[resource._id];

                return (
                  <Alert
                    key={resource._id}
                    severity={severity}
                    icon={
                      <Checkbox
                        checked={isChecked}
                        size="small"
                        onChange={function() { handleToggleResource(resource._id); }}
                        sx={{ p: 0, color: isDark ? 'rgba(255,255,255,0.7)' : undefined }}
                      />
                    }
                    sx={{
                      mb: 0.5,
                      py: 0,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      opacity: isChecked ? 1 : 0.6,
                      '& .MuiAlert-message': { width: '100%', overflow: 'hidden' },
                      ...(isDark ? {
                        bgcolor: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.87)',
                        '& .MuiAlert-icon': { color: 'rgba(255,255,255,0.7)' },
                        '& .MuiChip-root': {
                          bgcolor: 'rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.87)'
                        }
                      } : {})
                    }}
                    onClick={function() { handleToggleResource(resource._id); }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                      <Chip
                        label={get(resource, 'resourceType', 'Unknown')}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', flexShrink: 0 }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          color: isDark ? 'rgba(255,255,255,0.87)' : undefined
                        }}
                      >
                        {summary}
                      </Typography>
                    </Box>
                  </Alert>
                );
              })}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

export { ExportResourceAccordion };
export default ExportResourceAccordion;
