import Log from "../Util";
import {log} from "util";

export default class RoomHelper {
    private document: any;
    private tbody: any;
    private buildingsA: any;
    private id: "string";
    private roomsFolder: any;
    public roomsObjects: object[] = [];

    constructor(id: any, index: any, roomsFolder: any) {
        const parse5 = require("parse5");
        this.document = parse5.parse(index);
        // let root = document.childNodes;
        this.id = id;
        this.roomsFolder = roomsFolder;
        // tbody where building info
        // let tbody: any = [];
        this.tbody = this.gettbody(this.document);

        // get building info from index
        this.buildingsA = this.makeBuilding(this.tbody);

        // combine to create final room objects
    }

    public async test() {
        const parse5 = require("parse5");
        for (let b in this.buildingsA) {
            // each building has a path to get to its directory of room information
            let path = this.buildingsA[b].link;
            let correctPath = path.slice(2);
            // Log.trace(b);

            // let building =  fs.readFileSync(path);
            let building = await this.roomsFolder.file(correctPath).async("string");
            let roomHTML = parse5.parse(building);
            let Rtbody = this.gettbody(roomHTML);
            if (!(Rtbody === null)) {
                let rooms = this.makeRooms(Rtbody);

                // TODO: use building paths to get to room directories !!!!
                for (let r in rooms) {
                    // final room object
                    const room = {
                        // TODO: why does this hate me!!! I'm JUST COMBINING THINGSSSS
                        [this.id + "_fullname"]: this.buildingsA[b].fullname,
                        [this.id + "_shortname"]: this.buildingsA[b].shortname,
                        [this.id + "_number"]: rooms[r].number,
                        [this.id + "_name"]: this.buildingsA[b].shortname + " " + rooms[r].number,
                        [this.id + "_address"]: this.buildingsA[b].address,
                        [this.id + "_lat"]: this.buildingsA[b].lat,
                        [this.id + "_lon"]: this.buildingsA[b].lon,
                        [this.id + "_seats"]: rooms[r].seats,
                        [this.id + "_type"]: rooms[r].type,
                        [this.id + "_furniture"]: rooms[r].furniture,
                        [this.id + "_href"]: rooms[r].href
                    };
                    this.roomsObjects.push(room);
                }
            }
        }
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
                            roomCapacity = td.childNodes[0].value.trim();
                        }
                        if (roomProperty === "views-field views-field-field-room-furniture") {
                            roomFurniture = td.childNodes[0].value.trim();
                        }
                        if (roomProperty === "views-field views-field-field-room-type") {
                            roomType = td.childNodes[0].value.trim();
                        }
                        if (roomProperty === "views-field views-field-field-room-number") {
                            roomNumber = td.childNodes[1].childNodes[0].value.trim();
                        }
                        if (roomProperty === "views-field views-field-field-room-number" &&
                            td.childNodes[1].attrs[0].name === "href") {
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

    private makeBuilding(tbody: any): any[] {
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
                            buildingCode = td.childNodes[0].value.trim();
                        }
                        if (buildingProperty === "views-field views-field-field-building-address") {
                            buildingAddress = td.childNodes[0].value.trim();
                        }
                        if (buildingProperty === "views-field views-field-title") {
                            buildingTitle = td.childNodes[1].childNodes[0].value.trim();
                        }
                        if (buildingProperty === "views-field views-field-title" &&
                            td.childNodes[1].attrs[0].name === "href") {
                            buildingPath = td.childNodes[1].attrs[0].value.trim();
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

                // let's building this damn building object already
                const building = {
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

    private gettbody(root: any): any {
        let childrenToExplore = [];
        for (let child of root.childNodes) {
            childrenToExplore.push(child);
        }

        while (childrenToExplore.length) {
            let currentChild = childrenToExplore.pop();

            if (currentChild.nodeName === "tbody") {
                return currentChild.childNodes;

            } else { // undefined or not a tbody keep digging
                if (!(currentChild.childNodes === undefined)) {
                    childrenToExplore.push(... currentChild.childNodes);
                }
            }
        }
        return null;
    }

    public async test2() {
        let buildingPromises: any = [];
        for (let b in this.buildingsA) {

            let convertedAddress = this.buildingsA[b].address.split(" ").join("%20");
            let link = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_j0a0b_x3o0b/" + convertedAddress;
            buildingPromises.push(this.test3(link, this.buildingsA[b]));
            // buildingPromises.push(this.test3(link, this.buildingsA[b]));
        }
        // await Promise.all(buildingPromises).then((result) => {
        //    // TODO
        // });
        let x: any = 0;
    }

    private async test3(link: any, building: any) {
        let http = require("http");
        const coordinates = {lat: 0, lon: 0};
        let p = new Promise(function (resolve, reject) {
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
                res.on("data", (chunk: any) => {
                    rawData += chunk;
                });
                res.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData); // this is the lat/lon
                        coordinates.lat = parsedData.lat;
                        coordinates.lon = parsedData.lon;
                        resolve(parsedData);
                    } catch (e) {
                        reject(new Error("Geolocation server error"));
                    }
                });
            });
        });
        await p;
        building.lat = coordinates.lat;
        building.lon = coordinates.lon;
        // return p;
    }

}
