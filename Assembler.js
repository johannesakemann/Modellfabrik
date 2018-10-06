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

var endpointFabrik = "opc.tcp://Johanness-MacBook-Pro-1434.local:4337/UA/modellfabrik";
var endpointAssembler = server.endpoints[0].endpointDescriptions()[0].endpointUrl;

var client =  new opcua.OPCUAClient();

function post_initialize() {
    console.log("initialized");
    function construct_my_address_space(server) {

//****** Hilfsvariablen */
        var addressSpace = server.engine.addressSpace;
        var objectFolder = addressSpace.findNode("ns=0;i=85");
        var folderType = addressSpace.findNode("ns=0;i=61");
        
        var productionRuns = false;
        var produktnummer = 0;
        var outputGoal = 0;
        var mengeAproC = 0;
        var mengeBproC = 0;
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
        var Collect = addressSpace.addObject({
            browseName: capabilities.COLLECTING,
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
        var ProduktCMonitoring = addressSpace.addObject({
            browseName: producttypes.C,
            componentOf: Monitoring
        });

        var Production = addressSpace.addObject({
            browseName: "Production",
            componentOf:Monitoring
        })
//****** Spezifikation der Collecting Capability */
        var ProduktACollecting = addressSpace.addObject({
            browseName: producttypes.A,
            componentOf: Collect
        });

        var productTypeACollecting = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktACollecting,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.A});
                }
            }
        });
        var ProduktBCollecting = addressSpace.addObject({
            browseName: producttypes.B,
            componentOf: Collect
        });
        
        var productTypeBCollecting = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktBCollecting,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.B});
                }
            }
        }); 
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
        TimeToManufacture.addReference({referenceType: "OrganizedBy",nodeId: ProduktCMonitoring});
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
        Input.addReference({referenceType:"OrganizedBy",nodeId: ProduktCMonitoring});
        var ProduktA = addressSpace.addObject({
            browseName : producttypes.A,
            organizedBy : Input,
        });
        var NumberA = addressSpace.addVariable({
            browseName: "Number",
            dataType: "Int32",
            propertyOf: ProduktA,
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: 2});
                }
            }
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
        var NumberB = addressSpace.addVariable({
            browseName: "Number",
            dataType: "Int32",
            propertyOf: ProduktB,
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: 1});
                }
            }
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
            //TODO: remove this output!
            console.log("ManifestPort has been called "+ inputArguments);
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
                    return new opcua.Variant({dataType: "Int32", value:help.transformFabrikPowerToLEDPower(productionRuns)});
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
        var ProductionsRuns = addressSpace.addVariable({
            browseName: "ProductionRuns",
            dataType: "Boolean",
            componentOf: Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Boolean", value: productionRuns});
                }
            }
        });
        ProductionsRuns.addReference({referenceType: "OrganizedBy", nodeId: Production});
//****** Anlegen Outputgoal */
        var OutputGoal = addressSpace.addVariable({
            browseName: "OutputGoal",
            dataType: "Int32",
            propertyOf : Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.Int32,value: outputGoal});
                },
                set: function(variant){                    
                    outputGoal = variant.value;
                    console.log("Outputgoal changed to: "+ outputGoal);
                    return opcua.StatusCodes.Good;
                }
            }
        });
        OutputGoal.addReference({referenceType:"OrganizedBy",nodeId: ProduktCMonitoring});
//****** Anlegen Output Variable für ProduktC
        var Output = addressSpace.addVariable({
            browseName:"Output",
            dataType: "Int32",
            propertyOf: Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    try{
                        return new opcua.Variant({dataType: "Int32", value: Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(element => element.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C).length});
                    }catch(err){
                        return new opcua.Variant({dataType: "Int32", value: 0});
                    }
                }
            }
        });
        Output.addReference({referenceType:"OrganizedBy",nodeId: ProduktCMonitoring});        
