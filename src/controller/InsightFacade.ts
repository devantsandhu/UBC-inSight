import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import DataSetHelper from "./DataSetHelper";
import QueryValidator from "./QueryValidator";
import ProcessQuery from "./ProcessQuery";
import RoomHelper from "./RoomHelper";
// import {resolve} from "url";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

let fs = require("fs");
let JSZip = require("jszip");
// let metaData: InsightDataset[] = [];
export default class InsightFacade implements IInsightFacade {
    public storedDataSets: Map<string, any> = new Map<string, object[]>();
    private metaData: InsightDataset[] = [];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.storedDataSets = new Map<string, object[]>();
        this.metaData = [];

        fs = require("fs");
        JSZip = require("jszip");

        // need to store the datasets to data so ensure that a directory for that exists
        if (!fs.existsSync("./data/")) {
            fs.mkdirSync("./data");
        }
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // return Promise.reject("Not implemented.");
        let stringType = "A string";
        let coursePromises: Array<Promise<string>> = [];
        let parsedOfferings: object[] = [];
        let numRows: number = 0;
        let context = this;
        return new Promise(function (resolve, reject) {
            if (id === "" || id === null || id === undefined) {
                return reject (new InsightError("id can't be empty string"));
            }
            if (!((typeof id) === (typeof stringType))) {
                return reject (new InsightError("id must be string"));
            }
            if (context.storedDataSets.has(id)) {
                return reject (new InsightError("id already in use"));
            }
            if (!((typeof content) === (typeof stringType))) {
                return reject (new InsightError("content must be string"));
            }
            if (!((kind === InsightDatasetKind.Courses) || (kind === InsightDatasetKind.Rooms))) {
                return reject (new InsightError("kind is not valid"));
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
                .then(async (zipContent: any) => {
                    // gonna put room stuff in another class because I'm scared of promises
                    // let rachelHatesPromises = new RoomsHelper();

                    if (kind === InsightDatasetKind.Courses) {
                        if (typeof zipContent === JSZip) {
                            return reject(new InsightError("test"));
                        }
                        zipContent.folder("courses").forEach(function (coursePath: any, file: any) {
                            if (DataSetHelper.isJson(coursePath)) {
                                coursePromises.push(file.async("string"));
                            }
                        });
                        if (coursePromises.length > 0) {
                            return Promise.all(coursePromises);
                        } else {
                            return reject(new InsightError("No courses"));
                        }

                    } else if (kind === InsightDatasetKind.Rooms) {
                        // rachelHatesPromises.processZip(id, content);

                        let index = await zipContent.file("index.htm").async("string");

                        let roomsHelper: RoomHelper = new RoomHelper(id, index, zipContent);
                        await roomsHelper.test2();
                        await roomsHelper.test();
                        parsedOfferings = roomsHelper.roomsObjects;
                        numRows = roomsHelper.roomsObjects.length;
                        return roomsHelper.roomsObjects;

                    } else {
                        return reject(new InsightError("Missing Courses folder"));
                    }
                })
                .then((unzippedContent: any) => {
                    if (kind === InsightDatasetKind.Rooms) {
                        return unzippedContent;
                    }
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
                    if (kind === InsightDatasetKind.Courses) {
                        tempOfferings.forEach((tempOffering: any) => {
                            let parsedCourse: object = DataSetHelper.parseOffering(tempOffering, id);
                            if (!(parsedCourse === null)) {
                                numRows++;
                                parsedOfferings.push(parsedCourse);
                            }
                        });
                    }
                    // this.fs.writeFileSync("./src/data" + id + ".json");
                    // is it already saved on disk (true if path exists)
                    if (!context.storedDataSets.has(id)) {
                        fs.writeFileSync("./data/" + id + ".json", JSON.stringify(parsedOfferings));
                        context.storedDataSets.set(id, JSON.stringify(parsedOfferings));
                    }

                    return context.storedDataSets.keys();

                })
                .then(() => {
                    context.storedDataSets.set(id, parsedOfferings);
                    let tempInsightDataset: InsightDataset = {id, kind, numRows};
                    context.metaData.push(tempInsightDataset);
                    let keys = Array.from(context.storedDataSets.keys());
                    return resolve(keys);
                }).catch();
        });
    }

    public removeDataset(id: string): Promise<string> {
        let context = this;
        // return Promise.reject("Not implemented.");
        return new Promise(function (resolve, reject) {
            if (id === null || id === undefined || id === "") {
                return reject(new InsightError("removeDataset cannot remove null, undefined, or empty id"));
            }
            if (!(context.storedDataSets.has(id))) {
                return reject(new NotFoundError("Dataset does not exist/ already removed"));
            }
            if (context.storedDataSets.has(id)) {
                context.storedDataSets.delete(id);

                for (let dataSet of context.metaData) {
                    if (dataSet.id === id) {
                        let i = context.metaData.indexOf(dataSet);
                        context.metaData.splice(i, 1);
                    }
                }

                // remove from disk:
                if (fs.existsSync("./data/" + id + ".json")) {
                    fs.unlink("./data/" + id + ".json");
                }

                return resolve (Promise.resolve(id));
            }
        });
    }

    public performQuery(query: any): Promise <any[]> {
        const context = this;
        return new Promise(function (resolve, reject) {
            // let datasets: any = context.storedDataSets.get(QueryValidator.getQueryID());
            ProcessQuery.result = [];
            let queryValidator: QueryValidator = new QueryValidator(query);
            // let returnFilteredOfferings: any = []; // empty array to put offering objects that fit requirements
            let validatedQuery: any = null;
            try {
                validatedQuery = JSON.parse(JSON.stringify(query));
            } catch (err) {
                return reject (new InsightError("Invalid query format -- not JSON"));
            }
            if (queryValidator.isQueryValid(validatedQuery)) {
                // const dataset = context.storedDataSets.get(queryValidator.getQueryID());
                let dataset: any;
                try {
                    let id: any = queryValidator.getQueryID();
                    let d: any = [...context.storedDataSets.get(id)];
                    dataset = JSON.parse(JSON.stringify(d));
                } catch (e) {
                    return reject (new InsightError("Dataset does not exist"));
                }
                if (dataset === null || dataset === undefined) {
                    return reject (new InsightError("dataset for that query doesn't exist"));
                }
                if (Object.keys(validatedQuery["WHERE"]).length === 0) {
                    ProcessQuery.result = dataset;
                } else {
                    ProcessQuery.compareQueryToDataset(dataset, validatedQuery);
                }
            } else {
                return reject (new InsightError("invalid query"));
            }
            // no TRANSFORMATIONS? NO PROBLEM! Get outta here
            if (!query.hasOwnProperty("TRANSFORMATIONS")) {
                if (!(ProcessQuery.result.length < 5000)) {
                    return reject (new InsightError("Result is not < 5000"));
                } else {
                    ProcessQuery.columnSelection(ProcessQuery.result, validatedQuery);
                    ProcessQuery.orderQuery(ProcessQuery.result, validatedQuery);
                    return resolve(ProcessQuery.result);
                }
            } else {
                let TResult = ProcessQuery.transformHelper(ProcessQuery.result, validatedQuery);
                if (!(TResult.length < 5000)) {
                    return reject (new InsightError("Result is not < 5000"));
                } else {
                    ProcessQuery.columnSelection(TResult, validatedQuery);
                    ProcessQuery.orderQuery(TResult, validatedQuery);

                    return resolve(TResult);
                }
            }
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.metaData);
        // return Promise.reject("Not implemented.");
    }
}
