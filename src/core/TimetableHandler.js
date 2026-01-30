import AccountHandler from "./AccountHandler";
import APIEndpoints from "./APIEndpoints";

class TimetableHandler {
    static async getTimetable(accountID, startDate, endDate) {
        const url = `https://api.ecoledirecte.com/v3/E/${accountID}/emploidutemps.awp`;
        console.log("[TimetableHandler] Target URL:", url);

        let fetchedLessons = [];

        // Use AccountHandler which manages the session robustly
        // Properly format the payload as URL-encoded form data
        // The JSON must be URL-encoded for application/x-www-form-urlencoded
        const jsonData = JSON.stringify({ dateDebut: startDate, dateFin: endDate, avecTrous: false });
        const payload = `data=${encodeURIComponent(jsonData)}`;
        console.log("[TimetableHandler] Payload:", payload);

        await AccountHandler.parseEcoleDirecte(
            "timetable",
            accountID,
            url,
            payload,
            async (data) => {
                // Determine if data is the array itself or nested
                console.log("[TimetableHandler] Raw API Data:", JSON.stringify(data).substring(0, 500)); // Log first 500 chars

                if (Array.isArray(data)) {
                    fetchedLessons = data;
                } else if (data && data.data && Array.isArray(data.data)) {
                    fetchedLessons = data.data; // Handle occasional double nesting
                } else {
                    console.log("[TimetableHandler] Data is not a direct array:", JSON.stringify(data).substring(0, 100));
                    // Sometimes it might be an empty object if no lessons
                }
                return 1;
            },
            "get" // The API usually expects POST, forcing it here to be safe, previously 'get' param was passed but payload implies POST
        );

        return fetchedLessons;
    }


    // Helper to get formatted date YYYY-MM-DD
    static formatDate(date) {
        let d = new Date(date);
        if (isNaN(d.getTime())) {
            console.warn("[TimetableHandler] Invalid date passed to formatDate, using today:", date);
            d = new Date();
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export default TimetableHandler;