//****** Anlegen VerhaeltnisVariablen */
        var MengeAproC = addressSpace.addVariable({
            browseName: "MengeAproC",
            dataType: "Int32",
            propertyOf : Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.Int32,value: mengeAproC});
                },
                set: function(variant){
                    mengeAproC = variant.value;
                    console.log("Menge A pro C changed to: "+mengeAproC);
                    return opcua.StatusCodes.Good;
                }
            }
        });
        var MengeBproC = addressSpace.addVariable({
            browseName: "MengeBproC",
            dataType: "Int32",
            propertyOf : Assembler.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.Int32,value: mengeBproC});
                },
                set: function(variant){
                    mengeBproC = variant.value;
                    console.log("Menge B pro C changed to: "+mengeBproC);
                    return opcua.StatusCodes.Good;
                }
            }
        });


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
//****** JS-Methode zur Erstellung von Aufträgen */

        function createAuftrag(auftraggeber, auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC){
            var Auftrag = AssetType.instantiate({
                browseName: "CurrentAuftrag",
                componentOf: Assembler.getComponentByName("Body")
            });

            var AuftragsBody = addressSpace.addObject({
                browseName: "Body",
                typeDefinition: folderType,
                componentOf: Auftrag
            })

            var Auftraggeber = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "String",
                browseName: "Auftraggeber",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "String", value: auftraggeber});
                    }
                }
            });


            var Auftragsnummer = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "Int32",
                browseName: "Auftragsnummer",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: auftragsnummer});
                    }
                }
            });

            var BestellmengeA = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeA",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: bestellmengeA});
                    }
                }
            });
            var BestellmengeB = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeB",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value:bestellmengeB});
                    }
                }
            });
            var BestellmengeC = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeC",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value:bestellmengeC});
                    }
                }
            });
            var Auftragsstatus = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "String",
                browseName: "Auftragsstatus",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "String", value:auftragsstat.INPRODUCTION});
                    },
                    set: function(variant){
                        auftragsstatus = variant.value;
                        return opcua.StatusCodes.Good;
                    }
                }
            });

            var AuftragProduktordner = addressSpace.addObject({
                componentOf:Auftrag.getComponentByName("Body"),
                browseName: "Zugehoerige Produkte",
                typeDefinition: folderType
            })
        }

//****** Methode zur Aufnahme der Produkte A durch den Assembler

        var collectProductsA = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName:"CollectProductsA",
            modellingRule: "Mandatory",
            inputArguments:[{
                name: "Produktnummern Produkt A",
                dataType: "Int32",
                valueRank:1,
                arrayType: opcua.VariantArrayType.Array,
            },{
                name: "Auftraggeber",
                dataType: "String"
            },{
                name: "Auftragsnummer",
                dataType: opcua.DataType.Int32
            },{
                name: "BestellmengeA",
                dataType: opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge des Endproduktes, die für den aktuellen Auftrag gewünscht ist."
            },{
                name:"BestellmengeB",
                dataType:  opcua.DataType.Int32,
                description: "Menge, die im aktuellen Auftrag von A ins Endprodukt einfliessen sollen."
            },{
                name:"BestellmengeC",
                dataType:  opcua.DataType.Int32,
                description: "Menge, die im aktuellen Auftrag von B ins Endprodukt einfliessen sollen."
            }]
        });
        collectProductsA.addReference({referenceType: "OrganizedBy",nodeId: ProduktACollecting});
        collectProductsA.bindMethod(function(inputArguments,context,callback){

            var productsA = inputArguments[0].value; 
            var auftraggeber = inputArguments[1].value;
            var auftragsnummer = inputArguments[2].value;
            var bestellmengeA = inputArguments[3].value;
            var bestellmengeB = inputArguments[4].value;
            var bestellmengeC = inputArguments[5].value;
            

            if(Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag")===null){
                console.log("Hier");
                createAuftrag(auftraggeber,auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC);
            }else if (Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value !== auftragsnummer){
                createAuftrag(auftraggeber,auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC);
            }
            
            productsA.forEach( function(productnumberA){
                var Produkt = AssetType.instantiate({
                    browseName:producttypes.A,
                    organizedBy: Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte")
                });
                var ProduktType = addressSpace.addVariable({
                    browseName: "ProduktTyp",
                    componentOf: Produkt.getComponentByName("Header"),
                    dataType:"String",
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"String", value: producttypes.A})
                        }
                    }
                });
                var ProduktNummer = addressSpace.addVariable({
                    browseName: "Produktnummer",
                    dataType:"Int32",
                    componentOf:Produkt.getComponentByName("Header"),
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"Int32",value: productnumberA})
                        }
                    }
                });
            });
            var produkteA =Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktType") === producttypes.A);
            var produkteB =Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktType") === producttypes.B);
            if (produkteA.length >= MengeAproC.readValue().value.value && produkteB.length >= MengeBproC.readValue().value.value){
                productionRuns = true;
                produceProductC.execute([{dataType:"Int32",value:1}],new opcua.SessionContext(),function(err,result){
                    if(!err){
                        //console.log("Assemble Called!");
                    }else{
                        console.log(err);
                    }
                })
            }
            callback(null,{
                statusCode: opcua.StatusCodes.Good
            });

        });

