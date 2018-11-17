import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");

import chaiHttp = require("chai-http");
import {expect} from "chai";
import * as fs from "fs";
import Log from "../src/Util";
import {InsightError} from "../src/controller/IInsightFacade";
import JSON = Mocha.reporters.JSON;
import {stringify} from "querystring";
import DataSetHelper from "../src/controller/DataSetHelper";
import {queryParser} from "restify";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    let coursesDataset: any = null;
    let roomsDataset: any = null;
    let sampleQuery: any = null;
    let queryFile: any = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);

        // TODO: start server here once and handle errors properly
        server.start().then( (res: any) => {
            // server working
            Log.trace(res);
        })
            .catch( function (err: any) {
                // server did not start
                Log.trace(err);
            });
        coursesDataset = fs.readFileSync("./test/data/courses.zip");
        roomsDataset = fs.readFileSync("./test/data/rooms.zip");

        queryFile = fs.readFileSync("./test/queries/q1.json");
        sampleQuery = DataSetHelper.StringifyANDparse(queryFile);
    });

    after(function () {
        // TODO: stop server here once!
        server.stop().then( function (res: any) {
            // server stopped
            Log.trace(res);
        }).catch( function (err: any) {
            // server failed to stop
            Log.trace(err);
        });
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    // TODO: read your courses and rooms datasets here once!
    // ^ DONE in before

    // Hint on how to test PUT requests

    it("PUT test for courses dataset - PASS", function () {
        try {
            // return chai.request(URL)
             return chai.request("http://localhost:4321")
                // .put(YOUR_PUT_URL)
                .put("/dataset/courses/courses")
                // .attach("body", YOUR_COURSES_DATASET, COURSES_ZIP_FILENAME)
                .attach("body", coursesDataset, "courses.zip")
                .then(function (res: ChaiHttp.Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    it("POST test", function () {
        try {
            // return chai.request(URL)
            return chai.request("http://localhost:4321")
            // .put(YOUR_PUT_URL)
                .post("/query")
                // .attach("body", YOUR_COURSES_DATASET, COURSES_ZIP_FILENAME)
                .send(sampleQuery.query)
                .then(function (res: ChaiHttp.Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    it("GET test with one dataset", function () {
        try {
            // return chai.request(URL)
            return chai.request("http://localhost:4321")
            // .put(YOUR_PUT_URL)
                .get("/datasets")
                // .attach("body", YOUR_COURSES_DATASET, COURSES_ZIP_FILENAME)
                // .attach("body", coursesDataset, "courses.zip")
                .then(function (res: ChaiHttp.Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.trace(err);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    it("PUT test for courses dataset - FAIL", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/courses/rooms")
                .attach("body", coursesDataset, "courses.zip")
                .then(function (res: ChaiHttp.Response) {
                    expect.fail();
                })
                .catch(function (err: any) {
                    Log.trace(err);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.error(err);
        }
    });
    it("PUT test for rooms dataset - PASS", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/rooms")
                .attach("body", roomsDataset, "rooms.zip")
                .then(function (res: ChaiHttp.Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    expect.fail();
                });
        } catch (err) {
            Log.error(err);
        }
    });
    it("PUT test for rooms dataset - FAIL", function () {
        try {
            return chai.request("http://localhost:4321")
                .put("/dataset/rooms/Notrooms")
                .attach("body", coursesDataset, "rooms.zip")
                .then(function (res: ChaiHttp.Response) {
                    // expect(res.status).to.be.equal(400);
                    expect.fail();
                })
                .catch(function (err: any) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.error(err);
        }
    });

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
