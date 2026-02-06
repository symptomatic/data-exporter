// https://www.npmjs.com/package/react-dropzone-component
// http://www.dropzonejs.com/ 

import { 
  Grid, 
  Button, 
  Card,
  CardContent, 
  CardHeader, 
  CardActions,
  Tab, 
  Tabs, 
  Typography,
  TextField,
  Select,
  MenuItem,
  Toggle,
  Table,
  FormControl,
  InputLabel,
  Input,
  SelectField,
  Checkbox,
  useTheme as useMuiTheme
} from '@mui/material';

// import Accordion from '@material-ui/Accordion';
// import AccordionSummary from '@material-ui/AccordionSummary';
// import AccordionDetails from '@material-ui/AccordionDetails';
// import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import PropTypes from 'prop-types';

// import AccountCircle from 'material-ui/svg-icons/action/account-circle';

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Random } from 'meteor/random';
import { HTTP } from 'meteor/http';

import React, { useState, useEffect } from 'react';
import { ReactMeteorData, useTracker } from 'meteor/react-meteor-data';

// Handle optional Roles package
let Roles;
if(Package["meteor/alanning:roles"]){
  import('meteor/alanning:roles').then((module) => {
    Roles = module.Roles;
  });
}

// import ReactGA from 'react-ga';
import { parseString } from 'xml2js';

import { browserHistory } from 'react-router';
import { get, has, set, cloneDeep } from 'lodash';
import moment from 'moment';

import MedicalRecordsExporter from '../lib/MedicalRecordsExporter';
import { CollectionManagement } from './CollectionManagement';


import "ace-builds";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/theme-monokai";

//============================================================================
// Helper Components 

let Patients;
let useTheme;
Meteor.startup(function(){
  Patients = Meteor.Collections.Patients;
  useTheme = Meteor.useTheme;
})


//============================================================================
// Helper Components 

function DynamicSpacer(props){
  return(
    <div style={{height: '20px'}}></div>
  )
}

//============================================================================
//Global Theming 

  // This is necessary for the Material UI component render layer
  let theme = {
    primaryColor: "rgb(108, 183, 110)",
    primaryText: "rgba(255, 255, 255, 1) !important",

    secondaryColor: "rgb(108, 183, 110)",
    secondaryText: "rgba(255, 255, 255, 1) !important",

    cardColor: "rgba(255, 255, 255, 1) !important",
    cardTextColor: "rgba(0, 0, 0, 1) !important",

    errorColor: "rgb(128,20,60) !important",
    errorText: "#ffffff !important",

    appBarColor: "#f5f5f5 !important",
    appBarTextColor: "rgba(0, 0, 0, 1) !important",

    paperColor: "#f5f5f5 !important",
    paperTextColor: "rgba(0, 0, 0, 1) !important",

    backgroundCanvas: "rgba(255, 255, 255, 1) !important",
    background: "linear-gradient(45deg, rgb(108, 183, 110) 30%, rgb(150, 202, 144) 90%)",

    nivoTheme: "greens"
  }

  // if we have a globally defined theme from a settings file
  if(get(Meteor, 'settings.public.theme.palette')){
    theme = Object.assign(theme, get(Meteor, 'settings.public.theme.palette'));
  }
  
//===================================================================================================================
// Cordova  

