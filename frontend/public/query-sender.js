/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        // TODO: implement!
        // https://github.com/aahung/cpsc310-geolocation-ui/blob/checkpoint/7/public/query-sender.js

        let request = new XMLHttpRequest();
        request.open('GET', 'http://localhost:4321/query', true);
        http.setRequestHeader("Content-Type", "application/json");

        request.onload = function() {
            let result = JSON.parse(request.responseText);
            fulfill(result);
        };

        request.onerror = function() {
            reject('The request failed')
        };

        request.send(JSON.stringify(query));

        // console.log("CampusExplorer.sendQuery not implemented yet.");
    });
};
