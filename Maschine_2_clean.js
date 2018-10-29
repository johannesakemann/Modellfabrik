var opcua = require("node-opcua");
var path = require('path');
var async = require("async");
var call = require('node-opcua-service-call');
var manufacturers = require('./manufacturers.json');
var serialnumbers = require('./serialnumbers.json');
var einheiten = require('./einheiten.json');
var help = require('./help');
var endpointtypes = require('./endpointtypes.json');
var producttypes = require('./producttypes.json');
var auftragsstat = require('./AuftragsStatus.json');
var capabilities = require('./capabilities.json');
var msgspec = require('./MessageSpecification.json');
var productstat = require('./productstatus.json');

var client =  new opcua.OPCUAClient({endpoint_must_exist:false});
var server = new opcua.OPCUAServer({
    port: 4338, // the port of the listening socket of the server
    maxAllowedSessionNumber: 100,
    resourcePath: "UA/Machine_2", // this path will be added to the endpoint resource name
    nodeset_filename: [opcua.standard_nodeset_file], //"/home/pi/modellfabrik/aas_for_import.xml"],
     buildInfo : {
        productName: "Machine_2",
        buildNumber: "7658",
        buildDate: new Date(2018,1,26)
    }
});

var endpointFabrik = "opc.tcp://MHraspberry:4337/UA/modellfabrik";
var endpointMachine2 = server.endpoints[0].endpointDescriptions()[0].endpointUrl;

function post_initialize() {
    console.log("initialized");
    function construct_my_address_space(server) {
//***** Hilfsvariablen        
        var addressSpace = server.engine.addressSpace;
        var objectFolder = addressSpace.findNode("ns=0;i=85");
        var folderType = addressSpace.findNode("ns=0;i=61");
        

//***** JS Variablen zu OPCUA-Variablen        
        var temperature_1 = 1.0;
        var outputA = 0;
        var outputB = 0;
        
        var timeToManufactureA = 10;
        var timeToManufactureB = 5;
        var overheatingTemperature = 26;
 //***********Definition der abstrakten Types
        
        
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
        
        var Manufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            dataType: "String",
            propertyOf : Header
        });
        var SerialNumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            dataType: "String",
            propertyOf : Header
        });
      
//***** Instanzieren konkreter Objekte -- Machine2
              
        var Machine_2 = AssetType.instantiate({
            browseName :"Machine_2",
            nodeId:"ns=2;s=Machine",
            organizedBy: objectFolder
        });

        var Header_Machine_2 = Machine_2.getComponentByName("Header");

        var Machine_2_manufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            propertyOf: Header_Machine_2,
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: manufacturers["Machine"]});
                }
            }
        });

        var Machine_2_serialnumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            propertyOf: Header_Machine_2,
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: serialnumbers["Machine_2"]});
                }
            }
        });
//***** Spezifizieren Manifest
        var Manifest = addressSpace.addObject({
            browseName: "Manifest",
            componentOf: Machine_2,
            nodeId: "ns=2;s=Manifest"
        });

        var Identification = addressSpace.addObject({
            browseName: "Identification",
            componentOf: Manifest,
            typeDefinition: folderType
        });
        Machine_2_serialnumber.addReference({referenceType:"OrganizedBy",nodeId: Identification});

        var Capabilities = addressSpace.addObject({
            browseName: "Capabilities",
            componentOf: Manifest,
            typeDefinition : folderType
        });
//***** Anlegen des Capabilities innerhalb des Manifestes
        
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
//***** Spezifikation der Produktions-Capability
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
        

        // ProduktA
        var ProduktA = addressSpace.addObject({
            browseName: producttypes.A,
            componentOf: Producing
        });

        var TimeToManufactureA = addressSpace.addVariable({
            browseName: "TimeToManufacture",
            propertyOf: ProduktA,
            dataType : "Int32",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: timeToManufactureA});
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
        var InputA = addressSpace.addObject({
            browseName: "Input",
            propertyOf: ProduktA,
            typeDefinition: folderType
        });

        // ProduktB
        var ProduktB = addressSpace.addObject({
            browseName: producttypes.B,
            componentOf: Producing
        });

        var TimeToManufactureB = addressSpace.addVariable({
            browseName: "TimeToManufacture",
            propertyOf: ProduktB,
            dataType : "Int32",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value: timeToManufactureB});
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
        var InputB = addressSpace.addObject({
            browseName: "Input",
            propertyOf: ProduktB,
            typeDefinition: folderType
        });
