// extensions/data-exporter/server/methods.export.js
//
// Snapshot fetch for the Clinical Scenario exporter. Exports want snapshot
// semantics, not live pub/sub: deployments routinely run with
// settings.private.fhir.autopublishSubscriptions = false (no autopublish.*
// publications exist at all), and even when enabled those publications clamp
// at settings.public.defaults.subscriptionLimit (default 1000) — a silent
// truncation an export must never inherit.
//
// PHI posture: patient-scoped (compartment) collections are refused here —
// the exporter reads those from the client cache, which is fed only by the
// patient-filtered publications. This method serves structural/terminology/
// administrative collections wholesale to authenticated users.
import { Meteor } from 'meteor/meteor';
import { get } from 'lodash';

const log = (Meteor.Logger ? Meteor.Logger.for('data-exporter') : console);

// Mirrors the PATIENT_SCOPED_RESOURCES set in server/publications/autopublish.js
// (literal copy by package convention — see data-importer's methods.warehouse.js).
const PATIENT_SCOPED_COLLECTIONS = [
  'AllergyIntolerances', 'Appointments', 'BodyStructures', 'CarePlans',
  'CareTeams', 'ClinicalImpressions', 'Communications', 'Compositions',
  'Conditions', 'Consents', 'DetectedIssues', 'DiagnosticReports',
  'DocumentReferences', 'Encounters', 'ExplanationOfBenefits', 'Goals',
  'Immunizations', 'ImagingStudies', 'MedicationAdministrations',
  'MedicationRequests', 'MedicationStatements', 'MolecularSequences',
  'NutritionIntakes', 'NutritionOrders', 'Observations', 'Procedures',
  'QuestionnaireResponses', 'RiskAssessments', 'Schedules',
  'ServiceRequests', 'Specimens', 'SupplyDeliveries', 'SupplyRequests',
  'Tasks'
];

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 20000;

Meteor.ServerMethods.define('exportData.fetchCollection', {
  description: 'Snapshot-fetch a non-patient-scoped collection for the Clinical Scenario exporter',
  requireAuth: true
}, async function(params, context) {
  const collectionName = String(get(params, 'collectionName', '')).trim();
  if (!collectionName || !/^[A-Za-z]+$/.test(collectionName)) {
    throw new Meteor.Error('invalid-collection', 'collectionName must be a plain collection name');
  }
  if (PATIENT_SCOPED_COLLECTIONS.indexOf(collectionName) !== -1) {
    throw new Meteor.Error('patient-scoped',
      collectionName + ' is a patient-compartment collection — load it through a patient-scoped view instead.');
  }

  const collection = get(global, 'Collections.' + collectionName) ||
    get(Meteor, 'Collections.' + collectionName);
  if (!collection || typeof collection.find !== 'function') {
    throw new Meteor.Error('collection-not-found', 'No server collection named ' + collectionName);
  }

  const requested = Number(get(params, 'limit', DEFAULT_LIMIT)) || DEFAULT_LIMIT;
  const limit = Math.min(Math.max(requested, 1), MAX_LIMIT);

  const resources = await collection.find({}, { limit: limit }).fetchAsync();
  const total = await collection.find({}).countAsync();
  const truncated = total > resources.length;

  if (truncated) {
    log.warn('exportData.fetchCollection truncated', { collectionName, total, returned: resources.length, limit });
  }
  log.info('exportData.fetchCollection', { collectionName, returned: resources.length, total, userId: get(context, 'userId', null) });

  return { resources: resources, total: total, truncated: truncated };
});
