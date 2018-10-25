var opcua = require("node-opcua");
var path = require('path');
var async = require("async");
var auftragsstat = require('./AuftragsStatus.json');
var endpointtypes = require('./endpointtypes.json')
var help = require('./help.js');
var producttypes = require('./producttypes.json');
var capabilities = require('./capabilities.json');
var msgspec = require('./MessageSpecification.json');
var productstat = require('./productstatus.json');

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
        var produktnummer = 1;

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
        });
//****** Anlegen der AddInputProduct Capability

        var AddInputProduct = addressSpace.addObject({
            browseName: capabilities.ADDINPUTPRODUCT,
            organizedBy: Capabilities
        });
        var AddInputProductA = addressSpace.addObject({
            browseName: msgspec.Content.AddInputProduct.A,
            componentOf: AddInputProduct
        });
        var AddInputProductB = addressSpace.addObject({
            browseName: msgspec.Content.AddInputProduct.B,
            componentOf: AddInputProduct
        });
        var AddInputProductC = addressSpace.addObject({
            browseName: msgspec.Content.AddInputProduct.C,
            componentOf: AddInputProduct
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
                            var readyAuftraege = Auftragsordner.getFolderElements().filter(auftrag => auftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").readValue().value.value === auftragsstat.READY);
                            if(readyAuftraege.length > 0){
                                async.series([
                                    function(callback){                                    
                                        readyAuftraege[0].getComponentByName("Header").getComponentByName("Auftragsstatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:auftragsstat.INPRODUCTION}),statusCode: opcua.StatusCodes.Good}),function(err){
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
                                        startProduction.execute([],new opcua.SessionContext(),function(err,result){
                                            if(!err){
                                                //console.log("Starte Produktion!!!");
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
                            startProduction.execute([],new opcua.SessionContext(),function(err,result){
                                if(!err){
                                    //console.log("Starte Produktion!!!");
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
        
        createAuftrag.bindMethod(function(inputArguments,context, callback){
            var mengeA = inputArguments[0].value;
            var mengeB = inputArguments[1].value;
            var mengeC = inputArguments[2].value;
            var auftragsnr = auftragsnummer;
            var auftragsstatus = auftragsstat.WAITING;

            // Anlegen der Auftragsdaten

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
            var AuftragProduktordner = addressSpace.addObject({
                componentOf:Auftrag.getComponentByName("Body"),
                browseName: "Zugehoerige Produkte",
                typeDefinition: folderType
            })


            //Anlegen der entsprechenden Produkte

            for (var i = 0; i < mengeA;i++){
                createProduct(Auftrag,producttypes.A,[capabilities.PRODUCING]);
            }
            for (var i = 0; i < mengeB;i++){
                createProduct(Auftrag,producttypes.B,[capabilities.PRODUCING]);
            }
            for (var i = 0; i < mengeC;i++){
                createProduct(Auftrag,producttypes.C,[capabilities.PRODUCING]);
            }
            var Auftragsstatus = addressSpace.addVariable({
                componentOf: Auftrag.getComponentByName("Header"),
                dataType: "String",
                browseName: "Auftragsstatus",
                value:{
                    get: function(){
                        var productsArray = AuftragProduktordner.getFolderElements();
                        var productsStatusArray = productsArray.map(p => p.getComponentByName("Body").getComponentByName("ProduktStatus").readValue().value.value);
                        if(productsStatusArray.every(s => s === productstat.FINISHED)){                            
                            auftragsstatus = auftragsstat.FINISHED;
                        }else if (productsStatusArray.includes(productstat.WAITING)){
                            auftragsstatus = auftragsstat.WAITING;
                        }else if(productsStatusArray.every(e=> e === productstat.FINISHED || e === productstat.READY) && auftragsstatus!== auftragsstat.INPRODUCTION){
                            auftragsstatus = auftragsstat.READY;
                        }
                        return new opcua.Variant({dataType: "String", value:auftragsstatus});
                    },
                    set: function(variant){ 
                        if (auftragsstatus === auftragsstat.READY){
                            auftragsstatus = variant.value;
                        }
                        return opcua.StatusCodes.Good;
                    }
                }
            });

            console.log("Auftrag "+ auftragsnr+" created!");
            auftragsnummer++;
            callback(null,{
                statusCode: opcua.StatusCodes.Good,
                outputArguments:[]
            });
        });
//****** JS-Methode zur Produkterstellung

        function createProduct(Auftrag,produkttyp,plc){
            var produktnr = produktnummer;
            var Produkt = AssetType.instantiate({
                browseName:"Produkt",
                nodeId:"ns=2;s=Produkt"+produktnr,
                organizedBy: Auftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte")
            });
            var ProduktType = addressSpace.addVariable({
                browseName: "ProduktTyp",
                componentOf: Produkt.getComponentByName("Header"),
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
                componentOf:Produkt.getComponentByName("Header"),
                value:{
                    get: function(){
                        return new opcua.Variant({dataType:"Int32",value: produktnr})
                    }
                }
            });

            var ProductLifecycle = addressSpace.addObject({
                browseName: "ProductLifecycle",
                componentOf: Produkt.getComponentByName("Body"),
                typeDefinition: folderType
            });
            plc.forEach(function(process){
                var ProcessProduct = addressSpace.addObject({
                   componentOf: ProductLifecycle,
                   browseName: process
               });
               
                var numberInSequenceProcess = addressSpace.addVariable({
                    browseName: "numberInSequence",
                    propertyOf: ProcessProduct,
                    dataType: "Int32",
                    value: {
                        get: function(){
                            return new opcua.Variant({dataType: "Int32", value: plc.indexOf(process)+1});
                        }
                    }
                });
                var finishedProcessProductLocal = false;
                var finishedProcessProduct = addressSpace.addVariable({
                    propertyOf: ProcessProduct,
                    browseName: "finished",
                    dataType: "Boolean",
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType: "Boolean",value: finishedProcessProductLocal});
                        },
                        set: function(variant){
                            finishedProcessProductLocal = variant.value;                        
                        }
                    }
                });
            });
            var produktStatus = productstat.READY;
            var ProduktStatus = addressSpace.addVariable({
                componentOf: Produkt.getComponentByName("Body"),
                browseName: "ProduktStatus",
                dataType: "String",
                value:{
                    get: function(){
                        //Check ob alle Produktionsschritte abgehakt sind.
                        if (ProductLifecycle.getComponents().map(e => e.getPropertyByName("finished").readValue().value.value).includes(false)){
                            var capArray = ProductLifecycle.getComponents();
                            var capArrayNotFinished = capArray.filter(c => c.getPropertyByName("finished").readValue().value.value == false);
                            var capsExecutable = true;
                            capArrayNotFinished.forEach(function(c){
                                if (c.findReferences("Organizes",true).length === 0){
                                    capsExecutable = false;
                                }
                            });
                            if (capsExecutable){
                                return new opcua.Variant({dataType: "String",value: produktStatus})
                            }else{
                                return new opcua.Variant({dataType: "String", value: productstat.WAITING });    
                            }
                        }else{
                            return new opcua.Variant({dataType: "String", value: productstat.FINISHED});
                        }                        
                    },
                    set: function(variant){
                        //TODO:Limit Inputs to valid productstatus
                        produktStatus = variant.value;
                        return opcua.StatusCodes.Good
                    }
                }
            });
            //Link zwischen Produkten und Maschinen
            Geraeteordner.getFolderElements().forEach(function(device){
                linkProductToMaschine(Produkt,device);
            })
            produktnummer++;
            return Produkt;
        }
//****** JS-Methode um den Link zwischen den geforderten Fähigkeiten der eines Produkte und den einer Maschine herzustellen, welche diese Fähigkeit besitzt */
        
        function linkProductToMaschine (product, maschine){
            var typ = product.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value;
            var plcFolder = product.getComponentByName("Body").getComponentByName("ProductLifecycle");
            var capArray = plcFolder.getComponents();
            capArray.forEach(function(cap){
                var capName = cap.browseName.toString();
                var capMaschineArray = maschine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements();
                if(capMaschineArray.map(c=>c.browseName.toString()).includes(capName)){
                    var matchingCap = capMaschineArray.filter(c =>c.browseName.toString() === capName)[0];
                    if(matchingCap.getFolderElements().map(pt => pt.browseName.toString()).includes(typ)){
                        cap.addReference({referenceType: "Organizes",nodeId: maschine});
                    }
                }
            })
        }

//****** OPCUA-Methode zum Anlegen der von Geräten  */

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
            },{
                name:"Processing",
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
            var processing = inputArguments[7].value;
            
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
                var productionRunsDeviceLocal = false;
                var productionRunsDevice = addressSpace.addVariable({
                    browseName: "ProductionRuns",
                    componentOf: ProducingMachine,
                    dataType: "Boolean",
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType: "Boolean",value:productionRunsDeviceLocal})
                        },
                        set: function(value){
                            productionRunsDeviceLocal = value.value;
                            return opcua.StatusCodes.Good;
                        }
                    }
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

            if(processing.length > 0){
                var ProcessingMachine = addressSpace.addObject({
                    browseName: capabilities.PROCESSING,
                    organizedBy: CapabilitiesMachine
                });
                var processingRunsDeviceLocal = false;
                var processingRunsDevice = addressSpace.addVariable({
                    browseName: "ProcessingRuns",
                    componentOf: ProcessingMachine,
                    dataType: "Boolean",
                    value:{
                        get: function(){
                            return new opcua.Variant({dataType: "Boolean",value:processingRunsDeviceLocal})
                        },
                        set: function(value){
                            processingRunsDeviceLocal = value.value;
                            return opcua.StatusCodes.Good;
                        }
                    }
                });
                if(Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PROCESSING).length === 0 ){
                    var Processing = addressSpace.addObject({
                        browseName: capabilities.PROCESSING,
                        organizedBy: Capabilities
                    });
                }
            }
             
            processing.forEach(function(cap){
                var ProcPossMachine = addressSpace.addObject({
                    browseName: cap,
                    organizedBy: Machine.getComponentByName("Manifest").getComponentByName("Capabilities").getFolderElements().filter(e => e.browseName.toString() === capabilities.PROCESSING)[0]
                });
                var ProdPossMachineProductType =addressSpace.addVariable({
                    componentOf: ProcPossMachine,
                    browseName: "ProduktTyp",
                    dataType: "String",
                    value: {
                        get: function(){
                            return new opcua.Variant({dataType: "String",value: cap});
                        }
                    }
                })

                if (Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PROCESSING)[0].getComponentByName(cap) === null){
                    var ProcPoss = addressSpace.addObject({
                        browseName: cap,
                        componentOf: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PROCESSING)[0]
                    });
                }
                Machine.addReference({referenceType: "OrganizedBy", nodeId: Capabilities.getFolderElements().filter(element => element.browseName.toString() === capabilities.PROCESSING)[0].getComponentByName(cap)});
            });


            //Link zu Produkten
            Auftragsordner.getFolderElements().forEach(function(auftrag){
                var productfolder = auftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements();
                productfolder.forEach(function(p){
                    linkProductToMaschine(p,Machine);
                });
            })

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
            //TODO: Remove the inputArguments --> Check all MethodCalls!
            browseName: "startProduction",
            modellingRule: "Mandatory",
            inputArguments:[],
            outputArguments:[]
        })
        startProduction.bindMethod(function(inputArguments,context,callback){
            var currAuftrag = addressSpace.findNode(getCurrentAuftrag());
            console.log("Production started!")
            
            function produce(){
                var produktsCurrAuftrag = currAuftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements();
                var productCounter = 0;
                //filter alle nicht fertigen Produkte
                var notFinishedProduktsCurrAuftragNotSorted = produktsCurrAuftrag.filter(p=> (p.getComponentByName("Body").getComponentByName("ProduktStatus").readValue().value.value !== productstat.FINISHED) && (p.getComponentByName("Body").getComponentByName("ProduktStatus").readValue().value.value !== productstat.INPRODUCTION));
                var notFinishedProductsCurrAuftragMoreCap = notFinishedProduktsCurrAuftragNotSorted.filter(p => p.getComponentByName("Body").getComponentByName("ProductLifecycle").getComponents().length >1);
                var notFinishedProductsCurrAuftragLessCap = notFinishedProduktsCurrAuftragNotSorted.filter(p => p.getComponentByName("Body").getComponentByName("ProductLifecycle").getComponents().length == 1);
                var notFinishedProduktsCurrAuftrag = notFinishedProductsCurrAuftragMoreCap.concat(notFinishedProductsCurrAuftragLessCap);
                function processNotFinishedProduktsCurrAuftrag(produktIndex){
                    var produkt = notFinishedProduktsCurrAuftrag[produktIndex];
                    if (typeof produkt ===  "undefined"){
                        return;
                    }
                    getBestMaschineCurrentCap(produkt,function(bestMachine){
                        //console.log(bestMachine);
                        if(bestMachine === 0){
                            //TODO: Throw some error
                            return;
                        }
                        // Anfrage an Maschine ob frei
                        requestProduction(produkt, bestMachine,function(response){
                            if (response == null){
                                //TODO: Throw some error
                            }
                            var productionPossible = response.outputArguments[5].value;
                            //TODO: Remove this Output!
                            console.log("Production of "+produkt.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+ " auf "+bestMachine.browseName.toString()+" possible: "+productionPossible);
                            //Wenn frei, dann platzieren der Produktion.
                            if(productionPossible){
                                placeOrder(produkt,bestMachine, function(){
                                    if (produktIndex !== notFinishedProduktsCurrAuftrag.length-1){
                                        processNotFinishedProduktsCurrAuftrag(produktIndex+1);
                                    }
                                    productCounter++;
                                    if (productCounter === notFinishedProduktsCurrAuftrag.length){
                                        //redo if all Products have been processed.
                                        setTimeout(produce, 5000);
                                    }                                                                                        
                                });
                            }else{
                                if (produktIndex !== notFinishedProduktsCurrAuftrag.length-1){
                                    processNotFinishedProduktsCurrAuftrag(produktIndex+1);
                                }
                                productCounter++;
                                if (productCounter === notFinishedProduktsCurrAuftrag.length){
                                    //redo if all Products have been processed. 
                                    setTimeout(produce, 4000);
                                }                        
                            }                      
                        });
                    })
                }
                if (notFinishedProduktsCurrAuftrag.length >= 1){
                    processNotFinishedProduktsCurrAuftrag(0);
                }else if(currAuftrag.getComponentByName("Header").getComponentByName("Auftragsstatus").readValue().value.value === auftragsstat.INPRODUCTION){
                    setTimeout(produce,5000);
                }
            }
            produce();
        });
        //Hilfsfunktion, die zu einem Produkt die aktuelle Capability zurückgibt
        //@param: produkt
        //@return: capability
        function getCurrentCapability(produkt){
            //console.log("Product to determine currentCap: "+produkt);
            var capArray = produkt.getComponentByName("Body").getComponentByName("ProductLifecycle").getComponents();
            var notFinishedCaps = capArray.filter(cap => cap.getPropertyByName("finished").readValue().value.value === false);
            var currCap = notFinishedCaps[0];
            if(notFinishedCaps.length > 1){
                notFinishedCaps.forEach(function(cap){
                    var numberInSequenceCap = cap.getPropertyByName("numberInSequence").readValue().value.value;
                    var numberInSequenceAktCap = currCap.getPropertyByName("numberInSequence").readValue().value.value;
                    if(numberInSequenceCap<numberInSequenceAktCap){
                        currCap = cap;
                    }
                });
            }
            return currCap;
        }

        //Hilfsmethode die die beste Maschine für die aktuelle Capability eines Produktes zurückgibt
        //@param produkt
        //@return maschine

        function getBestMaschineCurrentCap(produkt, fn){
            var aktCap = getCurrentCapability(produkt);
            var availableMachinesforCap = aktCap.getFolderElements();
            console.log(availableMachinesforCap);
            var counterMachines =0;
            //TODO: Statusänderung des Produktes wenn es keine Maschinen gibt, die die Capability bearbeiten können
            if (availableMachinesforCap.length === 0){
                fn(0);
                return;
            }
            if (availableMachinesforCap.length === 1){
                fn(availableMachinesforCap[0]);
                return;
            }
            
            var bestMachineforCap = availableMachinesforCap[0];
            var bestMachineProdTime = Number.MAX_VALUE;            
            availableMachinesforCap.forEach(function(machine){
                var currMachineEndpoint = machine.getComponentByName("Header").getPropertyByName("Adresse").readValue().value.value;
                //console.log("Next Machine to request TtM: "+currMachineEndpoint);
                var currMachineTime;
                var requestsession;
                var requestClient = new opcua.OPCUAClient();
                //Abfrage der TimeToManufacture des aktuellen Produktes
                async.series([
                    function(callback){
                        requestClient.connect(currMachineEndpoint,function(err){
                            if(!err){
                                //console.log("Connected to "+currMachineEndpoint+" in Order to request TimeToManufacture");
                                callback();
                            }else{
                                console.log(err);
                            }
                        })
                    },
                    function(callback){
                        requestClient.createSession(function(err,session){
                            if(!err){                                        
                                requestsession = session
                                callback();
                            }else{
                                console.log(err);
                            }
                        })
                    },
                    function(callback){
                        requestsession.call({
                            objectId: "ns=2;s=Manifest",
                            methodId: "ns=2;s=ManifestPort",
                            inputArguments:[{
                                name: "Header",
                                dataType: "String",
                                value: msgspec.Header.REQUEST
                            },{
                                name: "Type",
                                dataType: "String",
                                value: aktCap.browseName.toString()
                            },{
                                name: "Content",
                                dataType: "String",
                                value: produkt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value
                            }]
                        },function(err,result){
                            if(!err){
                                currMachineTime = result.outputArguments[0].value;
                                counterMachines++;
                                //console.log("Zeit von "+currMachineEndpoint+": "+currMachineTime);
                                if (currMachineTime < bestMachineProdTime){
                                    bestMachineforCap = machine;
                                    bestMachineProdTime = currMachineTime;
                                }
                                //console.log("counterMachines: "+counterMachines);
                                if (counterMachines === availableMachinesforCap.length){
                                    fn(bestMachineforCap);
                                }
                                callback();
                            }
                        });
                    },
                    function(callback){
                        requestsession.close(function(err){
                            if (err){
                                console.log(err);
                            }
                        });
                        requestClient.disconnect();
                        callback();
                    }
                ]);
            });
        }

        //Hilfsmethode um ein Produkt auf gewisser Maschine zu ordern
        //@param: produkt, maschine

        function placeOrder(produkt, maschine, fn){
            produkt.getComponentByName("Body").getComponentByName("ProduktStatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:productstat.INPRODUCTION}),statusCode: opcua.StatusCodes.Good}),function(err){});
            var endpointToConnect = maschine.getComponentByName("Header").getPropertyByName("Adresse").readValue().value.value;
            var plcProdukt = produkt.getComponentByName("Body").getComponentByName("ProductLifecycle").getFolderElements();
            var plcToSend = plcProdukt.map(process => process.browseName.toString());
            console.log("Place Order von "+produkt.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+" auf "+maschine.browseName.toString());
            var orderClient = new opcua.OPCUAClient({keepSessionAlive:true, requestedSessionTimeout: 300000});
            var orderSession;
            var aktCap = getCurrentCapability(produkt);
            var objectId;
            var methodId;
            async.series([
                function(callback){
                    orderClient.connect(endpointToConnect,function(err){
                        if(!err){
                            //console.log("Connected to "+bestProduction[element]);
                            callback();
                        }else{
                            console.log(err);
                        }
                    })
                },
                function(callback){
                    orderClient.createSession(function(err,session){
                        if(!err){                                        
                            orderSession = session;                        
                            callback();
                        }else{
                            console.log(err);
                        }
                    })
                },
                function(callback){
                    orderSession.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[{
                            name: "Header",
                            dataType: "String",
                            value: msgspec.Header.ORDER
                        },{
                            name: "Type",
                            dataType: "String",
                            value: aktCap.browseName.toString()
                        },{
                            name: "Content",
                            dataType: "String",
                            value: produkt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value
                        }]
                    },function(err,result){
                        if(!err){
                            //console.log(result);
                            methodId = result.outputArguments[3].value;
                            objectId = result.outputArguments[4].value;
                            callback();
                        }
                    });
                },
                function(callback){
                    fn();
                    orderSession.call({
                        objectId: objectId,
                        methodId: methodId,
                        inputArguments:[
                            {
                                dataType: "Int32",
                                value: produkt.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value
                            },{
                                arrayType: opcua.VariantArrayType.Array,
                                valueRank:1,
                                dataType: "String",
                                value: plcToSend
                            }
                        ]
                    },function(err, response){
                        if(!err){
                            markCurrentCapabilityAsDone(produkt, response);                        
                            callback();
                        }else{
                            console.log(err);
                        }
                    })
                },  
                function(callback){
                    orderSession.close(function(err){
                        if (err){
                            console.log(err);
                        }
                    });
                    orderClient.disconnect();
                    callback();
                }
            ]);
        }

        //Hilfsmethodik, die den nächsten Schritt im PLC auf done setzt & den ProduktStatus wieder auf "WAITING".
        //@param: Produkt
        function markCurrentCapabilityAsDone(produkt,response){
            var maschineFinishedOn = response.outputArguments[0].value
            produkt.getComponentByName("Body").getComponentByName("ProduktStatus").writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "String",value:productstat.READY}),statusCode: opcua.StatusCodes.Good}),function(err){});
            var aktCap = getCurrentCapability(produkt);
            var finished = aktCap.getPropertyByName("finished");
            finished.writeValue(new opcua.SessionContext({server: server}), new opcua.DataValue({value: new opcua.Variant({dataType: "Boolean",value:true}),statusCode: opcua.StatusCodes.Good}),function(err){});
            console.log(aktCap.browseName.toString()+ " von Produkt"+produkt.getComponentByName("Header").getComponentByName("Produktnummer").readValue().value.value+ " ist fertig");
            var finishedOn = addressSpace.addVariable({
                propertyOf: finished,
                browseName: "finishedOn",
                dataType: "String",
                value:{
                    get: function(){
                        return new opcua.Variant({dataType: "String",value: maschineFinishedOn});
                    }
                }
            });
            //TODO: Evtl timestamps.
            //Referenz zum neuen übergeordneten Produkt
            var productNumberHigherProduct = response.outputArguments[1].value
            if (productNumberHigherProduct!= 0){
                var nodeIdhigherProdukt = "ns=2;s=Produkt"+productNumberHigherProduct;
                produkt.addReference({referenceType: "ComponentOf",nodeId: nodeIdhigherProdukt});
                //Entfernen der Referenz zum Auftragsordner
                var referenceToDelete = produkt.findReference("Organizes",false);
                produkt.removeReference(referenceToDelete);
            }
        }

        //Hilfsmethode, die ein REQUEST an eine Maschine stellt ob entsprechendes Teil produziert werden kann
        //@param: produkt, maschine, callback(response)
        function requestProduction(produkt, maschine, fn){
            var endpointToConnect = maschine.getComponentByName("Header").getPropertyByName("Adresse").readValue().value.value;
            var requestClient = new opcua.OPCUAClient();
            var requestSession;
            var aktCap = getCurrentCapability(produkt);
            async.series([
                function(callback){
                    requestClient.connect(endpointToConnect,function(err){
                        if(!err){                            
                            callback();
                        }else{
                            console.log(err);
                        }
                    })
                },
                function(callback){
                    requestClient.createSession(function(err,session){
                        if(!err){                                        
                            requestSession = session;
                            callback();
                        }else{
                            console.log(err);
                        }
                    })
                },
                function(callback){
                    requestSession.call({
                        objectId: "ns=2;s=Manifest",
                        methodId: "ns=2;s=ManifestPort",
                        inputArguments:[{
                            name: "Header",
                            dataType: "String",
                            value: msgspec.Header.REQUEST
                        },{
                            name: "Type",
                            dataType: "String",
                            value: aktCap.browseName.toString()
                        },{
                            name: "Content",
                            dataType: "String",
                            value: produkt.getComponentByName("Header").getComponentByName("ProduktTyp").readValue().value.value
                        }]
                    },function(err,result){
                        if(!err){                            
                            fn(result);
                            callback();
                        }
                    });
                },  
                function(callback){
                    requestSession.close(function(err){
                        if (err){
                            console.log(err);
                        }
                    });
                    requestClient.disconnect();
                    callback();
                }
            ]);
        }
        

        
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

            
            var nodeToBeDeleted = Geraeteordner.getFolderElements().filter(element => endpointToDelete === element.getComponentByName("Header").getPropertyByName("Adresse").readValue().value.value)[0];
            //Löschen der Referenzen der einzelnen Produkte zu der Maschine --> Klappt iwie nicht automatisch
            var nodeIdNodeToBeDeleted = nodeToBeDeleted.nodeId.toString();
            Auftragsordner.getFolderElements().forEach(function(auftrag){
                var zugeProdArray = auftrag.getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements();
                zugeProdArray.forEach(function(product){
                    var capArrays = product.getComponentByName("Body").getComponentByName("ProductLifecycle").getComponents();
                    capArrays.forEach(function(cap){
                        var refArray = cap.findReferences("Organizes", true);
                        if (refArray.map(r => r.nodeId.toString()).includes(nodeIdNodeToBeDeleted)){
                            var refToDelete = refArray.filter(r=> r.nodeId.toString()=== nodeIdNodeToBeDeleted)[0]
                            cap.removeReference(refToDelete);
                        }
                    })
                })
            });
            //Löschen des OPCUA-Objects
            addressSpace.deleteNode(nodeToBeDeleted);
            //Capabilities entfernen
            removeCapabilities();
            //Check ob die Production auf dem Gerät abgeschlossen ist
            var deviceProductionfinished = ((deviceOutputA >= deviceGoalA) && (deviceOutputB >= deviceGoalB) && (deviceOutputC >= deviceGoalC));
            if(deviceProductionfinished){

            }else{
                //Check ob der Aktuelle Auftrag noch bearbeitet werden kann
                if(checkCapabilitesCurrentOrderMatch()){
                    //Hinzufügen der liegengelassenen Produkte auf die verbleibenden Geräte durch erneutes Aufrufen der startProductionFunktion
                    startProduction.execute([],new opcua.SessionContext(),function(err,result){
                        if(err){
                            console.log("Error during restarting Production with additional Productquantities: "+err);
                        }
                    })
                }else{

                }
            }
            //console.log(Auftragsordner.getFolderElements()[0].getComponentByName("Body").getComponentByName("Zugehoerige Produkte").getFolderElements()[0].getComponentByName("Body").getComponentByName("ProductLifecycle").getComponentByName("Producing").getFolderElements());
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

