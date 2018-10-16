import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isNumber, log} from "util";
import DataSetHelper from "./DataSetHelper";
import InsightFacade from "./InsightFacade";
import QueryValidator from "./QueryValidator";

let offeringsCount = 0;
// let negation = false;
let unfilteredDataset: any[] = [];

export default class ProcessQuery {
    private insight: InsightFacade;
    public static result: any[] = [];

    public static compareQueryToDataset(dataset: any, query: any) {
        // must make sure that the queryID matches that of the dataset
        // const datasetID = dataset.id;
        // let qid = QueryValidator.getQID(query);
        // if (!(datasetID === qid)) {
        //    return false;
        // }

        let allOfferings = dataset; // unfiltered offerings
        unfilteredDataset = dataset;

        let filter = query["WHERE"];
        offeringsCount = 0;
        // negation = false;
        // recursive, same as validation
        this.comparatorProcess(filter, allOfferings);

    }

    private static comparatorProcess(filter: any, allOfferings: any) {
        const comparatorType = Object.keys(filter)[0]; // GT/LT/EQ/IS/AND/NOT
        let negation = false;
        /*
        if (comparatorType.length <= 1) {
            throw new InsightError("Invalid query");
        }
        */

        if (comparatorType === "LT") {
            try {
                const comparatorIDKKeyValue = filter[comparatorType]; // id_key = value
                const comparatorIDKKey = Object.keys(comparatorIDKKeyValue)[0]; // id_key
                const comparatorValue = comparatorIDKKeyValue[comparatorIDKKey]; // value
                /*if (!isNumber(comparatorValue)) {
                    throw new InsightError("LT: was not given a number");
                }*/
                for (const offering of allOfferings) {
                    if (offering[comparatorIDKKey] < comparatorValue) {
                        this.result.push(offering);
                        offeringsCount++;
                    }
                }
            } catch (e) {
                throw new InsightError(e);
            }
        } else if (comparatorType === "GT") {
            try {
                const comparatorIDKeyValue = filter[comparatorType];
                const comparatorIDKey = Object.keys(comparatorIDKeyValue)[0];
                const comparatorValue = comparatorIDKeyValue[comparatorIDKey];
                /*if (!isNumber(comparatorValue)) {
                    throw new InsightError("GT: was not given a number");
                }*/
                for (let offering of allOfferings) {
                    if (offering[comparatorIDKey] > comparatorValue) {
                        this.result.push(offering);
                        offeringsCount++;
                    }
                }
            } catch (e) {
                throw new InsightError(e);
            }
        } else if (comparatorType === "EQ") {
            try {
                const comparatorIDKeyValue = filter[comparatorType];
                const comparatorIDKey = Object.keys(comparatorIDKeyValue)[0];
                const comparatorValue = comparatorIDKeyValue[comparatorIDKey];
                /*if (!isNumber(comparatorValue)) {
                    throw new InsightError("EQ: was not given a number");
                }*/
                for (let offering of allOfferings) {
                    if (offering[comparatorIDKey] === comparatorValue) {
                        this.result.push(offering);
                        offeringsCount++;
                    }
                }
            } catch (e) {
                throw new InsightError(e);
            }
        } else if (comparatorType === "NOT") {
            if (negation) {
              negation = false;
            } else { negation = true; }
            ProcessQuery.comparatorProcess(filter["NOT"], allOfferings);
            // return;

        } else if (comparatorType === "AND") {
            for (let comp of filter["AND"]) {
                if (filter["AND"][0] === comp) {
                    ProcessQuery.comparatorProcess(comp, allOfferings);
                } else {
                    let tempResults = Array.from(this.result);
                    this.result = [];
                    ProcessQuery.comparatorProcess(comp, tempResults);
                }
            }
            return;
        } else if (comparatorType === "OR") {
            for (let comp of filter["OR"]) {
                if (filter["OR"][0] === comp) {
                    ProcessQuery.comparatorProcess(comp, allOfferings);
                } else {
                    let dontRepeat: any[] = [];
                    for (let offering of allOfferings) {
                        if (!(this.result.includes(offering))) {
                            dontRepeat.push(offering);
                            //       offeringsCount++;
                        }
                    }
                    ProcessQuery.comparatorProcess(comp, dontRepeat);
                }
            }

        } else if (comparatorType === "IS") {
            try {
                // bob* *bob *bob*
                const comparatorIDKeyValue = filter[comparatorType];
                const comparatorIDKey = Object.keys(comparatorIDKeyValue)[0];
                const comparatorValue = comparatorIDKeyValue[comparatorIDKey];
                let comparatorValueTrunc = "";
                let onlyWC = false;
                let bothEndsWC = false;
                let startWC = false;
                let endWC = false;
                let noWC = false;
                /*if (isNumber(comparatorValue) || comparatorValue === "") {
                    throw new InsightError("IS: was not given a string");
                }*/
                if (comparatorValue === "*") {
                    onlyWC = true;
                } else if (comparatorValue.startsWith("*")) {
                    if (comparatorValue.endsWith("*")) {
                        // both ends *xxx*
                        bothEndsWC = true;
                        comparatorValueTrunc = comparatorValue.substring(1, comparatorValue.length - 1);
                    } else {
                        // only starts *xxx
                        startWC = true;
                        comparatorValueTrunc = comparatorValue.substring(1, comparatorValue.length);
                    }
                } else if (comparatorValue.endsWith("*")) {
                    // only ends xxx*
                    endWC = true;
                    comparatorValueTrunc = comparatorValue.substring(0, comparatorValue.length - 1);
                }  else if ((comparatorValue.endsWith("*") === false)
                    && (comparatorValue.startsWith("*") === false)
                    && (comparatorValue.indexOf("*") > 0)) {
                    throw  new InsightError("cannot have * inside");
                } else {// no **
                    noWC = true;
                    comparatorValueTrunc = comparatorValue;
                }

                for (let offering of allOfferings) {
                    // let offeringLength = offering[comparatorIDKey].length;
                    if (offering === undefined || offering[comparatorIDKey] === undefined) {
                        // offering++;
                    } else if (onlyWC) {
                        this.result.push(offering);
                    } else if (noWC) {
                        if (offering[comparatorIDKey] === comparatorValueTrunc) {
                            this.result.push(offering);
                        }
                    } else if ((offering[comparatorIDKey].indexOf(comparatorValueTrunc) === 0) &&
                        ((endWC === true) || (noWC === true))) {
                        this.result.push(offering);
                        offeringsCount++;
                    } else if (startWC === true) {
                        let substringLength = comparatorValueTrunc.length;
                        let maxIndex = null;
                        for (let i = 1; i < offering[comparatorIDKey].length; i++) {
                            if (offering[comparatorIDKey].substring(i, i + substringLength) === comparatorValueTrunc) {
                                maxIndex = i;
                            }
                        }
                        if (maxIndex === (offering[comparatorIDKey].length - (comparatorValueTrunc.length))) {
                            this.result.push(offering);
                            offeringsCount++;
                        }

                        /*
                        (offering[comparatorIDKey].substring(
                        (offering[comparatorIDKey].length - comparatorValueTrunc.length),
                            offering[comparatorIDKey].length) === comparatorValueTrunc) && (startWC === true)) {
                        this.result.push(offering);
                        offeringsCount++;
                        */

                    } else if ((offering[comparatorIDKey].indexOf(comparatorValueTrunc) >= 0)
                        && (bothEndsWC === true)) {
                        this.result.push(offering);
                        offeringsCount++;
                    }
                }
            } catch (e) {
                throw new InsightError(e);
            }
        }
        // if (!negation) {
        //     if ((offeringsCount > 5000) || this.result.length > 5000) {
        //         throw new InsightError("too big");
        // }
        // }
        // this.result.sort(function (a, b) {return a["courses_avg"] - b["courses_avg"]; });
        if (negation) {
            // offeringsCount = 0;
            let negatedResult: any[] = [];
            for (let offering of allOfferings) {
                if (!(this.result.includes(offering))) {
                    negatedResult.push(offering);
                    //       offeringsCount++;
                }
            }
            // negation = false;
            /*
            if ((offeringsCount > 5000) || negatedResult.length > 5000) {
                throw new InsightError("too big");
            }*/
            this.result = negatedResult;
            // this.result = Array.from(negatedResult);
        }
    }

    // order the query given key if told to order
    public static orderQuery(result: any, query: any) {
        if (!query["OPTIONS"].hasOwnProperty("ORDER")) {
            return;
        }
        let orderKey = query["OPTIONS"]["ORDER"];
        result.sort(function (a: any, b: any) {
            if (a[orderKey] < b[orderKey]) {
                return -1;
            }
            if (a[orderKey] > b[orderKey]) {
                return 1;
            }
            return 0;
        });
    }

    // keep only specified columns in result
    public static columnSort(result: any, query: any) {
        let columnKeys = query["OPTIONS"]["COLUMNS"];
        for (let offering of result) {
            for (let key in offering) {
                if (offering.hasOwnProperty(key)) {
                    if (!columnKeys.includes(key)) {
                        delete offering[key];
                    }
                }
            }
        }
    }
}
