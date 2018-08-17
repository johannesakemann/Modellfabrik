var opcua = require("node-opcua");
var path = require('path');
var async = require("async");
var auftragsstat = require('./AuftragsStatus.json');
var endpointtypes = require('./endpointtypes.json')
var help = require('./help.js');
var producttypes = require('./producttypes.json');
var capabilities = require('./capabilities.json');
var msgspec = require('./MessageSpecification.json');

var server = new opcua.OPCUAServer({
    port: 4337, // the port of the listening socket of the server
    maxAllowedSessionNumber: 100,
    resourcePath: "UA/modellfabrik", // this path will be added to the endpoint resource name
    nodeset_filename: [opcua.standard_nodeset_file], //"/home/pi/modellfabrik/aas_for_import.xml"],
     buildInfo : {
        productName: "ModellfabrikOpcUA",
        buildNumber: "7658",
        buildDate: new Date(2017,12,20)
    }
});
var client =  new opcua.OPCUAClient({endpoint_must_exist:false});

function post_initialize() {
    console.log("initialized");
    function construct_my_address_space(server) {

//****** Hilfsvariablen
        var addressSpace = server.engine.addressSpace;
        var objectFolder = addressSpace.findNode("ns=0;i=85");
        var folderType = addressSpace.findNode("ns=0;i=61");
        var auftragsnummer = 1;
        var availableEndpoints =[];
        var productionRuns = false;
        var auftragFinished = false;

//****** Definition abstrakter Asset Type mit Body & Header*/
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

//****** Instanzieeren konkretes Fabrik Objekt */
        var Fabrik = AssetType.instantiate({
            browseName: "Fabrik",
            organizedBy: objectFolder,
            nodeId:"ns=2;s=Fabrik"
        });
//****** Instanziieren Manifest */
        var Manifest = addressSpace.addObject({
            browseName: "Manifest",
            nodeId: "ns=2;s=Manifest",
            componentOf: Fabrik
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
//****** Anlegen Monitoring Capability */
        var Monitoring = addressSpace.addObject({
            browseName: capabilities.MONITORING,
            organizedBy: Capabilities
        });

        var OrderMonitoring = addressSpace.addObject({
            browseName: "Order",
            componentOf: Monitoring
        });

//****** OPCUA-Methode um Node Ids der aktuellen Auftragsdaten zurückzugeben */
        var ProvideCurrOrderData = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            browseName: "ProvideCurrentOrderData",
            nodeId: "ns=2;s=ProvideCurrentOrderData",
            outputArguments:[{
                name: "Auftragsnummer",
                dataType: "String"
            },{
                name: "MengeA",
                dataType: "String"
            },{
                name: "MengeB",
                dataType: "String"
            },{
                name: "MengeC",
                dataType: "String"
            }]
        });
        ProvideCurrOrderData.addReference({referenceType: "OrganizedBy",nodeId: OrderMonitoring});
        ProvideCurrOrderData.bindMethod(function(inputArguments,context,callback){
            callback(null,{
                statusCode:opcua.StatusCodes.Good,
                outputArguments:[{
                    dataType: "String",
                    value: CurrentOrderNumber.nodeId.toString()
                },{
                    dataType: "String",
                    value: CurrentOrderVolumeA.nodeId.toString()
                },{
                    dataType: "String",
                    value: CurrentOrderVolumeB.nodeId.toString()
                },{
                    dataType: "String",
                    value: CurrentOrderVolumeC.nodeId.toString()
                }]
            });
        });
//****** Anlegen Device Management Capability */
        var DeviceManagement = addressSpace.addObject({
            browseName: capabilities.DEVICEMANAGEMENT,
            organizedBy: Capabilities
        });
        var RegisterDeviceManagement = addressSpace.addObject({
            browseName: msgspec.Content.DeviceManagement.REGISTER,
            componentOf: DeviceManagement
        });
        var RemoveDeviceManagement = addressSpace.addObject({
            browseName: msgspec.Content.DeviceManagement.REMOVE,
            componentOf: DeviceManagement
        })
//****** Anlegen Collecting Capability */
        var Collecting = addressSpace.addObject({
            browseName: capabilities.COLLECTING,
            organizedBy : Capabilities
        });

        var ProduktACollecting = addressSpace.addObject({
            browseName: producttypes.A,
            componentOf: Collecting
        });

        var ProduktACollectingProdukttype = addressSpace.addVariable({
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
            componentOf: Collecting
        });

        var ProduktBCollectingProdukttype = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktBCollecting,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.B});
                }
            }
        });
        var ProduktCCollecting = addressSpace.addObject({
            browseName: producttypes.C,
            componentOf: Collecting
        });

        var ProduktCCollectingProdukttype = addressSpace.addVariable({
            browseName: "ProduktTyp",
            propertyOf: ProduktCCollecting,
            dataType: "String",
            value: {
                get: function(){
                    return new opcua.Variant({dataType: "String",value: producttypes.C});
                }
            }
        });
//****** ManifestPort als Methode
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
                }]

        });

        ManifestPort.bindMethod(function(inputArguments,context,callback){
            var header = inputArguments[0].value;
            var type = inputArguments[1].value;
            var content = inputArguments[2].value;
            if(header === msgspec.Header.REQUEST){
                if(Capabilities.getFolderElements().map(e => e.browseName.toString()).includes(type)){                    
                    if (Capabilities.getFolderElements().filter(e => e.browseName.toString()===type)[0].getFolderElements().map(e => e.browseName.toString()).includes(content)){
                        callback(null,{
                            statusCode: opcua.statusCode.Good,
                            outputArguments:[
                                {
                                    name: "TimeToManufacture",
                                    dataType :"Int32",
                                    value: 0
                                },
                                {
                                    name: "Producttypes",
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: ["0"]
                                },{
                                    name: "NumberOfProducts",
                                    dataType:"Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: [0]
                                },{
                                    name: "NodeIdOfMethod",
                                    dataType:"String",
                                    value: "0"
                                },{
                                    name: "NodeIdOfParentObject",
                                    dataType: "String",
                                    value: "0"
                                }
                            ]
                        })
                    }else{
                        callback(null,{
                            statusCode: opcua.statusCode.Bad,
                            outputArguments:[
                                {
                                    name: "TimeToManufacture",
                                    dataType :"Int32",
                                    value: 0
                                },
                                {
                                    name: "Producttypes",
                                    dataType: "String",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: ["0"]
                                },{
                                    name: "NumberOfProducts",
                                    dataType:"Int32",
                                    arrayType: opcua.VariantArrayType.Array,
                                    valueRank:1,
                                    value: [0]
                                },{
                                    name: "NodeIdOfMethod",
                                    dataType:"String",
                                    value: "0"
                                },{
                                    name: "NodeIdOfParentObject",
                                    dataType: "String",
                                    value: "0"
                                }
                            ]
                        });

                    }
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
                        }
                    ]
                });
            }
        });
//****** Auftragsordner anlegen */
        var Auftragsordner = addressSpace.addObject({
            browseName: "Auftragsordner",
            nodeId:"ns=2;s=Auftragsordner",
            componentOf: Fabrik.getComponentByName("Body"),
            typeDefinition: folderType
        });