let onDeviceReady;
let writeToFile;
let errorHandler;
if (Meteor.isCordova) {
  console.log('Meteor.isCordova')
  errorHandler = function (fileName, e) {  
    let msg = '';

    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
          msg = 'Storage quota exceeded';
          break;
      case FileError.NOT_FOUND_ERR:
          msg = 'File not found';
          break;
      case FileError.SECURITY_ERR:
          msg = 'Security error';
          break;
      case FileError.INVALID_MODIFICATION_ERR:
          msg = 'Invalid modification';
          break;
      case FileError.INVALID_STATE_ERR:
          msg = 'Invalid state';
          break;
      default:
          msg = 'Unknown error';
          break;
    };

    console.log('Error (' + fileName + '): ' + msg);
  }
  onDeviceReady = function() {  
    console.log('Device is ready...')
    writeToFile = function(fileName, data) {
      console.log('writeToFile()', fileName, data)

      data = JSON.stringify(data, null, '\t');
      console.log('data', data)
      console.log('window', window)
      console.log('cordova', cordova)
      console.log('cordova.file', cordova.file)
      console.log('cordova.file.syncedDataDirectory', cordova.file.syncedDataDirectory)
      console.log('WebAppLocalServer.localFileSystemUrl(syncedDataDirectory)', WebAppLocalServer.localFileSystemUrl(cordova.file.syncedDataDirectory))

        window.resolveLocalFileSystemURL(cordova.file.syncedDataDirectory, function (directoryEntry) {
        console.log('local filesystem resolved...', JSON.stringify(directoryEntry))

        // window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {

          
            directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {
              // fs.root.getFile(fileName, { create: true }, function (fileEntry) {
              console.log('got file...', JSON.stringify(fileEntry))
              console.log('WebAppLocalServer.localFileSystemUrl(fileEntry)', WebAppLocalServer.localFileSystemUrl(fileEntry.nativeURL))

              fileEntry.createWriter(function (fileWriter) {
                console.log('writing file...')
                fileWriter.onwriteend = function (e) {
                        // for real-world usage, you might consider passing a success callback
                        console.log('Write of file "' + fileName + '" completed.');
                    };

                    fileWriter.onerror = function (e) {
                        // you could hook this up with our global error handler, or pass in an error callback
                        console.log('Write failed: ' + e.toString());
                    };

                    let blob = new Blob([data], { type: 'text/plain' });
                    //let blob = new Blob([data], { type: 'application/json' });
                    
                    if(blob){
                      console.log('have blob...', blob)
                      fileWriter.write(blob);  
                    }
                }, errorHandler.bind(null, fileName));
            }, errorHandler.bind(null, fileName));
        }, errorHandler.bind(null, fileName));
    }

    // writeToFile('example.json', { foo: 'bar' });
  }

  document.addEventListener('deviceready', onDeviceReady, false);
}



//===================================================================================================================
// Session Variables

Session.setDefault('fileExtension', 'json');
Session.setDefault('dataContent', '');
Session.setDefault('syncSourceItem', 1);
Session.setDefault('exportFileType', 1);
Session.setDefault('relayUrl', get(Meteor, 'settings.public.interfaces.fhirRelay.channel.endpoint', 'http://localhost:3000/baseR4'));




//===================================================================================================================
// Tabs  

function TabContainer(props) {
  return (
    <Typography component="div">
      {props.children}
    </Typography>
  );
}

TabContainer.propTypes = {
  children: PropTypes.node.isRequired
};


//====================================================================================
// Shared Components


//===================================================================================================================
// Main Component  

