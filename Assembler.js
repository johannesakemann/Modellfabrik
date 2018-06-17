var opcua = require("node-opcua");
var path = require('path');
var async = require("async");
var manufacturers = require('./manufacturers.json');
var serialnumbers = require('./serialnumbers.json');
var endpointtypes = require('./endpointtypes.json');
var producttypes = require('./producttypes.json');
var help = require('./help');
var auftragsstat = require('./AuftragsStatus.json'); 
var capabilities = require('./capabilities.json');
var msgspec = require('./MessageSpecification.json');
var productstat = require('./productstatus.json');
//Creation of an instance of OPCUAServer
var server = new opcua.OPCUAServer({
    port: 4335, // the port of the listening socket of the server
    maxAllowedSessionNumber: 100,
    resourcePath: "UA/Assembler", // this path will be added to the endpoint resource name
    nodeset_filename: [opcua.standard_nodeset_file], //"/home/pi/modellfabrik/aas_for_import.xml"],
     buildInfo : {
        productName: "AssemblerServer",
        buildNumber: "7658",
        buildDate: new Date(2017,12,20)
    }
});

var endpointFabrik = "opc.tcp://MHraspberry:4337/UA/modellfabrik";
var endpointAssembler = server.endpoints[0].endpointDescriptions()[0].endpointUrl;

var client =  new opcua.OPCUAClient();

function post_initialize() {
    console.log("initialized");
    function construct_my_address_space(server) {

//****** Hilfsvariablen */
        var addressSpace = server.engine.addressSpace;
        var objectFolder = addressSpace.findNode("ns=0;i=85");
        var folderType = addressSpace.findNode("ns=0;i=61");

        var outputCProducing = 0;
        var processProductA = 0;
        var processProductB = 0;
    
//****** Definition des abstrakten Typen AssetType        
        var AssetType = addressSpace.addObjectType({
            browseName: "AssetType"
        });
        
        var Header = addressSpace.addObject({
            browseName: "Header",
            componentOf: AssetType,
            modellingRule: "Mandatory",
            typeDefinition: folderType
        });
        
        var Body = addressSpace.addObject({
            browseName: "Body",
            componentOf: AssetType,
            modellingRule: "Mandatory",
            typeDefinition: folderType
        });
//****** Instanziieren des konkreten Assemblers */

        var Assembler = AssetType.instantiate({
            browseName: "Assembler",
            organizedBy: objectFolder,
            nodeId:"ns=2;s=Assembler"
        });
//****** Instanizieren Manifest */
        
        var Manifest = addressSpace.addObject({
            browseName: "Manifest",
            componentOf: Assembler,
            nodeId: "ns=2;s=Manifest"
        });

        var Identification = addressSpace.addObject({
            browseName: "Identification",
            componentOf: Manifest,
            typeDefinition: folderType
        });

        var Capabilities = addressSpace.addObject({
            browseName: "Capabilities",
            componentOf: Manifest,
            typeDefinition : folderType
        });

//****** Anlegen des Capabilities innerhalb des Manifestes
        
        var Producing = addressSpace.addObject({
            browseName: capabilities.PRODUCING,
            organizedBy: Capabilities
        });

        var Showing = addressSpace.addObject({
            browseName: capabilities.SHOWING,
            organizedBy: Capabilities
        });
        var Monitoring = addressSpace.addObject({
            browseName: capabilities.MONITORING,
            organizedBy: Capabilities
        });

        var Processing = addressSpace.addObject({
            browseName: capabilities.PROCESSING,
            organizedBy: Capabilities
        });

 //***** Spezifikation der Processing Capability */
        // Verfügbarkeitsvariable
        var processingAvailability = true;
        var ProcessingAvailability = addressSpace.addVariable({
            browseName: "Available",
            dataType: "Boolean",
            propertyOf: Processing,
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Boolean", value: processingAvailability});
                },
                set: function(value){
                    processingAvailability = value.value;
                    return opcua.StatusCodes.Good;
                }
            }
        });
        //ProduktA 
        var ProduktAProcessing = addressSpace.addObject({
            browseName: producttypes.A,
            componentOf: Processing
        });

        var TimeToProcessA = addressSpace.addVariable({
            browseName: "TimeToManufacture",
            propertyOf: ProduktAProcessing,
            dataType: "Int32",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: 0});
                }
            }
        });
        var productTypeAProcessing = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktAProcessing,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.A});
                }
            }
        });
        //ProduktB

        var ProduktBProcessing = addressSpace.addObject({
            browseName: producttypes.B,
            componentOf: Processing
        });

        var TimeToProcessB = addressSpace.addVariable({
            browseName: "TimeToManufacture",
            propertyOf: ProduktBProcessing,
            dataType: "Int32",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: 0});
                }
            }
        });
        var productTypeBProcessing = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktBProcessing,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.B});
                }
            }
        });
