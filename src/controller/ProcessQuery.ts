import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isNumber} from "util";
import DataSetHelper from "./DataSetHelper";
import InsightFacade from "./InsightFacade";
import QueryValidator from "./QueryValidator";

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

        let offeringsCount = 0;

        let filter = query["WHERE"];

        // recursive, same as validation
        return this.comparatorProcess(filter, allOfferings);

    }

    private static comparatorProcess(filter: any, allOfferings: any): any[] {
        const comparatorType = Object.keys(filter)[0]; // GT/LT/EQ/IS/AND/NOT

        if (comparatorType.length <= 1) {
            throw new InsightError("Invalid query");
        }

        // TODO: this is WRONG must be instantiated elsewhere
        let offeringsCount = 0;

        if (comparatorType === "LT") {
            try {
                const comparatorIDKKeyValue = filter[comparatorType]; // id_key = value
                const comparatorIDKKey = Object.keys(comparatorIDKKeyValue)[0]; // id_key
                const comparatorValue = comparatorIDKKeyValue[comparatorIDKKey]; // value
                if (!isNumber(comparatorValue)) {
                    throw new InsightError("LT: was not given a number");
                }
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
                if (!isNumber(comparatorValue)) {
                    throw new InsightError("GT: was not given a number");
                }
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
                if (!isNumber(comparatorValue)) {
                    throw new InsightError("EQ: was not given a number");
                }
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
            // legit kill me

        } else if (comparatorType === "AND") {
            // ahhh howwww

        } else if (comparatorType === "OR") {
            // ahhh howwww

        } else if (comparatorType === "IS") {
            // might be working!
            try {
                const comparatorIDKeyValue = filter[comparatorType];
                const comparatorIDKey = Object.keys(comparatorIDKeyValue)[0];
                const comparatorValue = comparatorIDKeyValue[comparatorIDKey];
                if (isNumber(comparatorValue) || comparatorValue === "") {
                    throw new InsightError("IS: was not given a string");
                }

                for (let offering of allOfferings) {
                    if (offering[comparatorIDKey] === comparatorValue) {
                        this.result.push(offering);
                        offeringsCount++;
                    }
                }
            } catch (e) {
                throw new InsightError(e);
            }
        }

        if ((offeringsCount > 5000) || this.result.length > 5000) {
            throw new InsightError("too big");
        }
        // this.result.sort(function (a, b) {return a["courses_avg"] - b["courses_avg"]; });
        return this.result;
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
