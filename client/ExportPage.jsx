// https://www.npmjs.com/package/react-dropzone-component
// http://www.dropzonejs.com/

import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';

import { Session } from 'meteor/session';
import { Meteor } from 'meteor/meteor';

import { get } from 'lodash';

import { ExportComponent } from './ExportComponent';



//============================================================================
// Main Component  

export function ExportPage(props){

  return(
    <div id="ExportPage" style={{padding: '20px'}}>
      <ExportComponent history={props.history} />
    </div>
  );
}



export default ExportPage;