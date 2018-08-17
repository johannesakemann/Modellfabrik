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

var client =  new opcua.OPCUAClient({endpoint_must_exist:false});
var server = new opcua.OPCUAServer({
    port: 4334, // the port of the listening socket of the server
    maxAllowedSessionNumber: 100,
    resourcePath: "UA/Machine_2", // this path will be added to the endpoint resource name
    nodeset_filename: [opcua.standard_nodeset_file], //"/home/pi/modellfabrik/aas_for_import.xml"],
     buildInfo : {
        productName: "Machine_2",
        buildNumber: "7658",
        buildDate: new Date(2018,1,26)
    }
});

var endpointFabrik = "opc.tcp://Johanness-MacBook-Pro-1057.local:4337/UA/modellfabrik";
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
        var outputgoalA = 0;
        var outputgoalB = 0;
        var produktnr = 1;
        var productionRuns = false;
        var productionRunsA = false;
        var productionRunsB = false;
        var timeToManufactureA = 2;
        var timeToManufactureB = 10;
        var overheatingTemperature = 26;
///**** Arrays festlegen
        var the_session, the_subscription;
        var productionOppAndTime1 = [0,2];
        var productionOppAndTime2 = [8,5];
        var productionOppAndTime3 = [4,0];
                
        var runProductionOppAndTime1 = false;
        var runProductionOppAndTime2 = false;
        var runProductionOppAndTime3 = false;

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
        var ProduktAMonitoring = addressSpace.addObject({
            browseName: "ProduktA",
            componentOf: Monitoring
        });
        TimeToManufactureA.addReference({referenceType:"OrganizedBy",nodeId:ProduktAMonitoring});
        var ProduktBMonitoring = addressSpace.addObject({
            browseName: "ProduktB",
            componentOf: Monitoring
        });
        TimeToManufactureB.addReference({referenceType:"OrganizedBy",nodeId:ProduktBMonitoring});
        var Produktion = addressSpace.addObject({
            browseName: "Production",
            componentOf: Monitoring
        });

//***** Spezifikation der Showing Capability
        var Light = addressSpace.addObject({
            browseName:"Light",
            componentOf:Showing
        });    
//***** Machine1 -- Production Runs*/
        var ProductionRuns = addressSpace.addVariable({
            browseName: "ProductionRuns",
            dataType: "Boolean",
            propertyOf: Machine_2.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Boolean", value:productionRuns});
                },
                set: function(variant){
                    productionRuns = variant.value;
                    return opcua.StatusCodes.Good;
                }
            }
        });
        ProductionRuns.addReference({referenceType: "OrganizedBy",nodeId: Produktion});
//***** Machine1 --- Outputgoals */
        var OutputgoalA = addressSpace.addVariable({
            browseName: "OutputGoalProductA",
            dataType: "Int32",
            propertyOf: Machine_2.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value:outputgoalA});
                },
                set: function(variant){
                    outputgoal_A = variant.value;
                }
            }
        });
        OutputgoalA.addReference({referenceType: "OrganizedBy",nodeId: ProduktAMonitoring});

        var OutputgoalB = addressSpace.addVariable({
            browseName: "OutputGoalProductB",
            dataType: "Int32",
            propertyOf: Machine_2.getComponentByName("Body"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Int32", value:outputgoalB});
                },
                set: function(variant){
                    outputgoal_B = variant.value;
                }
            }
        });
        OutputgoalB.addReference({referenceType: "OrganizedBy",nodeId: ProduktBMonitoring});

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
            productionRuns = false;
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
                                value: endpointMachine1
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
            server.shutdown(1000,function(err){
                if (!err){
                    console.log("Maschine1 wird heruntergefahren");
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
                    return new opcua.Variant({dataType: "Int32", value:help.transformFabrikPowerToLEDPower(productionRuns)});
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
                    return new opcua.Variant({dataType: "String", value: endpointMachine1});
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
                    try{
                        return new opcua.Variant({dataType: "Int32", value:Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(produkt => produkt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.A).length});        
                    }catch(err){
                        return new opcua.Variant({dataType: "Int32", value:0});
                    }
                    
                }
            }
        });
        OutputA.addReference({referenceType: "OrganizedBy",nodeId: ProduktAMonitoring});
        

        var OutputB = addressSpace.addVariable({
            browseName: "OutputB",
            description:"Anzahl vorhandener Produkte des Typs B im Produktordner",
            dataType: "Int32",
            propertyOf: Machine_2.getComponentByName("Body"),
            value:{
                get: function(){
                    try{
                        return new opcua.Variant({dataType: "Int32", value:Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(produkt => produkt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.B).length});        
                    }catch(err){
                        return new opcua.Variant({dataType: "Int32", value:0});
                    }
                    
                }
            }
        });
        OutputB.addReference({referenceType: "OrganizedBy",nodeId: ProduktBMonitoring});

