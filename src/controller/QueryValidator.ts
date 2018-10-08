import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isNumber} from "util";
import InsightFacade from "./InsightFacade";
import ProcessQuery from "./ProcessQuery";

export default class QueryValidator {
    private insight: InsightFacade;
    private insightFacade: InsightFacade;
    private queryDatasetIDs: string [] = [];

    // private courseNumberKey: any = ["avg",  "pass", "fail" , "audit", "year"];
    // private courseStringKey: any = ["dept", "id", "title", "uuid", "instructor"];

    constructor(facade: InsightFacade) {
         // this.insight = facade;
    }

    // if there's no query (null/undefined) and basic malformation check of WHERE and COLUMNS

    public isQueryValid(query: any): boolean {
        // let queryDatasetIDs: string[] = [];
        if (query === null || query === undefined || (Object.keys(query).length > 2) ||
            Object.keys(query).length <= 0) {
            return false;
        }

        // TODO Void test (can support queries without WHERE on small datasets) (need to get datasets into QV)
        // ((!query.hasOwnProperty("WHERE")) && storedDataSets.get(this.getQueryID()).length > 5000) {
        if ((!query.hasOwnProperty("WHERE"))) {
            return false;
        }

        if (!query.hasOwnProperty("OPTIONS")) {
            return false;
        }

        // ensures options has columns
        if (!query["OPTIONS"].hasOwnProperty("COLUMNS")) {
            return false;
        }
        // ensures columns is valid
        if (!this.isColumnsValid(query)) {
            return false;
        }
        // ensures order is valid if included
        if (!this.isOrderValid(query)) {
            return false;
        }

        // if (!this.confirmALLWhereIDs(query)) {
        //    return false;
        // }

        if (!this.confirmALLColumnIDs(query)) {
            return false;
        }
        if (Object.keys(query["WHERE"]).length !== 0) {
            // let queryDatasetIDs: string[] = [];
            if (!this.isQueryFilterValid(query["WHERE"])) {
                return false;
            }
        }
        return true;
    }

    /*
    // OR IF CAN BE FROM DIFFERENT ids (ie doesn't have to be just courses:
    public static confirmALLWhereIDs(query: any): boolean {
        let datasetIds: string[] = [];
        // let datasetId = ;
        if (query && query["WHERE"]) {
            let check = query["WHERE"];
            for (let i of check) {
                if (i.includes("_")) {
                    let id = i.split("_")[0];
                    datasetIds.push(id);
                }
                i++;
            }
            return datasetIds.every((x) => x === datasetIds[0]);
        }
    }
    */

    public confirmALLColumnIDs(query: any): boolean {
        let datasetIds: string[] = [];
        // let datasetId = ;
        if (query["OPTIONS"]["COLUMNS"]) {
            let columns = query["OPTIONS"]["COLUMNS"];
            for (let i of columns) {
                if (i.includes("_")) {
                    let id = i.split("_")[0];
                    datasetIds.push(id);
                }
                i++;
            }
            return datasetIds.every((x) => x === datasetIds[0]);
        }
    }

    // check that each filter and each filter information type (ie avg, dept); recurse in AND/OR are valid
    public isQueryFilterValid(where: any): boolean {
        let courseNumberKey: any = ["avg",  "pass", "fail" , "audit", "year"];
        let courseStringKey: any = ["dept", "id", "title", "uuid", "instructor"];
        // check that if there is a MCOMPARATOR, SCOMPARATOR, or LOGIC  key it's followed by a key

        if (this.queryDatasetIDs.length > 1) {
            if (!this.queryDatasetIDs.every((x) => x === this.queryDatasetIDs[0])) {
                return false;
            }
        }

        if (Object.keys(where).length > 1) {
            return false;
        }  else if ("LT" in where) {
            const f = where["LT"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = Object.keys(f)[0];
            let key = infoType.split("_");
            let id = infoType.split("_")[0];
            this.queryDatasetIDs.push(id);
            if (!courseNumberKey.includes(key[1])) {
                return false;
            }
            return true;
        } else if ("GT" in where) {
            const f = where["GT"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = Object.keys(f)[0];
            let key = infoType.split("_");
            let id = infoType.split("_")[0];
            this.queryDatasetIDs.push(id);
            if (!courseNumberKey.includes(key[1])) {
                return false;
            }
            return true;
        } else if ("EQ" in where) {
            const f = where["EQ"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = Object.keys(f)[0];
            let key = infoType.split("_");
            let id = infoType.split("_")[0];
            this.queryDatasetIDs.push(id);
            if (!courseNumberKey.includes(key[1])) {
                return false;
            }
            return true;
        } else if ("IS" in where) {
            const f = where["IS"];
            const input = Object.values(f)[0];
            if (input == null || input === undefined) {
                return false;
            }
            let stringInput = input.toString();
            // Might not need

            let infoType = Object.keys(f)[0];
            let key = infoType.split("_");
            let id = infoType.split("_")[0];
            this.queryDatasetIDs.push(id);
            if (!courseStringKey.includes(key[1])) {
                return false;
            }
            if ((stringInput.endsWith("*") === false) &&
                (stringInput.startsWith("*") === false) &&
                (stringInput.indexOf("*") === true)) {
                throw new InsightError("cannot have * inside input");
            }
            return true;

        } else if ("AND" in where) {
            if (!Array.isArray(where["AND"])) {
                throw new InsightError("AND is not an array");
            }
            if (where["AND"].length < 1) {
                throw new InsightError("AND is empty");
            }
            for (let comp of where["AND"]) {
                if (!this.isQueryFilterValid(comp)) {
                    return false;
                }
            }
            return true;
        } else if ("OR" in where) {
            if (!Array.isArray(where["OR"])) {
                throw new InsightError("OR is not an array");
            }
            if (where["OR"].length < 1) {
                throw new InsightError("OR is empty");
            }
            for (let comp of where["OR"]) {
                if (!this.isQueryFilterValid(comp)) {
                    return false;
                }
            }
            return true;
        } else if ("NOT" in where) {
            return this.isQueryFilterValid(where["NOT"]);
        }
        return false;

    }
    private isColumnsValid(query: any) {
        let validKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year"];

        // ensures columns not empty
        try {
            if (query["OPTIONS"]["COLUMNS"].length <= 0) {
                return false;
            }
            // ensures columns only has valid keys
            for (let key of query["OPTIONS"]["COLUMNS"]) {
                if (key.indexOf("_") < 0) {
                    return false;
                } else if (validKeys.indexOf(key) >= 0) {
                    return false;
                }
            }
        } catch (e) {
            throw new InsightError(e);
        }
        return true;
    }
    private isOrderValid(query: any) {
        if (query["OPTIONS"].hasOwnProperty("ORDER")) {
            // ensures options only has 1 key/ not an array
            if (Array.isArray(query["OPTIONS"]["ORDER"])) {
                return false;
            }
            // ensures order key is included in columns
            let orderKey = query["OPTIONS"]["ORDER"];
            // if (orderKey === null || orderKey === undefined || orderKey === "" ) {
            //    return false;
            // }
            if (!query["OPTIONS"]["COLUMNS"].includes(orderKey)) {
                return false;
            }
        }
        return true;
    }
    public getQueryID() {
        if (this.queryDatasetIDs.every((x) => x === this.queryDatasetIDs[0])) {
            return this.queryDatasetIDs[0];
        }

    }
}