//****** Spezifikation der Monitoring Capability

        var Production = addressSpace.addObject({
            browseName: "Production",
            componentOf:Monitoring
        });
        ProductionAvailability.addReference({referenceType: "OrganizedBy",nodeId:Production});
        var ProcessingMonitoring = addressSpace.addObject({
            browseName: "Processing",
            componentOf: Monitoring
        })
        ProcessingAvailability.addReference({referenceType: "OrganizedBy",nodeId: Production});
       
//****** Spezifikation der Showing Capability
        var Light = addressSpace.addObject({
            browseName:"Light",
            componentOf:Showing
        });
        var Text = addressSpace.addObject({
            browseName:"Text",
            componentOf:Showing
        });
//****** Spezifikation der Producing Capability */
        // Verfügbarkeitsvariable
        var productionAvailability = true;
        var ProductionAvailability = addressSpace.addVariable({
            browseName: "Available",
            dataType: "Boolean",
            propertyOf: Producing,
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Boolean", value: productionAvailability});
                },
                set: function(value){
                    productionAvailability = value.value;
                    return opcua.StatusCodes.Good;
                }
            }
        });
        //ProduktC
        var ProduktC = addressSpace.addObject({
            browseName: producttypes.C,
            componentOf: Producing
        });

        var TimeToManufacture = addressSpace.addVariable({
            browseName: "TimeToManufacture",
            propertyOf: ProduktC,
            dataType : "Int32",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: 5});
                }
            }
        });
        var productType = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktC,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.C});
                }
            }
        });
        var Input = addressSpace.addObject({
            browseName: "Input",
            propertyOf: ProduktC,
            typeDefinition: folderType
        });
        var ProduktA = addressSpace.addObject({
            browseName : producttypes.A,
            organizedBy : Input,
        });
        
        var productTypeA = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktA,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.A});
                }
            }
        });

        var ProduktB = addressSpace.addObject({
            browseName : producttypes.B,
            organizedBy : Input,
        });
        var productTypeB = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktB,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.B});
                }
            }
        });