//****** Anzahl der fertiggestellten Auftraege */
        var NumberAuftraege = addressSpace.addVariable({
            browseName: "AnzahlFertigerAuftraege",
            dataType: "Int32",
            nodeId:"ns=2;s=AnzahlFertigerAuftraege",
            componentOf: Fabrik.getComponentByName("Header"),
            value:{
                get: function(){
                    if (Auftragsordner.getFolderElements().length === 0){
                        return new opcua.Variant({dataType: "Int32",value:0});
                    }else{
                        return new opcua.Variant({dataType: "Int32", value:Auftragsordner.getFolderElements().filter(auftrag => auftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").readValue().value.value === auftragsstat.FINISHED).length})
                    }
                    
                }
            }
        })
//****** GeraeteOrdner anlegen */
        var Geraeteordner = addressSpace.addObject({
            browseName: "Geraeteordner",
            nodeId:"ns=2;s=Geraeteordner",
            componentOf: Fabrik.getComponentByName("Body"),
            typeDefinition: folderType
        });

//****** Variable zum Anzeigen der Anzahl aktiver Geraete
        var NumberGeraete = addressSpace.addVariable({
            browseName:"AnzahlGeraete",
            nodeId: "ns=2;s=AnzahlGeraete",
            dataType:"Int32",
            componentOf:Fabrik.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Int32",value: Geraeteordner.getFolderElements().length});
                }
            }

        })        
//****** Production Runs Variable */
        var ProductionRuns = addressSpace.addVariable({
            browseName: "ProductionRuns",
            dataType: "Boolean",
            componentOf: Fabrik.getComponentByName("Header"),
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Boolean", value:productionRuns});
                },
                set: function(variant){
                    if (variant.value === true){
                        if(getCurrentAuftrag()==="NoCurrentAuftrag"){
                            var waitingAuftraege = Auftragsordner.getFolderElements().filter(auftrag => auftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").readValue().value.value === auftragsstat.WAITING);
                            if(waitingAuftraege.length >0){
                                async.series([
                                    function(callback){                                    
                                        waitingAuftraege[0].getComponentByName("Header").getComponentByName("Auftragsstatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:auftragsstat.INPRODUCTION}),statusCode: opcua.StatusCodes.Good}),function(err){
                                            if(!err){
                                                console.log("Next Auftrag Chosen!" +getCurrentAuftrag());
                                                auftragFinished = false;
                                                callback();
                                            }else{
                                                console.log(err);
                                            }
                                        });
                                    },
                                    function(callback){
                                        var currAuftragBody = addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Body");
                                        var mengeA = currAuftragBody.getComponentByName("BerechneteMengeA").readValue().value;
                                        var mengeB = currAuftragBody.getComponentByName("BerechneteMengeB").readValue().value;
                                        var mengeC = currAuftragBody.getComponentByName("BerechneteMengeC").readValue().value;                                    
                                        startProduction.execute([mengeA,mengeB,mengeC],new opcua.SessionContext(),function(err,result){
                                            if(!err){
                                                console.log("Starte Produktion!!!");
                                            }
                                        });
                                        callback();   
                                    }
                                ]);
                                productionRuns = variant.value;
                            }else{
                                productionRuns = false;
                                console.log("Keine Aufträge mehr verfügbar");
                            }
                        }else{
                            var currAuftragBody = addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Body");
                            var mengeA = currAuftragBody.getComponentByName("BerechneteMengeA");
                            var mengeB = currAuftragBody.getComponentByName("BerechneteMengeB");
                            var mengeC = currAuftragBody.getComponentByName("BerechneteMengeC");
                            var mengeAVariant = new opcua.Variant({dataType: "Int32",value: mengeA});
                            var mengeBVariant = new opcua.Variant({dataType: "Int32",value: mengeB});
                            var mengeCVariant = new opcua.Variant({dataType: "Int32",value: mengeC});
                            startProduction.execute([mengeAVariant,mengeBVariant,mengeCVariant],new opcua.SessionContext(),function(err,result){
                                if(!err){
                                    console.log("Starte Produktion!!!");
                                }
                            });
                            productionRuns = variant.value;
                        }
                    }else{
                        productionRuns=variant.value;
                    }
                    return opcua.StatusCodes.Good;
                }
            }
        });
//****** Variablen zum Anzeigen aktueller Auftragsdaten */

        var CurrentOrderNumber = addressSpace.addVariable({
            componentOf: Fabrik.getComponentByName("Body"),
            dataType: "String",
            browseName:"CurrentOrderNumber",
            value: {
                get: function(){
                    var currAuftrag = getCurrentAuftrag();
                    if (currAuftrag === "NoCurrentAuftrag"){
                        return new opcua.Variant({dataType: "String", value: "NoCurrentOrder"}); 
                    }else{
                        return new opcua.Variant({dataType: "String", value: addressSpace.findNode(currAuftrag).getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value.toString()}); 
                    }
                }
            }
        });
        CurrentOrderNumber.addReference({referenceType: "OrganizedBy",nodeId: OrderMonitoring});
        var CurrentOrderVolumeA = addressSpace.addVariable({
            componentOf: Fabrik.getComponentByName("Body"),
            dataType: "String",
            browseName:"CurrentOrderVolumeA",
            value: {
                get: function(){
                    var currAuftrag = getCurrentAuftrag();
                    if (currAuftrag === "NoCurrentAuftrag"){
                        return new opcua.Variant({dataType: "String", value: "-"}); 
                    }else{
                        return new opcua.Variant({dataType: "String", value: addressSpace.findNode(currAuftrag).getComponentByName("Body").getComponentByName("BestellmengeA").readValue().value.value.toString()});
                    }
                }
            }
        });
        CurrentOrderVolumeA.addReference({referenceType: "OrganizedBy",nodeId: OrderMonitoring});
        var CurrentOrderVolumeB = addressSpace.addVariable({
            componentOf: Fabrik.getComponentByName("Body"),
            dataType: "String",
            browseName:"CurrentOrderVolumeB",
            value: {
                get: function(){
                    var currAuftrag = getCurrentAuftrag();
                    if (currAuftrag === "NoCurrentAuftrag"){
                        return new opcua.Variant({dataType: "String", value: "-"}); 
                    }else{
                        return new opcua.Variant({dataType: "String", value:addressSpace.findNode(currAuftrag).getComponentByName("Body").getComponentByName("BestellmengeB").readValue().value.value.toString()});
                    }
                }
            }
        });
        CurrentOrderVolumeB.addReference({referenceType: "OrganizedBy",nodeId: OrderMonitoring});
        var CurrentOrderVolumeC = addressSpace.addVariable({
            componentOf: Fabrik.getComponentByName("Body"),
            dataType: "String",
            browseName:"CurrentOrderVolumeC",
            value: {
                get: function(){
                    var currAuftrag = getCurrentAuftrag();
                    if (currAuftrag === "NoCurrentAuftrag"){
                        return new opcua.Variant({dataType: "String", value: "-"}); 
                    }else{
                        return new opcua.Variant({dataType: "String", value: addressSpace.findNode(currAuftrag).getComponentByName("Body").getComponentByName("BestellmengeC").readValue().value.value.toString()});
                    }
                }
            }
        });
        CurrentOrderVolumeC.addReference({referenceType: "OrganizedBy",nodeId: OrderMonitoring});

        var CurrentAuftragfinished = addressSpace.addVariable({
            componentOf: Fabrik.getComponentByName("Header"),
            dataType: "Boolean",
            browseName: "CurrentAuftragfinished",
            value:{
                get: function(){
                    return new opcua.Variant({dataType: "Boolean",value :auftragFinished});
                }
            }
        })
