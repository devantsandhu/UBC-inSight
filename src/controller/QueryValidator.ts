import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {isNumber} from "util";
import InsightFacade from "./InsightFacade";

export default class QueryValidator {
    private insight: InsightFacade;
    private insightFacade: InsightFacade;

    // private courseNumberKey: any = ["avg",  "pass", "fail" , "audit", "year"];
    // private courseStringKey: any = ["dept", "id", "title", "uuid", "instructor"];

    constructor(facade: InsightFacade) {
        this.insight = facade;
    }

    // if there's no query (null/undefined) and basic malformation check of WHERE and COLUMNS
    // TODO: any other basic malformed things to check?

    public static isQueryValid(query: any): boolean {
        if (query === null || query === undefined || !(Object.keys(query).length === 2) ||
            Object.keys(query).length <= 0) {
            return false;
        }

        if (!query.hasOwnProperty("WHERE")) {
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
        // ensure all keys are for courses dataset
        // TODO: do they need to be courses or can they be named something else?
        // let where: any  = query["WHERE"];
        // let queryID = this.findFilterID(where);
        // if (queryID !== "courses") {
        //     return false;
        // } else {
        //     this.isQueryFilterValid(where);
        // }
        if (Object.keys(query["WHERE"]).length !== 0) {
            if (!this.isQueryFilterValid(query["WHERE"])) {
                return false;
            }
        }
        return true;
    }

    // OR IF CAN BE FROM DIFFERENT ids (ie doesn't have to be just courses:
    public static getQID(query: any): string {
        return query["OPTIONS"]["COLUMNS"][0].split("_")[0];
    }
    /*
    // either get S/MCOMPARATOR or iterate through LOGIC
    // ensure that we're doing courses/ 1 dataset at a time
    public static findFilterID(filter: any): any {
        let filterID = "";
        if ("LT" in filter) {
            const f = filter["LT"];
            const key = Object.keys(f)[0];
            const index = key.indexOf("_");
            filterID = key.substring(0, index);
        } else if ("GT" in filter) {
            const f = filter["GT"];
            const key = Object.keys(f)[0];
            const index = key.indexOf("_");
            filterID = key.substring(0, index);
        } else if ("EQ" in filter) {
            const f = filter["EQ"];
            const key = Object.keys(f)[0];
            const index = key.indexOf("_");
            filterID = key.substring(0, index);
        } else if ("IS" in filter) {
            const f = filter["IS"];
            const key = Object.keys(f)[0];
            const index = key.indexOf("_");
            filterID = key.substring(0, index);
        } else if ("AND" in filter) {
            const and = filter["AND"];
            filterID = this.findFilterID(and);
        } else if ("OR" in filter) {
            const or = filter["OR"];
            filterID = this.findFilterID(or);
        } else if ("NOT" in filter) {
            const not = filter["NOT"];
            filterID = this.findFilterID(not);
        }
        return filterID;
    }*/
    // check that each filter and each filter information type (ie avg, dept); recurse in AND/OR are valid
    public static isQueryFilterValid(where: any): boolean {
        let courseNumberKey: any = ["avg",  "pass", "fail" , "audit", "year"];
        let courseStringKey: any = ["dept", "id", "title", "uuid", "instructor"];
        // check that if there is a MCOMPARATOR, SCOMPARATOR, or LOGIC  key it's followed by a key

        if (Object.keys(where).length !== 1) {
            return false;
        } else if ("LT" in where) {
            const f = where["LT"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = Object.keys(f)[0];
            let key = infoType.split("_");
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
            if (!courseNumberKey.includes(key[1])) {
                return false;
            }
            return true;
        } else if ("IS" in where) {
            const f = where["IS"];
            const input = Object.values(f)[0];
            if (input == null || input === undefined || isNumber(input)) {
                return false;
            }
            let infoType = Object.keys(f)[0];
            let key = infoType.split("_");
            if (!courseStringKey.includes(key[1])) {
                return false;
            }
            // TODO wildcards
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
    private static isColumnsValid(query: any) {
        let validKeys = ["courses_dept",
            "courses_id",
            "courses_avg",
            "courses_instructor",
            "courses_title",
            "courses_pass",
            "courses_fail",
            "courses_audit",
            "courses_uuid",
            "courses_year"];
        // ensures columns not empty
        try {
            if (query["OPTIONS"]["COLUMNS"].length <= 0) {
                return false;
            }
            // ensures columns only has valid keys
            for (let key of query["OPTIONS"]["COLUMNS"]) {
                if (!validKeys.includes(key)) {
                    return false;
                }
            }
        } catch (e) {
            throw new InsightError(e);
        }
        return true;
    }
    private static isOrderValid(query: any) {
        if (query["OPTIONS"].hasOwnProperty("ORDER")) {
            // ensures options only has 1 key
            if (Array.isArray(query["OPTIONS"]["ORDER"])) {
                return false;
            }
            // ensures order key is included in columns
            let orderKey = query["OPTIONS"]["ORDER"];
            if (!query["OPTIONS"]["COLUMNS"].includes(orderKey)) {
                return false;
            }
        }
        return true;
    }
}
