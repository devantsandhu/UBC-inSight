

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

    let comparators = activeTabPanel.getElementsByClassName("conditions-container");

    let numberOfComparators = comparators[0].children.length;
    let comparatorArray = [];


    // empty where/ base case
    if (numberOfComparators === 0) {
        query["WHERE"] = {};
    } else if (numberOfComparators === 1) {
        // cannot have AND/OR if only 1 comparator
        let oneCondition = comparators[0].getElementsByClassName("control-group condition")[0];

        let processedCond = processComparator(oneCondition);

        query["WHERE"] = processedCond;

    } else if (numberOfComparators > 1) {
        // each comparator must be processed/info extracted then pushed into array
        // WHERE: { AND/OR: {xxx}, {yyy}} then added
        // AND/OR only 1 OK - YES
        let condition = comparators[0].getElementsByClassName("control-group condition");
        let ANDORNOTcondition = getCondition(conditions); // AND/OR/NOT

        for (let cond of condition) {
            comparatorArray.push(processComparator(cond));
        }
        query["WHERE"] = {[ANDORNOTcondition]: comparatorArray}
    }


    // 2) COLUMNS BLOCK
    // columns and order in OPTIONS block
    // OPTIONS: COLUMNS: && (ORDER:)
    query["OPTIONS"] = {};

    let columns = activeTabPanel.getElementsByClassName("form-group columns")[0];
    query["OPTIONS"]["COLUMNS"] = getCols(columns);


    // 3) ORDER BLOCK
    let order = activeTabPanel.getElementsByClassName("form-group order")[0].getElementsByClassName("control-group")[0];
    let parsedOrder = getOrder(order);

    let dir = "";
    let isDescending = false;

    if (order.children[1].children[0].checked === true) {
        isDescending = true;
    }

    if (isDescending) {
        dir = "DOWN"
    } else {
        dir = "UP"
    }

    // ORDER not required so don't create it if nothing specified
    if ((parsedOrder.length === 1) && (dir === "UP")) {
        query["OPTIONS"]["ORDER"] = parsedOrder[0];
    } else if ((parsedOrder.length === 1) && (dir === "DOWN")){
        query["OPTIONS"]["ORDER"] = {"dir": dir, "keys": parsedOrder};
    } else if (parsedOrder.length > 1) {
        query["OPTIONS"]["ORDER"] = {"dir": dir, "keys": parsedOrder};
    }

    // 4) GROUPS BLOCK
    // TRANSFORMATIONS: GROUP && APPLY
    let groups = activeTabPanel.getElementsByClassName("form-group groups")[0].getElementsByClassName("control-group")[0];
    let groupBlock = getGroup(groups);


    // 5) TRANSFORMATIONS BLOCK
    // APPLY
    let transformations = activeTabPanel.getElementsByClassName("form-group transformations")[0].getElementsByClassName("transformations-container");
    let applyBlock;
    if (transformations[0].children.length > 0) {
        applyBlock = getTransform(transformations[0].children);
    }



    // 4 + 5 ) DO WE HAVE A TRANSFORM?!
    // can only make TRANSFORMATION block if have a transformation
    if ((groupBlock.length > 0) && (transformations !== undefined)) {
        query["TRANSFORMATIONS"] = {};
        query["TRANSFORMATIONS"]["GROUP"] = groupBlock;
        query["TRANSFORMATIONS"]["APPLY"] = applyBlock;

    }

    // console.log("CampusExplorer.buildQuery not implemented yet.");
    console.log(JSON.stringify(query));

    return query;
};



processComparator = function(cond) {
    let isNOTcond = false;

    if (cond.children[0].children[0].checked === true) {
        isNOTcond = true;
    }

    let allFields = cond.children[1].children[0];
    let selectedField = "";
    for (let field in allFields) {
        let selected = allFields[field].getAttribute("selected");

        if (selected === "selected"){
            selectedField = allFields[field].getAttribute("value"); // audit/agv/dept/etc.
            break; // we got it, just get out
        }
    }

    let idField = getID() + "_" + selectedField;

    let allOperators = cond.children[2].children[0];
    let selectedOperator = "";
    for (let operator of allOperators) {
        let selected = operator.getAttribute("selected");

        if (selected == "selected") {
            selectedOperator = operator.getAttribute("value"); // IS/GT/EQ/LT
            break;
        }
    }

    let term = cond.children[3].children[0].getAttribute("value");

    // need to make input a number (not a string) if MComparator
    let properTerm;
    if ((selectedOperator === "GT") || (selectedOperator === "LT") || (selectedOperator === "EQ")) {
        properTerm = Number(term);
    } else if (selectedOperator === "IS") {
        properTerm = term;
    }

    let comparatorObject = {[selectedOperator]: {[idField]: properTerm}};


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

    let applyKey;
    let allAPPLYTOKENS;
    let APPLYTOKEN;
    let allFields;
    let key;

    // APPLY: [ {applyKey: {APPLYTOKEN : key}}]
    // APPLY: [ {MAXavg: { MAX : courses_avg}}]
    for (let transform of transformations) {


        applyKey = transform.children[0].children[0].getAttribute("value");

        allAPPLYTOKENS = transform.children[1].children[0].getElementsByTagName("option");
        for (let at of allAPPLYTOKENS) {
            if (at.getAttribute("selected") !== null) {
                APPLYTOKEN = at.value;
                break; //got it

            }
        }

        allFields = transform.children[2].children[0].getElementsByTagName("option");
        for (let field in allFields) {
            if (allFields[field].getAttribute("selected") !== null) {
                key = getID() + "_" + allFields[field].value;
                break;
            }
        }

        let apply = {[applyKey]: {[APPLYTOKEN]: key}};
        returnApply.push(apply);
    }

    return returnApply;


};

getGroup = function(groups) {
    let returnGroup = [];

    let allGroups = groups.getElementsByClassName("control field");

    for (let gr in allGroups) {
        if (gr === "length") return returnGroup;

        if (allGroups[gr].children[0].checked === true) {
            returnGroup.push(getID() + "_" + allGroups[gr].children[0].value);
        }
    }

    return returnGroup;
};

getOrder = function (order) {
    let returnOrder = [];
    let allOrderOptions = order.getElementsByClassName("control order fields")[0].getElementsByTagName("option");

    for (let ord in allOrderOptions) {
        if (ord === "length") return returnOrder;
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
    let allColumns = columns.children[1].children;


    for (let col of allColumns) {
        if (col.childNodes[1].getAttribute("checked") === "checked") {
            if (col.className == "control transformation") {
                returnCol.push(col.firstElementChild.getAttribute("value"));
            }
            else {
                returnCol.push(getID() + "_" + col.firstElementChild.getAttribute("value"));
            }
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