//***** OPCUA-Methode zur Erstellung des ProduktsA */
        var ProduceProductA = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            nodeId:"ns=2;s=ProduceProductA",
            browseName: "ProduceProductA",
            inputArguments:[{
                name: "VolumeA",
                dataType: opcua.DataType.Int32,
                description:"Gewuenschte Menge des Produktes A"
            },{
                name:"AdresseZiel",
                dataType: opcua.DataType.String,
                description: "Addresse des Ziels, an den die Produkte nach Fertigstellung zu schicken sind"
            },{
                name: "Auftraggeber",
                dataType: opcua.DataType.String
            },{
                name: "Auftragsnummer",
                dataType: opcua.DataType.Int32
            },{
                name: "BestellmengeA",
                dataType: opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge von ProduktA, die für den aktuellen Auftrag gewünscht ist."
            },{
                name:"BestellmengeB",
                dataType:  opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge von ProduktB, die für den aktuellen Auftrag gewünscht ist."
            },{
                name:"BestellmengeC",
                dataType:  opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge von ProduktC, die für den aktuellen Auftrag gewünscht ist."
            }]
        });
        ProduceProductA.addReference({referenceType: "OrganizedBy",nodeId: ProduktA});

        ProduceProductA.bindMethod(function(inputArguments,context,callback){
            console.log("Production Product A started");
            productionRuns = true;
            var auftraggeber = inputArguments[2].value;
            var auftragsnummer = inputArguments[3].value;
            var bestellmengeA = inputArguments[4].value;
            var bestellmengeB = inputArguments[5].value;
            var bestellmengeC = inputArguments[6].value;
            var volumeA = inputArguments[0].value;
            outputgoalA += volumeA;
            if(Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag") === null){
                createAuftrag(auftraggeber,auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC);
                console.log("Es werden "+volumeA+" Produkte A, für Auftrag "+auftragsnummer+" hergestellt.");
            }else if(auftragsnummer === Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value){
                console.log("Es werden zusätzlich "+volumeA+" Produkte A, für Auftrag "+auftragsnummer+" hergestellt.");
            }
            
            
            var endpointZiel = inputArguments[1].value;
            var speedA = timeToManufactureA*1000;
            var outputA;

            function produceA(){
                if (!productionRunsB){
                    productionRunsA = true;
                    createProduct(producttypes.A);
                }
                productsA = Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(element =>element.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value===producttypes.A); 
                outputA = productsA.length;
                productsB = Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(element =>element.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value===producttypes.B); 
                outputB = productsB.length;
                if(outputA>=volumeA || !productionRuns){
                    productionRunsA = false;
                    clearInterval(productionA);
                    setTimeout(function(){
                        sendProducts(endpointZiel,productsA,producttypes.A);
                        outputgoalA = 0;
                    },10000);
                    if(outputB>=outputgoalB){
                        productionRuns = false;
                    }
                }
            }
            if (volumeA!= 0){
                var productionA = setInterval(produceA,speedA);
            }
            callback();
        });
