// This file contains the server code (google app script code) which is used to store the gained information in google sheets.

const attributeNamesColorOnly = [ 
  "Q1", "Q1_Confident", "Q1_Time", //Questions -> q,c,time
  "Q2", "Q2_Confident", "Q2_Time",
  "Q3", "Q3_Confident", "Q3_Time",
  "Q4", "Q4_Confident", "Q4_Time",
  "Q5", "Q5_Confident", "Q5_Time",
  "Q6", "Q6_Confident", "Q6_Time",
  "Q7", "Q7_Confident", "Q7_Time",
  "Q8", "Q8_Confident", "Q8_Time",
  "Q9", "Q9_Confident", "Q9_Time",
  "Q10", "Q10_Confident", "Q10_Time",
  "AT1", "AT1_Confident", "AT1_Time", //Attention Task -> f1, timef1
  "TQ1_Confident", //Training/Example Questions -> e
  "TQ2_Identification",
  "TQ3_Comparison",
  "TQ4_GAP",
  "TQ5_OUTLIER",
  "TQ6_SPIKE",
  "Gender", //Demographic Questions -> d
  "Age",
  "EducationLevel",
  "ExperienceCharts",
  "ExperienceParameters",
  "Likert", //how did users like vis --> l
  ];

 //IDs of google spreadsheets where results are stored
const ssIds = ["XXX" //Results_Validation
              ]
const ssIdentification = "ssIdentification";

const spacing = 1; //WorkerID, CompletionCode space
const numberOfLikertQuestions = 1;
const numberOfDemographicQuestions = 5;
const numberOfTrainingsQuestions = 6;
const numberOfAttentionTasks = 1;
const numberOfQuestions = 10; //main questions in html
const measurmentsPerQuestion = 3; //main question + confident + time

function doGet() {
  // referencing the HTML.html file and allow iframing
  return HtmlService.createTemplateFromFile('Main')
  .evaluate()
  .setTitle('')
  .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function include(filename) {
  // both CSS.html and JS.html will get included 
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function createQuestionHTML()
{
  //Set questionaire ID here!
  var questionaireID = (0).toFixed(0);

  var scriptPrp = PropertiesService.getScriptProperties();
  scriptPrp.setProperty(ssIdentification, questionaireID);

  var	template;
  if(questionaireID == 0)
  { 
    template = HtmlService.createHtmlOutputFromFile('Questions').getContent();
  }

  return template;
}

function processForm(json) {
 
  var row = []; //new Date();
  var formObj = JSON.parse(json);
  
  // Create shell of a row to append
  if ( formObj.length ) {  // Total number of input items
    for ( var c = 0; c < formObj.length; c++ ) {
      row.push('');
    }
  }
  
  // Replace empty row index values with item values that came through with the form response
  for ( var i = 0; i < formObj.length; i++ ) {

    var name = formObj[i].name; // This will be "e" or "q" or "c" or "d" or "f" or "time" + a number (1 or 2 digits)
    var type;
    var questionId;

    if(i == 0 || i == 1)
    { //workerID and completionCode 
      row[i] =  formObj[i].value;
    }else
    {
      if(name.length === 2 ){
      // ex, qx, cx, dx, fx (x = number)
      type = name.slice(0, 1);
      questionId = parseInt(name.slice(name.length-1, name.length));

    }else if(name.length === 3){
      // exx, qxx, cxx, dxx (x = number)
      type = name.slice(0, 1);
      questionId = parseInt(name.slice(name.length-2, name.length));
      if(type == 'c' && isNaN(questionId))
      {//found attention task time
        type = "f";
        questionId = 2;
      }

    }else if(name.length === 5){
      // timex (x = number)
      type = name.slice(0, 4);
      questionId = parseInt(name.slice(4, name.length));
    }else if(name.length === 6){
      // timexx (x = number)
      type = name.slice(0, 4);
      questionId = parseInt(name.slice(4, name.length));
      if(isNaN(questionId))
      {//found attention task time
        type = "f";
        questionId = 3;
      }
    }else{
      //timex-start or timexx-start
      continue;
    }
    
    var rowId = -1;
    
    if(type == "q"){ //main question
      rowId = spacing + questionId+((measurmentsPerQuestion-1)*(questionId-1)) + 0;
    }else if(type == "c"){ //confident question
      rowId = spacing +questionId+((measurmentsPerQuestion-1)*(questionId-1)) + 1;
    }else if(type == "time"){
      rowId = spacing + questionId+((measurmentsPerQuestion-1)*(questionId-1)) + 2;
    }else if(type == "f"){ //attention task
      rowId = (numberOfQuestions*measurmentsPerQuestion) + questionId;
    }else if(type == "e"){ // training/example question
      rowId = (numberOfQuestions*measurmentsPerQuestion) + (numberOfAttentionTasks*measurmentsPerQuestion) + questionId; 
    }else if(type == "d"){ //demographic question
      rowId = (numberOfQuestions*measurmentsPerQuestion) + (numberOfAttentionTasks*measurmentsPerQuestion) + numberOfTrainingsQuestions + questionId;
    }else if(type == "l"){ //likert question
      rowId = (numberOfQuestions*measurmentsPerQuestion) + (numberOfAttentionTasks*measurmentsPerQuestion) + numberOfTrainingsQuestions + numberOfDemographicQuestions + questionId;
    }
    else{
      continue;
    }

    //var num = parseInt(name.match(/\d+$/)[0]); 
    if(type != "e" && type != "d" && type != "f" && type != "l")
    { //ordinary questions
      var number = rowId;
      row[number] = formObj[i].value;

    }else{
      //formal questions like how old are you etc.
      var number = spacing + rowId;
      row[number] = formObj[i].value;
      
    } 
    }

    // Insert server-side validation, if needed
    
  }
  
  appendRow_(row);  

}

function appendRow_(row) 
{
  try {
    var lock = LockService.getPublicLock();
    lock.waitLock(10000);
    var scriptPrp = PropertiesService.getScriptProperties();
    var ssID = scriptPrp.getProperty(ssIdentification);

    var ss = SpreadsheetApp.openById(ssIds[ssID]); 
    var s = ss.getSheets()[0];
    
    if ( !s ) {  // Check for sheet
      var s = ss.insertSheet(ss.getName());
      s.appendRow(attributeNamesColorOnly);
    }
    
    // Post form results with empty responses in order of item index
    s.appendRow(row);
    //lock.releaseLock();
  } 
  catch (error) { 
     //Insert your own error handling
      Logger.log("ERROR when storing in Spreadsheet: " + error);
  }
  finally { 
    lock.releaseLock();
  }
}

function addWorkerID(userInput)
{
  workerID = userInput; 
}

function generateCompletionCode()
{
  completionCode = Utilities.getUuid();
  return completionCode;
}

function getCompletionCode()
{
  return completionCode;
}