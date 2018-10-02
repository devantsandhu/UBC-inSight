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
            const comparatorIDKKeyValue = filter[comparatorType]; // id_key = value
            const comparatorIDKKey = Object.keys(comparatorIDKKeyValue)[0]; // id_key
            const comparatorValue  = comparatorIDKKeyValue[comparatorIDKKey]; // value

            for (const offering of allOfferings) {
                if (offering[comparatorIDKKey] < comparatorValue) {
                    this.result.push(offering);
                    offeringsCount++;
                }
            }
        } else if (comparatorType === "GT") {
            const comparatorIDKeyValue = filter[comparatorType];
            const comparatorIDKey = Object.keys(comparatorIDKeyValue)[0];
            const comparatorValue  = comparatorIDKeyValue[comparatorIDKey];

            for (const offering of allOfferings) {
                if (offering[comparatorIDKey] > comparatorValue) {
                    this.result.push(offering);
                    offeringsCount++;
                }
            }

        } else if (comparatorType === "EQ") {
            const comparatorIDKeyValue = filter[comparatorType];
            const comparatorIDKey = Object.keys(comparatorIDKeyValue)[0];
            const comparatorValue  = comparatorIDKeyValue[comparatorIDKey];

            for (let offering of allOfferings) {
                if (offering[comparatorIDKey] === comparatorValue) {
                    this.result.push(offering);
                    offeringsCount++;
                }
            }
        } else if (comparatorType === "NOT") {
            // legit kill me

        } else if (comparatorType === "AND") {
            // ahhh howwww

        } else if (comparatorType === "OR") {
            // ahhh howwww

        } else if (comparatorType === "IS") {
            // ahhhhhhh
        }

        if ((offeringsCount > 5000) || this.result.length > 5000) {
            throw new InsightError("too big");
        }

        return this.result;
    }
}