//***** Spezifikation der Monitoring-Capability
        var Temperatur = addressSpace.addObject({
            browseName: "Temperature",
            componentOf: Monitoring
        });
        var Produktion = addressSpace.addObject({
            browseName: "Production",
            componentOf: Monitoring
        });
        ProductionAvailability.addReference({referenceType: "OrganizedBy",nodeId: Produktion});

//***** Spezifikation der Showing Capability
        var Light = addressSpace.addObject({
            browseName:"Light",
            componentOf:Showing
        });    

//***** Instanzieren Temperatursensor       
        var TemperatureSensor = AssetType.instantiate({
            browseName :"TemperatureSensor",
            organizedBy: Machine_2.getComponentByName("Body") 
        });

        TemperatureSensor.addReference({referenceType: "OrganizedBy",nodeId:Temperatur});
        var TemperatureSensorBody = addressSpace.addObject({
            browseName :"Body",
            componentOf: TemperatureSensor,
            typeDefinition: folderType
        });
        var TemperatureSensorManufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            propertyOf: TemperatureSensor.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: manufacturers["TemperatureSensor"]});
                }
            }
        });
        var TemperatureSensorSerialnumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            propertyOf: TemperatureSensor.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: serialnumbers["TemperatureSensor_1"]});
                }
            }
        });
        var TemperatureSensorManifest = addressSpace.addObject({
            browseName: "Manifest",
            componentOf: TemperatureSensor
        });
        var CapabilitiesTemperatureSensor = addressSpace.addObject({
            browseName: "Capabilities",
            componentOf: TemperatureSensorManifest,
            typeDefinition: folderType
        });
        var IdentificationTemperatureSensor = addressSpace.addObject({
            browseName: "Identification",
            componentOf: TemperatureSensorManifest,
            typeDefinition: folderType
        });

        TemperatureSensorSerialnumber.addReference({referenceType: "OrganizedBy",nodeId: IdentificationTemperatureSensor});
        var MonitoringTemperatureSensor = addressSpace.addObject({
            browseName: capabilities.MONITORING,
            organizedBy: CapabilitiesTemperatureSensor 
        });
        var TemperatureSensorTemperatur = addressSpace.addObject({
            browseName: "Temperature",
            componentOf: MonitoringTemperatureSensor
        });
//***** Temperatursensor Messwerte */
        var TemperatureSensorMesswerte = addressSpace.addVariable({
            browseName : "Messwert",
            dataType : "Double",
            componentOf: TemperatureSensor.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Double", value:temperature_1});
                },
                set: function(variant){
                    temperature_1 = parseFloat(variant.value);
                    if (temperature_1 > overheatingTemperature){
                        SafeShutdown.execute([], new opcua.SessionContext(),function(err,result){
                            if(err){
                                console.log("Error calling Safe Shutdown: "+err);
                            }
                        })
                    }
                    return opcua.StatusCodes.Good;
                }
            },
            eventSourceOf: TemperatureSensor
        });
        TemperatureSensorMesswerte.addReference({referenceType:"OrganizedBy",nodeId: TemperatureSensorTemperatur});
        var TemperatureSensorMesswerte_einheit = addressSpace.addVariable({
            browseName: "Einheit",
            dataType: "String",
            propertyOf: TemperatureSensorMesswerte,
            value :{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: einheiten["TemperatureSensor"]});
                }
            }
        });
        var TemperatureMesswerte_skala = addressSpace.addVariable({
            browseName: "Skala",
            dataType: "Int32",
            propertyOf: TemperatureSensorMesswerte,
            value :{
                get: function() {return help.calculate_normalized_value(temperature_1,20,25);}
            }
        });
        TemperatureMesswerte_skala.addReference({referenceType:"OrganizedBy",nodeId: TemperatureSensorTemperatur});

        var ProvideTemperatureData = addressSpace.addMethod(TemperatureSensorBody,{
            browseName: "ProvideTemperatureData",
            nodeId: "ns=2;s=ProvideTemperatureData",
            outputArguments:[
                {
                    name: "Temperaturmesswert",
                    dataType: "String"
                },{
                    name: "Temperaturmesswertskala",
                    dataType: "String"
                }
            ]
        });
        ProvideTemperatureData.addReference({referenceType:"OrganizedBy",nodeId: TemperatureSensorTemperatur});

        ProvideTemperatureData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType:"String",
                    value: TemperatureSensorMesswerte.nodeId.toString()
                },{
                    dataType:"String",
                    value: TemperatureMesswerte_skala.nodeId.toString()
                }]
            });
        });

