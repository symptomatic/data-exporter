

import { get, set, has, cloneDeep } from 'lodash';
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';

import moment from 'moment';

import PapaParse from 'papaparse';
const CSV = PapaParse;

let FhirDehydrator;
let FhirUtilities;

Meteor.startup(function(){
  FhirDehydrator = Meteor.FhirDehydrator;
  FhirUtilities = Meteor.FhirUtilities;
})

if(Package["meteor/alanning:roles"]){
  import { Roles } from 'meteor/alanning:roles';
}



//====================================================================================
// Data Cursors
//
// Want to enable all of these eventually.  But for now, just the ones that are used in the IPF.
// Should we tree shake this list, based on whats in Meteor.settings or a /metadata CapabilityStatement?
//

// let AllergyIntolerances;
let CarePlans;
// let CareTeams;
let Consents;
let Compositions;
let Conditions;
// let Devices;
let Encounters;
let Goals;
let Immunizations;
// let Locations;
// let Medications;
// let MedicationRequests;
let Observations;
let Procedures;
let Patients;
// let Questionnaires;
let QuestionnaireResponses;

Meteor.startup(async function(){
//   AllergyIntolerances = window.Collections.AllergyIntolerances;
  CarePlans = window.Collections.CarePlans;
//   CareTeams = window.Collections.CareTeams;
  Consents = window.Collections.Consents;
  Compositions = window.Collections.Compositions;
  Conditions = window.Collections.Conditions;
//   Devices = window.Collections.Devices;
  Encounters = window.Collections.Encounters;
  Goals = window.Collections.Goals;
  Immunizations = window.Collections.Immunizations;
//   Locations = window.Collections.Locations;
//   Medications = window.Collections.Medications;
//   MedicationRequests = window.Collections.MedicationRequests;
  Observations = window.Collections.Observations;
  Patients = window.Collections.Patients;
  Procedures = window.Collections.Procedures;
//   Questionnaires = window.Collections.Questionnaires;
  QuestionnaireResponses = window.Collections.QuestionnaireResponses;
})

//====================================================================================

