export default class DataSetHelper {

    public static parseOffering(offering: any) {
        // object that will be returned
        // offering = JSON.stringify(offering);
        let parsedOffering: {[key: string]: any} = {
            courses_dept: "",
            courses_id: "",
            courses_avg: 0,
            courses_instructor: "",
            courses_title: "",
            courses_pass: 0,
            courses_fail: 0,
            courses_audit: 0,
            courses_uuid: "",
            courses_year: 0,
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
                parsedOffering["courses_dept"] = offering["Subject"];
                parsedOffering["courses_id"] = offering["Course"];
                parsedOffering["courses_avg"] = offering["Avg"];
                parsedOffering["courses_instructor"] = offering["Professor"];
                parsedOffering["courses_title"] = offering["Title"];
                parsedOffering["courses_pass"] = offering["Pass"];
                parsedOffering["courses_fail"] = offering["Fail"];
                parsedOffering["courses_audit"] = offering["Audit"];
                parsedOffering["courses_uuid"] = offering["id"].toString();
                parsedOffering["courses_year"] = Number(offering["Year"]);
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