//****** Methode zum Anlegen von Aufträgen */

        var createAuftrag = addressSpace.addMethod(Fabrik.getComponentByName("Body"), {
            modellingRule: "Mandatory",
            browseName: "CreateAuftrag",
            inputArguments: [{
                name: "Menge Produkt A",
                dataType: opcua.DataType.Int32
            },{
                name: "Menge Produkt B",
                dataType: opcua.DataType.Int32
            },{
                name:"Menge Produkt C",
                dataType: opcua.DataType.Int32
            }],
            outputArguments: []
        });
        createAuftrag.bindMethod(function (inputArguments, context, callback){
            var mengeA = inputArguments[0].value;
            var mengeB = inputArguments[1].value;
            var mengeC = inputArguments[2].value;
            var auftragsObjekt ={};
            auftragsObjekt[producttypes.A] = mengeA;
            auftragsObjekt[producttypes.B] = mengeB;
            auftragsObjekt[producttypes.C] = mengeC;
            var auftragsnr = auftragsnummer;
            var auftragsstatus = auftragsstat.WAITING;
            if (Capabilities.getFolderElements().filter(e => e.browseName.toString()===capabilities.PRODUCING).length === 0){
                callback(null,{
                    statusCode: opcua.StatusCodes.Bad,
                    outputArguments:[]
                });
                console.log("Der Auftrag "+auftragsnr+ " kannn nicht angenommen werden, da die geforderten Produkte nicht erstellt werden können");
                return;
            }else{
                var producing = Capabilities.getFolderElements().filter(e=> e.browseName.toString()=== capabilities.PRODUCING)[0];
                if((mengeA> 0 && producing.getComponentByName(producttypes.A)=== null)||(mengeB > 0 && producing.getComponentByName(producttypes.B)===null)||(mengeC > 0 && producing.getComponentByName(producttypes.C) === null)){
                    callback(null,{
                        statusCode: opcua.StatusCodes.Bad,
                        outputArguments:[]
                    });
                    console.log("Der Auftrag "+auftragsnr+ " kannn nicht angenommen werden, da die geforderten Produkte nicht erstellt werden können");
                    return;
                }else{
                    if (mengeC > 0){
                        var geraeteToProduceC = producing.getComponentByName(producttypes.C).getFolderElements().map(element => element.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(e => e.browseName.toString() === "Adresse")[0].readValue().value.value);
                        geraeteToProduceC.forEach(function(element){
                            var connectionsession;
                            async.series([
                                function(callback){
                                    client.connect(element,function(err){
                                        if(!err){
                                            callback();
                                        }
                                    });
                                },
                                function(callback){
                                    client.createSession(function(err,session){
                                        if(!err){
                                            connectionsession = session;
                                            callback();
                                        }
                                    });
                                },
                                function(callback){
                                    connectionsession.call({
                                        objectId: "ns=2;s=Manifest",
                                        methodId: "ns=2;s=ManifestPort",
                                        inputArguments:[{
                                            name: "Header",
                                            value: msgspec.Header.REQUEST,
                                            dataType:"String"
                                        },{
                                            name: "Type",
                                            value: msgspec.Type.PRODUCING,
                                            dataType:"String"
                                        },{
                                            name: "Content",
                                            value: producttypes.C,
                                            dataType:"String"
                                        }]
                                    },function(err,result){
                                        if(!err){
                                            var aktMachine = producing.getComponentByName(producttypes.C).getFolderElements().filter(e => e.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(i => i.browseName.toString() ==="Adresse")[0].readValue().value.value === element)[0];
                                            var aktMachineProdPC = aktMachine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0].getFolderElements().filter(e => e.browseName.toString() === producttypes.C)[0];
                                            if(aktMachineProdPC.getPropertyByName("Input") === null){
                                                var InputProductC = addressSpace.addObject({
                                                    browseName: "Input",
                                                    propertyOf: aktMachineProdPC,
                                                    typeDefinition: folderType
                                                });
                                            }
                                            if(aktMachineProdPC.getPropertyByName("TimeToManufacture") === null){
                                                addressSpace.addVariable({
                                                    browseName: "TimeToManufacture",
                                                    propertyOf: aktMachineProdPC,
                                                    dataType: "Int32",
                                                    value: {
                                                        get: function(){
                                                            return new opcua.Variant({dataType: "Int32",value: result.outputArguments[0].value});
                                                        }
                                                    }
                                                })
                                            }else{
                                               //aktMachineProdPC.getPropertyByName("TimeToManufacture").writeValue(new opcua.SessionContext(),{value: result.outputArguments[0].value},function(err,statusCode){});
                                            }
                                            
                                            var inputObj = {};
                                            var inputArray = result.outputArguments[1].value;
                                            var inputNumberArray = result.outputArguments[2].value;
                                            for(var i = 0;i < result.outputArguments[1].value.length;i++){
                                                var aktMachineInp = aktMachineProdPC.getPropertyByName("Input").getFolderElements().map(e => e = e.browseName.toString());
                                                var number = inputNumberArray[i];
                                                var name = inputArray[i];
                                                if(!aktMachineInp.includes(result.outputArguments[1].value[i])){
                                                    var InputProdukt = addressSpace.addObject({
                                                        browseName: result.outputArguments[1].value[i],
                                                        organizedBy: aktMachineProdPC.getPropertyByName("Input")
                                                    });
                                                    var productTypeInputProdukt = function (name){
                                                        var ProductTypeInputProdukt = {
                                                            browseName: "ProduktTyp",
                                                            propertyOf: InputProdukt,
                                                            dataType: "String",
                                                            value: {
                                                                get: function(){
                                                                    return new opcua.Variant({dataType:"String",value: name});
                                                                },
                                                                set: function(variant){
                                                                    name = variant.value;
                                                                    return opcua.StatusCodes.Good;
                                                                }
                                                            }
                                                        };
    
                                                        return ProductTypeInputProdukt;
                                                    }(name);
    
                                                    var numberInputProdukt = function(number){
                                                        var NumberInputProdukt = {
                                                            browseName: "Number",
                                                            dataType: "Int32",
                                                            propertyOf: InputProdukt,
                                                            value: {
                                                                get: function(){
                                                                    return new opcua.Variant({dataType: "Int32", value:number});
                                                                },
                                                                set: function(variant){
                                                                    number = variant.value;
                                                                    return opcua.StatusCodes.Good;
                                                                }
                                                            }
                                                        }
                                                        return NumberInputProdukt;
                                                    }(number);
                                                    console.log(productTypeInputProdukt);
                                                    addressSpace.addVariable(productTypeInputProdukt);
                                                    addressSpace.addVariable(numberInputProdukt);
                                                }
                                                auftragsObjekt[result.outputArguments[1].value[i]] += (result.outputArguments[2].value[i]*auftragsObjekt[producttypes.C]);
                                            }
                                            callback();
                                        }
                                    })
                                },
                                function(callback){
                                    connectionsession.close();
                                    client.disconnect(function(err){
                                        if(!err){
                                            callback();
                                        }
                                    })
                                }
                                
                            ]);
                        });
                        
                    }
                    if (mengeB > 0){
                        var geraeteToProduceB = producing.getComponentByName(producttypes.B).getFolderElements().map(element => element.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(e => e.browseName.toString() === "Adresse")[0].readValue().value.value);
                        geraeteToProduceB.forEach(function(element){
                            var client1 = new opcua.OPCUAClient();
                            var connectionsession;
                            async.series([
                                function(callback){
                                    client1.connect(element,function(err){
                                        if(!err){
                                            callback();
                                        }
                                    });
                                },
                                function(callback){
                                    client1.createSession(function(err,session){
                                        if(!err){
                                            connectionsession = session;
                                            callback();
                                        }
                                    });
                                },
                                function(callback){
                                    connectionsession.call({
                                        objectId: "ns=2;s=Manifest",
                                        methodId: "ns=2;s=ManifestPort",
                                        inputArguments:[{
                                            name: "Header",
                                            value: msgspec.Header.REQUEST,
                                            dataType:"String"
                                        },{
                                            name: "Type",
                                            value: msgspec.Type.PRODUCING,
                                            dataType:"String"
                                        },{
                                            name: "Content",
                                            value: producttypes.B,
                                            dataType:"String"
                                        }]
                                    },function(err,result){
                                        if(!err){
                                            var aktMachine = producing.getComponentByName(producttypes.B).getFolderElements().filter(e => e.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(i => i.browseName.toString() ==="Adresse")[0].readValue().value.value === element)[0];
                                            var aktMachineProdPB = aktMachine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0].getFolderElements().filter(e => e.browseName.toString() === producttypes.B)[0];
                                            if(aktMachineProdPB.getPropertyByName("Input") === null){
                                                var InputProductB = addressSpace.addObject({
                                                    browseName: "Input",
                                                    propertyOf: aktMachineProdPB,
                                                    typeDefinition: folderType
                                                });
                                            }
                                            if(aktMachineProdPB.getPropertyByName("TimeToManufacture") === null){
                                                addressSpace.addVariable({
                                                    browseName: "TimeToManufacture",
                                                    propertyOf: aktMachineProdPB,
                                                    dataType: "Int32",
                                                    value: {
                                                        get: function(){
                                                            return new opcua.Variant({dataType: "Int32",value: result.outputArguments[0].value});
                                                        }
                                                    }
                                                })
                                            }else{
                                               //aktMachineProdPB.getPropertyByName("TimeToManufacture").writeValue(new opcua.SessionContext(),{dataType: "Int32",value: result.outputArguments[0].value},function(err,statusCode){});
                                            }
                                            
                                            for(var i = 0;i < result.outputArguments[1].value.length;i++){
                                                var aktMachineInp = aktMachineProdPB.getPropertyByName("Input").getFolderElements().map(e => e = e.browseName.toString());
                                                if(!aktMachineInp.includes(result.outputArguments[1].value[i])){
                                                    var InputProdukt = addressSpace.addObject({
                                                        browseName: result.outputArguments[1].value[i],
                                                        organizedBy: aktMachineProdPB.getPropertyByName("Input")
                                                    });
                                                    var productTypeInputProdukt = addressSpace.addVariable({
                                                        browseName: "ProduktTyp",
                                                        propertyOf: InputProdukt,
                                                        dataType: "String",
                                                        value: {
                                                            get: function(){
                                                                return new opcua.Variant({dataType:"String",value:result.outputArguments[1].value[i]});
                                                            }
                                                        }
                                                    });
                                                    var NumberInputProdukt = addressSpace.addVariable({
                                                        browseName: "Number",
                                                        dataType: "Int32",
                                                        propertyOf: InputProdukt,
                                                        value: {
                                                            get: function(){
                                                                return new opcua.Variant({dataType: "Int32", value: result.outputArguments[2].value[i]});
                                                            }
                                                        }
                                                    })
                                                }
                                                auftragsObjekt[result.outputArguments[1].value[i]] += (result.outputArguments[2].value[i]*auftragsObjekt[producttypes.B]);
                                            }
                                            callback();
                                        }
                                    });
                                },
                                function(callback){
                                    connectionsession.close();                                    
                                    client1.disconnect(function(err){
                                        if(!err){
                                            callback();
                                        }
                                    });
                                }
                                
                            ]);
                        });
                        
                    }
                    if (mengeA > 0){
                        var geraeteToProduceA = producing.getComponentByName(producttypes.A).getFolderElements().map(element => element.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(e => e.browseName.toString() === "Adresse")[0].readValue().value.value);                        
                        geraeteToProduceA.forEach(function(element){
                            var client2 = new opcua.OPCUAClient();
                            var connectionsession2;
                            async.series([
                                function(callback){
                                    client2.connect(element,function(err){
                                        if(!err){
                                            callback();
                                        }else{
                                            console.log(err);
                                        }
                                    });
                                },
                                function(callback){
                                    client2.createSession(function(err,session){
                                        if(!err){
                                            connectionsession2 = session;
                                            callback();
                                        }
                                    });
                                },
                                function(callback){
                                    connectionsession2.call({
                                        objectId: "ns=2;s=Manifest",
                                        methodId: "ns=2;s=ManifestPort",
                                        inputArguments:[{
                                            name: "Header",
                                            value: msgspec.Header.REQUEST,
                                            dataType:"String"
                                        },{
                                            name: "Type",
                                            value: msgspec.Type.PRODUCING,
                                            dataType:"String"
                                        },{
                                            name: "Content",
                                            value: producttypes.A,
                                            dataType:"String"
                                        }]
                                    },function(err,result){
                                        if(!err){
                                            var aktMachine = producing.getComponentByName(producttypes.A).getFolderElements().filter(e => e.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(i => i.browseName.toString() ==="Adresse")[0].readValue().value.value === element)[0];
                                            var aktMachineProdPA = aktMachine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0].getFolderElements().filter(e => e.browseName.toString() === producttypes.A)[0];
                                            if(aktMachineProdPA.getPropertyByName("Input") === null){
                                                var InputProductA = addressSpace.addObject({
                                                    browseName: "Input",
                                                    propertyOf: aktMachineProdPA,
                                                    typeDefinition: folderType
                                                });
                                            }
                                            if(aktMachineProdPA.getPropertyByName("TimeToManufacture") === null){
                                                addressSpace.addVariable({
                                                    browseName: "TimeToManufacture",
                                                    propertyOf: aktMachineProdPA,
                                                    dataType: "Int32",
                                                    value: {
                                                        get: function(){
                                                            return new opcua.Variant({dataType: "Int32",value: result.outputArguments[0].value});
                                                        }
                                                    }
                                                })
                                            }else{
                                               //aktMachineProdPA.getPropertyByName("TimeToManufacture").writeValue(new opcua.SessionContext(),{value: result.outputArguments[0].value},function(err,statusCode){});
                                            }
                                            
                                            for(var i = 0;i < result.outputArguments[1].value.length;i++){
                                                var aktMachineInp = aktMachineProdPC.getPropertyByName("Input").getFolderElements().map(e => e = e.browseName.toString());
                                                if(!aktMachineInp.includes(result.outputArguments[1].value[i])){
                                                    var InputProdukt = addressSpace.addObject({
                                                        browseName: result.outputArguments[1].value[i],
                                                        organizedBy: aktMachineProdPA.getPropertyByName("Input")
                                                    });
                                                    var productTypeInputProdukt = addressSpace.addVariable({
                                                        browseName: "ProduktTyp",
                                                        propertyOf: InputProdukt,
                                                        dataType: "String",
                                                        value: {
                                                            get: function(){
                                                                return new opcua.Variant({dataType:"String",value:result.outputArguments[1].value[i]});
                                                            }
                                                        }
                                                    });
                                                    var NumberInputProdukt = addressSpace.addVariable({
                                                        browseName: "Number",
                                                        dataType: "Int32",
                                                        propertyOf: InputProdukt,
                                                        value: {
                                                            get: function(){
                                                                return new opcua.Variant({dataType: "Int32", value: result.outputArguments[2].value[i]});
                                                            }
                                                        }
                                                    })
                                                }
                                                auftragsObjekt[result.outputArguments[1].value[i]] += (result.outputArguments[2].value[i]*auftragsObjekt[producttypes.A]);
                                            }
                                            callback();
                                        }
                                    })
                                },
                                function(callback){
                                    connectionsession2.close();
                                    client2.disconnect(function(err){
                                        if(!err){
                                            callback();
                                        }
                                    })
                                }
                                
                            ]);
                        });
                        
                    }
                    if((mengeA> 0 && producing.getComponentByName(producttypes.A)=== null)||(mengeB > 0 && producing.getComponentByName(producttypes.B)===null)||(mengeC > 0 && producing.getComponentByName(producttypes.C) === null)){
                        callback(null,{
                            statusCode: opcua.StatusCodes.Bad,
                            outputArguments:[]
                        });
                        console.log("Der Auftrag "+auftragsnr+ " kannn nicht angenommen werden, da die geforderten Produkte nicht erstellt werden können");
                        return;
                    }
                }
            }
                    
            var Auftrag = AssetType.instantiate({
                browseName: "Auftrag",
                organizedBy: Auftragsordner
            });

            var Auftraggeber = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "String",
                browseName: "Auftraggeber",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "String", value: "Florian Mohr GmbH"});
                    }
                }
            });

            var Auftragsnummer = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "Int32",
                browseName: "Auftragsnummer",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: auftragsnr});
                    }
                }
            });

            var Auftrag_Anzahl_A = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeA",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: mengeA});
                    }
                }
            });
            var Auftrag_Anzahl_B = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeB",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: mengeB});
                    }
                }
            });
            var Auftrag_Anzahl_C = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BestellmengeC",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: mengeC});
                    }
                }
            });

            var AuftragAnzahlAReal = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BerechneteMengeA",
                value: {
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: auftragsObjekt[producttypes.A]})
                    }
                }
            });
            var AuftragAnzahlBReal = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BerechneteMengeB",
                value: {
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: auftragsObjekt[producttypes.B]})
                    }
                }
            });
            var AuftragAnzahlCReal = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Body"),
                dataType: "Int32",
                browseName: "BerechneteMengeC",
                value: {
                    get: function(){
                        return new opcua.Variant({dataType: "Int32", value: auftragsObjekt[producttypes.C]})
                    }
                }
            });

            var Auftragsstatus = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "String",
                browseName: "Auftragsstatus",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "String", value:auftragsstatus});
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
            console.log("Auftrag "+ auftragsnr+" created!");
            auftragsnummer++;
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[]
            });
        });
        

