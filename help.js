var opcua = require("node-opcua");
var producttypes = require ('./producttypes.json');


module.exports ={
    calculate_normalized_value: function (value,lower_limit,upper_limit){
        if (value < lower_limit){
            return new opcua.Variant({dataType: "Int32", value: 1});
        }else if (value > upper_limit){
            return new opcua.Variant({dataType: "Int32", value: 3});
        }else{
            return new opcua.Variant({dataType: "Int32", value: 2});
        }
    },
    transformToTransportArray: function (arrayToBeTransformed){
        var numberOfArrays = arrayToBeTransformed.length;
        var lengthOfArrays = arrayToBeTransformed[0].length;
        var result = [numberOfArrays,lengthOfArrays];
        arrayToBeTransformed.forEach(function(element){
            element.forEach(function(deepElement){
                result.push(deepElement);
            });
        });
        return result;
    },
    transformToPPArray: function (arrayToBeTransformed){
        var result = [];
        for (var i = 1; i <= arrayToBeTransformed[0];i++){
            var deepArray = [];
            for(var j = 0; j < arrayToBeTransformed[1];j++){
                var index = j + i*arrayToBeTransformed[1];
                deepArray.push(arrayToBeTransformed[index]);
            }
            result.push(deepArray);
        }
        return result;
    },
    calaculateProductionTime: function(solution, productionpossibilities,mengeA,mengeB){
        var productsAPerTime = 0;
        var productsBPerTime = 0;
        console.log("ProductionPossibility [0][0][0] " +productionpossibilities[0][0][0]);
        for (var i=0; i<solution.length ; i++){
            if(productionpossibilities[i][solution[i]][0] !== 0){
                productsAPerTime+=1/(productionpossibilities[i][solution[i]][0]);    
            }
            if(productionpossibilities[i][solution[i]][1] !== 0){
                productsBPerTime+=1/(productionpossibilities[i][solution[i]][1]);    
            }
        }
        console.log("ProductsAperTime: "+productsAPerTime+" ProductsBperTime "+productsBPerTime)
        if(productsAPerTime === 0){
            timeA = Number.MAX_VALUE;
        }else{
            timeA = Math.ceil(mengeA/productsAPerTime);    
        }
        if (productsBPerTime === 0){
            timeB = Number.MAX_VALUE;  
        }else{
            timeB = Math.ceil(mengeB/productsBPerTime);
        }            
        return Math.max(timeA,timeB);
    },
    determineProductionProgramm: function(productionpossibilities, mengeA,mengeB){
        var bestSolution;
        if (productionpossibilities.length===2){
            bestSolution = [0,0];
            for(var i=0;i<productionpossibilities.length;i++){
                for(var j=0;i<productionpossibilities[i].length;j++){
                    if(this.calaculateProductionTime(bestSolution,productionpossibilities,mengeA,mengeB)>this.calaculateProductionTime([i,j],productionpossibilities,mengeA,mengeB)){
                        bestSolution = [i,j];
                    }
                }
            }
        }else{
            bestSolution = [0];
            console.log("Kosten BS 0: "+ this.calaculateProductionTime(bestSolution,productionpossibilities,mengeA,mengeB));
            console.log("Kosten BS 1: "+ this.calaculateProductionTime([1],productionpossibilities,mengeA,mengeB));
            for (var i = 0;i < productionpossibilities[0].length;i++){
                if (this.calaculateProductionTime(bestSolution,productionpossibilities,mengeA,mengeB)>this.calaculateProductionTime([i],productionpossibilities,mengeA,mengeB)){
                    bestSolution = [i];
                }
            }
        }
        return bestSolution;
    },
    transformFabrikPowerToLEDPower: function(fabrikPower){
        if(fabrikPower){
            return 0;
        }else{
            return 1;
        }
    }
    
}