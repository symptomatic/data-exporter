

import { get, set, has, cloneDeep } from 'lodash';
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';

import moment from 'moment';

import { FhirDehydrator } from 'meteor/clinical:hl7-fhir-data-infrastructure';

import PapaParse from 'papaparse';
const CSV = PapaParse;

if(Package["meteor/alanning:roles"]){
  import { Roles } from 'meteor/alanning:roles';
}

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
  generateCoverPage(){

    let newComposition = {
      "resourceType": "Composition",
      "status" : "preliminary", 
      "subject" : { 
        "display": '',
        "reference": ''
      }, 
      // "encounter" : { 
      //   "display": '',
      //   "reference": ''
      //  }, 
      "date" : moment().format("YYYY-MM-DD"), 
      "author" : [{ 
        "display": '',
        "reference": ""
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
        set(newComposition, 'resource.subject.display', Meteor.user().fullName())
        set(newComposition, 'resource.subject.reference', 'Patient/' + Meteor.userId())
  
        set(newComposition, 'resource.author.display', Meteor.user().fullName())
        set(newComposition, 'resource.author.reference', 'Patient/' + Meteor.userId())
      }
  
      if(Roles.userIsInRole(Meteor.userId(), 'practitioner')){
        if(Patients.findOne()){
          set(newComposition, 'resource.subject.display', Meteor.user().fullName())
          set(newComposition, 'resource.subject.reference', 'Patient/' + Meteor.userId())
        }
  
        set(newComposition, 'resource.author.display', Meteor.user().fullName())
        set(newComposition, 'resource.author.reference', 'Practitioner/' + Meteor.userId())
      }  
    }

    
    return newComposition;
  },
  exportBulkData(filterString, excludeEnteredInError, includeCoverLetter, includeTableOfContents){
    console.log('Exporting FHIR Bulk Data...', filterString, excludeEnteredInError);
    if(typeof filterString !== "string"){
      console.log('filterString.target.value', ilterString.target.value);
    }

    let fhirEntries = [];
    let exportFile = "";


    let newComposition;
    let newTableOfContents;
    
    

    let defaultQuery = {};
    if(filterString){
      defaultQuery = {$or: [
        {'patient.reference': {$regex: filterString}},
        {'subject.reference': {$regex: filterString}}
      ], 
      'code.text': {$not: 'Error'}}
    }

    if(includeCoverLetter){
      newComposition = MedicalRecordsExporter.generateCoverPage(filterString);

      if(filterString){
        let patient = Patients.findOne({id: filterString});
        set(newComposition, 'resource.author[0].display', get(patient, 'name[0].text', ''))
        set(newComposition, 'resource.author[0].reference', 'Patient/' + get(patient, 'id', ''))  
      }
  
      console.log('Generating new Composition template', newComposition);  
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
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
          if(newComposition){
            newComposition.section.push({
              reference: "ValueSet/" + valueSet.id
            })              
          }
        })
      }
    }

    if(includeCoverLetter){
      exportFile = exportFile + JSON.stringify(newComposition) + "\n";  
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
  },
  exportContinuityOfCareDoc(filterString, excludeEnteredInError, includeCoverLetter){
    console.log('Exporting a Continuity Of Care Document', filterString, excludeEnteredInError);
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

    let newComposition = {
      fullUrl: "Composition/" + Random.id(),
      resource: MedicalRecordsExporter.generateCoverPage(filterString),
      request: {
        method: "PUT",
        url: "Composition"
      }
    }

    let defaultQuery = {};
    if(filterString){
      let patient = Patients.findOne({id: filterString});
      set(newComposition, 'resource.author[0].display', get(patient, 'name[0].text', ''))
      set(newComposition, 'resource.author[0].reference', 'Patient/' + get(patient, 'id', ''))

      defaultQuery = {$or: [
        {'patient.reference': {$regex: filterString}},
        {'subject.reference': {$regex: filterString}}
      ], 
      'code.text': {$not: 'Error'}}
    }

    console.log('Generating new Composition template', newComposition);

   

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
          fhirEntries.push({
            fullUrl: "Patient/" + patient.id,
            resource: patient,
            request: {
              method: "PUT",
              url: "Patient/" + patient.id
            }
          })
          newComposition.resource.section.push({
            reference: "Patient/" + patient.id
          })
        })
      }

      if((typeof AllergyIntolerances === "object") && toggleStates.AllergyIntollerance){
        let allergyQuery = defaultQuery;
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
          newComposition.resource.section.push({
            entry: [{
              reference: "AllergyIntolerance/" + allergy.id
            }]
          })          
        })
      }
      if((typeof CarePlans === "object") && toggleStates.CarePlan){
        let carePlanQuery = defaultQuery;
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
          newComposition.resource.section.push({
            reference: "CarePlan/" + careplan.id
          })
        })
      }
      // if((typeof Claims === "object") && toggleStates.claims){
      //   Claims.find().forEach(function(claim){
      //     delete claim._document;
      //     fhirEntries.push({
      //       fullUrl: "Claim/" + claim.id,
      //       resource: claim
      //     })
      //     newComposition.resource.section.push({
      //       reference: "Claim/" + claim.id
      //     })
      //   })
      // }
      
      if((typeof Conditions === "object") && toggleStates.Condition){

        let conditionsQuery = defaultQuery;
        if(Session.get('hideEnteredInError')){          
          conditionsQuery.verificationStatus = {$nin: ["entered-in-error"]}  // unconfirmed | provisional | differential | confirmed | refuted | entered-in-error
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
          newComposition.resource.section.push({
            reference: "Condition/" + condition.id
          })
        })
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
      //     newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
            reference: "ClinicalImpressions/" + clinicalImpression.id
          })
        })
      }
      if((typeof Devices === "object") && toggleStates.Device){
        let devicesQuery = {};
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
          newComposition.resource.section.push({
            reference: "Device/" + device.id
          })
        })
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
            reference: "Goal/" + goal.id
          })
        })
      }
      if((typeof Immunizations === "object") && toggleStates.Immunization){
        let immunizationsQuery = defaultQuery;
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
          newComposition.resource.section.push({
            reference: "Immunization/" + immunization.id
          })
        })
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
            reference: "MeasureReport/" + measureReport.id
          })
        })
      }

      if((typeof Medications === "object") && toggleStates.Medication){
        let medicationsQuery = defaultQuery;
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
          newComposition.resource.section.push({
            reference: "Medication/" + medication.id
          })
        })
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
            reference: "MessageHeader/" + messageHeader.id
          })
        })
      }
      if((typeof Observations === "object") && toggleStates.Observation){
        let observationQuery = defaultQuery;
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
          newComposition.resource.section.push({
            reference: "Observation/" + observation.id
          })
        })
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
            reference: "Practitioner/" + practitioner.id
          })
        })
      }
      if((typeof Procedures === "object") && toggleStates.Procedure){
        let proceduresQuery = defaultQuery;
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
          newComposition.resource.section.push({
            reference: "Procedure/" + procedure.id
          })
        })
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
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
          newComposition.resource.section.push({
            reference: "ValueSet/" + valueSet.id
          })
        })
      }
    }
    
    if(get(Meteor, 'settings.private.addCompositionToRelay') || includeCoverLetter){
      console.log('Added new Composition to Bundle.');
      exportBundle.entry.push(newComposition);  
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



export default MedicalRecordsExporter;