//****** Methode zum Anlegen der von Geräten  */

        var registerDevice = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            modellingRule:"Mandatory",
            browseName: "registerDevice",
            inputArguments: [{
                name: "Endpoint",
                dataType: opcua.DataType.String
            },{
                name: "SerialNumber",
                dataType: opcua.DataType.Int32
            },{
                name:"Manufacturer",
                dataType:opcua.DataType.String 
            },{
                name:"Endpointtype",
                dataType:opcua.DataType.String
            },{
                name:"Producing",
                dataType: opcua.DataType.String,
                arrayType: opcua.VariantArrayType.Array,
                valueRank: 1
            },{
                name:"Showing",
                dataType: opcua.DataType.String,
                arrayType: opcua.VariantArrayType.Array,
                valueRank: 1
            },{
                name:"Monitoring",
                dataType: opcua.DataType.String,
                arrayType: opcua.VariantArrayType.Array,
                valueRank: 1
            }],
            outputArguments: []

        });

        registerDevice.bindMethod(function(inputArguments,context,callback){
            var endpoint = inputArguments[0];
            var serialNumber = inputArguments[1];
            var manufacturer = inputArguments[2];
            var endpointType = inputArguments[3];
            var producing = inputArguments[4].value;
            var showing = inputArguments[5].value;
            var monitoring = inputArguments[6].value;
            
            var Machine = AssetType.instantiate({
                browseName: endpointType.value,
                organizedBy:Geraeteordner
            });
            var serialNumberMachine = addressSpace.addVariable({
                browseName: "SerialNumber",
                propertyOf: Machine.getComponentByName("Header"),
                dataType: "String",
                value:{
                    get:function(){
                        return serialNumber;
                    }  
                } 
            });
            var manufacturerMachine = addressSpace.addVariable({
                browseName: "Manufacturer",
                propertyOf: Machine.getComponentByName("Header"),
                dataType: "String",
                value:{
                    get:function(){
                        return manufacturer;
                    }  
                } 
            });
            var endpointMachine = addressSpace.addVariable({
                browseName: "Adresse",
                propertyOf: Machine.getComponentByName("Header"),
                dataType:"String",
                value:{
                    get: function(){
                        return endpoint;
                    }
                }
            });
            var endpointTypeMachine = addressSpace.addVariable({
                browseName: "GeraeteTyp",
                componentOf: Machine.getComponentByName("Header"),
                dataType:"String",
                value:{
                    get: function(){
                        return endpointType
                    }
                }
            });

            var ManifestMachine = addressSpace.addObject({
                browseName: "Manifest",
                componentOf: Machine
            });

            var CapabilitiesMachine = addressSpace.addObject({
                browseName: "Capabilities",
                componentOf: ManifestMachine,
                typeDefinition: folderType
            });
    
            var IdentificationMachine = addressSpace.addObject({
                browseName: "Identification",
                componentOf: ManifestMachine,
                typeDefinition: folderType
            });
            endpointMachine.addReference({referenceType:"OrganizedBy",nodeId:IdentificationMachine});
            serialNumberMachine.addReference({referenceType:"OrganizedBy",nodeId:IdentificationMachine});

            if(producing.length > 0){
                var ProducingMachine = addressSpace.addObject({
                    browseName: capabilities.PRODUCING,
                    organizedBy: CapabilitiesMachine
                });
                if(Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PRODUCING).length === 0 ){
                    var Producing = addressSpace.addObject({
                        browseName: capabilities.PRODUCING,
                        organizedBy: Capabilities
                    });
                }
            }
             
            producing.forEach(function(cap){
                var ProdPossMachine = addressSpace.addObject({
                    browseName: cap,
                    organizedBy: Machine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === capabilities.PRODUCING)[0]
                });
                var ProdPossMachineProductType =addressSpace.addVariable({
                    browseName: "ProduktTyp",
                    dataType: "String",
                    value: {
                        get: function(){
                            return new opcua.Variant({dataType: "String",value: cap});
                        }
                    }
                })

                if (Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PRODUCING)[0].getComponentByName(cap) === null){
                    var ProdPoss = addressSpace.addObject({
                        browseName: cap,
                        componentOf: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PRODUCING)[0]
                    });
                }
                Machine.addReference({referenceType: "OrganizedBy", nodeId: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PRODUCING)[0].getComponentByName(cap)});
            });

            if(showing.length > 0){
                var ShowingMachine = addressSpace.addObject({
                    browseName: capabilities.SHOWING,
                    organizedBy: CapabilitiesMachine
                });
                if(Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.SHOWING).length === 0 ){
                    var Showing = addressSpace.addObject({
                        browseName: capabilities.SHOWING,
                        organizedBy: Capabilities
                    });
                }
            }
             
            showing.forEach(function(cap){
                var ShowingPossMachine = addressSpace.addObject({
                    browseName: cap,
                    organizedBy: Machine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === capabilities.SHOWING)[0]
                });
                if (Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.SHOWING)[0].getComponentByName(cap) === null){
                    var ShowingPoss = addressSpace.addObject({
                        browseName: cap,
                        componentOf: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.SHOWING)[0]
                    });
                }
                Machine.addReference({referenceType: "OrganizedBy", nodeId:  Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.SHOWING)[0].getComponentByName(cap)});
            });

            if(monitoring.length > 0){
                var MonitoringMachine = addressSpace.addObject({
                    browseName: capabilities.MONITORING,
                    organizedBy: CapabilitiesMachine
                });
                if(Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.MONITORING).length === 0 ){
                    var Monitoring = addressSpace.addObject({
                        browseName: capabilities.MONITORING,
                        organizedBy: Capabilities
                    });
                }
            } 

            monitoring.forEach(function(cap){
                var MonitoringPossMachine = addressSpace.addObject({
                    browseName: cap,
                    organizedBy: Machine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === capabilities.MONITORING)[0]
                });
                if (Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.MONITORING)[0].getComponentByName(cap) === null){
                    var MonitoringPoss = addressSpace.addObject({
                        browseName: cap,
                        componentOf: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.MONITORING)[0]
                    });
                }
                Machine.addReference({referenceType: "OrganizedBy", nodeId: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.MONITORING)[0].getComponentByName(cap)});
            });

            callback();
        });

        registerDevice.addReference({referenceType: "OrganizedBy",nodeId: RegisterDeviceManagement});