//***** Feueralarm als Condition implementiert

        var overheating = addressSpace.instantiateNonExclusiveLimitAlarm("NonExclusiveLimitAlarmType",{
            nodeId: "ns=2;s=TemperaturSensorOverheating",
            componentOf: TemperatureSensor,
            browseName: "Overheating",
            inputNode: TemperatureSensorMesswerte,
            conditionSource: TemperatureSensorMesswerte,
            optionals: [
                "ConfirmedState" // confirm state and confirm Method
            ],
            //lowLowLimit: -10.0,
            //lowLimit: 2.0,
            highLimit: overheatingTemperature,
            //highHighLimit: 100.0
        })
//***** Safety Shutdown als OPCUA Methode
        var SafeShutdown = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            nodeId:"ns=2;s=SafeShutdown",
            browseName: "SafeShutdown",
        });

        SafeShutdown.bindMethod(function(inputArgumens,context,callback){
            //Zunächst beenden der Produktion --> führt auch zum senden der Produkte an die nächste Instanz
            productionAvailability = false;
            //Aufrufen der remove Methode in der Fabrik --> entfernen des Devices + letzter Status der übergeben wird.
            var unregistersession;
            var unregisterMethodId;
            var unregisterObjectId;
            async.series([
                function(callback)  {
                    client.connect(endpointFabrik,function (err) {
                        if(err) {
                            console.log(" cannot connect to endpoint :" , endpointFabrik );
                            console.log(err);
                        }
                        callback(err);
                    }); 
                },
                function(callback) {
                    client.createSession(function(err,session) {
                        if(!err) {
                            unregistersession = session;
                        }
                        callback(err);
                    });
                },
                function(callback){
                    unregistersession.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[
                            {
                                dataType: "String",
                                value: msgspec.Header.ORDER
                            },{
                                dataType: "String",
                                value: msgspec.Type.DEVICEMANAGEMENT
                            },{
                                dataType: "String",
                                value: msgspec.Content.DeviceManagement.REMOVE
                            }
                        ]
                    },function(err,response){
                        if (err){
                            console.log("Error during Unregister request: "+err);
                        }else{
                            //console.log(response);
                            unregisterMethodId = response.outputArguments[3].value;
                            unregisterObjectId = response.outputArguments[4].value;
                            //console.log(unregisterMethodId);
                            //console.log(unregisterObjectId);
                            callback();
                        }
                    })
                },
                function(callback){
                    unregistersession.call({
                        objectId:unregisterObjectId,
                        methodId:unregisterMethodId,
                        inputArguments:[
                            {
                                dataType: "Int32",
                                value:outputgoalA
                            },{
                                dataType: "Int32",
                                value: OutputA.readValue().value.value
                            },{
                                dataType: "Int32",
                                value: outputgoalB
                            },{
                                dataType: "Int32",
                                value: OutputB.readValue().value.value
                            },{
                                dataType: "Int32",
                                value: 0
                            },{
                                dataType: "Int32",
                                value: 0
                            },{
                                dataType: "String",
                                value: endpointMachine2
                            }
                        ]
                    },function(err,response){
                        if (err){
                            console.log("Error during removal of device: "+err);
                        }else{
                            console.log("Device sucessfully removed");
                        }
                        callback();
                    })
                },
                function(callback){
                    unregistersession.close();
                    client.disconnect();
                    callback();
                }
            ]);
            //Herunterfahren des Servers.
            server.shutdown(10000,function(err){
                if (!err){
                    console.log("Maschine2 wird heruntergefahren");
                }else{
                    console.log("Error during shutdown: "+err);
                }
                //callback();
            })
        })