MedicalRecordsExporter = {
  exportJson(collectionName){
    let exportBuffer;
    console.log("Generating JSON export file for " + collectionName + ' collection');

    let resourcesArray = [];
    let resourceFile;

    if(Meteor.isClient){
      resourcesArray = window[collectionName].find().fetch()
    }

    console.log(collectionName + " Array:", resourcesArray);

    return resourcesArray;
  },
  exportCsv(collectionName){
    let exportBuffer;
    console.log("Generating CSV export file for " + collectionName + ' collection');

    let resourcesArray = [];
    let resourceFile;

    if(Meteor.isClient){
      window[collectionName].find().forEach(function(resource){
        resourcesArray.push(FhirDehydrator.flatten(collectionName, resource));
      });
    }


    console.log(collectionName + " Array:", resourcesArray);

    let resourcesCSv = CSV.unparse(resourcesArray)
    console.log(collectionName + " CSV:", resourcesCSv);

    return resourcesCSv;
  },
  generateTableOfContents(){
    let newDocumentManifest = {
      "resourceType": "DocumentManifest",
      "status": "current"
    }

    return newDocumentManifest;
  },
  generateCoverPage(filterString, patient){
    console.log('Generating cover page...', filterString)

    if(!patient){
      patient = Patients.findOne({id: filterString});
    }
    
    console.log('Found patient', patient)

    let newCoverPage = {
      "resourceType": "Composition",
      "status" : "preliminary", 
      "subject" : { 
        "display": FhirUtilities.pluckName(patient),
        "reference": get(patient, 'id', '')
      }, 
      // "encounter" : { 
      //   "display": '',
      //   "reference": ''
      //  }, 
      "date" : moment().format("YYYY-MM-DD"), 
      "author" : [{ 
        "display": FhirUtilities.pluckName(patient),
        "reference": get(patient, 'id', '')
      }], 
      "title" : "Continuity of Care Document", 
      // "confidentiality" : "0", 
      // "attester" : [],
      // "custodian" : { 
      //   "display": '',
      //   "reference": ''
      // }, 
      // "relatesTo" : [],
      // "event" : [],
      "section" : []
    };



    if(typeof Roles === "object"){
      if(Roles.userIsInRole(Meteor.userId(), 'patient')){
        set(newCoverPage, 'resource.subject.display', Meteor.user().fullName())
        set(newCoverPage, 'resource.subject.reference', 'Patient/' + Meteor.userId())
  
        set(newCoverPage, 'resource.author.display', Meteor.user().fullName())
        set(newCoverPage, 'resource.author.reference', 'Patient/' + Meteor.userId())
      }
  
      if(Roles.userIsInRole(Meteor.userId(), 'practitioner')){
        if(Patients.findOne()){
          set(newCoverPage, 'resource.subject.display', Meteor.user().fullName())
          set(newCoverPage, 'resource.subject.reference', 'Patient/' + Meteor.userId())
        }
  
        set(newCoverPage, 'resource.author.display', Meteor.user().fullName())
        set(newCoverPage, 'resource.author.reference', 'Practitioner/' + Meteor.userId())
      }  
    }

    
    return newCoverPage;
  },
  generateIps(filterString, patient){
    console.log('Generating IPS document...', filterString)

    if(!patient){
      patient = Patients.findOne({id: filterString});
    }
    
    console.log('Found patient', patient)

    let newCoverPage = {
      "resourceType": "Composition",
      "status" : "preliminary", 
      "subject" : { 
        "display": FhirUtilities.pluckName(patient),
        "reference": get(patient, 'id', '')
      }, 
      "date" : moment().format("YYYY-MM-DD"), 
      "author" : [{ 
        "display": FhirUtilities.pluckName(patient),
        "reference": get(patient, 'id', '')
      }], 
      "title" : "International Patient Summary", 
      "section" : []
    };


    if(typeof Roles === "object"){
      if(Roles.userIsInRole(Meteor.userId(), 'patient')){
        set(newCoverPage, 'resource.subject.display', Meteor.user().fullName())
        set(newCoverPage, 'resource.subject.reference', 'Patient/' + Meteor.userId())
  
        set(newCoverPage, 'resource.author.display', Meteor.user().fullName())
        set(newCoverPage, 'resource.author.reference', 'Patient/' + Meteor.userId())
      }
  
      if(Roles.userIsInRole(Meteor.userId(), 'practitioner')){
        if(Patients.findOne()){
          set(newCoverPage, 'resource.subject.display', Meteor.user().fullName())
          set(newCoverPage, 'resource.subject.reference', 'Patient/' + Meteor.userId())
        }
  
        set(newCoverPage, 'resource.author.display', Meteor.user().fullName())
        set(newCoverPage, 'resource.author.reference', 'Practitioner/' + Meteor.userId())
      }  
    }

    

    
    return newCoverPage;
  },
  exportBulkData(filterString, excludeEnteredInError, includeCoverLetter, includeTableOfContents, patient){
    console.log('Exporting FHIR Bulk Data...', filterString, excludeEnteredInError);
    if(typeof filterString !== "string"){
      console.log('filterString.target.value', get(filterString, 'target.value', ''));
    }

    let fhirEntries = [];
    let exportFile = "";


    let newCoverPage;
    let newTableOfContents;
    
    

    let defaultQuery = {};
    if(typeof filterString === "string"){
      defaultQuery = {$or: [
        {'patient.reference': {$regex: filterString}},
        {'subject.reference': {$regex: filterString}}
      ], 
      'code.text': {$not: 'Error'}}
    }

    if(includeCoverLetter){
      newCoverPage = MedicalRecordsExporter.generateCoverPage(filterString);
      console.log('generated cover page...', newCoverPage)
      if(filterString){
        let patient = Patients.findOne({id: filterString});
        if(patient){
          set(newCoverPage, 'resource.author[0].display', get(patient, 'name[0].text', ''))
          set(newCoverPage, 'resource.author[0].reference', 'Patient/' + get(patient, 'id', ''))    
        } else {
          console.log('patient not found...')
        }
      }
  
      console.log('Generating new Composition template', newCoverPage);  
    }    
    if(includeTableOfContents){
      newTableOfContents = MedicalRecordsExporter.generateTableOfContents(filterString);
    }


    let toggleStates = Session.get('toggleExportStates');
    if(toggleStates){
      console.log('Successfull fetched toggle states to determine which collections to export.', toggleStates);

      if((typeof Patients === "object") && toggleStates.Patient){
        let patientQuery = {};
        if(filterString){
          patientQuery = {
            id: filterString
          }
        }
        Patients.find(patientQuery).forEach(function(patient){
          delete patient._document;
          fhirEntries.push(patient)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Patient/" + patient.id
            })  
          }
        })
      }

      if((typeof AllergyIntolerances === "object") && toggleStates.AllergyIntollerance){
        let allergyQuery = defaultQuery;
        AllergyIntolerances.find(allergyQuery).forEach(function(allergy){
          delete allergy._document;
          fhirEntries.push(allergy)
          if(newCoverPage){
            newCoverPage.section.push({
              entry: [{
                reference: "AllergyIntolerance/" + allergy.id
              }]
            })  
          }          
        })
      }
      if((typeof CarePlans === "object") && toggleStates.CarePlan){
        let carePlanQuery = defaultQuery;
        CarePlans.find(carePlanQuery).forEach(function(careplan){
          delete careplan._document;
          fhirEntries.push(careplan)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "CarePlan/" + careplan.id
            })              
          }
        })
      }
      if((typeof Conditions === "object") && toggleStates.Condition){

        let conditionsQuery = defaultQuery;
        if(Session.get('hideEnteredInError')){          
          conditionsQuery.verificationStatus = {$nin: ["entered-in-error"]}  // unconfirmed | provisional | differential | confirmed | refuted | entered-in-error
        }
  
        Conditions.find(conditionsQuery).forEach(function(condition){
          delete condition._document;
          fhirEntries.push(condition)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Condition/" + condition.id
            })              
          }
        })
      }
      if((typeof Consents === "object") && toggleStates.Consent){
        let consentsQuery = defaultQuery;
        Consents.find(consentsQuery).forEach(function(consent){
          delete consent._document;
          fhirEntries.push(consent)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Consent/" + consent.id
            })              
          }
        })
      }    
      if((typeof Claims === "object") && toggleStates.Claim){
        let claimsQuery = defaultQuery;
        Claims.find(claimsQuery).forEach(function(claim){
          delete claim._document;
          fhirEntries.push(claim)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Claim/" + claim.id
            })              
          }
        })
      }
      if((typeof ClinicalDocuments === "object") && toggleStates.ClinicalDocument){
        let clinicalDocumentsQuery = defaultQuery;
        ClinicalDocuments.find(clinicalDocumentsQuery).forEach(function(clinicalDocument){
          delete clinicalDocument._document;
          fhirEntries.push(clinicalDocument)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "ClinicalDocument/" + clinicalDocument.id
            })              
          }
        })
      }
      if((typeof Communications === "object") && toggleStates.Communication){
        let communicationsQuery = defaultQuery;
        Communications.find(communicationsQuery).forEach(function(communication){
          delete communication._document;
          fhirEntries.push(communication)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Communication/" + communication.id
            })              
          }
        })
      }
      if((typeof CommunicationRequests === "object") && toggleStates.CommunicationRequest){
        let communicationRequestsQuery = defaultQuery;
        CommunicationRequests.find(communicationRequestsQuery).forEach(function(communicationRequest){
          delete communicationRequest._document;
          fhirEntries.push(communicationRequest)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "CommunicationRequest/" + communicationRequest.id
            })              
          }
        })
      }
      if((typeof Compositions === "object") && toggleStates.Composition){
        let communicationsQuery = defaultQuery;
        Compositions.find(communicationsQuery).forEach(function(composition){
          delete composition._document;
          fhirEntries.push(composition)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Composition/" + composition.id
            })              
          }
        })
      }
      if((typeof Contracts === "object") && toggleStates.Contract){
        let contractsQuery = defaultQuery;
        Contracts.find(contractsQuery).forEach(function(contract){
          delete contract._document;
          fhirEntries.push(contract)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Contract/" + contract.id
            })              
          }
        })
      }
      if((typeof ClinicalImpressionss === "object") && toggleStates.ClinicalImpression){
        let clinicalImpressionsQuery = defaultQuery;
        ClinicalImpressionss.find(clinicalImpressionsQuery).forEach(function(clinicalImpression){
          delete clinicalImpression._document;
          fhirEntries.push(clinicalImpression)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "ClinicalImpressions/" + clinicalImpression.id
            })              
          }
        })
      }
      if((typeof Devices === "object") && toggleStates.Device){
        let devicesQuery = {};
        Devices.find(devicesQuery).forEach(function(device){
          delete device._document;
          fhirEntries.push(device)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Device/" + device.id
            })              
          }
        })
      }

      if((typeof DocumentReferences === "object") && toggleStates.DocumentReference){
        let documentReferencesQuery = {};
        DocumentReferences.find(documentReferencesQuery).forEach(function(documentReference){
          delete documentReference._document;
          fhirEntries.push(documentReference)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "DocumentReference/" + documentReference.id
            })              
          }
        })
      }
      if((typeof DocumentManifests === "object") && toggleStates.DocumentManifest){
        let documentReferencesQuery = {};
        DocumentManifests.find(documentReferencesQuery).forEach(function(documentManifest){
          delete documentManifest._document;
          fhirEntries.push(documentManifest)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "DocumentManifest/" + documentManifest.id
            })              
          }
        })
      }

      if((typeof DiagnosticReports === "object") && toggleStates.DiagnosticReport){
        let diagnosticReportsQuery = defaultQuery;
        DiagnosticReports.find(diagnosticReportsQuery).forEach(function(diagnosticReport){
          delete diagnosticReport._document;
          fhirEntries.push(diagnosticReport)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "DiagnosticReport/" + diagnosticReport.id
            })              
          }
        })
      }
      if((typeof DocumentReferences === "object") && toggleStates.DocumentReference){
        let documentReferencesQuery = defaultQuery;
        DocumentReferences.find(documentReferencesQuery).forEach(function(documentReference){
          delete documentReference._document;
          fhirEntries.push(documentReference)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "DocumentReference/" + documentReference.id
            })              
          }
        })
      }
      if((typeof ExplanationOfBenefits === "object") && toggleStates.ExplanationOfBenefit){
        let explanationOfBenefitsQuery = defaultQuery;
        ExplanationOfBenefits.find(explanationOfBenefitsQuery).forEach(function(explanationOfBenefit){
          delete explanationOfBenefit._document;
          fhirEntries.push(explanationOfBenefit)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "ExplanationOfBenefit/" + explanationOfBenefit.id
            })              
          }
        })
      }
      if((typeof Encounters === "object") && toggleStates.Encounter){
        let encountersQuery = defaultQuery;
        Encounters.find(encountersQuery).forEach(function(encounter){
          delete encounter._document;
          fhirEntries.push(encounter)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Encounter/" + encounter.id
            })              
          }
        })
      }
      if((typeof Goals === "object") && toggleStates.goals){
        let goalsQuery = defaultQuery;
        Goals.find(goalsQuery).forEach(function(goal){
          delete goal._document;
          fhirEntries.push(goal)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Goal/" + goal.id
            })              
          }
        })
      }
      if((typeof Immunizations === "object") && toggleStates.Immunization){
        let immunizationsQuery = defaultQuery;
        Immunizations.find(immunizationsQuery).forEach(function(immunization){
          delete immunization._document;
          fhirEntries.push(immunization)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Immunization/" + immunization.id
            })              
          }
        })
      }
      if((typeof ImagingStudies === "object") && toggleStates.ImagingStudy){
        let imagingStudiesQuery = defaultQuery;
        ImagingStudies.find(imagingStudiesQuery).forEach(function(imagingStudy){
          delete imagingStudy._document;
          fhirEntries.push(imagingStudy)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "ImagingStudies/" + imagingStudy.id
            })              
          }
        })
      }
      if((typeof Locations === "object") && toggleStates.Location){
        let locationsQuery = {};
        Locations.find(locationsQuery).forEach(function(location){
          delete location._document;
          fhirEntries.push(location)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Location/" + location.id
            })              
          }
        })
      }
      if((typeof Lists === "object") && toggleStates.List){
        let listsQuery = {};
        Lists.find(listsQuery).forEach(function(list){
          delete list._document;
          fhirEntries.push(list)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "List/" + list.id
            })              
          }
        })
      }
      if((typeof Measures === "object") && toggleStates.Measure){
        let measuresQuery = {};
        Measures.find(measuresQuery).forEach(function(measure){
          delete measure._document;
          fhirEntries.push(measure)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Measure/" + measure.id
            })              
          }
        })
      }      
      if((typeof MeasureReports === "object") && toggleStates.MeasureReport){
        let measureReportsQuery = {};
        MeasureReports.find(measureReportsQuery).forEach(function(measureReport){
          delete measureReport._document;
          fhirEntries.push(measureReport)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "MeasureReport/" + measureReport.id
            })              
          }
        })
      }

      if((typeof Medications === "object") && toggleStates.Medication){
        let medicationsQuery = defaultQuery;
        Medications.find(medicationsQuery).forEach(function(medication){
          delete medication._document;
          fhirEntries.push(medication)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Medication/" + medication.id
            })              
          }
        })
      }
      if((typeof MedicationOrders === "object") && toggleStates.MedicationOrder){
        let medicationOrdersQuery = defaultQuery;
        MedicationOrders.find(medicationOrdersQuery).forEach(function(medicationOrder){
          delete medicationOrder._document;
          fhirEntries.push(medicationOrder)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "MedicationOrder/" + medicationOrder.id
            })              
          }
        })
      }
      if((typeof MedicationStatements === "object") && toggleStates.MedicationStatement){
        let medicationStatementsQuery = defaultQuery;
        MedicationStatements.find(medicationStatementsQuery).forEach(function(medicationStatement){
          delete medicationStatement._document;
          fhirEntries.push(medicationStatement)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "MedicationStatement/" + medicationStatement.id
            })              
          }
        })
      }
      if((typeof MessageHeaders === "object") && toggleStates.MessageHeader){
        let messageHeaderQuery = {};
        MessageHeaders.find(messageHeaderQuery).forEach(function(messageHeader){
          delete messageHeader._document;
          fhirEntries.push(messageHeader)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "MessageHeader/" + messageHeader.id
            })              
          }
        })
      }
      if((typeof Observations === "object") && toggleStates.Observation){
        let observationQuery = defaultQuery;
        Observations.find(observationQuery).forEach(function(observation){
          delete observation._document;
          fhirEntries.push(observation)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Observation/" + observation.id
            })              
          }
        })
      }
      if((typeof Organizations === "object") && toggleStates.Organization){
        let organizationQuery = {};
        Organizations.find(organizationQuery).forEach(function(organization){
          delete organization._document;
          fhirEntries.push(organization)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Organization/" + organization.id
            })              
          }
        })
      }
      
      if((typeof Persons === "object") && toggleStates.Person){
        let personsQuery = {};
        Persons.find(personsQuery).forEach(function(person){
          delete person._document;
          fhirEntries.push(person)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Person/" + person.id
            })              
          }
        })
      }
      if((typeof Practitioners === "object") && toggleStates.Practitioner){
        let practitionersQuery = {};
        Practitioners.find(practitionersQuery).forEach(function(practitioner){
          delete practitioner._document;
          fhirEntries.push(practitioner)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Practitioner/" + practitioner.id
            })              
          }
        })
      }
      if((typeof Procedures === "object") && toggleStates.Procedure){
        let proceduresQuery = defaultQuery;
        Procedures.find(proceduresQuery).forEach(function(procedure){
          delete procedure._document;
          fhirEntries.push(procedure)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Procedure/" + procedure.id
            })              
          }
        })
      }
      if((typeof Questionnaires === "object") && toggleStates.Questionnaire){
        let questionnairesQuery = {};
        Questionnaires.find(questionnairesQuery).forEach(function(questionnaire){
          delete questionnaire._document;
          fhirEntries.push(questionnaire)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Questionnaire/" + questionnaire.id
            })              
          }
        })
      }
      if((typeof QuestionnaireResponses === "object") && toggleStates.QuestionnaireResponse){
        let questionnaireResponsesQuery = defaultQuery;
        QuestionnaireResponses.find(questionnaireResponsesQuery).forEach(function(questionnaireResponse){
          delete questionnaireResponse._document;
          fhirEntries.push(questionnaireResponse)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "QuestionnaireResponse/" + questionnaireResponse.id
            })              
          }
        })
      }
      if((typeof RiskAssessments === "object") && toggleStates.RiskAssessment){
        let riskAssessmentsQuery = defaultQuery;
        RiskAssessments.find(riskAssessmentsQuery).forEach(function(riskAssessment){
          delete riskAssessment._document;
          fhirEntries.push(riskAssessment)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "RiskAssessment/" + riskAssessment.id
            })              
          }
        })
      }
      if((typeof Sequences === "object") && toggleStates.Sequence){
        let sequencesQuery = defaultQuery;
        Sequences.find(sequencesQuery).forEach(function(sequence){
          delete sequence._document;
          fhirEntries.push(sequence)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Sequence/" + sequence.id
            })              
          }
        })
      }
      if((typeof ServiceRequests === "object") && toggleStates.ServiceRequest){
        let serviceRequestsQuery = defaultQuery;
        ServiceRequests.find(serviceRequestsQuery).forEach(function(serviceRequest){
          delete serviceRequest._document;
          fhirEntries.push(serviceRequest)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "ServiceRequest/" + serviceRequest.id
            })              
          }
        })
      }
      if((typeof Tasks === "object") && toggleStates.Task){
        let tasksQuery = defaultQuery;
        Tasks.find(tasksQuery).forEach(function(task){
          delete task._document;
          fhirEntries.push(task)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "Task/" + task.id
            })              
          }
        })
      }
      if((typeof ValueSets === "object") && toggleStates.ValueSet){
        let valueSetsQuery = defaultQuery;
        ValueSets.find(valueSetsQuery).forEach(function(valueSet){
          delete valueSet._document;
          fhirEntries.push(valueSet)
          if(newCoverPage){
            newCoverPage.section.push({
              reference: "ValueSet/" + valueSet.id
            })              
          }
        })
      }
    }

    if(includeCoverLetter){
      exportFile = exportFile + JSON.stringify(newCoverPage) + "\n";  
    }
    if(includeTableOfContents){
      exportFile = exportFile + JSON.stringify(newTableOfContents) + "\n";  
    }


    console.log('Adding resource entries to Bundle.');    
    if(Array.isArray(fhirEntries)){
      fhirEntries.forEach(function(fhirResource){        
        exportFile = exportFile + JSON.stringify(fhirResource) + "\n";  
      })      
    }


    Session.set('exportBuffer', exportFile);        
      
    // try {
    //   Session.set('exportBuffer', exportFile);          
    // } catch (error) {
    //   console.log('Export file too big for buffer', error)
    // }

    // return exportFile;
  },
  exportContinuityOfCareDoc(filterString, excludeEnteredInError, includeCoverLetter, includeTableOfContents, includePatientSummary, patient){
    console.log('Exporting a Continuity Of Care Document', filterString, excludeEnteredInError, includeTableOfContents, includePatientSummary, patient);

    if(typeof includePatientSummary === "object"){
      console.warn('Please upgrade to v0.11.16 or later.  patientSummary should be a boolean, not an object.')
    } else {
      if(typeof filterString !== "string"){
        console.log('filterString.target.value', ilterString.target.value);
      }
  
      let fhirEntries = [];
      let exportBundle = {
        resourceType: "Bundle",
        type: "transaction",
        total: 0,
        entry: []
      }
  
      let newCoverPage = {
        fullUrl: "Composition/" + Random.id(),
        resource: MedicalRecordsExporter.generateCoverPage(filterString, patient),
        request: {
          method: "PUT",
          url: "Composition"
        }
      }

      let newInternationalPatientSummary = {
        fullUrl: "Composition/" + Random.id(),
        resource: MedicalRecordsExporter.generateIps(filterString, patient),
        request: {
          method: "PUT",
          url: "Composition"
        }
      }

      let defaultQuery = {};
      if(filterString){
        if(!patient){
          patient = Patients.findOne({id: filterString});
        }
        
        set(newCoverPage, 'subject.display', FhirUtilities.pluckName(patient))
        set(newCoverPage, 'subject.reference', 'Patient/' + get(patient, 'id', ''))
  
        set(newCoverPage, 'author[0].display', FhirUtilities.pluckName(patient))
        set(newCoverPage, 'author[0].reference', 'Patient/' + get(patient, 'id', ''))
  
        defaultQuery = {$or: [
          {'patient.reference': {$regex: filterString}},
          {'subject.reference': {$regex: filterString}}
        ], 
        'code.text': {$not: 'Error'}}
      }
  
      console.log('Generating new Cover Page', newCoverPage);
      console.log('Generating new International Patient Summary', newInternationalPatientSummary);
  
     
      

  
      let toggleStates = Session.get('toggleExportStates');
      if(toggleStates){
        console.log('Successfull fetched toggle states to determine which collections to export.', toggleStates);
  
        if((typeof Patients === "object") && toggleStates.Patient){
          let patientQuery = {};
          if(filterString){
            patientQuery = {
              id: filterString
            }
          }
          

          let sectionEntries = {
            entry: []
          }

          Patients.find(patientQuery).forEach(function(patient){
            delete patient._document;
            fhirEntries.push({
              fullUrl: "Patient/" + patient.id,
              resource: patient,
              request: {
                method: "PUT",
                url: "Patient/" + patient.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Patient/" + patient.id
            })
            sectionEntries.entry.push({
              reference: "Patient/" + patient.id
            })
          })
          // newInternationalPatientSummary.resource.section.push(sectionEntries)
        }
  
        if((typeof AllergyIntolerances === "object") && toggleStates.AllergyIntollerance){
          let allergyQuery = defaultQuery;

          let sectionAllergies = {
            title: 'IPS Allergies and Intolerances',
            entry: []
          }
          AllergyIntolerances.find(allergyQuery).forEach(function(allergy){
            delete allergy._document;
            fhirEntries.push({
              fullUrl: "AllergyIntolerance/" + allergy.id,
              resource: allergy,
              request: {
                method: "PUT",
                url: "AllergyIntolerance/" + allergy.id
              }
            })
            newCoverPage.resource.section.push({
              entry: [{
                reference: "AllergyIntolerance/" + allergy.id
              }]
            })    
            sectionAllergies.entry.push({
              reference: "AllergyIntolerance/" + allergy.id
            })      
          })
          newInternationalPatientSummary.resource.section.push(sectionAllergies)
        }


        if((typeof CarePlans === "object") && toggleStates.CarePlan){
          let carePlanQuery = defaultQuery;

          let sectionPlanOfCare = {
            title: "IPS Plan of Care",
            entry: []
          }

          CarePlans.find(carePlanQuery).forEach(function(careplan){
            delete careplan._document;
            fhirEntries.push({
              fullUrl: "CarePlan/" + careplan.id,
              resource: careplan,
              request: {
                method: "PUT",
                url: "CarePlan/" + careplan.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "CarePlan/" + careplan.id
            })
            sectionPlanOfCare.entry.push({
              reference: "CarePlan/" + careplan.id
            })  
          })
          newInternationalPatientSummary.resource.section.push(sectionPlanOfCare)
        }
        // if((typeof Claims === "object") && toggleStates.claims){
        //   Claims.find().forEach(function(claim){
        //     delete claim._document;
        //     fhirEntries.push({
        //       fullUrl: "Claim/" + claim.id,
        //       resource: claim
        //     })
        //     newCoverPage.resource.section.push({
        //       reference: "Claim/" + claim.id
        //     })
        //   })
        // }
        
        if((typeof Conditions === "object") && toggleStates.Condition){
  
          let conditionsQuery = defaultQuery;
          if(Session.get('hideEnteredInError')){          
            conditionsQuery.verificationStatus = {$nin: ["entered-in-error"]}  // unconfirmed | provisional | differential | confirmed | refuted | entered-in-error
          }
    
          let sectionProblems = {
            title: 'IPS Problems',
            entry: []
          }
          let sectionPastIllnessHx = {
            title: 'IPS History of Past Illness',
            entry: []
          }

          Conditions.find(conditionsQuery).forEach(function(condition){
            delete condition._document;

            fhirEntries.push({
              fullUrl: "Condition/" + condition.id,
              resource: condition,
              request: {
                method: "PUT",
                url: "Condition/" + condition.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Condition/" + condition.id
            })
            sectionProblems.entry.push({
              reference: "Condition/" + condition.id
            })  
          })
          newInternationalPatientSummary.resource.section.push(sectionProblems)
        }
        
        if((typeof Consents === "object") && toggleStates.Consent){
          let consentsQuery = defaultQuery;
          Consents.find(consentsQuery).forEach(function(consent){
            delete consent._document;
            fhirEntries.push({
              fullUrl: "Consent/" + consent.id,
              resource: consent,
              request: {
                method: "PUT",
                url: "Consent/" + consent.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Consent/" + consent.id
            })
          })
        }   

        if((typeof Claims === "object") && toggleStates.Claim){
          let claimsQuery = defaultQuery;
          Claims.find(claimsQuery).forEach(function(claim){
            delete claim._document;
            fhirEntries.push({
              fullUrl: "Claim/" + claim.id,
              resource: claim,
              request: {
                method: "PUT",
                url: "Claim/" + claim.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Claim/" + claim.id
            })
          })
        }

        if((typeof ClinicalDocuments === "object") && toggleStates.ClinicalDocument){
          let clinicalDocumentsQuery = defaultQuery;
          ClinicalDocuments.find(clinicalDocumentsQuery).forEach(function(clinicalDocument){
            delete clinicalDocument._document;
            fhirEntries.push({
              fullUrl: "ClinicalDocument/" + clinicalDocument.id,
              resource: clinicalDocument,
              request: {
                method: "PUT",
                url: "ClinicalDocument/" + clinicalDocument.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "ClinicalDocument/" + clinicalDocument.id
            })
          })
        }

        if((typeof Communications === "object") && toggleStates.Communication){
          let communicationsQuery = defaultQuery;
          Communications.find(communicationsQuery).forEach(function(communication){
            delete communication._document;
            fhirEntries.push({
              fullUrl: "Communication/" + communication.id,
              resource: communication,
              request: {
                method: "PUT",
                url: "Communication/" + communication.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Communication/" + communication.id
            })
          })
        }

        // if((typeof CommunicationResponses === "object") && toggleStates.CommunicationResponse){
        //   let communicationResponsesQuery = defaultQuery;
        //   CommunicationResponses.find(communicationResponsesQuery).forEach(function(communicationResponse){
        //     delete communicationResponse._document;
        //     fhirEntries.push({
        //       fullUrl: "CommunicationResponse/" + communicationResponse.id,
        //       resource: communicationResponse,
        //       request: {
        //         method: "PUT",
        //         url: "CommunicationResponse"
        //       }
        //     })
        //     newCoverPage.resource.section.push({
        //       reference: "CommunicationResponse/" + communicationResponse.id
        //     })
        //   })
        // }

        if((typeof CommunicationRequests === "object") && toggleStates.CommunicationRequest){
          let communicationRequestsQuery = defaultQuery;
          CommunicationRequests.find(communicationRequestsQuery).forEach(function(communicationRequest){
            delete communicationRequest._document;
            fhirEntries.push({
              fullUrl: "CommunicationRequest/" + communicationRequest.id,
              resource: communicationRequest,
              request: {
                method: "PUT",
                url: "CommunicationRequest/" + communicationRequest.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "CommunicationRequest/" + communicationRequest.id
            })
          })
        }

        if((typeof Contracts === "object") && toggleStates.Contract){
          let contractsQuery = defaultQuery;
          Contracts.find(contractsQuery).forEach(function(contract){
            delete contract._document;
            fhirEntries.push({
              fullUrl: "Contract/" + contract.id,
              resource: contract,
              request: {
                method: "PUT",
                url: "Contract/" + contract.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Contract/" + contract.id
            })
          })
        }

        if((typeof ClinicalImpressionss === "object") && toggleStates.ClinicalImpression){
          let clinicalImpressionsQuery = defaultQuery;
          ClinicalImpressionss.find(clinicalImpressionsQuery).forEach(function(clinicalImpression){
            delete clinicalImpression._document;
            fhirEntries.push({
              fullUrl: "ClinicalImpressions/" + clinicalImpression.id,
              resource: clinicalImpression,
              request: {
                method: "PUT",
                url: "ClinicalImpressions/" + clinicalImpression.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "ClinicalImpressions/" + clinicalImpression.id
            })
          })
        }

        if((typeof Compositions === "object") && toggleStates.Composition){
          let compositionsQuery = defaultQuery;
          Compositions.find(compositionsQuery).forEach(function(composition){
            delete composition._document;
            fhirEntries.push({
              fullUrl: "Composition/" + composition.id,
              resource: composition,
              request: {
                method: "PUT",
                url: "Composition/" + composition.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Composition/" + composition.id
            })
          })
        }

        if((typeof Devices === "object") && toggleStates.Device){
          let devicesQuery = {};

          let sectionMedicalDevices = {
            title: "IPS Medical Devices",
            entry: []
          }
          Devices.find(devicesQuery).forEach(function(device){
            delete device._document;
            fhirEntries.push({
              fullUrl: "Device/" + device.id,
              resource: device,
              request: {
                method: "PUT",
                url: "Device/" + device.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Device/" + device.id
            })
            sectionMedicalDevices.entry.push({
              reference: "Device/" + device.id
            })   
          })
          newInternationalPatientSummary.resource.section.push(sectionMedicalDevices);
        }

        if((typeof ExplanationOfBenefits === "object") && toggleStates.ExplanationOfBenefit){
          let explanationOfBenefitsQuery = defaultQuery;
          ExplanationOfBenefits.find(explanationOfBenefitsQuery).forEach(function(explanationOfBenefit){
            delete explanationOfBenefit._document;
            fhirEntries.push({
              fullUrl: "ExplanationOfBenefit/" + explanationOfBenefit.id,
              resource: explanationOfBenefit,
              request: {
                method: "PUT",
                url: "ExplanationOfBenefit/" + explanationOfBenefit.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "ExplanationOfBenefit/" + explanationOfBenefit.id
            })
          })
        }

        if((typeof DiagnosticReports === "object") && toggleStates.DiagnosticReport){
          let diagnosticReportsQuery = defaultQuery;
          DiagnosticReports.find(diagnosticReportsQuery).forEach(function(diagnosticReport){
            delete diagnosticReport._document;
            fhirEntries.push({
              fullUrl: "DiagnosticReport/" + diagnosticReport.id,
              resource: diagnosticReport,
              request: {
                method: "PUT",
                url: "DiagnosticReport/" + diagnosticReport.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "DiagnosticReport/" + diagnosticReport.id
            })
          })
        }

        if((typeof DocumentReferences === "object") && toggleStates.DocumentReference){
          let documentReferencesQuery = defaultQuery;
          DocumentReferences.find(documentReferencesQuery).forEach(function(documentReference){
            delete documentReference._document;
            fhirEntries.push({
              fullUrl: "DocumentReference/" + documentReference.id,
              resource: documentReference,
              request: {
                method: "PUT",
                url: "DocumentReference/" + documentReference.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "DocumentReference/" + documentReference.id
            })
          })
        }

        if((typeof Goals === "object") && toggleStates.goals){
          let goalsQuery = defaultQuery;
          Goals.find(goalsQuery).forEach(function(goal){
            delete goal._document;
            fhirEntries.push({
              fullUrl: "Goal/" + goal.id,
              resource: goal,
              request: {
                method: "PUT",
                url: "Goal/" + goal.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Goal/" + goal.id
            })
          })
        }

        if((typeof Immunizations === "object") && toggleStates.Immunization){
          let immunizationsQuery = defaultQuery;

          let sectionImmunizations = {
            title: 'IPS Immunizations',
            entry: []
          }
          Immunizations.find(immunizationsQuery).forEach(function(immunization){
            delete immunization._document;
            fhirEntries.push({
              fullUrl: "Immunization/" + immunization.id,
              resource: immunization,
              request: {
                method: "PUT",
                url: "Immunization/" + immunization.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Immunization/" + immunization.id
            })
            sectionImmunizations.entry.push({
              reference: "Immunization/" + immunization.id
            })
          })
          newInternationalPatientSummary.resource.section.push(sectionImmunizations)
        }

        if((typeof ImagingStudies === "object") && toggleStates.ImagingStudy){
          let imagingStudiesQuery = defaultQuery;
          ImagingStudies.find(imagingStudiesQuery).forEach(function(imagingStudy){
            delete imagingStudy._document;
            fhirEntries.push({
              fullUrl: "ImagingStudies/" + imagingStudy.id,
              resource: imagingStudy,
              request: {
                method: "PUT",
                url: "ImagingStudies/" + imagingStudy.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "ImagingStudies/" + imagingStudy.id
            })
          })
        }

        if((typeof Locations === "object") && toggleStates.Location){
          let locationsQuery = {};
          Locations.find(locationsQuery).forEach(function(location){
            delete location._document;
            fhirEntries.push({
              fullUrl: "Location/" + location.id,
              resource: location,
              request: {
                method: "PUT",
                url: "Location/" + location.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Location/" + location.id
            })
          })
        }

        if((typeof Lists === "object") && toggleStates.List){
          let listsQuery = {};
          Lists.find(listsQuery).forEach(function(list){
            delete list._document;
            fhirEntries.push({
              fullUrl: "List/" + list.id,
              resource: list,
              request: {
                method: "PUT",
                url: "List/" + list.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "List/" + list.id
            })
          })
        }

        if((typeof Measures === "object") && toggleStates.Measure){
          let measuresQuery = {};
          Measures.find(measuresQuery).forEach(function(measure){
            delete measure._document;
            fhirEntries.push({
              fullUrl: "Measure/" + measure.id,
              resource: measure,
              request: {
                method: "PUT",
                url: "Measure/" + measure.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Measure/" + measure.id
            })
          })
        }  

        if((typeof MeasureReports === "object") && toggleStates.MeasureReport){
          let measureReportsQuery = {};
          MeasureReports.find(measureReportsQuery).forEach(function(measureReport){
            delete measureReport._document;
            fhirEntries.push({
              fullUrl: "MeasureReport/" + measureReport.id,
              resource: measureReport,
              request: {
                method: "PUT",
                url: "MeasureReport/" + measureReport.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "MeasureReport/" + measureReport.id
            })
          })
        }
  
        if((typeof Medications === "object") && toggleStates.Medication){
          let medicationsQuery = defaultQuery;

          let sectionMedications = {
            title: "IPS Medications",
            entry: []
          }
          Medications.find(medicationsQuery).forEach(function(medication){
            delete medication._document;
            fhirEntries.push({
              fullUrl: "Medication/" + medication.id,
              resource: medication,
              request: {
                method: "PUT",
                url: "Medication/" + medication.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Medication/" + medication.id
            })
            sectionMedications.entry.push({
              reference: "Medication/" + medication.id
            })
          })
          newInternationalPatientSummary.resource.section.push(sectionMedications)

        }

        if((typeof MedicationOrders === "object") && toggleStates.MedicationOrder){
          let medicationOrdersQuery = defaultQuery;
          MedicationOrders.find(medicationOrdersQuery).forEach(function(medicationOrder){
            delete medicationOrder._document;
            fhirEntries.push({
              fullUrl: "MedicationOrder/" + medicationOrder.id,
              resource: medicationOrder,
              request: {
                method: "PUT",
                url: "MedicationOrder/" + medicationOrder.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "MedicationOrder/" + medicationOrder.id
            })
          })
        }

        if((typeof MedicationStatements === "object") && toggleStates.MedicationStatement){
          let medicationStatementsQuery = defaultQuery;
          MedicationStatements.find(medicationStatementsQuery).forEach(function(medicationStatement){
            delete medicationStatement._document;
            fhirEntries.push({
              fullUrl: "MedicationStatement/" + medicationStatement.id,
              resource: medicationStatement,
              request: {
                method: "PUT",
                url: "MedicationStatement/" + medicationStatement.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "MedicationStatement/" + medicationStatement.id
            })
          })
        }

        if((typeof MessageHeaders === "object") && toggleStates.MessageHeader){
          let messageHeaderQuery = {};
          MessageHeaders.find(messageHeaderQuery).forEach(function(messageHeader){
            delete messageHeader._document;
            fhirEntries.push({
              fullUrl: "MessageHeader/" + messageHeader.id,
              resource: messageHeader,
              request: {
                method: "PUT",
                url: "MessageHeader/" + messageHeader.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "MessageHeader/" + messageHeader.id
            })
          })
        }

        if((typeof Observations === "object") && toggleStates.Observation){
          let observationQuery = defaultQuery;

          let sectionResults = {
            title: 'IPS Results',
            entry: []
          }
          let sectionVitalSigns = {
            title: 'IPS Vital Signs',
            entry: []
          }

          Observations.find(observationQuery).forEach(function(observation){
            delete observation._document;
            fhirEntries.push({
              fullUrl: "Observation/" + observation.id,
              resource: observation,
              request: {
                method: "PUT",
                url: "Observation/" + observation.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Observation/" + observation.id
            })
          })
          newInternationalPatientSummary.resource.section.push(sectionResults)
          newInternationalPatientSummary.resource.section.push(sectionVitalSigns)
        }

        if((typeof Organizations === "object") && toggleStates.Organization){
          let organizationQuery = {};
          Organizations.find(organizationQuery).forEach(function(organization){
            delete organization._document;
            fhirEntries.push({
              fullUrl: "Organization/" + organization.id,
              resource: organization,
              request: {
                method: "PUT",
                url: "Organization/" + organization.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Organization/" + organization.id
            })
          })
        }
        
        if((typeof Persons === "object") && toggleStates.Person){
          let personsQuery = {};
          Persons.find(personsQuery).forEach(function(person){
            delete person._document;
            fhirEntries.push({
              fullUrl: "Person/" + person.id,
              resource: person,
              request: {
                method: "PUT",
                url: "Person/" + person.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Person/" + person.id
            })
          })
        }

        if((typeof Practitioners === "object") && toggleStates.Practitioner){
          let practitionersQuery = {};
          Practitioners.find(practitionersQuery).forEach(function(practitioner){
            delete practitioner._document;
            fhirEntries.push({
              fullUrl: "Practitioner/" + practitioner.id,
              resource: practitioner,
              request: {
                method: "PUT",
                url: "Practitioner/" + practitioner.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Practitioner/" + practitioner.id
            })
          })
        }

        if((typeof Procedures === "object") && toggleStates.Procedure){
          let proceduresQuery = defaultQuery;

          let sectionProceduresHx = {
            title: 'IPS History of Procedures',
            entry: []
          }
          Procedures.find(proceduresQuery).forEach(function(procedure){
            delete procedure._document;
            fhirEntries.push({
              fullUrl: "Procedure/" + procedure.id,
              resource: procedure,
              request: {
                method: "PUT",
                url: "Procedure/" + procedure.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Procedure/" + procedure.id
            })
            sectionProceduresHx.entry.push({
              reference: "Procedure/" + procedure.id
            })
          })
          newInternationalPatientSummary.resource.section.push(sectionProceduresHx)
        }

        if((typeof Questionnaires === "object") && toggleStates.Questionnaire){
          let questionnairesQuery = {};
          Questionnaires.find(questionnairesQuery).forEach(function(questionnaire){
            delete questionnaire._document;
            fhirEntries.push({
              fullUrl: "Questionnaire/" + questionnaire.id,
              resource: questionnaire,
              request: {
                method: "PUT",
                url: "Questionnaire/" + questionnaire.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Questionnaire/" + questionnaire.id
            })
          })
        }

        if((typeof QuestionnaireResponses === "object") && toggleStates.QuestionnaireResponse){
          let questionnaireResponsesQuery = defaultQuery;
          QuestionnaireResponses.find(questionnaireResponsesQuery).forEach(function(questionnaireResponse){
            delete questionnaireResponse._document;
            fhirEntries.push({
              fullUrl: "QuestionnaireResponse/" + questionnaireResponse.id,
              resource: questionnaireResponse,
              request: {
                method: "PUT",
                url: "QuestionnaireResponse/" + questionnaireResponse.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "QuestionnaireResponse/" + questionnaireResponse.id
            })
          })
        }

        if((typeof RiskAssessments === "object") && toggleStates.RiskAssessment){
          let riskAssessmentsQuery = defaultQuery;
          RiskAssessments.find(riskAssessmentsQuery).forEach(function(riskAssessment){
            delete riskAssessment._document;
            fhirEntries.push({
              fullUrl: "RiskAssessment/" + riskAssessment.id,
              resource: riskAssessment,
              request: {
                method: "PUT",
                url: "RiskAssessment/" + riskAssessment.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "RiskAssessment/" + riskAssessment.id
            })
          })
        }

        if((typeof Sequences === "object") && toggleStates.Sequence){
          let sequencesQuery = defaultQuery;
          Sequences.find(sequencesQuery).forEach(function(sequence){
            delete sequence._document;
            fhirEntries.push({
              fullUrl: "Sequence/" + sequence.id,
              resource: sequence,
              request: {
                method: "PUT",
                url: "Sequence/" + sequence.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Sequence/" + sequence.id
            })
          })
        }

        if((typeof ServiceRequests === "object") && toggleStates.ServiceRequest){
          let serviceRequestsQuery = defaultQuery;
          ServiceRequests.find(serviceRequestsQuery).forEach(function(serviceRequest){
            delete serviceRequest._document;
            fhirEntries.push({
              fullUrl: "ServiceRequest/" + serviceRequest.id,
              resource: serviceRequest,
              request: {
                method: "PUT",
                url: "ServiceRequest/" + serviceRequest.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "ServiceRequest/" + serviceRequest.id
            })
          })
        }

        if((typeof Tasks === "object") && toggleStates.Task){
          let tasksQuery = defaultQuery;
          Tasks.find(tasksQuery).forEach(function(task){
            delete task._document;
            fhirEntries.push({
              fullUrl: "Task/" + task.id,
              resource: task,
              request: {
                method: "PUT",
                url: "Task/" + task.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "Task/" + task.id
            })
          })
        }

        if((typeof ValueSets === "object") && toggleStates.ValueSet){
          let valueSetsQuery = defaultQuery;
          ValueSets.find(valueSetsQuery).forEach(function(valueSet){
            delete valueSet._document;
            fhirEntries.push({
              fullUrl: "ValueSet/" + valueSet.id,
              resource: valueSet,
              request: {
                method: "PUT",
                url: "ValueSet/" + valueSet.id
              }
            })
            newCoverPage.resource.section.push({
              reference: "ValueSet/" + valueSet.id
            })
          })
        }
      }
      
      if(get(Meteor, 'settings.private.addCompositionToRelay') || includeCoverLetter){
        console.log('Added new Composition to Bundle.');
        exportBundle.entry.push(newCoverPage);  
      }
  
      console.log('Adding resource entries to Bundle.');    
      if(Array.isArray(fhirEntries)){
        fhirEntries.forEach(function(fhirResource){
          exportBundle.entry.push(fhirResource);
        })
        exportBundle.total = fhirEntries.length;  
      }
      console.log('Finished generating ', exportBundle);
     
      Session.set('exportBuffer', exportBundle);
    }        
  }
}



export default MedicalRecordsExporter;