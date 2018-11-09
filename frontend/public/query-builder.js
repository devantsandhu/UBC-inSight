

/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 */

CampusExplorer.buildQuery = function() {
    let query = {};

    // get to the tab you want (courses or rooms)
    // https://developer.mozilla.org/en-US/docs/Web/API/Document
    let activeTabPanel = document.getElementsByClassName("tab-panel active")[0];


    // 1) CONDITION BLOCK
    // get condition (all/any/none)
    let conditionBlock = activeTabPanel.getElementsByClassName("control-group condition-type");
    let conditions = conditionBlock.children;
    let condition = getCondition(conditions);

    let comparators = activeTabPanel.getElementsByClassName("conditions-container");

    // empty where/ base case
    if (comparators.length === 0) {
        query["WHERE"] = {};
    } else {
        // each comparator must be processed/info extracted then pushed into array
        // WHERE: { AND/OR: {xxx}, {yyy}} then added
        // AND/OR only 1 OK - YES
        let comparatorArray = [];
        for (let cond of comparators) {
            comparatorArray.push(processComparator(cond));
        }
        query["WHERE"] = {[condition]: comparatorArray}
    }


    // 2) COLUMNS BLOCK
    // columns and order in OPTIONS block
    // OPTIONS: COLUMNS: && (ORDER:)
    query["OPTIONS"] = {};

    let columns = activeTabPanel.getElementsByClassName("form-group columns")[0].getElementsByClassName("control-group")[0];
    query["OPTIONS"]["COLUMNS"] = getCols(columns);

    // 3) ORDER BLOCK
    let order = activeTabPanel.getElementsByClassName("form-group order")[0].getElementsByClassName("control-group")[0];
    let parsedOrder = getOrder(order);

    let dir = "";
    let isDescending = order.getElementsByClassName("control descending")[0].children.checked;
    if (isDescending) {
        dir = "DOWN"
    } else {
        dir = "UP"
    }

    // ORDER not required so don't create it if nothing specified
    if (parsedOrder.length > 0) {
        query["OPTIONS"]["ORDER"] = {"dir": dir, "keys": parsedOrder}

    }

    // 4) GROUPS BLOCK
    // TRANSFORMATIONS: GROUP && APPLY
    query["TRANSFORMATIONS"] = {};

    let groups = activeTabPanel.getElementsByClassName("form-group group")[0].getElementsByClassName("control-group")[0];
    query["TRANSFORMATIONS"]["GROUP"] = getGroup(groups);

    // 5) TRANSFORMATIONS BLOCK
    // APPLY
    let transformations = activeTabPanel.getElementsByClassName("form-group transformations")[0].getElementsByClassName("control-group transformation")[0];
    if (transformations.length > 0) {
        query["TRANSFORMATIONS"]["APPLY"] = getTransform(transformations);
    }


    // console.log("CampusExplorer.buildQuery not implemented yet.");
    console.log(JSON.stringify(query));

    return query;
};





processComparator = function(cond) {
    let isNOTcond = cond.getElementsByClassName("control not")[0].children.checked;

    let allFields = cond.getElementsByClassName("control fields")[0].children;
    let selectedField = allFields.opacity[allFields.selectedIndex].value; // audit/avg/etc

    let idField = getID() + "_" + selectedField;

    let allOperators = cond.getElementsByClassName("control operators")[0].children;
    let selectedOperator = allOperators.options[allOperators.selectedIndex].value; // IS/GT/EQ/LT

    let term = cond.getElementsByClassName("control term")[0].children.value;

    // need to make input a number (not a string) if MComparator
    if (selectedOperator === ("GT" || "LT" || "EQ")) {
        term = Number(term);
    }

    let comparatorObject = {[selectedOperator]: {[idField]: term}};


    let returnCond = {};

    // check if the comparator get wrapped in a NOT
    // make comparator object and then check if needs to be wrapped in NOT
    if (isNOTcond) {
        returnCond["NOT"] = comparatorObject;
    } else {
        returnCond = comparatorObject;
    }

    return returnCond;

};

getTransform = function(transformations) {
    let returnApply = [];

    // APPLY: [ {applyKey: {APPLYTOKEN : key}}]
    // APPLY: [ {MAXavg: { MAX : courses_avg}}]
    for (let transform of transformations) {
        let applyKey = transform.getElementsByClassName("control term")[0].children.value;

        let allAPPLYTOKENS = transform.getElementsByClassName("control operator")[0].children;
        let APPLYTOKEN = allAPPLYTOKENS.options[allAPPLYTOKENS.selectedIndex].value;

        let allKeys = transform.getElementsByClassName("control fields")[0].children;
        let key = allKeys.options[allKeys.selectedIndex].value;

        let apply = {[applyKey]: {[APPLYTOKEN]: key}};
        returnApply.push(apply);
    }


};

getGroup = function(groups) {
    let returnGroup = [];

    let allGroups = groups.getElementsByClassName("control field");

    for (let gr in allGroups) {
        if (gr.querySelector("div input").checked) {
            returnGroup.push(getID() + "_" + gr.children.value);
        }
    }

    return returnGroup;
};

getOrder = function (order) {
    let returnOrder = [];
    let allOrderOptions = order.getElementsByClassName("control order fields")[0].children;

    for (let ord in allOrderOptions) {
        if (ord.selected) {
            if (ord.className === "transformation") {
                returnOrder.push(ord.value);
            } else {
                returnOrder.push(getID() + "_" + ord.value);
            }
        }
    }

    return returnOrder;

};

getCols = function (columns) {
    let returnCol = [];
    let allGivenColumns = columns.getElementsByClassName("control-field");
    let allTransformColumns = columns.getElementsByClassName("control transformation");


    for (let col of allGivenColumns) {
        if (col.querySelector("div input").checked) {
            returnCol.push(getID() + "_" + col.children.value);
        }
    }
    for (let tcol of allTransformColumns) {
        if (tcol.querySelector("div input").checked) {
            returnCol.push(tcol.children.value);
        }
    }

    return returnCol;
};

getCondition = function (conditions){

    for (let cond of conditions) {
        let condType = cond.children.value;
        if (cond.children.checked === true) {
            if (condType === "all") {
                return "AND";
            }
            if (condType === "any") {
                return "OR";
            }
            if (condType === "none") {
                return "NOT";
            }
        }
    }

};

getID = function () {
    return document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");
};