//****** Spezifikation Manifest Port als Methode */
        
        var ManifestPort = addressSpace.addMethod(Manifest,{
            browseName:"ManifestPort",
            nodeId:"ns=2;s=ManifestPort",
            modellingRule: "Mandatory",
            inputArguments:[
                {
                    name: "Header",
                    description: "Type of Message that should be send (Request or Order)",
                    dataType: "String"
                },{
                    name: "Type",
                    description: "Capability auf die sich die Nachricht bezieht",
                    dataType: "String"
                },{
                    name: "Content",
                    description: "Was sollen die Capabilities machen?",
                    dataType: "String"
                    
                }],
            outputArguments:[
                {
                    name: "TimeToManufacture",
                    dataType :"Int32",
                },
                {
                    name: "Producttypes",
                    dataType: "String",
                    arrayType: opcua.VariantArrayType.Array,
                    valueRank:1
                },{
                    name: "NumberOfProducts",
                    dataType:"Int32",
                    arrayType: opcua.VariantArrayType.Array,
                    valueRank:1
                },{
                    name: "NodeIdOfMethod",
                    dataType:"String"
                },{
                    name: "NodeIdOfParentObject",
                    dataType: "String"
                },{
                    name: "Availability",
                    dataType: "Boolean"
                }]
        
        });
        

        ManifestPort.bindMethod(function(inputArguments,context,callback){
            var header = inputArguments[0].value;
            var type = inputArguments[1].value;
            var content = inputArguments[2].value;
            if(header === msgspec.Header.REQUEST){
                if(type === msgspec.Type.PRODUCING){
                    var producttypeRequested = inputArguments[2].value;
                    var produkts =  Producing.getComponents().filter(produkt => produkt.getPropertyByName("ProduktTyp").readValue().value.value === producttypeRequested);
                    if(produkts.length > 0){
                        var input = produkts[0].getPropertyByName("Input").getFolderElements().map(element => element.getPropertyByName("ProduktTyp").readValue().value.value);
                        var inputNumbers = produkts[0].getPropertyByName("Input").getFolderElements().map(element => element.getPropertyByName("Number").readValue().value.value);
                        
                        callback(null,{
                            statusCode: opcua.StatusCodes.Good,
                            outputArguments:[
                                {
                                    dataType:"Int32",
                                    value: produkts[0].getPropertyByName("TimeToManufacture").readValue().value.value
                                },{
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: input
                                },{
                                    dataType: "Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: inputNumbers
                                },{
                                    dataType:"String",
                                    value: "0"
                                },{
                                    dataType: "String",
                                    value : "0"
                                },{
                                    dataType: "Boolean",
                                    value: productionAvailability
                                }
                            ]
                        })
                    }else{
                        callback(null,{
                            statusCode: opcua.StatusCodes.Bad,
                            outputArguments:[
                                {
                                    dataType:"Int32",
                                    value: 0
                                },{
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: ["0"]
                                },{
                                    dataType: "Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: [0]
                                },{
                                    dataType:"String",
                                    value: "0"
                                },{
                                    dataType: "String",
                                    value : "0"
                                },{
                                    dataType:"Boolean",
                                    value: false
                                }
                            ]
                        })
                    }
                }else if(type === msgspec.Type.SHOWING){
                    var objectToShowRequested = inputArguments[2];
                    var showObjects = Showing.getComponents().filter(element => element.browseName === objectToShowRequested);
                    if(showObjects>0){
                        callback(null,{
                            statusCode: opcua.StatusCodes.Good,
                            outputArguments:[{
                                dataType: "Int32",
                                value: 0
                            },{
                                dataType:"String",
                                arrayType: opcua.VariantArrayType.Array,
                                valueRank:1,
                                value: ["0"]
                            },{
                                dataType: "Int32",
                                arrayType: opcua.VariantArrayType.Array,
                                valueRank:1,
                                value: [0]
                            },{
                                dataType:"String",
                                value: "0"
                            },{
                                dataType :"String",
                                value : "0"
                            },{
                                dataType: "Boolean",
                                value: true
                            }]
                        });
                    }else{
                        callback(null,{
                            statusCode: opcua.StatusCodes.Bad,
                            outputArguments:[{
                                dataType: "Int32",
                                value: 0
                            },{
                                dataType:"String",
                                arrayType: opcua.VariantArrayType.Array,
                                valueRank:1,
                                value: ["0"]
                            },{
                                dataType: "Int32",
                                arrayType: opcua.VariantArrayType.Array,
                                valueRank:1,
                                value: [0]
                            },{
                                dataType:"String",
                                value: "0"
                            },{
                                dataType :"String",
                                value : "0"
                            },{
                                dataType: "Boolean",
                                value: false
                            }]
                        });
                    }
                }else if (type === msgspec.Type.PROCESSING){
                    var producttypeRequested = inputArguments[2].value;
                    var produkts =  Processing.getComponents().filter(produkt => produkt.getPropertyByName("ProduktTyp").readValue().value.value === producttypeRequested);
                    if(produkts.length > 0){
                        callback(null,{
                            statusCode: opcua.StatusCodes.Good,
                            outputArguments:[
                                {
                                    dataType:"Int32",
                                    value: produkts[0].getPropertyByName("TimeToManufacture").readValue().value.value
                                },{
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: ["0"]
                                },{
                                    dataType: "Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: [0]
                                },{
                                    dataType:"String",
                                    value: "0"
                                },{
                                    dataType: "String",
                                    value : "0"
                                },{
                                    dataType: "Boolean",
                                    value: processingAvailability
                                }
                            ]
                        })
                    }else{
                        callback(null,{
                            statusCode: opcua.StatusCodes.Bad,
                            outputArguments:[
                                {
                                    dataType:"Int32",
                                    value: 0
                                },{
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: ["0"]
                                },{
                                    dataType: "Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: [0]
                                },{
                                    dataType:"String",
                                    value: "0"
                                },{
                                    dataType: "String",
                                    value : "0"
                                },{
                                    dataType:"Boolean",
                                    value: false
                                }
                            ]
                        })
                    }
                }else{
                    callback(null,{
                        statusCode: opcua.StatusCodes.Bad,
                        outputArguments:[{
                            dataType: "Int32",
                            value: 0
                        },{
                            dataType:"String",
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank:1,
                            value: ["0"]
                        },{
                            dataType: "Int32",
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank:1,
                            value: [0]
                        },{
                            dataType:"String",
                            value: "0"
                        },{
                            dataType :"String",
                            value : "0"
                        },{
                            dataType: "Boolean",
                            value: false
                        }]
                    });
                }
            }else if(header === msgspec.Header.ORDER){
                if(Capabilities.getFolderElements().map(e => e.browseName.toString()).includes(type)){
                    if(Capabilities.getFolderElements().filter(e => e.browseName.toString() === type)[0].getComponentByName(content)!==null){
                        var nodeIdToRespond = Capabilities.getFolderElements().filter(e => e.browseName.toString() === type)[0].getComponentByName(content).getFolderElements().filter(e => e.constructor.name ==="UAMethod")[0].nodeId.toString();
                        var objectIdToRespond = addressSpace.findNode(nodeIdToRespond).parent.nodeId.toString();
                        callback(null,{
                            statusCode: opcua.StatusCodes.Good,
                            outputArguments:[
                                {
                                    dataType:"Int32",
                                    value: 0
                                },{
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: ["0"]
                                },{
                                    dataType: "Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: [0]
                                },{
                                    dataType:"String",
                                    value: nodeIdToRespond
                                },{
                                    dataType: "String",
                                    value: objectIdToRespond
                                },{
                                    dataType: "Boolean",
                                    value: true
                                }
                            ]
                        });
                        return;
                    }
                }
                callback(null,{
                    statusCode: opcua.StatusCodes.Bad,
                    outputArguments:[
                        {
                            dataType:"Int32",
                            value: 0
                        },{
                            dataType: "String",
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank:1,
                            value: ["0"]
                        },{
                            dataType: "Int32",
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank:1,
                            value: [0]
                        },{
                            dataType:"String",
                            value: "0"
                        },{
                            dataType :"String",
                            value : "0"
                        },{
                            dataType: "Boolean",
                            value: true
                        }
                    ]
                });
            }
        });

