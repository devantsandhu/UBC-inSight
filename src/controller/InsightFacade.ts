import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import DataSetHelper from "./DataSetHelper";
import QueryValidator from "./QueryValidator";
import ProcessQuery from "./ProcessQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
let storedDataSets: Map<string, any> = new Map<string, any>();
let fs = require("fs");
let JSZip = require("jszip");
let metaData: InsightDataset[] = [];

export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        storedDataSets = new Map<string, any>();
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let coursePromises: Array<Promise<string>> = [];
        let parsedOfferings: object[] = [];
        let numRows: number = 0;
        return Promise.resolve()
            .then(() => {
                if (id === "") {
                    throw new InsightError("id can't be empty string");
                }
                if (storedDataSets.has(id)) {
                    throw new InsightError("id already in use");
                }
                // fs.readFile(content);
                // return JSZip.loadAsync(fs, {base64: true});
                // fs.readFile(JSZip);
                let zip = new JSZip();
                return zip.loadAsync(content, {base64: true});
            })
            .then((zipContent: any) => {
                if (kind === InsightDatasetKind.Courses) {
                    if (typeof zipContent === JSZip) {
                        throw new InsightError("test");
                    }
                    zipContent.folder("courses").forEach(function (coursePath: any) {
                        if (DataSetHelper.isJson(coursePath)) {
                            coursePromises.push(zipContent.folder("courses").file(coursePath).async("string"));
                        }
                    });
                } else {
                    throw new InsightError("Missing Courses folder");
                }
                if (coursePromises.length > 0) {
                    return Promise.all(coursePromises);
                } else { throw new InsightError("No courses"); }
            })
            .then((unzippedContent: any) => {
                let allOfferings: object[] = [];
                let course: {[key: string]: any};
                for (let file of unzippedContent) {
                    try {
                        course = JSON.parse(file);
                        if (course["result"].length >= 1) {
                            // testing
                            for (let offering of course["result"]) {
                                allOfferings.push(offering);
                            }
                        }
                    } catch (e) {
                        throw new InsightError(e);
                    }
                }
                return Promise.resolve(allOfferings);
            })
            .then((tempOfferings: any) => {
                tempOfferings.forEach( (tempOffering: any) => {
                    let parsedCourse: object = DataSetHelper.parseOffering(tempOffering);
                    if (!(parsedCourse === null)) {
                        numRows++;
                        parsedOfferings.push(parsedCourse);
                    }});
                // TODO save to Disk
            })
            .then(() => {
                storedDataSets.set(id, parsedOfferings);
                let tempInsightDataset: InsightDataset = {id, kind, numRows};
                metaData.push(tempInsightDataset);
                let keys = Array.from(storedDataSets.keys());
                return Promise.resolve(keys);
            }).catch();
        // return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.resolve()
            .then(() => {
                if (!(storedDataSets.has(id))) {
                    throw new NotFoundError("Dataset does not exist/ already removed");
                }
                if (storedDataSets.has(id)) {
                    storedDataSets.delete(id);
                    return Promise.resolve(id);
                }
                throw new InsightError("removeDataset did not complete for some reason");
            });
        // return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {

        let datasets: object[] = [];
        let allOfferings: any = []; // unfiltered offerings (BAD! CANNOT REtuRN ALL!!)
        let returnFilteredOfferings: any = []; // empty array to put offering objects that fit requirements
        let validatedQuery: any = null;
        try {
            validatedQuery = JSON.parse(JSON.stringify(query));
        } catch (err) {
            return new Promise(function (fulfill, reject) {
                throw new InsightError("Invalid query format -- not JSON");
            });
        }
        return Promise.resolve()
            .then(() => {
                if (QueryValidator.isQueryValid(validatedQuery)) {
                    returnFilteredOfferings = ProcessQuery.compareQueryToDataset(datasets, validatedQuery);
                    return Promise.resolve(returnFilteredOfferings);
                } else {
                    throw new InsightError("invalid query 130");
                }
            });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(metaData);
        // return Promise.reject("Not implemented.");
    }
}