//****** JS-Hilfsfunktion zur Lokalisierung des aktuellen Auftrages, gibt dessen Node-Id zurück, wenn nicht erfolgt die Rückgabe: "NoCurrentAuftrag" */
        function getCurrentAuftrag(){
            var auftraege = Auftragsordner.getFolderElements();
            for (var i = 0; i < auftraege.length;i++){
                var auftragNodeId = auftraege[i].nodeId.toString();
                var auftragsstatus = auftraege[i].getComponentByName("Header").getComponentByName("Auftragsstatus").readValue().value.value;
                if (auftragsstatus === auftragsstat.INPRODUCTION){
                    return auftragNodeId;
                }
            }
            return "NoCurrentAuftrag";
        }

//****** JS-Funktion um die Produktion anzuschieben */

        var startProduction = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            browseName: "startProduction",
            modellingRule: "Mandatory",
            inputArguments:[
                {
                    name: "Berechnete Menge A",
                    dataType: "Int32"
                },{
                    name: "Berechnete Menge B",
                    dataType: "Int32"
                },{
                    name: "Berechnete Menge C",
                    dataType: "Int32"
                }
            ],
            outputArguments:[]
        })
        startProduction.bindMethod(function(inputArguments,context,cb){
            var auftrag = addressSpace.findNode(getCurrentAuftrag());
            var mengeA = inputArguments[0].value;
            var mengeB = inputArguments[1].value;
            var mengeC = inputArguments[2].value;
            var prodData = {}
            var producing = Capabilities.getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0];
            var mengenObj = {};
            
            if (mengeA > 0){
                prodData[producttypes.A] = {}
                producing.getComponentByName(producttypes.A).getFolderElements().forEach(function(geraet){
                    var adresse = geraet.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(element => element.browseName.toString() === "Adresse")[0].readValue().value.value;
                    var timeToManufacture = geraet.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0].getFolderElements().filter(e => e.browseName.toString() === producttypes.A)[0].getPropertyByName("TimeToManufacture").readValue().value.value;
                    prodData[producttypes.A][adresse] = timeToManufacture;
                });
            }

            if (mengeB > 0){
                prodData[producttypes.B] = {}
                producing.getComponentByName(producttypes.B).getFolderElements().forEach(function(geraet){
                    var adresse = geraet.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(element => element.browseName.toString() === "Adresse")[0].readValue().value.value;
                    var timeToManufacture = geraet.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0].getFolderElements().filter(e => e.browseName.toString() === producttypes.B)[0].getPropertyByName("TimeToManufacture").readValue().value.value;
                    prodData[producttypes.B][adresse] = timeToManufacture;
                });
            }
            if (mengeC > 0){
                prodData[producttypes.C] = {}
                producing.getComponentByName(producttypes.C).getFolderElements().forEach(function(geraet){
                    var adresse = geraet.getComponentByName("Manifest").getComponentByName("Identification").getFolderElements().filter(element => element.browseName.toString() === "Adresse")[0].readValue().value.value;
                    var timeToManufacture = geraet.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === msgspec.Type.PRODUCING)[0].getFolderElements().filter(e => e.browseName.toString() === producttypes.C)[0].getPropertyByName("TimeToManufacture").readValue().value.value;
                    prodData[producttypes.C][adresse] = timeToManufacture;
                });
            }
            var bestProduction = {};
            //Beachtung der Produkte die nur auf einer Maschine hergestellt werden können.
            for (var product in prodData){
                if (prodData.hasOwnProperty(product)){
                    if (Object.keys(product).length === 1){
                        bestProduction[product] = prodData[prodData];
                    }
                }
            }
            
            for (var product in prodData){
                if(!bestProduction.hasOwnProperty(product)){
                    var minTime = Number.MAX_VALUE;
                    var minGeraet;
                    for(var geraet in prodData[product]){
                        if(minTime>prodData[product][geraet]){
                            minTime = prodData[product][geraet];
                            minGeraet = geraet;
                        }
                    }
                    bestProduction[product] = minGeraet;
                }    
            }
            function getZielAdresse(){
                if (mengeC >0 ){
                    return bestProduction[producttypes.C]
                }else{
                    return server.endpoints[0].endpointDescriptions()[0].endpointUrl;
                }
            }
            mengenObj[producttypes.A] = mengeA;
            mengenObj[producttypes.B] = mengeB;
            mengenObj[producttypes.C] = mengeC;

            console.log(bestProduction);
            var productArray = Object.keys(bestProduction);
            var baseproductsArray = productArray.filter(e => e === producttypes.A || e === producttypes.B);
            console.log(baseproductsArray);
            baseproductsArray.forEach(function(element){
                console.log(element);
                console.log(bestProduction[element]);
                var theSession;
                var methodIdPr;
                var objectIdPr;
                var productClient = new opcua.OPCUAClient();
                async.series([
                    function(callback){
                        productClient.connect(bestProduction[element],function(err){
                            if(!err){
                                console.log("Connected to "+bestProduction[element]);
                                callback();
                            }else{
                                console.log(err);
                            }
                        })
                    },
                    function(callback){
                        productClient.createSession(function(err,session){
                            if(!err){
                                console.log("Session created");
                                theSession = session
                                callback();
                            }else{
                                console.log(err);
                            }
                        })
                    },
                    function(callback){
                        theSession.call({
                            objectId: "ns=2;s=Manifest",
                            methodId: "ns=2;s=ManifestPort",
                            inputArguments:[{
                                name: "Header",
                                dataType: "String",
                                value: msgspec.Header.ORDER
                            },{
                                name: "Type",
                                dataType: "String",
                                value: msgspec.Type.PRODUCING
                            },{
                                name: "Content",
                                dataType: "String",
                                value: element
                            }]
                        },function(err,result){
                            if(!err){                            
                                methodIdPr = result.outputArguments[3].value;
                                objectIdPr = result.outputArguments[4].value;                                
                                callback();
                            }
                        });
                    },
                    function(callback){
                        theSession.call({
                            objectId: objectIdPr,
                            methodId: methodIdPr,
                            inputArguments:[{
                                name: "VolumeA",
                                dataType: "Int32",
                                value: mengenObj[element]
                            },{
                                name: "AdresseZiel",
                                dataType: "String",
                                value : getZielAdresse()
                            },{
                                name: "Auftraggeber",
                                dataType: "String",
                                value: addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Header").getComponentByName("Auftraggeber").readValue().value.value
                            },{
                                name: "Auftragsnummer",
                                dataType: "Int32",
                                value: addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value
                            },{
                                name: "BestellmengeA",
                                dataType: "Int32",
                                value: addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Body").getComponentByName("BestellmengeA").readValue().value.value
                            },{
                                name: "BestellmengeB",
                                dataType: "Int32",
                                value: addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Body").getComponentByName("BestellmengeB").readValue().value.value
                            },{
                                name: "BestellmengeC",
                                dataType: "Int32",
                                value: addressSpace.findNode(getCurrentAuftrag()).getComponentByName("Body").getComponentByName("BestellmengeC").readValue().value.value
                            }
                        ]
                        },function(err,result){
                            if(!err){
                                callback();
                            }
                        })
                    },
                    function(callback){
                        theSession.close();
                        productClient.disconnect(function(err){
                            if(!err){
                                callback();
                            }
                        })
                    }
                ])
            })

            cb();
        });
        