//****** Anlegen Produktordner
        var Produkte = addressSpace.addObject({
            browseName:"Produkte",
            typeDefinition: folderType,
            componentOf: Assembler.getComponentByName("Body")
        })     

//****** Instanziieren LED
        var LED = AssetType.instantiate({
            browseName: "LED",
            componentOf: Assembler.getComponentByName("Body")
        });

        var LEDManifest = addressSpace.addObject({
            browseName: "Manifest",
            componentOf : LED
        });

        var LEDIdentification = addressSpace.addObject({
            browseName: "Identification",
            componentOf: LEDManifest,
            typeDefinition: folderType
        });

        var LEDCapabilities = addressSpace.addObject({
            browseName: "Capabilities",
            componentOf: LEDManifest,
            typeDefinition : folderType
        });
        var LEDShowing = addressSpace.addObject({
            browseName: capabilities.SHOWING,
            organizedBy: LEDCapabilities
        });

        var LEDLight = addressSpace.addObject({
            browseName:"Light",
            componentOf:LEDShowing
        });


        LED.addReference({referenceType:"OrganizedBy",nodeId: Light});
        var LEDBody = addressSpace.addObject({
            browseName :"Body",
            componentOf:LED,
            typeDefinition:folderType
        });

        var LEDManufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            propertyOf: LED.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: manufacturers["LED"]});
                }
            }
        });
        var LEDSerialNumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            propertyOf: LED.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: serialnumbers["LED_1"]});
                }
            }
        });

        LEDSerialNumber.addReference({referenceType:"OrganizedBy",nodeId: LEDIdentification});
        var LEDPower = addressSpace.addVariable({
            browseName : "Power",
            dataType : "Int32",
            componentOf: LED.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value:help.transformFabrikPowerToLEDPower(productionAvailability)});
                }
            }
        });
        LEDPower.addReference({referenceType: "OrganizedBy",nodeId: LEDLight});        
//****** Anlegen der Assembler Eigenschaften im Header
        var Manufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            dataType: "String",
            propertyOf : Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: manufacturers.Assembler});
                }
            }  
        });
        var SerialNumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            dataType: "Int32",
            componentOf : Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: serialnumbers.Assembler});
                }
            }
        });
        SerialNumber.addReference({referenceType:"OrganizedBy",nodeId: Identification});

        var EndpointType = addressSpace.addVariable({
            browseName: "GeraeteTyp",
            dataType:"String",
            propertyOf: Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: endpointtypes.ASSEMBLER});
                }
            }
        });
        var Adress = addressSpace.addVariable({
            browseName: "Address",
            componentOf: Assembler.getComponentByName("Header"),
            dataType:"String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value:endpointAssembler});
                }
            }
        });
        Adress.addReference({referenceType:"OrganizedBy",nodeId: Identification});
    
//****** Anlegen Output Variable für ProduktC
        var Output = addressSpace.addVariable({
            browseName:"OutputC",
            dataType: "Int32",
            propertyOf: Assembler.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: outputCProducing})
                }
            }
        });
        Output.addReference({referenceType:"OrganizedBy",nodeId: Production});        