//***** OPCUA-Methode um Produkt B herzustellen */
        var ProduceProductB = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            nodeId:"ns=2;s=ProduceProductB",
            browseName: "ProduceProductB",
            inputArguments:[{
                name: "VolumeA",
                dataType: opcua.DataType.Int32,
                description:"Gewuenschte Menge des Produktes B"
            },{
                name:"AdresseZiel",
                dataType: opcua.DataType.String,
                description: "Addresse des Ziels, an den die Produkte nach Fertigstellung zu schicken sind"
            },{
                name: "Auftraggeber",
                dataType: opcua.DataType.String
            },{
                name: "Auftragsnummer",
                dataType: opcua.DataType.Int32
            },{
                name: "BestellmengeA",
                dataType: opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge von ProduktA, die für den aktuellen Auftrag gewünscht ist."
            },{
                name:"BestellmengeB",
                dataType:  opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge von ProduktB, die für den aktuellen Auftrag gewünscht ist."
            },{
                name:"BestellmengeC",
                dataType:  opcua.DataType.Int32,
                description: "Die gesamte Bestellmenge von ProduktC, die für den aktuellen Auftrag gewünscht ist."
            }]
        });
        ProduceProductB.addReference({referenceType: "OrganizedBy",nodeId: ProduktB});

        ProduceProductB.bindMethod(function(inputArguments,context,callback){
            console.log("Production Product B started");
            productionRuns = true;
            var auftraggeber = inputArguments[2].value;
            var auftragsnummer = inputArguments[3].value;
            var bestellmengeA = inputArguments[4].value;
            var bestellmengeB = inputArguments[5].value;
            var bestellmengeC = inputArguments[6].value;
            var volumeB = inputArguments[0].value;
            outputgoalB += volumeB;
            if(Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag") === null){
                createAuftrag(auftraggeber,auftragsnummer,bestellmengeA,bestellmengeB,bestellmengeC);
                console.log("Es werden "+volumeB+" Produkte B, für Auftrag "+ auftragsnummer+" hergestellt.");
            } else if(auftragsnummer === Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value){
                console.log("Es werden zusätzlich "+volumeB+" Produkte B,für Auftrag "+auftragsnummer+" hergestellt.");
            }
           
            var endpointZiel = inputArguments[1].value;
            var speedB = timeToManufactureB*1000;
            var outputB;

            function produceB(){
                if(!productionRunsA){
                    productionRunsB = true;
                    createProduct(producttypes.B);
                }
                productsA = Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(element =>element.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value===producttypes.A); 
                outputA = productsA.length;
                productsB = Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(element =>element.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value===producttypes.B); 
                outputB = productsB.length;
                if (outputB >= volumeB || !productionRuns){
                    productionRunsB = false;
                    setTimeout(function(){
                        sendProducts(endpointZiel,productsB,producttypes.B);
                        outputgoalB = 0;
                    },10000);
                    clearInterval(productionB);
                    if(outputA>= outputgoalA){
                        productionRuns = false;
                    }
                }
            }
            if (volumeB >0){
                var productionB = setInterval(produceB,speedB);
            }
            callback();

        });


//***** OPCUA-Methode um Node-Ids der Informationen von ProduktA zu übermitteln */
        var ProvideDataOfProductA = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            browseName: "ProvideDataOfProductA",
            modellingRule: "Mandatory",
            nodeId: "ns=2;s=ProvideDataOfProductA",
            inputArguments:[],
            outputArguments:[
                {
                    name:"TimeToManufacture",
                    dataType: "String"   
                },{
                    name: "OutputA",
                    dataType: "String"
                },{
                    name: "OutputgoalA",
                    dataType: "String"
                }
            ]
        });
        ProvideDataOfProductA.addReference({referenceType:"OrganizedBy",nodeId:ProduktAMonitoring});
        ProvideDataOfProductA.bindMethod(function(inputArgumens,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[
                    {
                        dataType: "String",
                        value: TimeToManufactureA.nodeId.toString()
                    },{
                        dataType: "String",
                        value: OutputA.nodeId.toString()
                    },{
                        dataType: "String",
                        value: OutputgoalA.nodeId.toString()
                    }
                ]
            })
        });
//***** OPCUA-Methode um Node-Ids der Informationen von ProduktB zu übermitteln */
        var ProvideDataOfProductB = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            browseName: "ProvideDataOfProductB",
            modellingRule: "Mandatory",
            nodeId: "ns=2;s=ProvideDataOfProductB",
            inputArguments:[],
            outputArguments:[
                {
                    name:"TimeToManufacture",
                    dataType: "String"   
                },{
                    name: "OutputB",
                    dataType: "String"
                },{
                    name: "OutputgoalB",
                    dataType: "String"
                }
            ]
        });
        ProvideDataOfProductB.addReference({referenceType:"OrganizedBy",nodeId:ProduktBMonitoring});
        ProvideDataOfProductB.bindMethod(function(inputArgumens,context,callback){
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[
                    {
                        dataType: "String",
                        value: TimeToManufactureB.nodeId.toString()
                    },{
                        dataType: "String",
                        value: OutputB.nodeId.toString()
                    },{
                        dataType: "String",
                        value: OutputgoalB.nodeId.toString()
                    }
                ]
            })
        });


