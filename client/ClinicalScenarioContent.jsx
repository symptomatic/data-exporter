// packages/data-exporter/client/ClinicalScenarioContent.jsx
//
// "Clinical Scenario" tab content for the Export page.
// Two-column layout: left column has collection picker + grouped resource list;
// right column shows resource preview via DynamicFhirViews or AceEditor.
// Adapted from data-importer FileDropTab EmptyStatePanel — standalone, no ImportStoreContext.

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Meteor } from 'meteor/meteor';
import { get } from 'lodash';

import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Autocomplete,
  TextField,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  Badge,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Storage as CollectionIcon,
  CloudDownload as LoadIcon,
  Visibility as ShowAllIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  ViewList as AccordionIcon,
  Code as RawIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
  DeleteSweep as ClearIcon
} from '@mui/icons-material';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';

// =============================================================================
// CONSTANTS
// =============================================================================

var COMMON_TYPES = [
  'Patient', 'Observation', 'Condition', 'Procedure', 'Encounter',
  'MedicationRequest', 'AllergyIntolerance', 'Immunization', 'CarePlan',
  'Goal', 'DiagnosticReport', 'DocumentReference', 'Organization',
  'Practitioner', 'Medication', 'Device', 'Consent', 'CareTeam',
  'ServiceRequest', 'Questionnaire', 'QuestionnaireResponse'
];

// =============================================================================
// RESOURCE SUMMARY HELPERS (inlined to avoid cross-package dependency)
// =============================================================================

function getResourceEmoji(resourceType) {
  var emojiMap = {
    'Patient': '\u{1F464}',
    'Observation': '\u{1F52C}',
    'Condition': '\u{1F3E5}',
    'Procedure': '\u2695\uFE0F',
    'Encounter': '\u{1F3E8}',
    'MedicationRequest': '\u{1F48A}',
    'AllergyIntolerance': '\u26A0\uFE0F',
    'Immunization': '\u{1F489}',
    'CarePlan': '\u{1F4CB}',
    'Goal': '\u{1F3AF}',
    'DiagnosticReport': '\u{1F4CA}',
    'DocumentReference': '\u{1F4C4}',
    'Organization': '\u{1F3E2}',
    'Practitioner': '\u{1F9D1}\u200D\u2695\uFE0F',
    'Medication': '\u{1F48A}',
    'OperationOutcome': '\u{1F6A8}',
    'Bundle': '\u{1F4E6}'
  };
  return emojiMap[resourceType] || '\u{1F4CC}';
}

function getResourceSummary(resource) {
  if (!resource) return '';
  var resourceType = get(resource, 'resourceType', '');
  if (resourceType === 'Patient') {
    var given = get(resource, 'name.0.given.0', '');
    var family = get(resource, 'name.0.family', '');
    if (given || family) return (given + ' ' + family).trim();
  }
  var codeText = get(resource, 'code.text', '');
  if (codeText) return codeText.length > 40 ? codeText.substring(0, 37) + '...' : codeText;
  var codingDisplay = get(resource, 'code.coding.0.display', '');
  if (codingDisplay) return codingDisplay.length > 40 ? codingDisplay.substring(0, 37) + '...' : codingDisplay;
  if (resource.summary) return resource.summary.length > 40 ? resource.summary.substring(0, 37) + '...' : resource.summary;
  var id = get(resource, 'id', '');
  if (id) return id.length > 12 ? id.substring(0, 12) + '...' : id;
  return '';
}

function getResourceAlertSeverity(resourceType) {
  switch (resourceType) {
    case 'Patient': return 'success';
    case 'AllergyIntolerance': return 'warning';
    case 'OperationOutcome': return 'error';
    default: return 'info';
  }
}

// =============================================================================
// RESOURCE LIST ACCORDION (self-contained, no ImportStoreContext)
// =============================================================================

