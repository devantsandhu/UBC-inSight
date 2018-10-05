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
let storedDataSets: Map<string, any> = new Map<string, object[]>();
let fs = require("fs");
let JSZip = require("jszip");
let metaData: InsightDataset[] = [];

export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        storedDataSets = new Map<string, object[]>();
        metaData = [];
        fs = require("fs");
        JSZip = require("jszip");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // return Promise.reject("Not implemented.");
        let stringType = "A string";
        let coursePromises: Array<Promise<string>> = [];
        let parsedOfferings: object[] = [];
        let numRows: number = 0;
        return new Promise(function (resolve, reject) {
            if (id === "") {
                return reject (new InsightError("id can't be empty string"));
            }
            if (!((typeof id) === (typeof stringType))) {
                return reject (new InsightError("id must be string"));
            }
            if (storedDataSets.has(id)) {
                return reject (new InsightError("id already in use"));
            }
            if (!((typeof content) === (typeof stringType))) {
                return reject (new InsightError("content must be string"));
            }
            if (!(kind === InsightDatasetKind.Courses)) {
                return reject (new InsightError("kind is not Courses"));
            }
            // fs.readFile(content);
            // return JSZip.loadAsync(fs, {base64: true});
            // fs.readFile(JSZip);
            let zip = new JSZip();
            return zip.loadAsync(content, {base64: true})
                .then(function (result: any) {
                    return result;
                }).catch(function (error: any) {
                    return reject (new InsightError("non-zip/ corrupt file"));
                })
        .then((zipContent: any) => {
                if (kind === InsightDatasetKind.Courses) {
                    if (typeof zipContent === JSZip) {
                        return reject (new InsightError("test"));
                    }
                    zipContent.folder("courses").forEach(function (coursePath: any) {
                        if (DataSetHelper.isJson(coursePath)) {
                            coursePromises.push(zipContent.folder("courses").file(coursePath).async("string"));
                        }
                    });
                } else {
                    return reject (new InsightError("Missing Courses folder"));
                }
                if (coursePromises.length > 0) {
                    return Promise.all(coursePromises);
                } else {
                    return reject (new InsightError("No courses"));
                }
            })
                .then((unzippedContent: any) => {
                    let allOfferings: object[] = [];
                    let course: { [key: string]: any };
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
                            // throw new InsightError(e);
                        }
                    }
                    if (allOfferings.length < 1) {
                        return reject (new InsightError("Zero offerings in dataset"));
                    }
                    return allOfferings;
                })
                .then((tempOfferings: any) => {
                    tempOfferings.forEach((tempOffering: any) => {
                        let parsedCourse: object = DataSetHelper.parseOffering(tempOffering);
                        if (!(parsedCourse === null)) {
                            numRows++;
                            parsedOfferings.push(parsedCourse);
                        }
                    });
                    // TODO save to Disk
                })
                .then(() => {
                    storedDataSets.set(id, parsedOfferings);
                    let tempInsightDataset: InsightDataset = {id, kind, numRows};
                    metaData.push(tempInsightDataset);
                    let keys = Array.from(storedDataSets.keys());
                    return resolve(keys);
                }).catch();
        });
    }

    public removeDataset(id: string): Promise<string> {
        // return Promise.reject("Not implemented.");
        return new Promise(function (resolve, reject) {
            if (!(storedDataSets.has(id))) {
                return reject(new NotFoundError("Dataset does not exist/ already removed"));
            }
            if (storedDataSets.has(id)) {
                storedDataSets.delete(id);
                for (let dataSet of metaData) {
                    if (dataSet.id === id) {
                        let i = metaData.indexOf(dataSet);
                        metaData.splice(i, 1);
                    }
                }
                return resolve (Promise.resolve(id));
            } else {
                return reject(new InsightError("removeDataset did not complete for some reason"));
            }
        });
    }

    public performQuery(query: any): Promise <any[]> {
        return new Promise(function (resolve, reject) {
            let datasets: any = storedDataSets.get("courses");
            ProcessQuery.result = [];
            // let returnFilteredOfferings: any = []; // empty array to put offering objects that fit requirements
            let validatedQuery: any = null;
            try {
                validatedQuery = JSON.parse(JSON.stringify(query));
            } catch (err) {
                return reject (new InsightError("Invalid query format -- not JSON"));
            }
            if (QueryValidator.isQueryValid(validatedQuery)) {
                ProcessQuery.compareQueryToDataset(datasets, validatedQuery);
            } else {
                return reject (new InsightError("invalid query"));
            }
            ProcessQuery.columnSort(ProcessQuery.result, validatedQuery);
            ProcessQuery.orderQuery(ProcessQuery.result, validatedQuery);
            return resolve(ProcessQuery.result);
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(metaData);
        // return Promise.reject("Not implemented.");
    }
}