//****** Instanziieren des Displays */

        var Display = AssetType.instantiate({
            browseName: "Display",
            componentOf: Assembler.getComponentByName("Body")
        });
        Display.addReference({referenceType:"OrganizedBy",nodeId: Text});
        var DisplayManifest = addressSpace.addObject({
            browseName: "Manifest",
            componentOf : Display
        });

        var DisplayIdentification = addressSpace.addObject({
            browseName: "Identification",
            componentOf: DisplayManifest,
            typeDefinition: folderType
        });

        var DisplayCapabilities = addressSpace.addObject({
            browseName: "Capabilities",
            componentOf: DisplayManifest,
            typeDefinition : folderType
        });
        var DisplayShowing = addressSpace.addObject({
            browseName: capabilities.SHOWING,
            organizedBy: DisplayCapabilities
        });
        var DisplayBody = addressSpace.addObject({
            browseName:"Body",
            componentOf:Display,
            typeDefinition:folderType
        });

        var DisplayText = addressSpace.addObject({
            browseName:"Text",
            componentOf:DisplayShowing
        });

        
        var DisplayManufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            propertyOf: Display.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: manufacturers.Assembler});
                }
            }
        });

        var Display_serialnumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            propertyOf: Display.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String",value: serialnumbers.Assembler});
                }
            }
        });
        Display_serialnumber.addReference({referenceType: "OrganizedBy",nodeId: DisplayIdentification});        

        var Display_Anzeige = addressSpace.addVariable({
            browseName : "Anzeige",
            dataType : "String",
            propertyOf: Display.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "String", value:"SomeText"}); //Gedanken machen was man auf dem Display sehen soll 
                }
            }
        });

        Display_Anzeige.addReference({referenceType:"OrganizedBy",nodeId:DisplayText});
//****** Anmeldung bei der Fabrik */
        callCreateObject = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName: "AnmeldenBeiFabrik",
            modellingRule: "Mandatory",
            inputArguments: [],
            ouputArguments: []
        });
        callCreateObject.bindMethod(function(inputArguments,context,cb){
            var producing = Producing.getComponents().map(element => element.browseName.toString());
            var showing = Showing.getComponents().map(element => element.browseName.toString());
            var monitoring = [];
            var processing = Processing.getComponents().map(element => element.browseName.toString());
            var methodsession;
            var registerMethodId;
            var registerObjectId;
            async.series([
                function(callback)  {
                    client.connect(endpointFabrik,function (err) {
                        if(err) {
                            console.log(" cannot connect to endpoint :" , endpointFabrik );
                            console.log(err);
                        }else{
                            //console.log("Connected to Fabrik!")
                            callback(err);
                        }
                    }); 
                },
                function(callback) {
                    client.createSession(function(err,session) {
                        if(!err) {
                            methodsession = session;
                            callback(err);                            
                        }else{
                            console.log("Error during Session Creation: "+err);
                        }
                    });
                },
                function(callback){
                    methodsession.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[
                            {
                                dataType:"String",
                                value: msgspec.Header.ORDER
                            },{
                                dataType: "String",
                                value: msgspec.Type.DEVICEMANAGEMENT
                            },{
                                dataType: "String",
                                value: msgspec.Content.DeviceManagement.REGISTER
                            }
                        ]
                    },function(err,response){
                        //console.log("Request called!");
                        if (err){
                            console.log("Error during register request: "+err);
                        }else{
                            //console.log(response);
                            registerMethodId = response.outputArguments[3].value;
                            registerObjectId = response.outputArguments[4].value;
                            //console.log("RegisterMethodId: "+registerMethodId);
                            //console.log("RegisterObjectId: "+registerObjectId);
                        }
                        callback(err);
                    })
                },
                function(callback){
                    methodsession.call({
                        objectId: registerObjectId,
                        methodId: registerMethodId,
                        inputArguments: [{
                            dataType: opcua.DataType.String,
                            value: endpointAssembler
                        },{
                            dataType: opcua.DataType.Int32,
                            value: SerialNumber.readValue().value.value
                        },{
                            dataType: opcua.DataType.String,
                            value: Manufacturer.readValue().value.value
                        },{
                            dataType: opcua.DataType.String,
                            value: EndpointType.readValue().value.value
                        },{
                            dataType: opcua.DataType.String,
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank: 1,
                            value: producing
                        },{
                            dataType: opcua.DataType.String,
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank: 1,
                            value: showing
                        },{
                            dataType: opcua.DataType.String,
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank: 1,
                            value: monitoring
                        },{
                            dataType: opcua.DataType.String,
                            arrayType: opcua.VariantArrayType.Array,
                            valueRank: 1,
                            value: processing 
                        }]
                    
                    },function(err,response){
                        //console.log(response);
                        //console.log(err);
                        if(err){
                            console.log("Error during methodCall of register Method: "+err);
                        }
                        callback(err);
                    });
                },
                function(callback){
                    methodsession.close();
                    client.disconnect();
                    callback();
                }
            ]);
            cb();
        });
        callCreateObject.execute([],new opcua.SessionContext(),function(err,result){
            if(!err){
                console.log("Assembler registriert!");
            }else{
                console.log(err);
            }
        })

