import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
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
        if (query === null || query === undefined || query.length <= 0 ||  Object.keys(query).length <= 0) {
            return false;
        }

        if (!query.hasOwnProperty("WHERE")) {
            return false;
        }

        if (!query.hasOwnProperty("OPTIONS")) {
            return false;
         }

        // ensure all keys are for courses dataset
        // TODO: do they need to be courses or can they be named something else?
        let where: any  = query["WHERE"];
        let queryID = this.findFilterID(where);
        if (queryID !== "courses") {
            return false;
        } else {
            this.isQueryFilterValid(where);
        }

        // if its VERY broadly well-formed continue to the BODY and OPTIONS validation
        return true;
    }

    // OR IF CAN BE FROM DIFFERENT ids (ie doesn't have to be just courses:
    public static getQID(query: any): string {
        return query["OPTIONS"]["COLUMNS"][0].split("_")[0];
    }

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
    }

    // check that each filter and each filter information type (ie avg, dept); recurse in AND/OR are valid
    private static isQueryFilterValid(where: any) {
        let courseNumberKey: any = ["avg",  "pass", "fail" , "audit", "year"];
        let courseStringKey: any = ["dept", "id", "title", "uuid", "instructor"];
        // check that if there is a MCOMPARATOR, SCOMPARATOR, or LOGIC  key it's followed by a key

        if (Object.keys(where).length <= 0) {
            return false;
        } else if ("LT" in where) {
            const f = where["LT"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = f.key;
            if (!courseNumberKey.hasOwnProperty(infoType)) {
                return false;
            }
        } else if ("GT" in where) {
            const f = where["GT"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = f.key;
            if (!courseNumberKey.hasOwnProperty(infoType)) {
                return false;
            }
        } else if ("EQ" in where) {
            const f = where["EQ"];
            const value = Object.values(f)[0];
            if (value == null || value === undefined || !isNumber(value)) {
                return false;
            }
            let infoType = f.key;
            if (!courseNumberKey.hasOwnProperty(infoType)) {
                return false;
            }
        } else if ("IS" in where) {
            const f = where["IS"];
            const input = Object.values(f)[0];
            if (input == null || input === undefined) {
                return false;
            }
            let infoType = f.key;
            if (!courseStringKey.hasOwnProperty(infoType)) {
                return false;
            }
            if ((input === "*") || (input === "**")) {
                // TODO: ahhhhh wildcards!
                return true;
            }
        } else if ("AND" in where) {
            const and = where["AND"];
            if ((and.length <= 0) || (this.findFilterID(and) === false)) {
                return false;
            }
        } else if ("OR" in where) {
            const or = where["OR"];
            if ((or.length <= 0) || (this.findFilterID(or) === false)) {
                return false;
            }
        } else if ("NOT" in where) {
            const not = where["NOT"];
            if ((not.length <= 0) || (this.findFilterID(not) === false)) {
                return false;
            }
        }
    }

}