var ScenarioResourceAccordion = forwardRef(function ScenarioResourceAccordion(props, ref) {
  var resources = props.resources || [];
  var selectedIndex = props.selectedIndex;
  var onSelectResource = props.onSelectResource;
  var isDark = props.isDark;

  var textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  var cardTextColor = isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)';

  var alertDarkBg = {
    success: isDark ? 'rgba(46, 125, 50, 0.15)' : undefined,
    info: isDark ? 'rgba(33, 150, 243, 0.15)' : undefined,
    warning: isDark ? 'rgba(237, 108, 2, 0.15)' : undefined,
    error: isDark ? 'rgba(211, 47, 47, 0.15)' : undefined
  };
  var alertDarkIcon = {
    success: isDark ? '#66bb6a' : undefined,
    info: isDark ? '#90caf9' : undefined,
    warning: isDark ? '#ff9800' : undefined,
    error: isDark ? '#f44336' : undefined
  };

  // Group resources by resourceType
  var groups = {};
  var groupOrder = [];
  resources.forEach(function(resource, idx) {
    var type = get(resource, 'resourceType', 'Unknown');
    if (!groups[type]) {
      groups[type] = [];
      groupOrder.push(type);
    }
    groups[type].push({ resource: resource, originalIndex: idx });
  });

  var initialExpanded = {};
  groupOrder.forEach(function(type) { initialExpanded[type] = true; });
  var expandedState = useState(initialExpanded);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];

  var entryExpandedState = useState({});
  var entryExpanded = entryExpandedState[0];
  var setEntryExpanded = entryExpandedState[1];

  useImperativeHandle(ref, function() {
    return {
      expandAll: function() {
        var newExpanded = {};
        groupOrder.forEach(function(type) { newExpanded[type] = true; });
        setExpanded(newExpanded);
        var newEntry = {};
        resources.forEach(function(r, idx) { newEntry[idx] = true; });
        setEntryExpanded(newEntry);
      },
      collapseAll: function() {
        var newExpanded = {};
        groupOrder.forEach(function(type) { newExpanded[type] = false; });
        setExpanded(newExpanded);
        setEntryExpanded({});
      }
    };
  }, [groupOrder, resources]);

  function toggleGroup(type) {
    setExpanded(function(prev) {
      var next = Object.assign({}, prev);
      next[type] = !prev[type];
      return next;
    });
  }

  function toggleEntry(idx) {
    setEntryExpanded(function(prev) {
      var next = Object.assign({}, prev);
      next[idx] = !prev[idx];
      return next;
    });
  }

  return (
    <Box sx={{ overflow: 'auto', flex: 1 }}>
      {groupOrder.map(function(type) {
        var items = groups[type];
        var emoji = getResourceEmoji(type);
        var severity = getResourceAlertSeverity(type);

        return (
          <Accordion
            key={type}
            expanded={expanded[type] || false}
            onChange={function() { toggleGroup(type); }}
            disableGutters
            sx={{
              bgcolor: 'transparent',
              '&:before': { display: 'none' },
              boxShadow: 'none'
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: cardTextColor }} />} sx={{ minHeight: 36, px: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: cardTextColor }}>
                  {emoji} {type}
                </Typography>
                <Chip label={items.length} size="small" sx={{
                  height: 18, fontSize: '0.7rem',
                  bgcolor: isDark ? 'rgba(255,255,255,0.12)' : undefined,
                  color: isDark ? 'rgba(255,255,255,0.87)' : undefined
                }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0.5 }}>
              {items.map(function(item) {
                var resource = item.resource;
                var idx = item.originalIndex;
                var summary = getResourceSummary(resource);
                var isSelected = selectedIndex === idx;

                return (
                  <Alert
                    key={idx}
                    severity={severity}
                    action={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Preview resource">
                          <IconButton
                            size="small"
                            sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : undefined }}
                            onClick={function(e) {
                              e.stopPropagation();
                              if (onSelectResource) onSelectResource(idx, resource);
                            }}
                          >
                            <ChevronRightIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                    sx={{
                      mb: 0.5,
                      py: 0,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '1px solid transparent',
                      borderColor: isSelected ? 'primary.main' : 'transparent',
                      '& .MuiAlert-message': { width: '100%', overflow: 'hidden' },
                      bgcolor: alertDarkBg[severity],
                      color: isDark ? cardTextColor : undefined,
                      '& .MuiAlert-icon': { color: alertDarkIcon[severity] }
                    }}
                    onClick={function() { toggleEntry(idx); }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                      <Chip
                        label={get(resource, 'resourceType', 'Unknown')}
                        size="small"
                        sx={{
                          height: 18, fontSize: '0.65rem', flexShrink: 0,
                          bgcolor: isDark ? 'rgba(255,255,255,0.12)' : undefined,
                          color: isDark ? 'rgba(255,255,255,0.87)' : undefined
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                      >
                        {summary}
                      </Typography>
                    </Box>
                    <Collapse in={entryExpanded[idx] || false}>
                      <Typography
                        component="pre"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.65rem',
                          mt: 0.5,
                          p: 0.5,
                          bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 200,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {JSON.stringify(resource, null, 2)}
                      </Typography>
                    </Collapse>
                  </Alert>
                );
              })}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {resources.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: textSecondary }}>
            No resources loaded. Select resource types above and click "Load Selected".
          </Typography>
        </Box>
      )}
    </Box>
  );
});

// =============================================================================
// CLINICAL SCENARIO CONTENT
// =============================================================================

