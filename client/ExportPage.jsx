// /Volumes/SonicMagic/Code/honeycomb-public-release/packages/data-exporter/client/ExportPage.jsx
// https://www.npmjs.com/package/react-dropzone-component
// http://www.dropzonejs.com/

import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';

import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';

import { get } from 'lodash';
import { useTheme } from '@mui/material/styles';

import { ExportComponent } from './ExportComponent';

let useAppTheme;
Meteor.startup(function(){
  useAppTheme = Meteor.useTheme;
})


//============================================================================
// Main Component  

export function ExportPage(props){
  const theme = useTheme();
  const appTheme = useAppTheme ? useAppTheme() : { theme: 'light' };

  return(
    <div id="ExportPage" style={{
      padding: '20px',
      minHeight: window.innerHeight
    }}>
      <ExportComponent history={props.history} />
    </div>
  );
}



export default ExportPage;