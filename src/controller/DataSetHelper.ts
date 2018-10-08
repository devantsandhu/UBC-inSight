export default class DataSetHelper {

    public static parseOffering(offering: any, id: string) {
        // object that will be returned
        // offering = JSON.stringify(offering);
        let parsedOffering: {[key: string]: any} = {
            // courses_dept: "",
            // courses_id: "",
            // courses_avg: 0,
            // courses_instructor: "",
            // courses_title: "",
            // courses_pass: 0,
            // courses_fail: 0,
            // courses_audit: 0,
            // courses_uuid: "",
            // courses_year: 0,
        };
        try {
            // Check to see if Offering has all valid keys
            if (// offering.hasOwnProperty("result") &&
                offering.hasOwnProperty("Subject") &&
                offering.hasOwnProperty("Course") &&
                offering.hasOwnProperty("Avg") &&
                offering.hasOwnProperty("Professor") &&
                offering.hasOwnProperty("Title") &&
                offering.hasOwnProperty("Pass") &&
                offering.hasOwnProperty("Fail") &&
                offering.hasOwnProperty("Audit") &&
                offering.hasOwnProperty("id") &&
                offering.hasOwnProperty("Year")) {
                // Assign key values to object
                parsedOffering[id + "_dept"] = offering["Subject"];
                parsedOffering[id + "_id"] = offering["Course"];
                parsedOffering[id + "_avg"] = offering["Avg"];
                parsedOffering[id + "_instructor"] = offering["Professor"];
                parsedOffering[id + "_title"] = offering["Title"];
                parsedOffering[id + "_pass"] = offering["Pass"];
                parsedOffering[id + "_fail"] = offering["Fail"];
                parsedOffering[id + "_audit"] = offering["Audit"];
                parsedOffering[id + "_uuid"] = offering["id"].toString();
                parsedOffering[id + "_year"] = Number(offering["Year"]);
                // return object with assigned values
                return parsedOffering;
            }
        } catch (e) {
            return null;
        }
    }

    public static isJson(file: any) {
        try {
            JSON.parse(JSON.stringify(file));
        } catch (e) {
            return false;
        }
        return true;
    }
}