//****** OPCUA- Variablen zum Zählen der Anzahl der Produkte die geprocessed wurden */

        //Produkt A
        var OutputProductAProcessing = addressSpace.addVariable({
            propertyOf: Assembler.getComponentByName("Body"),
            dataType: "Int32",
            browseName: "ProcessedProductA",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: processProductA});
                }
            }
        });
        OutputProductAProcessing.addReference({referenceType: "OrganizedBy", nodeId: ProcessingMonitoring});

        //Produkt B
        var OutputProductBProcessing = addressSpace.addVariable({
            propertyOf: Assembler.getComponentByName("Body"),
            dataType: "Int32",
            browseName: "ProcessedProductB",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: processProductB});
                }
            }
        });
        OutputProductBProcessing.addReference({referenceType: "OrganizedBy", nodeId: ProcessingMonitoring});


//****** OPCUA-Methode um Node-Id der ProcessingDaten zurückzugeben */
        var ProvideProcessingData = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName: "ProvideProcessingData",
            nodeId: "ns=2;s=ProvideProcessingData",
            modellingRule: "Mandatory",
            outputArguments:[{
                name: "ProcessingAvailability",
                dataType: "String"
            },{
                name: "OutputAProcess",
                dataType: "String"
            },{
                name: "OutputBProcess",
                dataType: "String"
            }]
        });
        ProvideProcessingData.addReference({referenceType:"OrganizedBy",nodeId: ProcessingMonitoring});

        ProvideProcessingData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: ProcessingAvailability.nodeId.toString()
                },{
                    dataType: "String",
                    value: OutputProductAProcessing.nodeId.toString()
                },{
                    dataType: "String",
                    value: OutputProductBProcessing.nodeId.toString()
                }]
            });
        });

//****** OPCUA-Methode um Node-Id der Produktions Daten zurückzugeben */
        var ProvideProductionData = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName: "ProvideProductionData",
            nodeId: "ns=2;s=ProvideProduction",
            modellingRule: "Mandatory",
            outputArguments:[{
                name: "ProductionAvailability",
                dataType: "String"
            },{
                name: "OutputC",
                dataType: "String"
            }]
        });
        ProvideProductionData.addReference({referenceType:"OrganizedBy",nodeId: Production});

        ProvideProductionData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: ProductionAvailability.nodeId.toString()
                },{
                    dataType: "String",
                    value: Output.nodeId.toString()
                }]
            });
        });

