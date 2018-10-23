import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import DataSetHelper from "./DataSetHelper";
import QueryValidator from "./QueryValidator";
import ProcessQuery from "./ProcessQuery";
import {log} from "util";
import {resolve} from "url";

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

                        // TODO
                        const parse5 = require("parse5");

                        let index = await zipContent.file("index.htm").async("string");
                        // TODO: I don't know if this is right ^^

                        let document = parse5.parse(index);
                        let children = document.childNodes;

                        // tbody where building info
                        let tbody = context.gettbody(children);

                        // get building info from index
                        let buildings = this.makeBuilding(tbody);

                        // get rooms from document
                        let rooms = this.makeRooms(tbody);
                        let roomsObjects: any [] = [];

                        // combine to create final room objects
                        for (let b in buildings) {
                            // TODO: use building paths to get to room directories !!!!
                            for (let r in rooms) {
                                // final room object
                                const room: {[key: string]: any} = {
                                    // TODO: why does this hate me!!! I'm JUSY COMBINING THINGSSSS
                                    [id + "_fullname"]: b.fullname,
                                    [id + "_shortname"]: b.shortname,
                                    [id + "_number"]: r.number,
                                    [id + "_name"]: b.shortname + " " + r.number,
                                    [id + "_address"]: b.address,
                                    [id + "_lat"]: b.lat,
                                    [id + "_lon"]: b.lon,
                                    [id + "_seats"]: r.seats,
                                    [id + "_type"]: r.type,
                                    [id + "_furniture"]: r.furniture,
                                    [id + "_href"]: r.href
                                };
                                roomsObjects.push(room);
                            }
                        }

                    } else {
                        return reject(new InsightError("Missing Courses folder"));
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
                        let parsedCourse: object = DataSetHelper.parseOffering(tempOffering, id);
                        if (!(parsedCourse === null)) {
                            numRows++;
                            parsedOfferings.push(parsedCourse);
                        }
                    });
                    // this.fs.writeFileSync("./src/data" + id + ".json");
                    // is it already saved on disk (true if path exists)
                    if (!context.storedDataSets.has(id)) {
                        let data = fs.writeFileSync("./data/" + id + ".json");
                        context.storedDataSets.set(id, JSON.stringify(data));
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

    private makeRooms(tbody: any): any {
        let arrayOfRooms: any [] = [];
        for (let tr of tbody) {
            if (tr.nodeName === "tr") {
                let roomNumber: string;
                let roomCapacity: number;
                let roomFurniture: string;
                let roomType: string;
                let roomURL: string;
                for (let td of tr.childNodes) {
                    if (td.nodeName === "td") {
                        let roomProperty = td.attrs[0].value;

                        if (roomProperty === "views-field views-field-field-room-capacity") {
                            roomCapacity = td.childNodes[0].value;
                        }
                        if (roomProperty === "views-field views-field-field-room-furniture") {
                            roomFurniture = td.childNodes[0].value;
                        }
                        if (roomProperty === "views-field views-field-field-room-type") {
                            roomType = td.childNodes[0].value;
                        }
                        if (roomProperty === "views-field views-field-field-room-number") {
                            roomNumber = td.childNodes[1].attrs[1].value;
                        }
                        if (roomProperty === "views-field views-field-field-room-number" &&
                            roomProperty.name === "href") {
                            roomURL = td.childNodes[1].attrs[0].value;
                        }
                    }
                }
                const room: { [key: string]: any } = {
                    number: roomNumber,
                    seats: roomCapacity,
                    type: roomType,
                    furniture: roomFurniture,
                    href: roomURL
                };
                arrayOfRooms.push(room);
            }
        }
        return arrayOfRooms;
    }

    public makeBuilding(tbody: any): any {
        let arrayOfBuildings: any [] = [];
        for (let tr of tbody) {
            // get all the information from each tr section (each tr is a building)
            if (tr.nodeName === "tr") {
                let buildingCode: string;
                let buildingTitle: string;
                let buildingAddress: string;
                let buildingPath: string;

                // get all the information from each td
                // each td is <<potentially>> important information for a specific building
                for (let td of tr.childNodes) {
                    if (td.nodeName === "td") {
                        let buildingProperty = td.attrs[0].value;
                        if (buildingProperty === "views-field views-field-field-building-code") {
                            buildingCode = td.childNodes[0].value;
                        }
                        if (buildingProperty === "views-field views-field-field-building-address") {
                            buildingAddress = td.childNodes[0].value;
                        }
                        if (buildingProperty === "views-field views-field-title") {
                            buildingTitle = td.childNodes[1].attrs[1].value;
                        }
                        if (buildingProperty === "views-field views-field-title" &&
                            buildingProperty.name === "href") {
                            buildingPath = td.childNodes[1].attrs[0].value;
                        }
                    }
                }

                // below is getting the lat/lon from the server using the building address we just parsed
                let convertedAddress = buildingAddress.replace(" ", "%");
                let link = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_j0a0b_x3o0b/" + convertedAddress;

                let http = require("http");
                const coordinates = {lat: 0, lon: 0};

                // https://nodejs.org/api/http.html#http_http_get_options_callback
                // straight up copied this ^^ but replaced '' with "", added any, and made coord object with lat/lon
                http.get(link, (res: any) => {
                    const {statusCode} = res;
                    const contentType = res.headers["content-type"];

                    let error;

                    if (statusCode !== 200) {
                        error = new Error("Request Failed.\n" +
                            "Status Code: ${statusCode}");
                    } else if (!/^application\/json/.test(contentType)) {
                        error = new Error("Invalid content-type.\n" +
                            "Expected application/json");
                    }
                    if (error) {
                        res.resume();
                        return;
                    }

                    res.setEncoding("utf8");
                    let rawData = "";
                    res.on("data", (chunk: any) => { rawData += chunk; });
                    res.on("end", () => {
                        try {
                            const parsedData = JSON.parse(rawData); // this is the lat/lon
                            coordinates.lat = parsedData.lat;
                            coordinates.lon = parsedData.lon;
                        } catch (e) {
                            throw new Error("Geolocation server error");

                        }
                    });
                });

                // let's building this damn building object already
                const building: {[key: string]: any } = {
                    shortname: buildingCode,
                    address: buildingAddress,
                    fullname: buildingTitle,
                    link: buildingPath,
                    lat: coordinates.lat,
                    lon: coordinates.lon
                };

                arrayOfBuildings.push(building);
            }
        }
        return arrayOfBuildings;
    }

    public gettbody(children: any): any {
        let tbodyArray: any[] = [];
        for (let child of children) {
            if (!(child.childNodes === undefined) && (child.nodeName === "tbody")) {
                tbodyArray = child.childNodes;
                return child;
            } else { // undefined or not a tbody keep digging
                if (this.gettbody(child.childNodes)) {
                    return this.gettbody(child.childNodes);
                }
            }
        }

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
                    dataset = JSON.parse(JSON.stringify(context.storedDataSets.get(queryValidator.getQueryID())));
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
            if (!(ProcessQuery.result.length < 5000)) {
                return reject (new InsightError("Result is not < 5000"));
            }
            ProcessQuery.columnSort(ProcessQuery.result, validatedQuery);
            ProcessQuery.orderQuery(ProcessQuery.result, validatedQuery);
            return resolve(ProcessQuery.result);
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.metaData);
        // return Promise.reject("Not implemented.");
    }
}