//****** Methode zur Aufnahme der Produkte B durch den Assembler
        var collectProductsB = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName:"CollectProductsB",
            modellingRule: "Mandatory",
            inputArguments:[{
                name: "Produktnummern Produkt B",
                dataType: "Int32",
                valueRank:1,
                arrayType: opcua.VariantArrayType.Array,
            },{
                name: "Auftraggeber",
                dataType: "String"
            },{
                name: "Auftragsnummer",
                dataType: opcua.DataType.Int32
            },{
                name: "BestellmengeA",
                dataType: opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge des Endproduktes, die für den aktuellen Auftrag gewünscht ist."
            },{
                name:"BestellmengeB",
                dataType:  opcua.DataType.Int32,
                description: "Menge, die im aktuellen Auftrag von A ins Endprodukt einfliessen sollen."
            },{
                name:"BestellmengeC",
                dataType:  opcua.DataType.Int32,
                description: "Menge, die im aktuellen Auftrag von B ins Endprodukt einfliessen sollen."
            }]
        });
        collectProductsB.addReference({referenceType: "OrganizedBy",nodeId: ProduktBCollecting});
        collectProductsB.bindMethod(function(inputArguments,context,callback){

            var productsB = inputArguments[0].value; 
            var auftraggeber = inputArguments[1].value;
            var auftragsnummer = inputArguments[2].value;
            var bestellmengeA = inputArguments[3].value;
            var bestellmengeB = inputArguments[4].value;
            var bestellmengeC = inputArguments[5].value;
            

            if(Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag")===null){
                createAuftrag(auftraggeber,auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC);
            }else if (Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value !== auftragsnummer){
                createAuftrag(auftraggeber,auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC);
            }
            
            productsB.forEach( function(productnumberB){
                var Produkt = AssetType.instantiate({
                    browseName:producttypes.B,
                    organizedBy: Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte")
                });
                var ProduktType = addressSpace.addVariable({
                    browseName: "ProduktTyp",
                    componentOf: Produkt.getComponentByName("Header"),
                    dataType:"String",
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"String", value: producttypes.B})
                        }
                    }
                });
                var ProduktNummer = addressSpace.addVariable({
                    browseName: "Produktnummer",
                    dataType:"Int32",
                    componentOf:Produkt.getComponentByName("Header"),
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"Int32",value: productnumberB})
                        }
                    }
                });
            });
            var produkteA =Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktType") === producttypes.A);
            var produkteB =Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktType") === producttypes.B);
            if (produkteA.length >= MengeAproC.readValue().value.value && produkteB.length >= MengeBproC.readValue().value.value){
                productionRuns = true;
                produceProductC.execute([{dataType:"Int32",value:1}],new opcua.SessionContext(),function(err,result){
                    if(!err){
                        //console.log("Assemble Called!");
                    }else{
                        console.log(err);
                    }
                })
            }
            callback(null,{
                statusCode: opcua.StatusCodes.Good
            });

        });

