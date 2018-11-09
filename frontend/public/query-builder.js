

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
    let conditions = conditionBlock[0].getElementsByTagName("input");
    let condition = getCondition(conditions); // AND/OR/NOT

    let comparators = activeTabPanel.getElementsByClassName("conditions-container");

    // empty where/ base case
    if (comparators.length === 0) {
        query["WHERE"] = {};
    } else {
        // each comparator must be processed/info extracted then pushed into array
        // WHERE: { AND/OR: {xxx}, {yyy}} then added
        // AND/OR only 1 OK - YES
        let comparatorArray = [];
        let conditions = comparators[0].getElementsByClassName("control-group condition");
        for (let cond of conditions) {
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

    // TODO: fix:
    let isDescending = order.getElementsByClassName("control descending")[0].getElementsByTagName("input").checked; // make bool
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
    // TODO: fix:
    let isNOTcond = (cond.firstElementChild.getElementsByTagName("input")[0].getAttribute("checked") === "checked");

    let allFields = cond.getElementsByClassName("control fields")[0].getElementsByTagName("option");
    let selectedField = "";
    for (let field in allFields) {
        let selected = allFields[field].getAttribute("selected");

        if (selected === "selected"){
            selectedField = allFields[field].getAttribute("value"); // audit/agv/dept/etc.
            break; // we got it, just get out
        }
    }

    let idField = getID() + "_" + selectedField;

    let allOperators = cond.getElementsByClassName("control operators")[0].getElementsByTagName("option");
    let selectedOperator = "";
    for (let operator of allOperators) {
        let selected = operator.getAttribute("selected");

        if (selected == "selected") {
            selectedOperator = operator.getAttribute("value"); // IS/GT/EQ/LT
            break;
        }
    }

    let term = cond.getElementsByClassName("control term")[0].firstElementChild.getAttribute("value");

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
        let applyKey = transformations[transform].getElementsByClassName("control term")[0].getAttribute("value");

        let allAPPLYTOKENS = transformations[transform].getElementsByClassName("control operator")[0].getElementsByTagName("select");
        let APPLYTOKEN = allAPPLYTOKENS.options[allAPPLYTOKENS.selectedIndex].value;

        let allKeys = transformations[transform].getElementsByClassName("control fields")[0].getElementsByTagName("select");
        let key = allKeys.getAttribute("value");

        let apply = {[applyKey]: {[APPLYTOKEN]: key}};
        returnApply.push(apply);
    }


};

getGroup = function(groups) {
    let returnGroup = [];

    let allGroups = groups.getElementsByClassName("control field");

    for (let gr in allGroups) {
        if (allGroups[gr].getAttribute("checked") === "checked") {
            returnGroup.push(getID() + "_" + gr.getAttribute("value"));
        }
    }

    return returnGroup;
};

getOrder = function (order) {
    let returnOrder = [];
    let allOrderOptions = order.getElementsByClassName("control order fields")[0].getElementsByTagName("option");

    for (let ord in allOrderOptions) {
        if (allOrderOptions[ord].getAttribute("selected") === "selected") {
            if (allOrderOptions[ord].getAttribute("class") === "transformation") {
                returnOrder.push(allOrderOptions[ord].getAttribute("value"));
            } else if (allOrderOptions[ord].getAttribute("class") === null) {
                returnOrder.push(getID() + "_" + allOrderOptions[ord].getAttribute("value"));
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
        if (col.firstElementChild.getAttribute("checked") === checked) {
            returnCol.push(getID() + "_" + col.firstElementChild.getAttribute("value"));
        }
    }
    for (let tcol of allTransformColumns) {
        if (tcol.firstElementChild.getAttribute("checked") === checked) {
            returnCol.push(tcol.firstElementChild.getAttribute("value"));
        }
    }

    return returnCol;
};

getCondition = function(conditions){

    if (conditions[0].getAttribute("checked") !== null) {
        return "AND";
    } else if (conditions[1].getAttribute("checked") !== null) {
        return "OR";
    } else if (conditions[2].getAttribute("checked") !== null) {
        return "NOT";
    }

};

getID = function () {
    return document.getElementsByClassName("tab-panel active")[0].getAttribute("data-type");
};