//****** OPCUA - Methode um A und B zu processen */

        //ProduktA
        var ProcessProductA = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName:"ProcessProductA",
            nodeId: "ns=2;s=ProcessProductA",
            modellingRule: "Mandatory",
            inputArguments:[{
                name: "Produktnummer des ProduktesA",
                dataType: "Int32"
             },{
                 name: "ProductLifecycleArray",
                 arrayType: opcua.VariantArrayType.Array,
                 valueRank:1,
                 dataType: "String"
             }],
             outputArguments:[{
                 name: "Adresse der produzierenden Maschine",
                 dataType: "String"
             },{
                 name: "ProductNumberHigherProduct",
                 dataType: "Int32"
             }]
        });

        ProcessProductA.addReference({referenceType: "OrganizedBy", nodeId: ProduktAProcessing});

        ProcessProductA.bindMethod(function(inputArguments,context,callback){
            var produktNummer = inputArguments[0].value;
            var productLifecycle = inputArguments[1].value;
            var currentProduct = createProduct(produktNummer, productLifecycle,producttypes.A);
            var productFolder = Assembler.getComponentByName("Body").getComponentByName("Produkte");
            currentProduct.addReference({referenceType: "OrganizedBy",nodeId: productFolder});
            //Senden des neuen übergeordneten Produktes.
            var productsCurrOnAssembler = Assembler.getComponentByName("Body").getFolderElements().filter(e => e.browseName.toString() === "Produkt");
            productsCurrOnAssembler.filter(p => p.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C);
            var produktNumberToSend = productsCurrOnAssembler[0].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value;
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: endpointAssembler
                },{
                    dataType: "Int32",
                    value: produktNumberToSend
                }]
            });
            //Erhöhen entsprechender Variable
            processProductA++;

            
        });

        //ProduktB

        var ProcessProductB = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName:"ProcessProductB",
            nodeId: "ns=2;s=ProcessProductB",
            modellingRule: "Mandatory",
            inputArguments:[{
                name: "Produktnummer des ProduktesB",
                dataType: "Int32"
             },{
                 name: "ProductLifecycleArray",
                 arrayType: opcua.VariantArrayType.Array,
                 valueRank:1,
                 dataType: "String"
             }],
             outputArguments:[{
                 name: "Adresse der produzierenden Maschine",
                 dataType: "String"
             },{
                 name: "ProduktNumberOfHigherProduct",
                 dataType: "Int32"
             }]
        });

        ProcessProductB.addReference({referenceType: "OrganizedBy", nodeId: ProduktBProcessing});

        ProcessProductB.bindMethod(function(inputArguments,context,callback){
            var produktNummer = inputArguments[0].value;
            var productLifecycle = inputArguments[1].value;
            var currentProduct = createProduct(produktNummer, productLifecycle,producttypes.B);
            var productFolder = Assembler.getComponentByName("Body").getComponentByName("Produkte");
            currentProduct.addReference({referenceType: "OrganizedBy",nodeId: productFolder});
            //Senden des neuen übergeordneten Produktes.
            var productsCurrOnAssembler = Assembler.getComponentByName("Body").getFolderElements().filter(e => e.browseName.toString() === "Produkt");
            productsCurrOnAssembler.filter(p => p.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C);
            var produktNumberToSend = productsCurrOnAssembler[0].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value;
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: endpointAssembler
                },{
                    dataType: "Int32",
                    value: produktNumberToSend
                }]
            });
            //Ehöhen entsprechender Variable
            processProductB++;

            
        });

//****** Methode zur Erstellung von ProduktC

        var produceProductC = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName:"ProduceProductC",
            nodeId: "ns=2;s=ProduceProductC",
            modellingRule: "Mandatory",
            inputArguments:[{
                name: "Produktnummer des ProduktesC",
                dataType: "Int32"
             },{
                 name: "ProductLifecycleArray",
                 arrayType: opcua.VariantArrayType.Array,
                 valueRank:1,
                 dataType: "String"
             }],
             outputArguments:[{
                 name: "Adresse der produzierenden Maschine",
                 dataType: "String"
             },{
                 name: "ProductNumberOfHigherProduct",
                 dataType: "Int32"

             }]
        });
        produceProductC.addReference({referenceType:"OrganizedBy",nodeId: ProduktC});

        produceProductC.bindMethod(function(inputArguments,context,callback){
            productionAvailability = false;
            var produktNummer = inputArguments[0].value;
            var productLifecycle = inputArguments[1].value;
            var currentProduct = createProduct(produktNummer, productLifecycle,producttypes.C);
            console.log("Production of Product "+currentProduct.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+ " has started!");
            //Anfrage an die Fabrik zur Herstellung der zusätzlichen Inputprodukte
            Input.getFolderElements().forEach(function(p){
                var requestClient = new opcua.OPCUAClient();
                var requestSession;
                var typ = p.getPropertyByName("ProduktTyp").readValue().value.value;                
                var objectId;
                var methodId;

                async.series([
                    function(callback)  {
                        requestClient.connect(endpointFabrik,function (err) {
                            if(err) {
                                console.log(" cannot connect to endpoint :" , endpointFabrik );
                                console.log(err);
                            }else{                                
                                callback(err);
                            }
                        }); 
                    },
                    function(callback) {
                        requestClient.createSession(function(err,session) {
                            if(!err) {
                                requestSession = session;
                                callback(err);                            
                            }else{
                                console.log("Error during Session Creation: "+err);
                            }
                        });
                    },
                    function(callback){
                        requestSession.call({
                            objectId: "ns=2;s=Manifest",
                            methodId: "ns=2;s=ManifestPort",
                            inputArguments:[
                                {
                                    dataType:"String",
                                    value: msgspec.Header.ORDER
                                },{
                                    dataType: "String",
                                    value: capabilities.ADDINPUTPRODUCT
                                },{
                                    dataType: "String",
                                    value: typ
                                }
                            ]
                        },function(err,response){
                            if (err){
                                console.log("Error during register request: "+err);
                            }else{
                                //console.log(response);
                                methodId = response.outputArguments[3].value;
                                objectId = response.outputArguments[4].value;
                            }
                            callback(err);
                        });
                    },function(callback){
                        requestSession.call({
                            objectId: objectId,
                            methodId: methodId,
                            inputArguments: [
                                {
                                    dataType: "String",
                                    value: capabilities.PROCESSING
                                }
                            ]
                        },function(err, response){
                            if (err){
                                console.log(err);
                            }
                        });
                    },function(callback){
                        requestSession.close();
                        requestClient.disconnect();
                        callback();
                    }
                ]);
            });
            function checkForInput(){
                var productFolder = Assembler.getComponentByName("Body").getComponentByName("Produkte");
                var inputNeeded = Input.getFolderElements().length;
                //TODO: Nicht nur reine Anzahl überprüfen, sondern auf Typübereinstimmung testen.
                if(productFolder.getFolderElements().length === inputNeeded){
                    productFolder.getFolderElements().forEach(function (input){                        
                        input.addReference({referenceType: "ComponentOf", nodeId: currentProduct});                        
                        var otherReferences = input.findReferences("Organizes",false);
                        otherReferences.forEach(function(reference){
                            input.removeReference(reference);
                        });
                    });
                    setTimeout(function(){
                        callback(null,{
                            statusCode: opcua.StatusCodes.Good,
                            outputArguments:[{
                                dataType: "String",
                                value: endpointAssembler
                            },{
                                dataType: "Int32",
                                value: 0
                            }]
                        });
                        //Erhöhen der OutputC Variable
                        outputCProducing++;
                        console.log("Production of Product "+currentProduct.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+" finished");
                        addressSpace.deleteNode(currentProduct);
                        productionAvailability = true;
                    },TimeToManufacture.readValue().value.value*1000);   
                }else{
                    setTimeout(checkForInput,2000);
                }
            }
            checkForInput();
        });