//***** OPCUA-Methode um Node Id der Production Runs  Variable zu liefern*/
        var ProvideProductionData = addressSpace.addMethod(Machine_2.getComponentByName("Body"),{
            browseName: "ProvideProductionData",
            modellingRule: "Mandatory",
            nodeId: "ns=2;s=ProvideProductionData",
            inputArguments:[],
            outputArguments:[
                {
                    name:"ProductionRuns",
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
                        value: ProductionRuns.nodeId.toString()
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
                            value: endpointMachine1
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
                console.log("Maschine_1 registriert!");
            }else{
                console.log(err);
            }
        })

//***** JS-Funktion zur Erstellung von Produkten

        function createProduct(produkttyp){
            var produktnummer = 1000 +produktnr;
            var Produkt = AssetType.instantiate({
                browseName:"Produkt",
                nodeId:"ns=3;i="+produktnummer,
                organizedBy: Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte")
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
            console.log(produkttyp+" "+produktnummer+ " successfully created!")
            produktnr++;
        }

//***** JS-Funktion zum Senden der aktuellen Produkte an einen Assembler */
    //Achtung: löscht nach Senden alle Produkte von der Maschine
    //@param endpointAssembler: Endpoint des Ziels zu dem geschickt werden soll
    //@param products: Alle Produkte die geschickt werden sollen
    //@param producttype: Produkttyp der Produkt, die geschickt werden sollen

        function sendProducts(endpointZiel,products,producttyp){
            var methodsession;
            var objectIdCo;
            var methodIdCo;
            async.series([
                function(callback){
                    client.connect(endpointZiel,function(err){
                        if(!err){
                            callback();
                        }else{
                            console.log(err);
                        }
                    });
                    
                },
                function(callback){
                    client.createSession(function(err,session,){
                        if(!err){
                            methodsession = session;
                            callback();
                        }else{
                            console.log(err);
                        }
                    }); 
                },
                function(callback){
                    methodsession.call({
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
                            value: producttyp
                        }]
                    },function(err,result){
                        methodIdCo = result.outputArguments[3].value;
                        objectIdCo = result.outputArguments[4].value;
                        callback();
                    })
                },  
                function(callback){
                    methodsession.call({
                        objectId: objectIdCo,
                        methodId: methodIdCo,
                        inputArguments:[{
                            name:"Productnumbers",
                            dataType: opcua.DataType.Int32,
                            arrayType:opcua.VariantArrayType.Array,
                            valueRank:1,
                            value: products.map(product => product.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value)
                        },{
                            name: "Auftraggeber",
                            dataType: opcua.DataType.String,
                            value: Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Auftraggeber").readValue().value.value
                        },{
                            name: "Auftragsnummer",
                            dataType: opcua.DataType.Int32,
                            value: Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value
                        },{
                            name: "BestellmengeA",
                            dataType: opcua.DataType.Int32,
                            value: Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("BestellmengeA").readValue().value.value
                        },{
                            name: "BestellmengeB",
                            dataType: opcua.DataType.Int32,
                            value: Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("BestellmengeB").readValue().value.value
                        },{
                            name: "BestellmengeC",
                            dataType: opcua.DataType.Int32,
                            value: Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("BestellmengeC").readValue().value.value
                        },]
                    },function(err,result){
                        if(!err){
                            console.log("Senden von "+producttyp+" erfolgreich!");
                            callback();
                        }else{
                            console.log(err);
                        }
                    });
                },
                function(callback){
                    products.forEach(function(product){
                        addressSpace.deleteNode(product);
                    });
                    if (Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag").getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().length === 0){
                        addressSpace.deleteNode(Machine_2.getComponentByName("Body").getComponentByName("CurrentAuftrag"));
                    }
                    callback();
                },
                function(callback){
                    methodsession.close();
                    client.disconnect();
                    callback();
                }
            ]);
        }

//***** JS-Funktion zum Anlegen von Aufträgen */
        function createAuftrag(auftraggeber, auftragsnummer,mengeA,mengeB,mengeC){
            var Auftrag = AssetType.instantiate({
                browseName: "CurrentAuftrag",
                componentOf: Machine_2.getComponentByName("Body")
            });

            var AuftragBody = addressSpace.addObject({
                componentOf:Auftrag,
                typeDefinition:folderType,
                browseName: "Body"
            });

            var Auftraggeber = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
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
                        return new opcua.Variant({dataType: "Int32", value: mengeA});
                    }
                }
            });
            var BestellmengeB = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeB",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value:mengeB});
                    }
                }
            });
            var BestellmengeC = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeC",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value:mengeC});
                    }
                }
            });
            var Auftragsstatus = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
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
                            }]
                        });
                    }
                }else if (type === msgspec.Type.MONITORING){
                    var objectToMonitorRequested = inputArguments[2];
                    var monitoringObjects = Monitoring.getComponents().filter(element => element.browseName === objectToMonitorRequested);
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