//****** OPCUA-Methode die von ausssen aufgerufen wird wenn Gerät entfernt wird, nimmt die Goals und CurrentOutputs aller Produkte, sowie den Endpoint des Geräts

        var removeDevice = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            browseName: "removeDevice",
            modellingRule: "Mandatory",
            inputArguments:[
                {
                    name: "OutputgoalA",
                    dataType: "Int32",
                },{
                    name: "OutputA",
                    dataType: "Int32"
                },{
                    name: "OutputgoalB",
                    dataType: "Int32",
                },{
                    name: "OutputB",
                    dataType: "Int32"
                },{
                    name: "OutputgoalC",
                    dataType: "Int32",
                },{
                    name: "OutputC",
                    dataType: "Int32"
                },{
                    name: "EndpointToRemove",
                    dataType: "String"
                }
            ],
            outputArguments:[]
        });

        removeDevice.bindMethod(function(inputArguments,context,callback){
            var deviceGoalA = inputArguments[0].value;
            var deviceOutputA = inputArguments[1].value;
            var deviceGoalB = inputArguments[2].value;
            var deviceOutputB = inputArguments[3].value;
            var deviceGoalC = inputArguments[4].value;
            var deviceOutputC = inputArguments[5].value;
            var endpointToDelete = inputArguments[6].value;

            //Löschen des OPCUA-Objects
            var nodeToBeDeleted = Geraeteordner.getFolderElements().filter(element => endpointToDelete === element.getComponentByName("Header").getPropertyByName("Adresse").readValue().value.value)[0];
            addressSpace.deleteNode(nodeToBeDeleted);
            //Capabilities entfernen
            removeCapabilities();
            //Check ob die Production auf dem Gerät abgeschlossen ist
            var deviceProductionfinished = ((deviceOutputA >= deviceGoalA) && (deviceOutputB >= deviceGoalB) && (deviceOutputC >= deviceGoalC));
            if(deviceProductionfinished){

            }else{
                //Check ob der Aktuelle Auftrag noch bearbeitet werden kann
                if(checkCapabilitesCurrentOrderMatch()){
                    var additionalA = Math.max(0, deviceGoalA-deviceOutputA);
                    var additionalB = Math.max(0, deviceGoalB-deviceOutputB);
                    var additionalC = Math.max(0, deviceGoalC-deviceOutputC);
                    //Hinzufügen der liegengelassenen Produkte auf die verbleibenden Geräte durch erneutes Aufrufen der startProductionFunktion
                    var additionalAVariant = new opcua.Variant({dataType: "Int32",value: additionalA});
                    var additionalBVariant = new opcua.Variant({dataType: "Int32",value: additionalB});
                    var additionalCVariant = new opcua.Variant({dataType: "Int32",value: additionalC});
                    startProduction.execute([additionalAVariant,additionalBVariant,additionalCVariant],new opcua.SessionContext(),function(err,result){
                        if(err){
                            console.log("Error during restarting Production with additional Productquantities: "+err);
                        }
                    })
                }else{

                }
            }
            //callback an den Client senden
            callback();
            //kurze Ausgabe
            console.log(endpointToDelete+" wurde entfernt");


        })
        removeDevice.addReference({referenceType:"OrganizedBy",nodeId:RemoveDeviceManagement})