//***** Instanzieren LED       
        var LED = AssetType.instantiate({
            browseName :"LED",
            organizedBy: Machine_2.getComponentByName("Body") 
        });

        LED.addReference({referenceType: "OrganizedBy",nodeId: Light});


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

        var LEDBody = addressSpace.addObject({
            browseName :"Body",
            componentOf:LED,
            typeDefinition:folderType
        });

        var LED_manufacturer = addressSpace.addVariable({
            browseName: "Manufacturer",
            propertyOf: LED.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: manufacturers["LED"]});
                }
            }
        });
        var LED_serialnumber = addressSpace.addVariable({
            browseName: "SerialNumber",
            propertyOf: LED.getComponentByName("Header"),
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: serialnumbers["LED"]});
                }
            }
        });

        LED_serialnumber.addReference({referenceType: "OrganizedBy",nodeId: LEDIdentification});
        var LED_power = addressSpace.addVariable({
            browseName : "Power",
            dataType : "Int32",
            componentOf: LED.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value:help.transformFabrikPowerToLEDPower(productionAvailability)});
                }
            }
        });
        LED_power.addReference({referenceType: "OrganizedBy",nodeId: LEDLight});
//***** Anlegen Endpointtype
        var Machine_2_endpointtype = addressSpace.addVariable({
            browseName: "EndpointType",
            propertyOf: Header_Machine_2,
            dataType: "String",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: opcua.DataType.String,value: endpointtypes.MACHINE});
                }
            }
        });
//***** Anlegen Adresse */
        var Addresse = addressSpace.addVariable({
            browseName: "Addresse",
            dataType: "String",
            componentOf: Machine_2.getComponentByName("Header"),
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String", value: endpointMachine2});
                }
            }
        });
        Addresse.addReference({referenceType: "OrganizedBy", nodeId: Identification});
//***** Maschine2 --- Outputs
        var OutputA = addressSpace.addVariable({
            browseName: "OutputA",
            description:"Anzahl vorhandener Produkte des Typs A im Produktordner",
            dataType: "Int32",
            propertyOf: Machine_2.getComponentByName("Body"),
            value:{
                get: function(){
                        return new opcua.Variant({dataType: "Int32", value: outputA});
                    }                    
            }
        });
        OutputA.addReference({referenceType: "OrganizedBy",nodeId: Produktion});

        var OutputB = addressSpace.addVariable({
            browseName: "OutputB",
            description:"Anzahl vorhandener Produkte des Typs B im Produktordner",
            dataType: "Int32",
            propertyOf: Machine_2.getComponentByName("Body"),
            value:{
                get: function(){
                   return new opcua.Variant({dataType: "Int32",value:outputB});
                }
            }
        });
        OutputB.addReference({referenceType: "OrganizedBy",nodeId: Produktion});

//***** OPCUA-Methode zur Erstellung des ProduktsA */
        var ProduceProductA = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            nodeId:"ns=2;s=ProduceProductA",
            browseName: "ProduceProductA",
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
                name: "ProduktNumberHiogherProdukt",
                dataType: "Int32"
            }]
        });
        ProduceProductA.addReference({referenceType: "OrganizedBy",nodeId: ProduktA});

        ProduceProductA.bindMethod(function(inputArguments,context,callback){
            productionAvailability = false;
            var produktNumber = inputArguments[0].value;
            console.log("Production ProductA: "+produktNumber+" has started");
            var productLifecycle = inputArguments[1].value;
            var newProduct = createProduct(produktNumber,productLifecycle,producttypes.A);
            setTimeout(function(){
                // Callback mit positivem Signal und Adresse des produzierenden Moduls
                callback(null,{
                    statusCode: opcua.StatusCodes.Good,
                    outputArguments:[
                        {
                            name: "Adresse der produzierenden Maschine",
                            dataType: "String",
                            value: endpointMachine2
                        },{
                            dataType: "Int32",
                            value: 0
                        }
                    ]
                });
                //Erhöhen der OutputA Variable
                outputA++;
                console.log("Production of ProductA "+produktNumber+ " is finished");
                //Nach der Produktion Availability der Produktionscapability wieder auf true setzen
                productionAvailability = true;
                //Nach der Produktion entfernen des Produktes von der Maschine
                addressSpace.deleteNode(newProduct);    
            },timeToManufactureA*1000)
            
        });
