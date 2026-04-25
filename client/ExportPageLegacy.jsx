// packages/data-exporter/client/ExportPageLegacy.jsx
//
// Legacy 4-step export UI, preserved as fallback at /export-data-legacy.
// Original ExportPage.jsx renamed.

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

export function ExportPageLegacy(props){
  const theme = useTheme();
  const appTheme = useAppTheme ? useAppTheme() : { theme: 'light' };

  return(
    <div id="ExportPageLegacy" style={{
      padding: '20px',
      minHeight: window.innerHeight
    }}>
      <ExportComponent history={props.history} />
    </div>
  );
}

export default ExportPageLegacy;