export function ExportComponent(props){
  // const classes = useStyles();
  const { theme: themeMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isDark = themeMode === 'dark';

  // Theme-aware colors: use mode-specific defaults
  const cardBgColor = isDark ? '#1e1e1e' : '#ffffff';
  const cardTextColor = isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)';
  const subheaderColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

  if(!logger && window.logger){
    logger = window.logger;
  }

  logger.info('Rendering the ExportComponent');
  logger.verbose('symptomatic:continuity-of-care.client.ExportComponent');
  logger.data('ExportComponent.props', {data: props}, {source: "ExportComponent.jsx"});

  //----------------------------------------------------------------------------------------------------
  // Internal variables

  const [tabIndex, setTabIndex] = useState(1);
  const [exportFileType, setExportFileType] = useState(1);
  const [relayUrl, setRelayUrl] = useState("");
  const [encryptExport, setEncryptExport] = useState(false);
  const [downloadFileName, setDownloadFileName ] = useState(get(Meteor, 'settings.public.defaults.exportFile.fileName', ""));
  const [downloadFileExtension, setDownloadFileExtension ] = useState(".json");
  const [appendDate, setAppendDate ] = useState(get(Meteor, 'settings.public.defaults.exportFile.appendDate', false));
  const [patientFilter, setPatientFilter] = useState("");
  const [errorFilter, setToggleErrorFilter] = useState(false);
  const [patientFilterToggle, setTogglePatientFilter] = useState(false);

  const [tableOfContents, setTableOfContents] = useState(false);
  const [coverLetter, setCoverLetter] = useState(false);
  const [patientSummary, setPatientSummary] = useState(false);
  const [includeSelectedPatient, setIncludeSelectedPatient] = useState(false);

  const [editorContent, setEditorContent] = useState("");


  useEffect(function(){
    if(typeof Session.get('exportBuffer') === "object"){
      setEditorContent( JSON.stringify(Session.get('exportBuffer'), null, 2));
    } else {
      setEditorContent( Session.get('exportBuffer'));
    }
  }, []);

  //----------------------------------------------------------------------------------------------------
  // Trackers

  useTracker(function(){
    if(typeof Session.get('exportBuffer') === "object"){
      setEditorContent( JSON.stringify(Session.get('exportBuffer'), null, 2));
    } else {
      setEditorContent( Session.get('exportBuffer'));
    }
  }, []);

  useTracker(function(){
    setPatientFilter(Session.get('selectedPatientId'))
  }, []);

  

  //----------------------------------------------------------------------------------------------------
  // Methods

  function handleTabChange(event, value){
    console.log('handleTabChange', event, value)
    setTabIndex(value);
  }
  function handleChangeExportFileType(event){
    setExportFileType(event.target.value)

    switch (event.target.value) {
      case 1:
        setDownloadFileExtension('.json')
        break;
      case 2:
        setDownloadFileExtension('.ndjson')
        break;
      case 3:
        setDownloadFileExtension('.csv')
        break;
      case 4:
        setDownloadFileExtension('.geojson')
        break;
      case 5:
        setDownloadFileExtension('.phr')
        break;
            
      default:
        break;
    }
  }
  function handleChangePatientFilter(event){
    setPatientFilter(event.target.value)
  }  
  function handleToggleErrorFilter(event, isChecked){
    console.log('handleToggleErrorFilter', isChecked)
    setToggleErrorFilter(isChecked)
  }
  function handleTogglePatientFilter(event, isChecked){
    console.log('handleTogglePatientFilter', isChecked)
    setTogglePatientFilter(isChecked)
  }
  function handleToggleCoverLetter(event, isChecked){
    console.log('handleToggleCoverLetter', isChecked)
    setCoverLetter(isChecked)
  }
  function handleTogglePatientSummary(event, isChecked){
    console.log('handleTogglePatientSummary', isChecked)
    setPatientSummary(isChecked)
  }
  function handleToggleTableOfContents(event, isChecked){
    console.log('handleToggleTableOfContents', isChecked)
    setTableOfContents(isChecked)
  }
  function handleToggleIncludeSelectedPatient(event, isChecked){
    console.log('handleToggleIncludeSelectedPatient', isChecked)
    setIncludeSelectedPatient(isChecked)
  }
  function prepareData(event, value){
    console.log('============================================================================================================')
    console.log("Let's try to export a file.  Using algorithm #" + exportFileType)
    let self = this;

    let dataContent = Session.get('exportBuffer');
    console.log('dataContent', dataContent);

    switch (exportFileType) {
      case 1:  // FHIR Bundle
        exportContinuityOfCareDoc();
        break;
      case 2:  // FHIR Bulk Data
        exportBulkData(dataContent);
        break;
      case 4:  // Geojson
        exportGeojson();
        break;
      case 5:  // PHR
        exportBulkData(dataContent);
        break;
      default:
        exportContinuityOfCareDoc();
        break;
    }

    if(!get(Meteor, 'settings.public.defaults.exportFile.fileName')){
      // Use selected patient if available, otherwise use first patient
      let patientForFilename = patientFilter
        ? Patients.findOne({id: patientFilter})
        : Patients.findOne();

      if(patientForFilename){
        setDownloadFileName((Meteor.FhirUtilities.pluckName(patientForFilename)).replace(/\s/g, '') + "-" + get(patientForFilename, 'id'));
      }
    }
  }
  function clearExportBuffer(){
    Session.set('exportBuffer', "");
  }
  function exportGeojson(){
    console.log('Exporting Geojson file.')
    console.log('Number of Locations:  ', Locations.find().count())

    let newFeatureCollection = {
      "type": "FeatureCollection",
      "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      "features": []
    }

    Locations.find().forEach(function(location){
      let newFeature = { 
        "type": "Feature", 
        "properties": location, 
        "geometry": { 
          "type": "Point", 
          "coordinates": [ get(location, 'position.longitude', null), get(location, 'position.latitude', null) ] 
        } 
      }
      newFeatureCollection.features.push(newFeature);
    });

    Session.set('exportBuffer', newFeatureCollection);
  }
  function exportContinuityOfCareDoc(){
    console.log('Export a Continuity Of Care Document');

    // filterString, excludeEnteredInError, includeCoverLetter, includeTableOfContents, includePatientSummary, patient, includeSelectedPatient
    let selectedPatient = includeSelectedPatient ? Session.get('selectedPatientId') : null;
    let currentPatient = patientFilter ? Patients.findOne({id: patientFilter}) : null;
    MedicalRecordsExporter.exportContinuityOfCareDoc(patientFilter, errorFilter, coverLetter, tableOfContents, patientSummary, currentPatient, selectedPatient);
  }
  function exportBulkData(dataContent){
    console.log('Exporting bulk data', dataContent);

    let selectedPatient = includeSelectedPatient ? Session.get('selectedPatientId') : null;
    MedicalRecordsExporter.exportBulkData(patientFilter, errorFilter, coverLetter, tableOfContents, dataContent, selectedPatient);
  }

  function handleEditorUpdate(newExportBuffer){
    console.log('handleEditorUpdate', newExportBuffer)
    setEditorContent(newExportBuffer)
  }
  function downloadExportFile(){
    console.log('downloadExportFile')
    let jsonFile;
    let csvFile;


  
    if(['iPhone'].includes(window.navigator.platform)){

      // copy to clipboard
      console.log('Running on iPhone...')
      let exportBuffer = document.getElementById("exportBuffer");
      console.log('exportBuffer', exportBuffer)

      exportBuffer.focus();
      exportBuffer.select();
      
      document.execCommand('Copy');

    } else {

      console.log('exportFileType', exportFileType)

      let blob;
      switch (exportFileType) {
        case 1:  // JSON
          // console.log('exportBuffer', exportBuffer)
          console.log('editorContent', editorContent)
          if(encryptExport){
            // https://atmospherejs.com/jparker/crypto-aes
            jsonFile = CryptoJS.AES.encrypt(JSON.stringify(editorContent), Meteor.userId());
          } else {
            if(typeof editorContent === "object"){
              jsonFile = JSON.stringify(editorContent, null, 2);
            } else {
              jsonFile = editorContent;
            }
          }
          blob = new Blob([jsonFile], { type: 'application/json;charset=utf-8;' })
          break;
        case 2:  // NDJSON
          // console.log('exportBuffer', exportBuffer)
          console.log('editorContent', editorContent)
          blob = new Blob([editorContent], { type: 'application/x-ndjson;charset=utf-8;' })
          break;      
        case 3:  // CSV
          csvFile = CSV.unparse(Encounters.find().fetch());
          blob = new Blob([csvFile], { type: 'application/csv;charset=utf-8;' })
          break;      
        case 5:  // PHR
        console.log('editorContent', editorContent)
          blob = new Blob([editorContent], { type: 'application/phr;charset=utf-8;' })
          break;      
        default:
          if(encryptExport){
            // https://atmospherejs.com/jparker/crypto-aes
            jsonFile = CryptoJS.AES.encrypt(JSON.stringify(editorContent), Meteor.userId());
          } else {
            if(typeof editorContent === "object"){
              jsonFile = JSON.stringify(editorContent, null, 2);
            } else {
              jsonFile = editorContent;
            }
          }
          blob = new Blob([jsonFile], { type: 'application/json;charset=utf-8;' })
          break;
      }
      console.log('Generated downloadable blob: ', blob)

      let downloadUrl = URL.createObjectURL(blob);
      console.log('Generated download url: ', downloadUrl)

      let downloadFilenameString = '';
      if(fileName.length > 0){
        downloadFilenameString = downloadFileName + ".Bundle";
      } else {
        if(appendDate){
          downloadFilenameString = downloadFileName + '-' + moment().format("YYYY-MM-DD-hh-mm")  + '.' + downloadFileExtension;
        } else {
          downloadFilenameString = downloadFileName + '.' + downloadFileExtension;
        }
      }

      switch (exportFileType) {
        case 1:  // JSON
          downloadFilenameString = downloadFileName + '.json';
          break;      
        case 2:  // NDJSON
          downloadFilenameString = downloadFileName + '.ndjson';
          break;      
        case 3:  // CSV
          downloadFilenameString = downloadFileName + '.csv';
          break;      
        case 4:  // Geojson
          downloadFilenameString = downloadFileName + '.geojson';
          break;      
        case 5:  // PHR
          downloadFilenameString = downloadFileName + '.phr';
          break;      
        default:
          if(encryptExport){
            downloadFilenameString = downloadFileName + '.fhir';
          } else {
            downloadFilenameString = downloadFileName + '.json';
          }
          break;
      }
      
      // desktop 
      //let dataString = 'data:text/csv;charset=utxf-8,' + encodeURIComponent(JSON.stringify(exportBuffer, null, 2));  

      //let patientName = Meteor.user().displayName();
      //console.log('Generating CCD for ', patientName)
      console.log('downloadFilenameString', downloadFilenameString)

      let downloadAnchorElement = document.getElementById('downloadAnchorElement');

      downloadAnchorElement.setAttribute("href", downloadUrl);
      downloadAnchorElement.setAttribute("download", downloadFilenameString);
      downloadAnchorElement.style.visibility = 'hidden';
      document.body.appendChild(downloadAnchorElement);
      downloadAnchorElement.click();
    }
  }

  function changeFileName(event){
    console.log('changeFileName', event.target.value);

    setDownloadFileName(event.target.value);
  }
  function sendToBundleService(){
    console.log('Sending to Bundle Service...')
    process.env.NODE_ENV === "verbose" && console.log('exportBuffer', Session.get('exportBuffer'))


    switch (Session.get('relayUrl')) {
      case 1:
        console.log('Sending to bundle service...')
        Bundles.insert(Session.get('exportBuffer'), {validation: false, filter: false}, function(error, result){
          console.error('error', error)
          if(result){
            browserHistory.push('/bundles')
          }
        })
        break;
      case 2:
        console.log('Sending to warehouse...')
        Meteor.call('storeBundleToWarehouse', Session.get('exportBuffer'), function(error, result){
          if(error){console.error('error', error);}
          Meteor.call('getServerStats', function(error, result){
            if(result){
              Session.set('datalakeStats', result);
            }
          });  
        })

      break;
      case 3:
        console.log('Trying to send to relay endpoint...')
        break;
    
      default:
        break;
    }

  }
  function toggleEncryptExport(){
    this.setState({encryptExport: !this.state.encryptExport})
  }
  function openPageUrl(url){
    console.log('openPageUrl', url, props)
    if(props.history){
      props.history.replace(url)
    }
  }
  
  function handleChangeDestination(event, value){
    console.log('handleChangeDestination', event.target.value)
    setRelayUrl(event.target.value);
    Session.set('relayUrl', event.target.value);
  }
  function handleRelay(){
    console.log("Relay URL: " + JSON.stringify(relayUrl))
    alert("Relay URL: " + JSON.stringify(relayUrl))
    
    let httpHeaders = { headers: {
      'Content-Type': 'application/fhir+json',
      'Access-Control-Allow-Origin': '*'          
    }}

    console.log('editorContent', editorContent)

    HTTP.post(relayUrl, {
      headers: httpHeaders,
      data: JSON.parse(editorContent)
    }, function(error, result){
      if(error){console.error(relayUrl + ' error', error)}
      if(result){
        console.log(relayUrl + ' result', result)
        
        // need to refactor the following into a dynamic method
        if(result.statusCode === 200){
          if(get(result, 'data.text')){
            Session.set('textNormalForm', result.data.text);
          } else if(get(result, 'data.text.div')){
            Session.set('textNormalForm', result.data.text.div);
          }
        }
      }      
    })
  }

  function handleProxyRelay(){
    console.log("Relay URL: " + JSON.stringify(relayUrl))
    alert("Relay URL: " + JSON.stringify(relayUrl))

    Meteor.call('postRelay', relayUrl, {}, JSON.parse(editorContent), Session.get('accountsAccessToken'), JSON.parse(editorContent), function(error, result){
      if(error){
        alert(JSON.stringify(error));
      }
      if(result){
        alert(JSON.stringify(result));
      }
    })
  }


  let downloadLabel = 'Download!';
  let downloadDisabled = false;
  let fileNameInput;

  let downloadAnchor = <Button 
    onClick={ downloadExportFile.bind(this)}
    style={{position: 'sticky', bottom: '20px', marginBottom: '20px'}}
    // disabled={downloadDisabled}
    fullWidth
    color='primary'
    variant='contained'
    disabled={editorContent ? false : true}
  >{downloadLabel}</Button> 


  if(['iPhone'].includes(window.navigator.platform)){
    // downloadLabel = 'Copy to Clipboard'
    downloadLabel = 'Select All > Share > Save to Files > iCloud';
    downloadDisabled = true;
    downloadAnchor = <h4 style={{textAlign: 'center', width: '100%', margin: '10px', marginBottom: '20px'}}>Select All &gt; Share &gt; Save to Files &gt; iCloud</h4>
  } else {    
    fileNameInput = <Grid container spacing={3}>
      <Grid item xs={9} >
        <FormControl style={{width: '100%', marginTop: '20px', marginBottom: '20px'}}>
          <InputLabel>File Name</InputLabel>
          <Input
            id='fileName'
            name='fileName'
            type='text'
            value={downloadFileName}
            // hintText='PatientName.YYYYMMDD.fhir'
            // floatingLabelFixed={true}
            onChange={ changeFileName.bind(this) }
            // hintText={ Meteor.user() ? Meteor.user().fullName() + '.fhir' : ''}
            // onKeyPress={this.handleKeyPress.bind(this)}
            // value={ get(formData, 'fileName') }
            fullWidth
          />
        </FormControl>
      </Grid>
      <Grid item xs={3} >
      <FormControl style={{width: '100%', marginTop: '20px', marginBottom: '20px'}}>
          <InputLabel>Extension</InputLabel>
          <Input
            id='fileExtension'
            name='fileExtension'
            type='text'
            value={downloadFileExtension}
            // hintText='PatientName.YYYYMMDD.fhir'
            // floatingLabelFixed={true}
            onChange={ changeFileName.bind(this) }
            // hintText={ Meteor.user() ? Meteor.user().fullName() + '.fhir' : ''}
            // onKeyPress={this.handleKeyPress.bind(this)}
            // value={ get(formData, 'fileName') }
            fullWidth
          />
        </FormControl>
      </Grid>
    </Grid>
    

  }

  let editCardHeight = window.innerHeight - 128 - 64 - 40 - 64 - 80;
  let editorHeight = editCardHeight;

  let relayOptions = [];
  let interfacesObject = get(Meteor, 'settings.public.interfaces');
  if(interfacesObject){
    Object.keys(interfacesObject).forEach(function(key, index){
      let interfaceConfig = interfacesObject[key];
      if(has(interfaceConfig, 'channel.endpoint') && (get(interfaceConfig, 'status') === "active")){
        relayOptions.push(<MenuItem value={get(interfaceConfig, 'channel.endpoint')} id={"relay-menu-item-" + index} key={"relay-menu-item-" + index} >{get(interfaceConfig, 'name')}</MenuItem>)
      }
    });  
  } else {
    console.log('WARNING:  No interfaces defined!')
  }

  let rightColumnStyle = {width: '100%', marginBottom: '84px', position: 'relative'};
  if(window.innerWidth < 920){
    rightColumnStyle.marginTop = '250px';
  }

  let relayElements;
  if(get(Meteor, 'settings.public.modules.dataRelay') === true){
    relayElements = <div>
    <CardHeader
      title="Step 3b - Send to Server" />
    <Card disabled sx={{
      bgcolor: cardBgColor,
      color: cardTextColor,
      '& .MuiInputLabel-root': { color: cardTextColor },
      '& .MuiSelect-root': { color: cardTextColor },
      '& .MuiSelect-icon': { color: cardTextColor },
      '& .MuiInput-root': { color: cardTextColor }
    }}>
      <CardContent>
        <FormControl style={{width: '100%'}}>
          <InputLabel id="export-algorithm-label">Destination</InputLabel>
          <Select
            value={ relayUrl}
            onChange={ handleChangeDestination.bind(this) }
            fullWidth
          >
            { relayOptions }
          </Select>
        </FormControl>


        <Input
          id='relayEndpointName'
          name='relayEndpointName'
          type='text'
          fullWidth
          /><br/>

        <Button
          color="primary"
          variant="contained"
          disabled={editorContent ? false : true}
          fullWidth
          onClick={handleRelay.bind(this)}
        >Send to Bundle Service</Button>

      </CardContent>
    </Card>
  </div>
  } 
  
  let proxyRelayElements;
  if(get(Meteor, 'settings.public.modules.proxyRelay') === true){
    proxyRelayElements = <div>
      <CardHeader
        title="Step 3c - Proxy Relay" />
      <Card disabled sx={{
        bgcolor: cardBgColor,
        color: cardTextColor,
        '& .MuiInputLabel-root': { color: cardTextColor },
        '& .MuiSelect-root': { color: cardTextColor },
        '& .MuiSelect-icon': { color: cardTextColor },
        '& .MuiInput-root': { color: cardTextColor }
      }}>
        <CardContent>
          <FormControl style={{width: '100%'}}>
            <InputLabel id="export-algorithm-label">Destination</InputLabel>
            <Select
              value={ relayUrl}
              onChange={ handleChangeDestination.bind(this) }
              fullWidth
            >
              { relayOptions }
            </Select>
          </FormControl>


          <Input
            id='relayEndpointName'
            name='relayEndpointName'
            type='text'
            fullWidth
            /><br/>

          <Button
            disabled={editorContent ? false : true}
            color="primary"
            variant="contained"
            fullWidth
            onClick={handleProxyRelay.bind(this)}
          >Send to Proxy to Relay</Button>

        </CardContent>
      </Card>
    </div>
  }

  let nextPageElements;
  if(get(Meteor, 'settings.public.defaults.dataExporterNextPageUrl', false)){
    let searchParams = new URLSearchParams(window.location.search);
    nextPageElements = <div>
      <CardHeader 
        title="Step 4 - Resume Workflow" />
      <Button
        color="primary"
        variant="contained" 
        fullWidth
        onClick={openPageUrl.bind(this, searchParams.get('next') ? searchParams.get('next') : get(Meteor, 'settings.public.defaults.dataExporterNextPageUrl', ''))}
      >Next</Button> 
    </div>
  }

  return(
    <div style={{"height": window.innerHeight, "overflow": "scroll", "paddingBottom": "128px" }}>          
      <Grid container spacing={3} >        
        <Grid item lg={4} style={{marginBottom: '84px'}}>
        <CardHeader
            title="Step 0 - Select Algorithm" />
          <Card sx={{
            bgcolor: cardBgColor,
            color: cardTextColor,
            '& .MuiInputLabel-root': { color: cardTextColor },
            '& .MuiSelect-root': { color: cardTextColor },
            '& .MuiSelect-icon': { color: cardTextColor },
            '& .MuiCheckbox-root': { color: cardTextColor },
            '& .MuiMenuItem-root': { color: cardTextColor }
          }}>
            <CardContent>
              <FormControl style={{width: '100%', paddingBottom: '20px'}}>
                <InputLabel id="export-algorithm-label">Export Algorithm</InputLabel>
                <Select
                  // labelId="export-algorithm-label"
                  id="export-algorithm-selector"
                  value={ exportFileType }
                  onChange={ handleChangeExportFileType }
                  fullWidth
                  sx={{
                    color: cardTextColor,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: cardBgColor,
                        color: cardTextColor,
                        '& .MuiMenuItem-root': {
                          color: cardTextColor,
                          '&:hover': {
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                          }
                        }
                      }
                    }
                  }}
                  >
                  <MenuItem value={1} sx={{display: 'flow-root'}} ><div style={{float:'left'}}>FHIR Bundle</div><div style={{float:'right'}}>.json</div></MenuItem>
                  <MenuItem value={2} sx={{display: 'flow-root'}} ><div style={{float:'left'}}>FHIR Bulk Data</div><div style={{float:'right'}}>.ndjson</div></MenuItem>
                  <MenuItem value={3} sx={{display: 'flow-root'}} ><div style={{float:'left'}}>Comma Separated Values (CSV)</div><div style={{float:'right'}}>.csv</div></MenuItem>
                  <MenuItem value={4} sx={{display: 'flow-root'}} ><div style={{float:'left'}}>Geojson</div><div style={{float:'right'}}>.geojson</div></MenuItem>
                  <MenuItem value={5} sx={{display: 'flow-root'}} ><div style={{float:'left'}}>Personal Health Record</div><div style={{float:'right'}}>.phr</div></MenuItem>
                </Select>
              </FormControl>

              <Checkbox
                checked={coverLetter}
                onChange={ handleToggleCoverLetter.bind(this)}
              />Ensure cover letter exists (Composition) <br />
              <Checkbox
                checked={patientSummary}
                onChange={ handleTogglePatientSummary.bind(this)}
              />Ensure International Patient Summary exists (Composition) <br />
              <Checkbox
                checked={tableOfContents}
                onChange={ handleToggleTableOfContents.bind(this)}
              />Ensure table of contents exists (DocumentManifest) <br />
              <Checkbox
                checked={includeSelectedPatient}
                onChange={ handleToggleIncludeSelectedPatient.bind(this)}
              />Add currently selected patient

            </CardContent>
          </Card>
          <DynamicSpacer />


          <CardHeader
            title="Step 1 - Select Data To Export" />
          <Card sx={{
            bgcolor: cardBgColor,
            color: cardTextColor,
            '& .MuiTableCell-root': {
              color: cardTextColor,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
            },
            '& .MuiCheckbox-root': { color: cardTextColor },
            '& .MuiTablePagination-root': { color: cardTextColor },
            '& .MuiTablePagination-selectLabel': { color: cardTextColor },
            '& .MuiTablePagination-displayedRows': { color: cardTextColor },
            '& .MuiSelect-icon': { color: cardTextColor },
            '& .MuiButton-root': { color: cardTextColor }
          }}>
            <CardContent>
              <CollectionManagement
                displayImportCheckmarks={false}
                displayExportCheckmarks={true}
                displayClientCount={true}
                displayExportButton={true}
                displayPreview={false}
                mode="export"
              />


            </CardContent>
          </Card>
          <DynamicSpacer />
          <Card sx={{
            bgcolor: cardBgColor,
            color: cardTextColor,
            '& .MuiCheckbox-root': { color: cardTextColor },
            '& .MuiInputLabel-root': { color: cardTextColor },
            '& .MuiInput-root': { color: cardTextColor }
          }}>
            <CardContent>
              <Checkbox
                defaultChecked={false}
                onChange={ handleToggleErrorFilter.bind(this)}
              />Filter Entered-in-Error records
              <Checkbox
                defaultChecked={patientFilterToggle}
                onChange={ handleTogglePatientFilter.bind(this)}
              />Filter By Patient
              <FormControl style={{width: '100%', marginTop: '20px', marginBottom: '20px'}}>
                <InputLabel id="patient-filter-label">Patient Filter</InputLabel>
                <Input
                  id="patient-filter-selector"
                  name='patientFilter'
                  placeholder={"Patient/" + Random.id()}
                  type='text'
                  value={patientFilterToggle ? patientFilter : ""}
                  disabled={!patientFilterToggle}
                  onChange={ handleChangePatientFilter.bind(this) }
                  fullWidth
                />
              </FormControl>
            </CardContent>
          </Card>
          <DynamicSpacer />
          <Button 
            id='exportCcdBtn' 
            color='primary'
            variant='contained'
            onClick={ prepareData.bind(this) }
            fullWidth
            disabled={editorContent ? true : false}
          >Prepare data</Button>   
        </Grid>  
        <Grid item lg={4} style={{width: '100%', height: editCardHeight + 'px', marginBottom: '84px'}}>
          <CardHeader
            title="Step 2 - Review and Edit" />

          <Card sx={{
            bgcolor: cardBgColor,
            color: cardTextColor,
            '& .MuiButton-root': { color: cardTextColor }
          }}>
            <CardContent>
            
            
              <AceEditor
                // placeholder="Placeholder Text"
                mode="json"
                theme={themeMode === 'light' ? "tomorrow" : "monokai"}
                name="exportBuffer"
                onChange={ handleEditorUpdate.bind(this) }
                fontSize={14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                value={ editorContent }
                defaultValue={ editorContent }
                setOptions={{
                  enableBasicAutocompletion: false,
                  enableLiveAutocompletion: false,
                  enableSnippets: false,
                  showLineNumbers: true,
                  tabSize: 2
                }}
                style={{width: '100%', position: 'relative', height: editorHeight + 'px', minHeight: '200px', borderRadius: '4px', lineHeight: '16px'}}        
              />

              {/* <pre 
                id="dropzonePreview"
                style={{width: '100%', position: 'relative', height: (Session.get('appHeight') - 240).toString() + 'px', borderRadius: '4px', lineHeight: '16px', overflow: 'scroll'}} 
              >
                { typeof exportBuffer === "object" ? JSON.stringify(exportBuffer, null, 2) : exportBuffer }
              </pre> */}

            </CardContent>
            <CardActions>
              <Button id="clearExportBuffer" color="primary" onClick={clearExportBuffer.bind(this)} >Clear</Button>            
            </CardActions>
          </Card>
          <DynamicSpacer />

          
        </Grid>
        <Grid item lg={4} style={rightColumnStyle}>
          { nextPageElements}          
          <DynamicSpacer />

          <CardHeader
            title="Step 3 - Select File Type and Download" />
          <Card sx={{
            bgcolor: cardBgColor,
            color: cardTextColor,
            '& .MuiInputLabel-root': { color: cardTextColor },
            '& .MuiInput-root': { color: cardTextColor }
          }}>
            <CardContent>

              { fileNameInput }

              {/* <FormControl style={{width: '100%', paddingBottom: '20px'}}>
                <InputLabel id="export-algorithm-label">Export Algorithm</InputLabel>
                <Select
                  // labelId="export-algorithm-label"
                  id="export-algorithm-selector"
                  value={ exportFileType }
                  onChange={ handleChangeExportFileType }
                  fullWidth
                  >
                  <MenuItem value={1} >FHIR Bundle - Mixed Mode</MenuItem>
                  <MenuItem value={2} disabled >FHIR Bundle - R4</MenuItem>
                  <MenuItem value={3} disabled >FHIR Bundle - DSTU2</MenuItem>
                  <MenuItem value={4} >Geojson</MenuItem>
                  <MenuItem value={5} >Comma Separated Values (CSV)</MenuItem>
                  <MenuItem value={6} >FHIR Shorthand (FSH)</MenuItem>
                </Select>
              </FormControl>

              <Checkbox 
                defaultChecked={false} 
                onChange={ handleToggleErrorFilter.bind(this)} 
              />Ensure cover letter exists (Composition) <br />
              <Checkbox 
                defaultChecked={false} 
                onChange={ handleToggleErrorFilter.bind(this)} 
              />Ensure table of contents exists (DocumentManifest) */}


              {/* <br/> */}
              {/* <Toggle onToggle={this.toggleEncryptExport.bind(this) } toggled={get(this, 'data.encryptExport')} label="Encrypt" labelPosition='right' /><br /> */}

                

              { downloadAnchor }             
              <a id="downloadAnchorElement" style={{display: "none"}} ></a>   
            </CardContent>
          </Card>
          <DynamicSpacer />
          { relayElements}
          <DynamicSpacer />
          { proxyRelayElements}          
        </Grid>
      </Grid>
    </div>
  );
}
export default ExportComponent;