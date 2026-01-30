import AccountHandler from "./AccountHandler";
import EcoleDirecteApi from "../services/EcoleDirecteApi";
import StorageHandler from "./StorageHandler";

class SchoolLifeHandler {
    static async getSchoolLife(accountID) {
        try {
            const response = await EcoleDirecteApi.getSchoolLife(accountID);
            if (response.status === 200) {
                const payload = response.data.data || response.data;
                await this.saveSchoolLife(accountID, payload);
                return payload;
            }
        } catch (e) {
            console.error("SchoolLifeHandler.getSchoolLife Error:", e);
        }
        return null;
    }

    static async saveSchoolLife(accountID, data) {
        const cacheData = (await StorageHandler.getData("school_life")) || {};
        cacheData[accountID] = {
            data: data,
            lastUpdated: new Date().toISOString()
        };
        await StorageHandler.saveData("school_life", cacheData);
    }

    static async getCachedSchoolLife(accountID) {
        const cacheData = await StorageHandler.getData("school_life");
        if (cacheData && cacheData[accountID]) {
            return cacheData[accountID].data;
        }
        return null;
    }
}

export default SchoolLifeHandler;
