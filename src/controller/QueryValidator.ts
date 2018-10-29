import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isArray, isNumber} from "util";
import InsightFacade from "./InsightFacade";
import ProcessQuery from "./ProcessQuery";
import {validate} from "jsonschema";

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
        if (query === null || query === undefined || (Object.keys(query).length > 3) ||
            (Object.keys(query).length <= 1) || Object.keys(query).length <= 0) {
            return false;
        }

        // ((!query.hasOwnProperty("WHERE")) && storedDataSets.get(this.getQueryID()).length > 5000) {
        if (Object.keys(query).length === 2) {
            if ((!query.hasOwnProperty("WHERE"))) {
                return false;
            }

            if (!query.hasOwnProperty("OPTIONS")) {
                return false;
            }
        }
        if (Object.keys(query).length === 3) {
            if ((!query.hasOwnProperty("WHERE"))) {
                return false;
            }

            if (!query.hasOwnProperty("OPTIONS")) {
                return false;
            }
            if (!query.hasOwnProperty("TRANSFORMATIONS")) {
                return false;
            }
        }

        // ensures options has columns
        if (!query["OPTIONS"].hasOwnProperty("COLUMNS")) {
            return false;
        }

        if (query.hasOwnProperty("TRANSFORMATIONS")) {
            if (query["TRANSFORMATIONS"] === null || query["TRANSFORMATIONS"] === undefined) {
                return false;
            } else {
                if (!(this.validateTransformation(query["TRANSFORMATIONS"]))) {
                    return false;
                }
                if (!(this.isAPPLYValid(query))) {
                    return false;
                }
            }
        }

        // ensures columns is valid
        if (!this.isColumnsValid(query)) {
            return false;
        }
        // ensures order is valid if included
        if (!this.isOrderValid(query)) {
            return false;
        }

        // check that everything from same dataset
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

    public isInGROUP(queryGROUP: any, name: string) {
        for (let i of queryGROUP) {
            if (i === name) {
                return true;
            }
        }
        return false;
    }

    public isInAPPLY(queryAPPLY: any, name: string) {
        for (let i of queryAPPLY) {
            for (let j of Object.keys(i)) {
                if (j === name) {
                    return true;
                }
            }
        }
        return false;
    }

    public confirmALLColumnIDs(query: any): boolean {
        let datasetIds: string[] = [];
        // let datasetId = ;
        if (query["OPTIONS"]["COLUMNS"]) {
            let columns = query["OPTIONS"]["COLUMNS"];
            for (let i of columns) {
                if (i.includes("_")) { // else it's an applykey
                    let id = i.split("_")[0];
                    datasetIds.push(id);
                    this.queryDatasetIDs.push(id);
                }
            }
            return datasetIds.every((x) => x === datasetIds[0]);
        }
    }

    // check that each filter and each filter information type (ie avg, dept); recurse in AND/OR are valid
    public isQueryFilterValid(where: any): boolean {
        let CRNumberKey: any = ["avg",  "pass", "fail" , "audit", "year", "lat", "lon", "seats"];
        let CRStringKey: any = ["dept", "id", "title", "uuid", "instructor", "fullname", "shortname",
            "number", "name", "type", "furniture", "href", "address"];
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
            if (!CRNumberKey.includes(key[1])) {
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
            if (!CRNumberKey.includes(key[1])) {
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
            if (!CRNumberKey.includes(key[1])) {
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
            if (!CRStringKey.includes(key[1])) {
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
        let validKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid", "year",
        "fullname", "shortname", "number", "name", "type", "furniture", "href", "lat", "lon", "seats", "address"];

        let potentialApplyKeys = [];
        let approvedValidKeys = [];
        // ensures columns not empty
        try {
            if (query["OPTIONS"]["COLUMNS"].length <= 0) {
                return false;
            }
            // ensures columns only has valid keys
            for (let key of query["OPTIONS"]["COLUMNS"]) {
                if (key.indexOf("_") < 0) {
                    // if it doesn't have an underscore it could be an applykey
                    // save to an array to check if they're in TRANSFORM later
                    if (!query["TRANSFORMATIONS"]["GROUP"]) {
                        return false;
                    } else {
                        potentialApplyKeys.push(key);
                    }
                } else {
                    let checkValidKey = key.split("_")[1];
                    if (!(validKeys.includes(checkValidKey))) {
                        return false;
                    } else {
                        approvedValidKeys.push(key);
                    }
                }
            }
            if (query["TRANSFORMATIONS"] && query["TRANSFORMATIONS"]["GROUP"]) {
                if (!(this.validateColumnKeysInGroupOrApply(query, approvedValidKeys, potentialApplyKeys))) {
                    return false;
                }
            }
        } catch (e) {
            throw new InsightError(e);
        }
        return true;
    }

    private validateColumnKeysInGroupOrApply(query: any, approvedValidKeys: any[], potentialApplyKeys: any[]) {
        let APPLY = query["TRANSFORMATIONS"]["APPLY"];
        let GROUP = query["TRANSFORMATIONS"]["GROUP"];
        let COLUMNS = query["OPTIONS"]["COLUMNS"];

        let applyKeyArray: string[] = [];

        for (let object of APPLY) {
            let applykey: any = Object.keys(object)[0];
            applyKeyArray.push(applykey);
        }
        for (let c of COLUMNS) {
            if (!(applyKeyArray.includes(c))) {
                if (!(GROUP.includes(c))) {
                    return false;
                }
            }
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
            // old version key was a string. validate.
            if (typeof query["OPTIONS"]["ORDER"] === "string") {
                let orderKey = query["OPTIONS"]["ORDER"];

                if (!query["OPTIONS"]["COLUMNS"].includes(orderKey)) {
                    return false;
                }
            }

            // expanded: ORDER has 2 objects (dir and key).
            if (typeof query["OPTIONS"]["ORDER"] === "object") {
                if ((Object.keys(query["OPTIONS"]).length === 2 )) {
                    if ((Object.keys(query["OPTIONS"]["ORDER"].hasOwnProperty("dir"))) &&
                        (Object.keys(query["OPTIONS"]["ORDER"].hasOwnProperty("keys")))) {

                        // keys must be an array
                        if (!isArray(query["OPTIONS"]["ORDER"]["keys"])) {
                            return false;
                        }
                        let direction: string = query["OPTIONS"]["ORDER"]["dir"];
                        let ORDERKeysArray: string [] = query["OPTIONS"]["ORDER"]["keys"]; // can have multiple

                        // confirm that dir is UP or DOWN, nothing else
                        if (!((direction === "UP") || (direction === "DOWN"))) {
                            return false;
                        }

                        for (let key in ORDERKeysArray) {
                            // confirm keys || applykeys are in COLUMNS
                            let keyObject = ORDERKeysArray[key];
                            if (query["OPTIONS"]["COLUMNS"].indexOf(keyObject) < 0) {
                                return false; // key in ORDER not in COLUMNS
                            }
                        }
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }

        return true;
    }
    public getQueryID() {
        if (this.queryDatasetIDs.every((x) => x === this.queryDatasetIDs[0])) {
            return this.queryDatasetIDs[0];
        }
    }

    private validateTransformation(transform: any) {
        // its OK if a query has neither GROUP nor APPLY
        if (!transform.hasOwnProperty("GROUP") || !transform.hasOwnProperty("APPLY")) {
            return false;
        }

        // neither GROUP nor APPLY can be empty/null/undefined
        if (transform["GROUP"] === null || transform["APPLY"] === null) {
                return false;
            }
        if (transform["GROUP"] === undefined || transform["APPLY"] === undefined) {
                return false;
            }
        if ((transform["GROUP"]).length <= 0 || (transform["APPLY"]).length <= 0 ) {
               return false;
            }
            /*
        if (!(typeof transform["GROUP"] === "string" && "array")) {
                    return false;
                }
        if (!(typeof transform["APPLY"] === "object" && "array")) {
                    return false;
                }
            */

        return true;
    }

    private isAPPLYValid(query: any) {
        let CRNumberKey: any = ["avg",  "pass", "fail" , "audit", "year", "lat", "lon", "seats"];

        let applyKeyArray: string[] = [];

        let apply = query["TRANSFORMATIONS"]["APPLY"];
        for (let object of apply) {
            let applykey: any = Object.keys(object)[0];
            let APPLYTOKENandKey: any = object[applykey];
            let APPLYTOKEN: string = Object.keys(APPLYTOKENandKey)[0];
            let key: string = APPLYTOKENandKey[APPLYTOKEN];
            let keyType = key.split("_")[1];

            // TODO: no two APPLYRULEs can have the same applykey - must be unique
            // TODO: track all the applykeys used and see if previous APPLYRULE has used this applykey already
            if (applyKeyArray.includes(applykey)) {
                return false;
            } else {
                applyKeyArray.push(applykey);
            }

            // APPLY token can only be MAX/MIN/AVG/COUNT
            if (!(APPLYTOKEN === "MAX" ||
                    APPLYTOKEN === "MIN" ||
                    APPLYTOKEN === "AVG" ||
                    APPLYTOKEN === "COUNT" ||
                    APPLYTOKEN  === "SUM")) {
                return false;
            }

            /*
            // key must be in GROUP
            if (query["TRANSFORMATION"]["GROUP"].indexOf(key) < 0) {
                return false;
            }
            */

            // MIN/MAX/AVG must be on Number keys
            if (APPLYTOKEN === "MAX" ||
                APPLYTOKEN === "MIN" ||
                APPLYTOKEN === "AVG" ||
                APPLYTOKEN  === "SUM") {
                if (!(CRNumberKey.includes(keyType))) {
                    return false;
                }
            }

        }
        return true;
    }

}