//***** OPCUA-Methode um Produkt B herzustellen */
        var ProduceProductB = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            nodeId:"ns=2;s=ProduceProductB",
            browseName: "ProduceProductB",
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
                name: "ProduktNumberHiogherProdukt",
                dataType: "Int32"
            }]
        });
        ProduceProductB.addReference({referenceType: "OrganizedBy",nodeId: ProduktB});

        ProduceProductB.bindMethod(function(inputArguments,context,callback){
            productionAvailability = false;
            var produktNumber = inputArguments[0].value;
            console.log("Production ProductB: "+produktNumber+" has started");
            var productLifecycle = inputArguments[1].value;
            var newProduct = createProduct(produktNumber,productLifecycle,producttypes.B);
            setTimeout(function(){
                // Callback mit positivem Signal und Adresse des produzierenden Moduls
                callback(null,{
                    statusCode: opcua.StatusCodes.Good,
                    outputArguments:[
                        {
                            name: "Adresse der produzierenden Maschine",
                            dataType: "String",
                            value: endpointMachine2
                        },{
                            dataType: "Int32",
                            value: 0
                        }
                    ]
                });
                //Erhöhen OutputB Variable
                outputB++;
                console.log("Production of ProductB "+produktNumber+ " is finished");
                //Nach der Produktion Availability der Produktionscapability wieder auf true setzen
                productionAvailability = true;
                //Nach der Produktion entfernen des Produktes von der Maschine
                addressSpace.deleteNode(newProduct);    
            },timeToManufactureB*1000)
        });


//***** OPCUA-Methode um Node Id der Produktionsdaten  Variable zu liefern*/
        var ProvideProductionData = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            browseName: "ProvideProductionData",
            modellingRule: "Mandatory",
            nodeId: "ns=2;s=ProvideProductionData",
            inputArguments:[],
            outputArguments:[
                {
                    name:"ProductionAvailability",
                    dataType: "String"   
                },
                {
                    name: "OutputA",
                    dataType: "String"
                },{
                    name: "OutputB",
                    dataType: "String"
                }
            ]
        });
        ProvideProductionData.addReference({referenceType: "OrganizedBy",nodeId: Produktion});
        ProvideProductionData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[
                    {
                        dataType: "String",
                        value: ProductionAvailability.nodeId.toString()
                    },{
                        dataType: "String",
                        value: OutputA.nodeId.toString()
                    },{
                        dataType: "String",
                        value: OutputB.nodeId.toString()
                    }
                ]
            })
        })
//***** Anmeldung bei der Fabrik über OPCUA-Methode, welche direkt bei Start aufgerufen wird.

        callCreateObject = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            browseName: "AnmeldenBeiFabrik",
            modellingRule: "Mandatory",
            inputArguments: [],
            ouputArguments: []
        });
        callCreateObject.bindMethod(function(inputArguments,context,cb){
            var producing = Producing.getComponents().map(element => element.browseName.toString());
            var showing = Showing.getComponents().map(element => element.browseName.toString());
            var monitoring = Monitoring.getComponents().map(element => element.browseName.toString());
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
                            value: endpointMachine2
                        },{
                            dataType: opcua.DataType.Int32,
                            value: Machine_2_serialnumber.readValue().value.value
                        },{
                            dataType: opcua.DataType.String,
                            value: Machine_2_manufacturer.readValue().value.value
                        },{
                            dataType: opcua.DataType.String,
                            value: Machine_2_endpointtype.readValue().value.value
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
                            value: []
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
                console.log("Maschine_2 registriert!");
            }else{
                console.log(err);
            }
        })