function ClinicalScenarioContent() {
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

  var cardBgColor = isDark ? '#1e1e1e' : '#ffffff';
  var cardTextColor = isDark ? 'rgba(255,255,255,0.87)' : 'rgba(0,0,0,0.87)';
  var dividerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  var textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  // Local state
  var resourceListState = useState([]);
  var resourceList = resourceListState[0];
  var setResourceList = resourceListState[1];

  var selectedCollectionsState = useState([]);
  var selectedCollections = selectedCollectionsState[0];
  var setSelectedCollections = selectedCollectionsState[1];

  var showAllState = useState(false);
  var showAll = showAllState[0];
  var setShowAll = showAllState[1];

  var selectedResourceIndexState = useState(-1);
  var selectedResourceIndex = selectedResourceIndexState[0];
  var setSelectedResourceIndex = selectedResourceIndexState[1];

  var viewModeState = useState('accordion');
  var viewMode = viewModeState[0];
  var setViewMode = viewModeState[1];

  var accordionRef = useRef(null);

  // Build list of available collections (those with data)
  var availableCollections = [];
  if (Meteor.Collections) {
    Object.keys(Meteor.Collections).forEach(function(pluralName) {
      var collection = Meteor.Collections[pluralName];
      if (collection && typeof collection.find === 'function') {
        try {
          var count = collection.find({}).count();
          if (count > 0) {
            var typeName = pluralName;
            if (typeName.endsWith('ies')) {
              typeName = typeName.slice(0, -3) + 'y';
            } else if (typeName.endsWith('ses')) {
              typeName = typeName.slice(0, -2);
            } else if (typeName.endsWith('s')) {
              typeName = typeName.slice(0, -1);
            }
            availableCollections.push({ type: typeName, plural: pluralName, count: count });
          }
        } catch (e) {
          // skip
        }
      }
    });
  }

  var displayCollections = showAll
    ? availableCollections
    : availableCollections.filter(function(c) { return COMMON_TYPES.indexOf(c.type) !== -1; });

  function handleLoadFromCollection() {
    var allResources = [];

    selectedCollections.forEach(function(item) {
      var collection = Meteor.Collections[item.plural];
      if (collection) {
        var records = collection.find({}).fetch();
        allResources = allResources.concat(records);
      }
    });

    if (allResources.length === 0) return;
    console.log('[ClinicalScenarioContent] Loaded', allResources.length, 'resources from', selectedCollections.length, 'collections');
    setResourceList(allResources);
    setSelectedResourceIndex(-1);
  }

  function handleSelectResource(index, resource) {
    setSelectedResourceIndex(index);
  }

  function handleModeChange(e, newMode) {
    if (newMode !== null) setViewMode(newMode);
  }

  function handleExpandAll() {
    if (accordionRef.current) accordionRef.current.expandAll();
  }

  function handleCollapseAll() {
    if (accordionRef.current) accordionRef.current.collapseAll();
  }

  function handleClear() {
    setResourceList([]);
    setSelectedResourceIndex(-1);
    setSelectedCollections([]);
  }

  var isEmpty = resourceList.length === 0;

  // Get selected resource for preview
  var selectedResource = null;
  if (selectedResourceIndex >= 0 && selectedResourceIndex < resourceList.length) {
    selectedResource = resourceList[selectedResourceIndex];
  }

  var DynamicFhirViews = Meteor.DynamicFhirViews;

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      gap: 2,
      p: 2,
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Left Column: Collection Picker + Resource List */}
      <Card sx={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        bgcolor: cardBgColor, color: cardTextColor,
        '& .MuiCardHeader-title': { color: cardTextColor },
        '& .MuiIconButton-root': { color: cardTextColor },
        '& .MuiToggleButton-root': { color: cardTextColor, borderColor: dividerColor },
        '& .MuiInputLabel-root': { color: cardTextColor },
        '& .MuiInputBase-root': { color: cardTextColor },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor },
        '& .MuiChip-root': { color: cardTextColor },
        '& .MuiAutocomplete-popupIndicator': { color: cardTextColor },
        '& .MuiAutocomplete-clearIndicator': { color: cardTextColor },
        '& .MuiAccordionSummary-expandIconWrapper': { color: cardTextColor }
      }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={resourceList.length} color="primary" max={9999}>
                  <Typography variant="h6">Clinical Scenario</Typography>
                </Badge>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {viewMode === 'accordion' && !isEmpty && (
                  <>
                    <Tooltip title="Expand all">
                      <IconButton size="small" onClick={handleExpandAll}>
                        <ExpandAllIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Collapse all">
                      <IconButton size="small" onClick={handleCollapseAll}>
                        <CollapseAllIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {!isEmpty && (
                  <Tooltip title="Clear list">
                    <IconButton size="small" onClick={handleClear}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleModeChange}
                  size="small"
                >
                  <ToggleButton value="accordion">
                    <AccordionIcon sx={{ fontSize: 16 }} />
                  </ToggleButton>
                  <ToggleButton value="raw">
                    <RawIcon sx={{ fontSize: 16 }} />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
          }
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, pt: 1, overflow: 'hidden' }}>
          {/* Collection Picker — always visible */}
          <Box sx={{ mb: 2, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CollectionIcon sx={{ fontSize: 20, color: textSecondary }} />
              <Typography variant="subtitle2" sx={{ color: textSecondary }}>
                Load from Collection
              </Typography>
            </Box>
            <Autocomplete
              multiple
              size="small"
              options={displayCollections}
              getOptionLabel={function(option) { return option.type + ' (' + option.count + ')'; }}
              value={selectedCollections}
              onChange={function(e, newValue) { setSelectedCollections(newValue); }}
              isOptionEqualToValue={function(option, value) { return option.plural === value.plural; }}
              renderTags={function(value, getTagProps) {
                return value.map(function(option, index) {
                  return (
                    <Chip
                      label={option.type + ' (' + option.count + ')'}
                      size="small"
                      {...getTagProps({ index: index })}
                      key={option.plural}
                      sx={isDark ? {
                        bgcolor: 'rgba(255,255,255,0.12)',
                        color: 'rgba(255,255,255,0.87)',
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.5)' }
                      } : {}}
                    />
                  );
                });
              }}
              renderInput={function(params) {
                return <TextField {...params} placeholder="Select resource types..." />;
              }}
              slotProps={{
                paper: {
                  sx: isDark ? {
                    bgcolor: '#2a2a2a',
                    color: 'rgba(255,255,255,0.87)',
                    '& .MuiAutocomplete-option': {
                      color: 'rgba(255,255,255,0.87)',
                      '&[aria-selected="true"]': {
                        bgcolor: 'rgba(255,255,255,0.12)'
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.08)'
                      }
                    },
                    '& .MuiAutocomplete-noOptions': {
                      color: 'rgba(255,255,255,0.6)'
                    }
                  } : {}
                }
              }}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<LoadIcon />}
                onClick={handleLoadFromCollection}
                disabled={selectedCollections.length === 0}
              >
                Load Selected
              </Button>
              <Button
                variant="text"
                size="small"
                startIcon={<ShowAllIcon />}
                onClick={function() { setShowAll(!showAll); }}
                sx={{
                  textTransform: 'none',
                  color: isDark ? 'rgba(255,255,255,0.7)' : undefined
                }}
              >
                {showAll ? 'Common Types' : 'Show All'}
              </Button>
            </Box>
          </Box>

          {/* Resource List */}
          {isEmpty ? null : viewMode === 'accordion' ? (
            <ScenarioResourceAccordion
              ref={accordionRef}
              resources={resourceList}
              selectedIndex={selectedResourceIndex}
              onSelectResource={handleSelectResource}
              isDark={isDark}
            />
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <AceEditor
                mode="json"
                theme={isDark ? 'monokai' : 'github'}
                value={JSON.stringify(resourceList, null, 2)}
                readOnly={true}
                name="scenario-resource-list-raw"
                editorProps={{ $blockScrolling: true }}
                width="100%"
                height="100%"
                fontSize={11}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={false}
                wrapEnabled={true}
                setOptions={{
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false
                }}
                style={{ flex: 1, minHeight: 200 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Right Column: Resource Preview */}
      <Card sx={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        bgcolor: cardBgColor, color: cardTextColor,
        '& .MuiCardHeader-title': { color: cardTextColor },
        '& .MuiIconButton-root': { color: cardTextColor }
      }}>
        <CardHeader
          title="Resource Preview"
          sx={{
            borderBottom: 1,
            borderColor: dividerColor,
            flexShrink: 0,
            '& .MuiCardHeader-title': { fontSize: '1.1rem' }
          }}
        />
        <CardContent sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {selectedResource && DynamicFhirViews ? (
            <DynamicFhirViews
              fhirResource={selectedResource}
              embedded={true}
              isDark={isDark}
            />
          ) : selectedResource ? (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <AceEditor
                mode="json"
                theme={isDark ? 'monokai' : 'github'}
                value={JSON.stringify(selectedResource, null, 2)}
                readOnly={true}
                name="scenario-resource-preview"
                editorProps={{ $blockScrolling: true }}
                width="100%"
                height="100%"
                fontSize={12}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={false}
                wrapEnabled={true}
                setOptions={{
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false
                }}
                style={{ flex: 1, minHeight: 200 }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" sx={{ color: textSecondary }}>
                Select a resource from the list to preview it here.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export { ClinicalScenarioContent };
export default ClinicalScenarioContent;
