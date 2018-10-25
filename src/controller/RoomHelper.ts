import Log from "../Util";
import DataSetHelper from "./DataSetHelper";

let fs = require("fs");

export default class RoomHelper {

    public static construction(id: any, index: any) {
        const parse5 = require("parse5");
        let document = parse5.parse(index);

        // tbody where building info
        let tbody = this.gettbody(document);

        // get building info from index
        let buildingsA = this.makeBuilding(tbody);

        // combine to create final room objects
        for (let b in buildingsA) {
            // each building has a path to get to its directory of room information
            let path = buildingsA[b].link; // ./courses/.../ALRD
            let correctPath = path.slice(2); // courses/../ALDR

            let Rtbody: any[];

            let rooms = this.makeRooms(Rtbody);

            // let roomAST: string;
            // for (let r in rooms) {
            //     if (r === correctPath) {
            //         roomAST = parse5.parse(r);
            //         Rtbody = this.gettbody(roomAST);
            //     }
            // }

            // let roomAST = parse5.parse(file);
            // let Rtbody = this.gettbody(roomAST);

            let roomsObjects: any [] = [];

            // TODO: use building paths to get to room directories !!!!
            for (let r in rooms) {
                // final room object
                const room = {
                    // TODO: why does this hate me!!! I'm JUST COMBINING THINGSSSS
                    [id + "_fullname"]: buildingsA[b].fullname,
                    [id + "_shortname"]: buildingsA[b].shortname,
                    [id + "_number"]: rooms[r].number,
                    [id + "_name"]: buildingsA[b].shortname + " " + rooms[r].number,
                    [id + "_address"]: buildingsA[b].address,
                    [id + "_lat"]: buildingsA[b].lat,
                    [id + "_lon"]: buildingsA[b].lon,
                    [id + "_seats"]: rooms[r].seats,
                    [id + "_type"]: rooms[r].type,
                    [id + "_furniture"]: rooms[r].furniture,
                    [id + "_href"]: rooms[r].href
                };
                roomsObjects.push(room);
            }
        }
    }

    private static makeRooms(tbody: any): any {
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

    private static makeBuilding(tbody: any): any[] {
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

    private static gettbody(root: any): any {
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

}
