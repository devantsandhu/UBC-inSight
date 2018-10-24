import Log from "../Util";

export default class RoomHelper {
    public static construction(id: any, index: any) {
        const parse5 = require("parse5");

        let document = parse5.parse(index);
        // let root = document.childNodes;

        // tbody where building info
        // let tbody: any = [];
        let tbody = this.gettbody(document);

        // get building info from index
        let buildingsA = this.makeBuilding(tbody);

        // get rooms from document
        let rooms = this.makeRooms(tbody);
        let roomsObjects: any [] = [];

        // combine to create final room objects
        for (let b in buildingsA) {
            // let path = b.link
            // Log.trace(b);
            // TODO: use building paths to get to room directories !!!!
            for (let r in rooms) {
                // final room object
                const room: {[key: string]: any} = {
                    // TODO: why does this hate me!!! I'm JUST COMBINING THINGSSSS
                    // [id + "_fullname"]: b.fullname,
                    // [id + "_shortname"]: b.shortname,
                    // [id + "_number"]: r.number,
                    // [id + "_name"]: b.shortname + " " + r.number,
                    // [id + "_address"]: b.address,
                    // [id + "_lat"]: b.lat,
                    // [id + "_lon"]: b.lon,
                    // [id + "_seats"]: r.seats,
                    // [id + "_type"]: r.type,
                    // [id + "_furniture"]: r.furniture,
                    // [id + "_href"]: r.href
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
                            buildingTitle = td.childNodes[1].attrs[1].value.trim();
                        }
                        if (buildingProperty === "views-field views-field-title" &&
                            buildingProperty.name === "href") {
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

    // private static gettbody(root: any): any {
    //     let todo = [];
    //     todo.push(root);
    //
    //     while (todo.length > 0) {
    //         let current = todo.pop();
    //         if (!(current.childNodes === undefined) || !(current.childNodes === null) ) {
    //             for (let child of current.childNodes) {
    //                 if (child.nodeName === "tbody") {
    //                     return child;
    //                 } else {
    //                     todo.push(child);
    //                 }
    //             }
    //         }
    //         return null;
    //     }
    // }

    // private static gettbody(root: any): any {
    //     if (root.nodeName === "tbody") {
    //         return root;
    //     } else if (root.childNodes) {
    //         for (let child of root.childNodes) {
    //             let current: any = this.gettbody(child);
    //             if (current !== null) {
    //                 return current;
    //             }
    //         }
    //         return null;
    //     }
    // }

    // private static gettbody(root: any): any {
    //     if (root.nodeName === "tbody") {
    //         return root;
    //     } else if (root.childNodes in root) {
    //         for (let child of root.childNodes) {
    //             let tbody = this.gettbody(child);
    //             if (tbody !== null) {
    //                 return tbody;
    //             }
    //         }
    //     }
    //     return null;
    // }

        // }else if (!(child.childNodes === undefined) || !(child.childNodes == null)) {
        //     let result = null;
        //     let i = 0;
        //     while (i < child.childNodes.length) {
        //         if (!result === null) {
        //             return result;
        //         } else {
        //             result = this.gettbody(child.childNodes[i]);
        //         }
        //         i++;
        //     }
        //     return result;
        // }


}