//****** OPCUA-Methode um Node-Ids der ProduktC Monitoring  zurückzugeben*/
        var ProvideProductCData = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName: "ProvideProductCData",
            nodeId: "ns=2;s=ProvideProductCData",
            modellingRule: "Mandatory",
            outputArguments:[{
                name: "TimeToManufacture",
                dataType:"String"
            },{
                name: "Outputgoal",
                dataType: "String"
            },{
                name: "Output",
                dataType: "String"
            },{
                name: "AperC",
                dataType: "String"
            },{
                name: "BperC",
                dataType: "String"
            }]
        });

        ProvideProductCData.addReference({referenceType: "OrganizedBy",nodeId:ProduktCMonitoring});

        ProvideProductCData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: TimeToManufacture.nodeId.toString()
                },{
                    dataType: "String",
                    value: OutputGoal.nodeId.toString()
                },{
                    dataType:"String",
                    value: Output.nodeId.toString()
                },{
                    dataType: "String",
                    value: NumberA.nodeId.toString()
                },{
                    dataType:"String",
                    value: NumberB.nodeId.toString()
                }]
            });
        });
//****** OPCUA-Methode um Node-Id der Production-Runs */
        var ProvideProductionData = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
            browseName: "ProvideProductionData",
            nodeId: "ns=2;s=ProvideProduction",
            modellingRule: "Mandatory",
            outputArguments:[{
                name: "ProductionRuns",
                dataType: "String"
            }]
        });
        ProvideProductionData.addReference({referenceType:"OrganizedBy",nodeId: Production});

        ProvideProductionData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: ProductionsRuns.nodeId.toString()
                }]
            });
        })