//****** JS-Funktion um zu checken ob aktueller Auftrag bewältigbar ist, returns boolean

        function checkCapabilitesCurrentOrderMatch(){
            var currentAuftragNodeId = getCurrentAuftrag();
            var currentAuftragBody = addressSpace.findNode(currentAuftragNodeId).getComponentByName("Body");
            var mengeA = currentAuftragBody.getComponentByName("BerechneteMengeA").readValue().value.value;
            var mengeB = currentAuftragBody.getComponentByName("BerechneteMengeB").readValue().value.value;
            var mengeC = currentAuftragBody.getComponentByName("BerechneteMengeC").readValue().value.value;
            if (Capabilities.getFolderElements().filter(e => e.browseName.toString()===capabilities.PRODUCING).length === 0){
                return false;
            }else{
                var producing = Capabilities.getFolderElements().filter(e=> e.browseName.toString()=== capabilities.PRODUCING)[0];
                if((mengeA> 0 && producing.getComponentByName(producttypes.A)=== null)||(mengeB > 0 && producing.getComponentByName(producttypes.B)===null)||(mengeC > 0 && producing.getComponentByName(producttypes.C) === null)){
                    return false;
                }
            }
            return true;
        }
//****** JS-Funktion um Capabilities im Abmeldevorgang zu entfernen
        function removeCapabilities(){
            Capabilities.getFolderElements().forEach(function(element){
                element.getComponents().forEach(function(deepElement){
                    if(deepElement.getFolderElements().length === 0){
                        addressSpace.deleteNode(deepElement);
                    }
                });
                if(element.getComponents().length === 0){
                    addressSpace.deleteNode(element);
                }
            })
        }        