//***** JS-Funktion zur Erstellung von Produkten

        function createProduct(produktNumber, productLifecycle, produkttyp){
            var produktnummer = produktNumber;
            var Produkt = AssetType.instantiate({
                browseName:"Produkt",
                nodeId:"ns=3;i="+produktnummer,
                //TODO:Change To Some Other Location
                organizedBy: Machine_2.getComponentByName("Body")
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

//***** Anlegen des Manifest Ports als OPCUA-Methode */
        ManifestPort = addressSpace.addMethod(Manifest,{
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
                    dataType: "String"
                },{
                    name: "NodeIdOfParentObject",
                    dataType: "String"
                },{
                    name: "AvailabilityCapability",
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
                        if (produkts[0].getPropertyByName("Input").getFolderElements().length === 0){
                            var input = [];
                            var inputNumbers = [];
                        }else{
                            var input = produkts[0].getPropertyByName("Input").getFolderElements().map(element => element.getPropertyByName("ProduktTyp").readValue().value.value);
                            var inputNumbers = produkts[0].getPropertyByName("Input").getFolderElements().map(element => element.getPropertyByName("Number").readValue().value.value);
                        }
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
                                    value: "0"
                                },{
                                    dataType: "Boolean",
                                    value: ProductionAvailability.readValue().value.value
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
                                    value: "0"
                                },{
                                    dataType: "Boolean",
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
                                dataType: "String",
                                value: "0"
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
                                dataType: "String",
                                value: "0"
                            },{
                                dataType: "Boolean",
                                value: false
                            }]
                        });
                    }
                }else if (type === msgspec.Type.MONITORING){
                    var objectToMonitorRequested = inputArguments[2];
                    var monitoringObjects = Monitoring.getComponents().filter(element => element.browseName === objectToMonitorRequested);
                    if(monitoringObjects>0){
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
                                dataType: "String",
                                value: "0"
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
                                dataType: "String",
                                value: "0"
                            },{
                                dataType: "Boolean",
                                value: false
                            }]
                        });
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
                            dataType: "String",
                            value: "0"
                        },{
                            dataType: "Boolean",
                            value: false
                        }]
                    });
                }
            }else if(header === msgspec.Header.ORDER){
                if(Capabilities.getFolderElements().map(e => e.browseName.toString()).includes(type)){
                    if(Capabilities.getFolderElements().filter(e => e.browseName.toString() === type)[0].getComponentByName(content)!==null){
                        var correspondingMethodArray = Capabilities.getFolderElements().filter(e => e.browseName.toString() === type)[0].getComponentByName(content).getFolderElements().filter(e => e.constructor.name ==="UAMethod");
                        if (correspondingMethodArray.length != 0){
                            var nodeIdToRespond = correspondingMethodArray[0].nodeId.toString();
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
                                        name: "NodeIdOfMethodToCall",
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
                        }else{
                            var correspondingObject = Capabilities.getFolderElements().filter(e => e.browseName.toString() === type)[0].getComponentByName(content).getFolderElements()[0];
                            //console.log(correspondingObject.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString()=== type)[0].getComponentByName(content));
                            var correspondingMethodOfObject = correspondingObject.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString()=== type)[0].getComponentByName(content).getFolderElements().filter(e => e.constructor.name === "UAMethod");
                            var nodeIdOfCorresponingMethodofObject = correspondingMethodOfObject[0].nodeId.toString();
                            var objectIdOfNodeId = addressSpace.findNode(nodeIdOfCorresponingMethodofObject).parent.nodeId.toString();
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
                                        name: "NodeIdOfMethodToCall",
                                        dataType:"String",
                                        value: nodeIdOfCorresponingMethodofObject
                                    },{
                                        dataType: "String",
                                        value: objectIdOfNodeId
                                    },{
                                        dataType: "Boolean",
                                        value: true
                                    }
                                ]
                            });
                            return;
                        } 
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
                            value: false
                        }
                    ]
                });
            }
        });

//***** Servererstellung    
    }   
    construct_my_address_space(server);
    server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port);
        console.log(" the primary server endpoint url is ", endpointMachine2 );
    });
}
server.initialize(post_initialize);