//****** Hilfsmethode zur Erstellung von Produkten */
        function createProduct(produktNumber, productLifecycle, produkttyp){
            var produktnummer = produktNumber;
            var Produkt = AssetType.instantiate({
                browseName:"Produkt",
                nodeId:"ns=3;i="+produktnummer,
                //TODO:Change To Some Other Location
                organizedBy: Assembler.getComponentByName("Body")
            });
            var ProduktType = addressSpace.addVariable({
                browseName: "ProduktTyp",
                componentOf: Produkt.getComponentByName("Header"),
                nodeId:"ns=3;i=2"+produktnummer,
                dataType:"String",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType:"String", value: produkttyp})
                    }
                }
            });
            var ProduktNummer = addressSpace.addVariable({
                browseName: "Produktnummer",
                dataType:"Int32",
                nodeId:"ns=3;i=1"+produktnummer,
                componentOf:Produkt.getComponentByName("Header"),
                value:{
                    get: function(){
                        return new opcua.Variant({dataType:"Int32",value: produktnummer})
                    }
                }
            });

            var ProductLifecycle = addressSpace.addObject({
                typeDefinition: folderType,
                componentOf: Produkt.getComponentByName("Body"),
                browseName: "ProductLifecycle"
            });

            productLifecycle.forEach(function(process){                
                var ProductionProcess = addressSpace.addObject({
                    componentOf:ProductLifecycle,
                    browseName: process
                });
                var numberInSequence = addressSpace.addVariable({
                    browseName: "numberInSequence",
                    propertyOf: ProductionProcess,
                    dataType: "Int32",
                    value: {
                        get: function(){
                            return new opcua.Variant({dataType: "Int32",value: productLifecycle.indexOf(process)});
                        }
                    }
                });
                var finished = addressSpace.addVariable({
                    propertyOf: ProductionProcess,
                    browseName: "finished",
                    dataType: "Boolean",
                    value: {
                        get: function(){
                            if (productLifecycle.indexOf(process)< productLifecycle.indexOf("Producing")){
                                return new opcua.Variant({dataType: "Boolean",value: true});
                            }else{
                                return new opcua.Variant({dataType: "Boolean",value: false});
                            }
                        }
                    }
                })
            });
            var ProduktStatus = addressSpace.addVariable({
                componentOf: Produkt.getComponentByName("Body"),
                browseName: "ProduktStatus",
                dataType: "String",
                value:{
                    get: function(){
                            return new opcua.Variant({dataType: "String", value: productstat.INPRODUCTION });
                    }
                }
            });

            return Produkt;
        }
//****** Servererstellung  */
    }
    construct_my_address_space(server);
    server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port);
        var endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the primary server endpoint url is ", endpointUrl );
    });
}
server.initialize(post_initialize);
