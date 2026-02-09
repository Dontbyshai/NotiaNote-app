import AccountHandler from "./AccountHandler";
import StorageHandler from "./StorageHandler";
import APIEndpoints from "./APIEndpoints";

class TimetableHandler {
    static async getTimetable(accountID, startDate, endDate) {
        const url = `${AccountHandler.USED_URL}${APIEndpoints.TIMETABLE(accountID)}`;
        const payload = {
            dateDebut: startDate,
            dateFin: endDate,
            avecCoursAnnule: true
        };

        const result = await AccountHandler.parseEcoleDirecte(
            "Emploi du temps",
            accountID,
            url,
            `data=${JSON.stringify(payload)}`,
            async (data) => {
                const lessons = Array.isArray(data) ? data : [];
                await StorageHandler.saveData(`timetable-${accountID}`, lessons);
                return lessons;
            }
        );

        return Array.isArray(result) ? result : [];
    }

    static async getCachedTimetable(accountID) {
        return await StorageHandler.getData(`timetable-${accountID}`);
    }

    static formatDate(date) {
        if (!date) return "";
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

export default TimetableHandler;