//***** Methoden um Inputprodukte zu Erstellen
        
        var AddInputProductAMethod = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            browseName: "AddInputProductAMethod",
            inputArguments:[
                {
                    name: "CapabilityToAdd",
                    dataType: "String"
                }
            ],
            outputArguments:[]
        })

        AddInputProductAMethod.addReference({referenceType: "OrganizedBy",nodeId: AddInputProductA});

        AddInputProductAMethod.bindMethod(function(inputArguments,context, callback){
            console.log("AddInputProductA called");
            var currAuftrag = addressSpace.findNode(getCurrentAuftrag());
            var createdProduct = createProduct(currAuftrag,producttypes.A,[capabilities.PRODUCING,inputArguments[0].value]);
            callback();

        });

        var AddInputProductBMethod = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            browseName: "AddInputProductBMethod",
            inputArguments:[
                {
                    name: "CapabilityToAdd",
                    dataType: "String"
                }
            ],
            outputArguments:[]
        })

        AddInputProductBMethod.addReference({referenceType: "OrganizedBy",nodeId: AddInputProductB});

        AddInputProductBMethod.bindMethod(function(inputArguments,context, callback){
            console.log("AddInputProductB called");
            var currAuftrag = addressSpace.findNode(getCurrentAuftrag());
            var createdProduct = createProduct(currAuftrag,producttypes.B,[capabilities.PRODUCING,inputArguments[0].value]);
            callback();

        });

        var AddInputProductCMethod = addressSpace.addMethod(Fabrik.getComponentByName("Body"),{
            modellingRule: "Mandatory",
            browseName: "AddInputProductCMethod",
            inputArguments:[
                {
                    name: "CapabilityToAdd",
                    dataType: "String"
                }
            ],
            outputArguments:[]
        })

        AddInputProductCMethod.addReference({referenceType: "OrganizedBy",nodeId: AddInputProductC});

        AddInputProductCMethod.bindMethod(function(inputArguments,context, callback){
            var currAuftrag = addressSpace.findNode(getCurrentAuftrag());
            var createdProduct = createProduct(currAuftrag,producttypes.C,[capabilities.PRODUCING,inputArguments[0].value]);
            callback();
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