//****** OPCUA - Methode um A und B zu processen */

        //ProduktA
        var processProductA = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
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

        processProductA.addReference({referenceType: "OrganizedBy", nodeId: ProduktAProcessing});

        processProductA.bindMethod(function(inputArguments,context,callback){
            var produktNummer = inputArguments[0].value;
            var productLifecycle = inputArguments[1].value;
            var currentProduct = createProduct(produktNummer, productLifecycle,producttypes.A);
            var productFolder = Assembler.getComponentByName("Body").getComponentByName("Produkte");
            currentProduct.addReference({referenceType: "OrganizedBy",nodeId: productFolder});
            //Senden des neuen übergeordneten Produktes.
            var productsCurrOnAssembler = Assembler.getComponentByName("Body").getFolderElements().filter(e => e.browseName.toString() === "Produkt");
            productsCurrOnAssembler.filter(p => p.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C);
            var produktNumberToSend = productsCurrOnAssembler[0].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value;
            //TODO: Remove Standard Reference to AssemblerBody
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

            
        });

        //ProduktB

        var processProductB = addressSpace.addMethod(Assembler.getComponentByName("Body"),{
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

        processProductB.addReference({referenceType: "OrganizedBy", nodeId: ProduktBProcessing});

        processProductB.bindMethod(function(inputArguments,context,callback){
            var produktNummer = inputArguments[0].value;
            var productLifecycle = inputArguments[1].value;
            var currentProduct = createProduct(produktNummer, productLifecycle,producttypes.B);
            var productFolder = Assembler.getComponentByName("Body").getComponentByName("Produkte");
            currentProduct.addReference({referenceType: "OrganizedBy",nodeId: productFolder});
            //Senden des neuen übergeordneten Produktes.
            var productsCurrOnAssembler = Assembler.getComponentByName("Body").getFolderElements().filter(e => e.browseName.toString() === "Produkt");
            productsCurrOnAssembler.filter(p => p.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C);
            var produktNumberToSend = productsCurrOnAssembler[0].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value;
            //TODO: Remove Standard Reference to AssemblerBody
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
            productionRuns= true;
            var produktNummer = inputArguments[0].value;
            var productLifecycle = inputArguments[1].value;
            var currentProduct = createProduct(produktNummer, productLifecycle,producttypes.C);
            console.log("Production of Product "+currentProduct.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+ " has started!");
            //Anfrage an die Fabrik zur Herstellung der zusätzlichen Inputprodukte
            Input.getFolderElements().forEach(function(p){
                var requestClient = new opcua.OPCUAClient();
                var requestSession;
                var typ = p.getPropertyByName("ProduktTyp").readValue().value.value;
                console.log("Typ "+typ);
                var objectId;
                var methodId;

                async.series([
                    function(callback)  {
                        requestClient.connect(endpointFabrik,function (err) {
                            if(err) {
                                console.log(" cannot connect to endpoint :" , endpointFabrik );
                                console.log(err);
                            }else{
                                console.log("Connected to Fabrik!")
                                callback(err);
                            }
                        }); 
                    },
                    function(callback) {
                        requestClient.createSession(function(err,session) {
                            if(!err) {
                                console.log("SessionCreated")
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
                            console.log("Add InputRequest called!");
                            if (err){
                                console.log("Error during register request: "+err);
                            }else{
                                //console.log(response);
                                methodId = response.outputArguments[3].value;
                                objectId = response.outputArguments[4].value;
                                console.log("RegisterMethodId: "+methodId);
                                console.log("RegisterObjectId: "+objectId);
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
                        console.log("Production of Product "+currentProduct.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+" finished");
                        addressSpace.deleteNode(currentProduct);
                    }, TimeToManufacture.readValue().value.value*1000);   
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
//****** JS-Methode um Produkte zu senden */
        function sendAllProducts(){
            var products = Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements();
            var productsC = transportProductsFromAuftrag(Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag"));
            var productsB = products.filter(p => p.browseName.toString() === producttypes.B).map(p => p.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value);
            var productsA = products.filter(p => p.browseName.toString() === producttypes.A).map(p => p.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value);
            var objectIdCC;
            var methodIdCC;
            var objectIdCB;
            var methodIdCB;
            var objectIdCA;
            var methodIdCA;
            var the_session;                    
            async.series([
                function(callback){
                    client.connect(endpointFabrik,function(err){
                        callback();
                    });
                },
                function(callback){
                    client.createSession(function(err,session){
                        if(!err){
                            the_session = session;
                            callback();
                        }else{
                            console.log(err);
                        }
                    })
                    
                },
                function(callback){
                    the_session.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[{
                            name: "Header",
                            dataType: "String",
                            value: msgspec.Header.ORDER
                        },{
                            name: "Type",
                            dataType: "String",
                            value: msgspec.Type.COLLECTING
                        },{
                            name: "Content",
                            dataType: "String",
                            value: producttypes.C
                        }]
                    },function(err,result){
                        if(!err){
                            methodIdCC = result.outputArguments[3].value;
                            objectIdCC = result.outputArguments[4].value;
                            console.log("Produkte C gesendet!");
                            callback();
                        }else{
                            console.log(err);
                        }
                    });                    
                },
                function(callback){
                    the_session.call({
                        objectId: objectIdCC,
                        methodId: methodIdCC,
                        inputArguments:[{
                            name: "Produktnummern",
                            dataType: "Int32",
                            valueRank: 1,
                            arrayType: opcua.VariantArrayType.Array,
                            value: productsC
                        },{
                            name: "AperC",
                            dataType: "Int32",
                            value: ProduktC.getPropertyByName("Input").getFolderElements().filter(e => e.browseName.toString() === producttypes.A)[0].getPropertyByName("Number").readValue().value.value
                        },{
                            name: "BperC",
                            dataType:"Int32",
                            value: ProduktC.getPropertyByName("Input").getFolderElements().filter(e => e.browseName.toString() === producttypes.B)[0].getPropertyByName("Number").readValue().value.value
                        }]
                    },function(err,result){
                        if(!err){
                            callback();
                        }
                    })
                },
                function(callback){
                    the_session.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[{
                            name: "Header",
                            dataType: "String",
                            value: msgspec.Header.ORDER
                        },{
                            name: "Type",
                            dataType: "String",
                            value: msgspec.Type.COLLECTING
                        },{
                            name: "Content",
                            dataType: "String",
                            value: producttypes.B
                        }]
                    },function(err,result){
                        if(!err){
                            methodIdCB = result.outputArguments[3].value;
                            objectIdCB = result.outputArguments[4].value;
                            callback();
                            console.log("Produkte B gesendet");
                        }else{
                            console.log(err);
                        }
                    });
                },
                function(callback){
                    the_session.call({
                        objectId: objectIdCB,
                        methodId: methodIdCB,
                        inputArguments:[{
                            name: "Produktnummern",
                            dataType: "Int32",
                            valueRank: 1,
                            arrayType: opcua.VariantArrayType.Array,
                            value: productsB
                        },{
                            name:"Auftraggeber",
                            dataType: "String",
                            value: "SomeString"
                        },{
                            name: "Auftragsnummer",
                            dataType: "Int32",
                            value: 0
                        },{
                            name:"BestellmengeA",
                            dataType: "Int32",
                            value: 0
                        },{
                            name: "BestellmengeB",
                            dataType: "Int32",
                            value: 0
                        },{
                            name: "BestellmengeC",
                            dataType: "Int32",
                            value: 0
                        }]
                    },function(err,result){
                        if(!err){
                            callback();
                        }
                    })
                },
                function(callback){
                    the_session.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[{
                            name: "Header",
                            dataType: "String",
                            value: msgspec.Header.ORDER
                        },{
                            name: "Type",
                            dataType: "String",
                            value: msgspec.Type.COLLECTING
                        },{
                            name: "Content",
                            dataType: "String",
                            value: producttypes.A
                        }]
                    },function(err,result){
                        if(!err){
                            methodIdCA = result.outputArguments[3].value;
                            objectIdCA = result.outputArguments[4].value;
                            console.log("Produkte A gesendet");
                            callback();
                        }else{
                            console.log(err)
                        }
                    });
                },function(callback){
                    the_session.call({
                        objectId: objectIdCA,
                        methodId: methodIdCA,
                        inputArguments:[{
                            name: "Produktnummern",
                            dataType: "Int32",
                            valueRank: 1,
                            arrayType: opcua.VariantArrayType.Array,
                            value: productsA
                        },{
                            name:"Auftraggeber",
                            dataType: "String",
                            value: "SomeString"
                        },{
                            name: "Auftragsnummer",
                            dataType: "Int32",
                            value: 0
                        },{
                            name:"BestellmengeA",
                            dataType: "Int32",
                            value: 0
                        },{
                            name: "BestellmengeB",
                            dataType: "Int32",
                            value: 0
                        },{
                            name: "BestellmengeC",
                            dataType: "Int32",
                            value: 0
                        }]
                    },function(err,result){
                        if(!err){
                            callback();
                        }
                    })
                },
                function(callback){
                    var nodesToBeDeleted = Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements();;
                    nodesToBeDeleted.forEach(function(element){
                        addressSpace.deleteNode(element);
                    });
                    addressSpace.deleteNode(Assembler.getComponentByName("Body").getComponentByName("CurrentAuftrag"));
                    callback();
                },
                function(callback){
                    the_session.close();
                    client.disconnect();
                    callback();
                }
            ]);
        }
//****** JS-Hilfsmethode um aus den Produkten einese Auftrag ein Array zum Transport herzustellen */


        function transportProductsFromAuftrag(Auftrag){
            var result = [];
            var endProducts = Auftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(product => product.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value===producttypes.C);
            for(var i = 0; i < endProducts.length; i++){
                result.push(endProducts[i].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value);
                var productsA = endProducts[i].getComponentByName("Body").getComponents().filter(teilprodukt => teilprodukt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.A);
                var productsB = endProducts[i].getComponentByName("Body").getComponents().filter(teilprodukt => teilprodukt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.B);
                for(var j = 0;j < productsA.length;j++){
                    result.push(productsA[j].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value);
                }
                for(var j = 0;j < productsB.length;j++){
                    result.push(productsB[j].getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value);
                }
            }
            return result;
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
