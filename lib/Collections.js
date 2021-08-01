
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import moment from 'moment';
import { get } from 'lodash';

import { FhirUtilities } from 'meteor/clinical:hl7-fhir-data-infrastructure';

if(Meteor.isClient){  
  ExportCursor = new Mongo.Collection('ExportCursor', {connection: null});
}