//****** Methode um Produkte vom Typ C aufzusammeln */
        var CollectProductC = addressSpace.addMethod(Fabrik.getComponentByName("Body"), {
            modellingRule: "Mandatory",
            browseName: "CollectProductC",
            inputArguments: [
                {
                    name: "ProduktnummernC",
                    dataType: "Int32",
                    valueRank:1,
                    arrayType: opcua.VariantArrayType.Array,
                },{
                    name: "AperC",
                    dataType: "Int32"
                },{
                    name: "BperC",
                    dataType: "Int32"
                }
            ],
            outputArguments: []
        });
        CollectProductC.addReference({referenceType:"OrganizedBy",nodeId: ProduktCCollecting})
        CollectProductC.bindMethod(function(inputArguments,context,callback){
            var currentAuftrag = addressSpace.findNode(getCurrentAuftrag());
            var produktnummern = inputArguments[0].value;            
            var numberOfC = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeC").readValue().value.value;
            var AperC = inputArguments[1].value;
            var BperC = inputArguments[2].value;
            var numberOfA = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeA").readValue().value.value;
            var numberOfB = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeB").readValue().value.value;
            
            
            for(var i = 0;i < produktnummern.length;i++){
                var endproduktnummer = produktnummern[i];
                var Endprodukt = AssetType.instantiate({
                    organizedBy: currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte"),
                    browseName: producttypes.C
                });
                var ProduktType = addressSpace.addVariable({
                    browseName: "ProduktTyp",
                    componentOf: Endprodukt.getComponentByName("Header"),
                    dataType:"String",
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"String", value: producttypes.C})
                        }
                    }
                });
                var ProduktNummer = addressSpace.addVariable({
                    browseName: "Produktnummer",
                    dataType:"Int32",
                    componentOf:Endprodukt.getComponentByName("Header"),
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"Int32",value: endproduktnummer})
                        }
                    }
                });

                for(var j = 0;j<AperC;j++){ 
                    var produktnummerA = produktnummern[i+j+1];
                    var Produkt = AssetType.instantiate({
                        browseName:"Produkt",
                        organizedBy: Endprodukt.getComponentByName("Body")
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
                                return new opcua.Variant({dataType:"Int32",value: produktnummerA})
                            }
                        }
                    });
                }

                for(var j = 0;j<BperC;j++){
                    var produktnummerB = produktnummern[i+j+AperC+1];
                    var Produkt = AssetType.instantiate({
                        browseName:"Produkt",
                        organizedBy: Endprodukt.getComponentByName("Body")
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
                                return new opcua.Variant({dataType:"Int32",value: produktnummerB})
                            }
                        }
                    });
                }
                i+=AperC+BperC;
            }
            var currentnumberA = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.A).length;
            var currentnumberB = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.B).length;
            var currentnumberC = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C).length;

            if (currentnumberA >= numberOfA && currentnumberB >= numberOfB && currentnumberC >= numberOfC){
                console.log("Auftrag "+ currentAuftrag.getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value + " finished!");
                currentAuftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:auftragsstat.FINISHED}),statusCode: opcua.StatusCodes.Good}),function(err){
                    if(!err){
                        auftragFinished = true;
                        productionRuns = false;
                    }
                });
            }
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[]
            });
        });

//****** Methode um Produkte vom Typ A aufzusammeln */
        var CollectProductA = addressSpace.addMethod(Fabrik.getComponentByName("Body"), {
            modellingRule: "Mandatory",
            browseName: "CollectProductA",
            inputArguments: [
                {
                    name: "ProduktnummernA",
                    dataType: "Int32",
                    valueRank:1,
                    arrayType: opcua.VariantArrayType.Array,
                },{
                    name: "Auftraggeber",
                    dataType: "String"
                },{
                    name: "Auftragsnummer",
                    dataType: "Int32"
                },{
                    name: "BestellmengeA",
                    dataType: "Int32"
                },{
                    name: "BestellmengeB",
                    dataType: "Int32"
                },{
                    name: "BestellmengeC",
                    dataType: "Int32"
                }
            ],
            outputArguments: []
        });
        CollectProductA.addReference({referenceType:"OrganizedBy",nodeId: ProduktACollecting})
        CollectProductA.bindMethod(function(inputArguments,context,callback){
            var currentAuftrag = addressSpace.findNode(getCurrentAuftrag());
            var produktnummern = inputArguments[0].value;
            var numberOfC = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeC").readValue().value.value;
            var numberOfA = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeA").readValue().value.value;
            var numberOfB = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeB").readValue().value.value;
            
            
            for(var i = 0;i < produktnummern.length;i++){
                var produktnummer = produktnummern[i];
                var ProduktA = AssetType.instantiate({
                    organizedBy: currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte"),
                    browseName: producttypes.A
                });
                var ProduktType = addressSpace.addVariable({
                    browseName: "ProduktTyp",
                    componentOf: ProduktA.getComponentByName("Header"),
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
                    componentOf:ProduktA.getComponentByName("Header"),
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"Int32",value: produktnummer})
                        }
                    }
                });

            }
            var currentnumberA = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.A).length;
            var currentnumberB = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.B).length;
            var currentnumberC = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C).length;

            console.log("Collect A");
            console.log("currentNumberA: "+currentnumberA);
            console.log("NumberA: "+numberOfA);
            console.log("currentNumberB: "+currentnumberB);
            console.log("NumberB: "+numberOfB);
            console.log("currentNumberC: "+currentnumberC);
            console.log("NumberC: "+numberOfC);
            if (currentnumberA >= numberOfA && currentnumberB >= numberOfB && currentnumberC >= numberOfC){
                console.log("Auftrag "+ currentAuftrag.getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value + " finished!");
                currentAuftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:auftragsstat.FINISHED}),statusCode: opcua.StatusCodes.Good}),function(err){
                    if(!err){        
                        auftragFinished = true;
                        productionRuns = false;
                    }
                });
            }
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[]
            });
        });
//****** Methode um Produkte vom Typ B aufzusammeln */
        var CollectProductB = addressSpace.addMethod(Fabrik.getComponentByName("Body"), {
            modellingRule: "Mandatory",
            browseName: "CollectProductB",
            inputArguments: [
                {
                    name: "ProduktnummernB",
                    dataType: "Int32",
                    valueRank:1,
                    arrayType: opcua.VariantArrayType.Array,
                },{
                    name: "Auftraggeber",
                    dataType: "String"
                },{
                    name: "Auftragsnummer",
                    dataType: "Int32"
                },{
                    name: "BestellmengeA",
                    dataType: "Int32"
                },{
                    name: "BestellmengeB",
                    dataType: "Int32"
                },{
                    name: "BestellmengeC",
                    dataType: "Int32"
                }
            ],
            outputArguments: []
        });
        CollectProductB.addReference({referenceType:"OrganizedBy",nodeId: ProduktBCollecting})
        CollectProductB.bindMethod(function(inputArguments,context,callback){
            var currentAuftrag = addressSpace.findNode(getCurrentAuftrag());
            var produktnummern = inputArguments[0].value;
            var numberOfC = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeC").readValue().value.value;
            var numberOfA = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeA").readValue().value.value;
            var numberOfB = currentAuftrag.getComponentByName("Body").getComponentByName("BestellmengeB").readValue().value.value;
            
            
            for(var i = 0;i < produktnummern.length;i++){
                var produktnummer = produktnummern[i];
                var ProduktB = AssetType.instantiate({
                    organizedBy: currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte"),
                    browseName: producttypes.B
                });
                var ProduktType = addressSpace.addVariable({
                    browseName: "ProduktTyp",
                    componentOf: ProduktB.getComponentByName("Header"),
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
                    componentOf:ProduktB.getComponentByName("Header"),
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType:"Int32",value: produktnummer})
                        }
                    }
                });

            }
            var currentnumberA = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.A).length;
            var currentnumberB = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.B).length;
            var currentnumberC = currentAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements().filter(e => e.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value === producttypes.C).length;
            console.log("Collect B");
            console.log("currentNumberA: "+currentnumberA);
            console.log("NumberA: "+numberOfA);
            console.log("currentNumberB: "+currentnumberB);
            console.log("NumberB: "+numberOfB);
            console.log("currentNumberC: "+currentnumberC);
            console.log("NumberC: "+numberOfC);

            if (currentnumberA >= numberOfA && currentnumberB >= numberOfB && currentnumberC >= numberOfC){
                console.log("Auftrag "+ currentAuftrag.getComponentByName("Header").getComponentByName("Auftragsnummer").readValue().value.value + " finished!");
                currentAuftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:auftragsstat.FINISHED}),statusCode: opcua.StatusCodes.Good}),function(err){
                    if(!err){
                        auftragFinished = true;
                        productionRuns = false;
                    }
                });
            }
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[]
            });
        });
    }

//****** Servererstellung */
    construct_my_address_space(server);
    server.start(function() {
        console.log("Fabrik is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port);
        var endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the primary server endpoint url is ", endpointUrl );
    });
}
server.initialize(post_initialize);