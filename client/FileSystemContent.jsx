// packages/data-exporter/client/FileSystemContent.jsx
//
// "File System" tab content for the Export page.
// Three-column layout:
//   1. Export Controls (patient card, resource accordion, file format + collapsible options, prepare data)
//   2. AceEditor raw data preview (exportBuffer)
//   3. Status Alert + Download
// Adapted from merkalis FileSystemContent — no ViewerStoreContext, no merkle storage.

import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Random } from 'meteor/random';
import { useTracker } from 'meteor/react-meteor-data';
import { get } from 'lodash';

import {
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  Input,
  Select,
  MenuItem,
  Tooltip,
  Typography,
  Alert
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ExportResourceAccordion from './ExportResourceAccordion.jsx';
import MedicalRecordsExporter from '../lib/MedicalRecordsExporter';

import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';

// Resolve collections at startup
var Patients;
Meteor.startup(function() {
  Patients = Meteor.Collections.Patients;
});

export function FileSystemContent() {
  // ---------------------------------------------------------------------------
  // Theme detection
  // ---------------------------------------------------------------------------
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
  var textDisabled = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  var dividerColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  var textSecondary = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  var cardSx = {
    bgcolor: cardBgColor,
    color: cardTextColor,
    '& .MuiCardHeader-title': { color: cardTextColor },
    '& .MuiCardHeader-subheader': { color: textSecondary },
    '& .MuiInputLabel-root': { color: textSecondary },
    '& .MuiInputBase-root': { color: cardTextColor },
    '& .MuiInput-underline:before': { borderBottomColor: dividerColor },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor },
    '& .MuiSelect-icon': { color: cardTextColor },
    '& .MuiCheckbox-root': { color: isDark ? 'rgba(255,255,255,0.7)' : undefined },
    '& .MuiFormControlLabel-label': { color: cardTextColor },
    '& .MuiIconButton-root': { color: cardTextColor },
    '& .MuiChip-root': { color: cardTextColor },
    '& .MuiAccordionSummary-expandIconWrapper': { color: cardTextColor },
    '& .MuiButton-root.Mui-disabled': {
      color: isDark ? 'rgba(255,255,255,0.3)' : undefined,
      bgcolor: isDark ? 'rgba(255,255,255,0.12)' : undefined
    }
  };

  // ---------------------------------------------------------------------------
  // Session-driven reactive state
  // ---------------------------------------------------------------------------
  var exportBuffer = useTracker(function() {
    return Session.get('exportBuffer');
  }, []);

  var exportFileTypeFromSession = useTracker(function() {
    return Session.get('exportFileType') || 1;
  }, []);

  var exportFileName = useTracker(function() {
    return Session.get('exportFileName') || '';
  }, []);

  var selectedPatient = useTracker(function() {
    return Session.get('selectedPatient');
  }, []);

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  var defaultFileName = get(Meteor, 'settings.public.defaults.exportFile.fileName', 'export');
  var [downloadFileName, setDownloadFileName] = useState(exportFileName || defaultFileName);
  var [exportFileType, setExportFileType] = useState(exportFileTypeFromSession);
  var [isPreparing, setIsPreparing] = useState(false);

  // Keep filename in sync if Session value changes
  useTracker(function() {
    var sessionFileName = Session.get('exportFileName');
    if (sessionFileName && sessionFileName !== downloadFileName) {
      setDownloadFileName(sessionFileName);
    }
  }, []);

  // Derive file extension from export type
  var downloadFileExtension = '.json';
  switch (exportFileType) {
    case 1:
      downloadFileExtension = '.json';
      break;
    case 2:
      downloadFileExtension = '.ndjson';
      break;
    default:
      downloadFileExtension = '.json';
      break;
  }

  // ---------------------------------------------------------------------------
  // Export Options state (bridged to Session for prepareData)
  // ---------------------------------------------------------------------------
  var [coverLetter, setCoverLetter] = useState(false);
  var [patientSummary, setPatientSummary] = useState(false);
  var [errorFilter, setErrorFilter] = useState(false);
  var [patientFilterToggle, setPatientFilterToggle] = useState(false);
  var [patientFilter, setPatientFilter] = useState('');
  var [normalizeIds, setNormalizeIds] = useState(false);
  var [optionsExpanded, setOptionsExpanded] = useState(false);

  function handleToggleCoverLetter(event) {
    var checked = event.target.checked;
    setCoverLetter(checked);
    Session.set('exportCoverLetter', checked);
  }

  function handleTogglePatientSummary(event) {
    var checked = event.target.checked;
    setPatientSummary(checked);
    Session.set('exportPatientSummary', checked);
  }

  function handleToggleErrorFilter(event) {
    var checked = event.target.checked;
    setErrorFilter(checked);
    Session.set('exportErrorFilter', checked);
  }

  function handleTogglePatientFilter(event) {
    var checked = event.target.checked;
    setPatientFilterToggle(checked);
    Session.set('exportPatientFilterToggle', checked);
  }

  function handleChangePatientFilter(event) {
    var value = event.target.value;
    setPatientFilter(value);
    Session.set('exportPatientFilter', value);
  }

  function handleToggleNormalizeIds(event) {
    var checked = event.target.checked;
    setNormalizeIds(checked);
    Session.set('exportNormalizeIds', checked);
  }

  // ---------------------------------------------------------------------------
  // Export handlers
  // ---------------------------------------------------------------------------
  function handleChangeExportFileType(event) {
    var value = event.target.value;
    setExportFileType(value);
    Session.set('exportFileType', value);
  }

  function prepareData() {
    console.log('============================================================================================================');
    console.log("[FileSystemContent] Preparing export. Algorithm #" + exportFileType);
    setIsPreparing(true);

    var exportCoverLetter = Session.get('exportCoverLetter') || false;
    var exportPatientSummary = Session.get('exportPatientSummary') || false;
    var exportErrorFilter = Session.get('exportErrorFilter') || false;
    var exportPatientFilterToggle = Session.get('exportPatientFilterToggle') || false;
    var exportPatientFilter = Session.get('exportPatientFilter') || '';

    var filterValue = exportPatientFilterToggle ? exportPatientFilter : '';
    var currentPatient = null;
    if (exportPatientFilterToggle && exportPatientFilter && Patients) {
      currentPatient = Patients.findOne({ id: exportPatientFilter });
    }
    var includeSelectedPatientId = selectedPatient ? Session.get('selectedPatientId') : null;

    switch (exportFileType) {
      case 1:
        MedicalRecordsExporter.exportContinuityOfCareDoc(
          filterValue,
          exportErrorFilter,
          exportCoverLetter,
          false,
          exportPatientSummary,
          currentPatient,
          includeSelectedPatientId
        );
        break;
      case 2:
        MedicalRecordsExporter.exportBulkData(
          filterValue,
          exportErrorFilter,
          exportCoverLetter,
          false,
          Session.get('exportBuffer'),
          includeSelectedPatientId
        );
        break;
      default:
        MedicalRecordsExporter.exportContinuityOfCareDoc(
          filterValue,
          exportErrorFilter,
          exportCoverLetter,
          false,
          exportPatientSummary,
          currentPatient,
          includeSelectedPatientId
        );
        break;
    }

    // Normalize _id values to strings if requested
    var exportNormalizeIds = Session.get('exportNormalizeIds') || false;
    if (exportNormalizeIds) {
      var currentBuffer = Session.get('exportBuffer');
      if (currentBuffer) {
        if (typeof currentBuffer === 'object' && currentBuffer.entry && Array.isArray(currentBuffer.entry)) {
          // Bundle format: walk entry[].resource._id
          var normalizedBundle = JSON.parse(JSON.stringify(currentBuffer));
          normalizedBundle.entry.forEach(function(entry) {
            var resource = entry.resource || entry;
            if (resource._id && typeof resource._id === 'object' && resource._id._str) {
              resource._id = resource._id._str;
            }
          });
          Session.set('exportBuffer', normalizedBundle);
        } else if (typeof currentBuffer === 'string' && currentBuffer.length > 0) {
          // Bulk data (NDJSON): parse each line, normalize, re-stringify
          var lines = currentBuffer.split('\n');
          var normalizedLines = lines.map(function(line) {
            if (!line.trim()) return line;
            try {
              var resource = JSON.parse(line);
              if (resource._id && typeof resource._id === 'object' && resource._id._str) {
                resource._id = resource._id._str;
              }
              return JSON.stringify(resource);
            } catch (e) {
              return line;
            }
          });
          Session.set('exportBuffer', normalizedLines.join('\n'));
        }
      }
    }

    // Auto-generate a filename from the patient
    if (!get(Meteor, 'settings.public.defaults.exportFile.fileName') && Patients) {
      var patientForFilename = filterValue
        ? Patients.findOne({ id: filterValue })
        : Patients.findOne();

      if (patientForFilename && Meteor.FhirUtilities) {
        var generatedName = (Meteor.FhirUtilities.pluckName(patientForFilename)).replace(/\s/g, '') + '-' + get(patientForFilename, 'id', '');
        Session.set('exportFileName', generatedName);
      }
    }

    setIsPreparing(false);
  }

  // ---------------------------------------------------------------------------
  // Detect iPhone
  // ---------------------------------------------------------------------------
  var isIPhone = false;
  if (typeof window !== 'undefined' && window.navigator) {
    isIPhone = ['iPhone'].includes(window.navigator.platform);
  }

  // ---------------------------------------------------------------------------
  // Compute buffer info
  // ---------------------------------------------------------------------------
  var hasBuffer = false;
  var bufferSummary = 'No data prepared';

  if (exportBuffer) {
    if (typeof exportBuffer === 'object') {
      if (exportBuffer.entry && Array.isArray(exportBuffer.entry)) {
        hasBuffer = true;
        bufferSummary = 'Ready: ' + exportBuffer.entry.length + ' resources (Bundle)';
      } else {
        hasBuffer = true;
        bufferSummary = 'Ready: data prepared';
      }
    } else if (typeof exportBuffer === 'string' && exportBuffer.length > 0) {
      hasBuffer = true;
      var lineCount = exportBuffer.split('\n').filter(function(l) { return l.trim().length > 0; }).length;
      bufferSummary = 'Ready: ' + lineCount + ' lines';
    }
  }

  // ---------------------------------------------------------------------------
  // AceEditor display string
  // ---------------------------------------------------------------------------
  var exportBufferDisplayString = '';
  if (exportBuffer) {
    if (typeof exportBuffer === 'object') {
      exportBufferDisplayString = JSON.stringify(exportBuffer, null, 2);
    } else if (typeof exportBuffer === 'string') {
      exportBufferDisplayString = exportBuffer;
    }
  } else {
    exportBufferDisplayString = '// No data prepared yet.\n// Use "Prepare Data" to generate export buffer.';
  }

  // ---------------------------------------------------------------------------
  // Patient Card
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
  // Download handlers
  // ---------------------------------------------------------------------------
  function handleChangeFileName(event) {
    setDownloadFileName(event.target.value);
  }

  function downloadExportFile() {
    console.log('[FileSystemContent] downloadExportFile');

    if (isIPhone) {
      console.log('[FileSystemContent] Running on iPhone — copy not supported via anchor');
      return;
    }

    var blob;
    switch (exportFileType) {
      case 1: {
        var jsonContent;
        if (typeof exportBuffer === 'object') {
          jsonContent = JSON.stringify(exportBuffer, null, 2);
        } else {
          jsonContent = exportBuffer;
        }
        blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        break;
      }
      case 2: {
        var ndjsonContent = exportBuffer;
        if (typeof exportBuffer === 'object') {
          ndjsonContent = JSON.stringify(exportBuffer);
        }
        blob = new Blob([ndjsonContent], { type: 'application/x-ndjson;charset=utf-8;' });
        break;
      }
      default: {
        var defaultContent;
        if (typeof exportBuffer === 'object') {
          defaultContent = JSON.stringify(exportBuffer, null, 2);
        } else {
          defaultContent = exportBuffer;
        }
        blob = new Blob([defaultContent], { type: 'application/json;charset=utf-8;' });
        break;
      }
    }

    console.log('[FileSystemContent] Generated blob:', blob);

    var downloadUrl = URL.createObjectURL(blob);
    var downloadFilenameString = downloadFileName + downloadFileExtension;

    console.log('[FileSystemContent] Download filename:', downloadFilenameString);

    var downloadAnchorElement = document.getElementById('downloadAnchorElement');
    if (downloadAnchorElement) {
      downloadAnchorElement.setAttribute('href', downloadUrl);
      downloadAnchorElement.setAttribute('download', downloadFilenameString);
      downloadAnchorElement.style.visibility = 'hidden';
      downloadAnchorElement.click();
    }
  }

  function clearExportBuffer() {
    Session.set('exportBuffer', '');
    Session.set('exportFileName', '');
    setDownloadFileName(defaultFileName);
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
      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
      gap: 2
    }}>
      {/* Column 1: Export Controls */}
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
            <ExportResourceAccordion isDark={isDark} />
          </CardContent>
        </Card>

        {/* File Format Card */}
        <Card sx={cardSx}>
          <CardHeader title="File Format" />
          <CardContent>
            <FormControl fullWidth>
              <InputLabel id="fs-export-file-type-label">Export Format</InputLabel>
              <Select
                labelId="fs-export-file-type-label"
                id="fsExportFileTypeSelector"
                value={exportFileType}
                onChange={handleChangeExportFileType}
                fullWidth
                MenuProps={isDark ? {
                  PaperProps: {
                    sx: {
                      bgcolor: '#2a2a2a',
                      color: 'rgba(255,255,255,0.87)',
                      '& .MuiMenuItem-root:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                    }
                  }
                } : {}}
              >
                <MenuItem value={1} sx={{ display: 'flow-root' }}>
                  <div style={{ float: 'left' }}>FHIR Bundle</div>
                  <div style={{ float: 'right' }}>.json</div>
                </MenuItem>
                <MenuItem value={2} sx={{ display: 'flow-root' }}>
                  <div style={{ float: 'left' }}>FHIR Bulk Data</div>
                  <div style={{ float: 'right' }}>.ndjson</div>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Collapsible Export Options */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                mt: 2,
                mb: optionsExpanded ? 1 : 0
              }}
              onClick={function() { setOptionsExpanded(!optionsExpanded); }}
            >
              <Typography variant="subtitle2" sx={{ color: textSecondary, flex: 1 }}>
                Export Options
              </Typography>
              <IconButton size="small" sx={{ transform: optionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <ExpandMoreIcon />
              </IconButton>
            </Box>
            <Collapse in={optionsExpanded}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={coverLetter}
                    onChange={handleToggleCoverLetter}
                  />
                }
                label="Ensure cover letter exists (Composition)"
              />
              <br />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={patientSummary}
                    onChange={handleTogglePatientSummary}
                  />
                }
                label="Include International Patient Summary"
              />
              <br />
              <Tooltip title="Coming soon" arrow>
                <FormControlLabel
                  control={<Checkbox disabled />}
                  label={<Typography sx={{ color: textDisabled }}>Include referenced resources</Typography>}
                />
              </Tooltip>
              <br />
              <Tooltip title="Coming soon" arrow>
                <FormControlLabel
                  control={<Checkbox disabled />}
                  label={<Typography sx={{ color: textDisabled }}>Include provenance records</Typography>}
                />
              </Tooltip>
              <br />
              <Tooltip title="Coming soon" arrow>
                <FormControlLabel
                  control={<Checkbox disabled />}
                  label={<Typography sx={{ color: textDisabled }}>Include multimedia</Typography>}
                />
              </Tooltip>
              <br />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={errorFilter}
                    onChange={handleToggleErrorFilter}
                  />
                }
                label="Filter Entered-in-Error records"
              />
              <br />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={patientFilterToggle}
                    onChange={handleTogglePatientFilter}
                  />
                }
                label="Filter by PatientID"
              />
              {patientFilterToggle && (
                <FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
                  <InputLabel id="patient-filter-label">Patient Filter</InputLabel>
                  <Input
                    id="patientFilterInput"
                    name="patientFilter"
                    placeholder={"Patient/" + Random.id()}
                    type="text"
                    value={patientFilter}
                    onChange={handleChangePatientFilter}
                    fullWidth
                  />
                </FormControl>
              )}
              <br />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={normalizeIds}
                    onChange={handleToggleNormalizeIds}
                  />
                }
                label="Normalize _id values to strings"
              />
            </Collapse>
          </CardContent>
        </Card>

        {/* Prepare Data Button */}
        <Button
          id="fsPrepareDataBtn"
          color="primary"
          variant="contained"
          onClick={prepareData}
          fullWidth
          disabled={isPreparing}
          sx={{ py: 1.5 }}
        >
          {isPreparing ? 'Preparing...' : 'Prepare Data'}
        </Button>
      </Box>

      {/* Column 2: AceEditor raw data preview */}
      <Box sx={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <Card sx={{ ...cardSx, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CardHeader title="Export Buffer Preview" />
          <CardContent sx={{ flex: 1, p: 0, '&:last-child': { pb: 0 }, overflow: 'hidden' }}>
            <AceEditor
              mode="json"
              theme={isDark ? 'monokai' : 'github'}
              name="exportBufferEditor"
              value={exportBufferDisplayString}
              readOnly={true}
              width="100%"
              height="100%"
              fontSize={12}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={false}
              wrapEnabled={true}
              setOptions={{
                useWorker: false,
                showLineNumbers: true,
                tabSize: 2
              }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Column 3: Status + Download */}
      <Box sx={{
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Status Indicator */}
        <Alert severity={hasBuffer ? 'success' : 'info'}>
          {bufferSummary}
        </Alert>

        {/* Download Card */}
        <Card sx={cardSx}>
          <CardHeader title="Download to File System" />
          <CardContent>
            {isIPhone ? (
              <Typography
                variant="body1"
                sx={{ textAlign: 'center', py: 2 }}
              >
                Select All &gt; Share &gt; Save to Files &gt; iCloud
              </Typography>
            ) : (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={9}>
                    <FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
                      <InputLabel>File Name</InputLabel>
                      <Input
                        id="fileName"
                        name="fileName"
                        type="text"
                        value={downloadFileName}
                        onChange={handleChangeFileName}
                        fullWidth
                      />
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl fullWidth sx={{ mt: 1, mb: 1 }}>
                      <InputLabel>Extension</InputLabel>
                      <Input
                        id="fileExtension"
                        name="fileExtension"
                        type="text"
                        value={downloadFileExtension}
                        readOnly
                        fullWidth
                      />
                    </FormControl>
                  </Grid>
                </Grid>

                <Button
                  id="downloadExportBtn"
                  color="primary"
                  variant="contained"
                  onClick={downloadExportFile}
                  fullWidth
                  disabled={!hasBuffer}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  Download
                </Button>

                <br />
                <Tooltip title="Coming soon" arrow>
                  <FormControlLabel
                    control={<Checkbox disabled />}
                    label={<Typography sx={{ color: textDisabled }}>Zip and compress file</Typography>}
                  />
                </Tooltip>

                {/* Hidden anchor for triggering download */}
                <a id="downloadAnchorElement" style={{ display: 'none' }}></a>
              </Box>
            )}
          </CardContent>
          <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
            <Button
              id="clearExportBuffer"
              color="primary"
              onClick={clearExportBuffer}
              disabled={!hasBuffer}
            >
              Clear
            </Button>
          </CardActions>
        </Card>
      </Box>
    </Box>
  );
}

export default FileSystemContent;
