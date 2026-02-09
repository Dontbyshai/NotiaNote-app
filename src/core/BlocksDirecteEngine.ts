import { Client } from "@blockshub/blocksdirecte";
import StorageHandler from "./StorageHandler";

class BlocksDirecteEngine {
    static BUNDLE_ID = "BLOCKSDIRECTE_OFFICIAL";
    static temporary2FAToken = "";
    static temporaryLoginToken = "";
    static wantToOpenDoubleAuthPopup = false;
    static openDoubleAuthPopup: (() => void) | null = null;
    static client: Client | null = null;

    static _generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static async login(username: string, password: string) {
        console.log(`[BLOCKS] >>> LOGIN WITH OFFICIAL LIBRARY <<<`);
        console.log(`[BLOCKS] User: ${username}`);

        if (StorageHandler.removeData) await StorageHandler.removeData("gtk");
        this.temporary2FAToken = "";

        try {
            // Create new client instance
            this.client = new Client();

            // Generate device UUID (as Papillon does)
            const deviceUUID = this._generateUUID();
            console.log(`[BLOCKS] Device UUID: ${deviceUUID.substring(0, 8)}...`);

            console.log(`[BLOCKS] Calling auth.refreshToken() for initial auth...`);

            // Use refreshToken for authentication
            await this.client.auth.refreshToken(
                username,
                "E" as any,
                undefined as any,
                password,
                undefined,
                deviceUUID
            );

            console.log(`[BLOCKS] ✅ Authentication successful!`);

            // Inspect the whole client.auth object
            console.log(`[BLOCKS] === INSPECTING CLIENT.AUTH ===`);
            console.log(`[BLOCKS] typeof client.auth:`, typeof this.client.auth);

            // Log all properties (safely)
            try {
                const authObj: any = this.client.auth;
                console.log(`[BLOCKS] client.auth properties:`);
                for (const key in authObj) {
                    if (authObj.hasOwnProperty(key)) {
                        const val = authObj[key];
                        const valType = typeof val;
                        if (valType === 'function') {
                            console.log(`[BLOCKS]   ${key}: [Function]`);
                        } else if (valType === 'object' && val !== null) {
                            console.log(`[BLOCKS]   ${key}: [Object] keys:`, Object.keys(val));
                        } else {
                            console.log(`[BLOCKS]   ${key}:`, val);
                        }
                    }
                }
            } catch (inspectError: any) {
                console.error("[BLOCKS] Error inspecting auth object:", inspectError.message);
            }

            // Try to JSON stringify it
            try {
                const authCopy: any = {};
                for (const key in this.client.auth) {
                    if (typeof (this.client.auth as any)[key] !== 'function') {
                        authCopy[key] = (this.client.auth as any)[key];
                    }
                }
                console.log(`[BLOCKS] Auth object (non-functions):`, JSON.stringify(authCopy, null, 2));
            } catch (jsonError: any) {
                console.error("[BLOCKS] Error stringifying auth:", jsonError.message);
            }

            // For now, return error so we can see all the logs
            console.log(`[BLOCKS] === END INSPECTION ===`);
            console.log(`[BLOCKS] Returning -1 for inspection purposes (will fix once we understand the API)`);
            return -1;

        } catch (error: any) {
            console.error("[BLOCKS] Login error:", error.message);
            console.error("[BLOCKS] Error stack:", error.stack);

            if (error.message && (error.message.includes("250") || error.message.includes("2FA"))) {
                console.log("[BLOCKS] 2FA required!");
                this.wantToOpenDoubleAuthPopup = true;
                if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                return 3;
            }

            if (error.message && error.message.includes("505")) {
                console.error("[BLOCKS] Invalid credentials");
                return 0;
            }

            return -1;
        }
    }

    static async parseEcoleDirecte(title: string, id: string, url: string, body: string, success: (data: any) => Promise<any>, verbe = "post") {
        if (!this.client) {
            console.error("[BLOCKS] No active client");
            return -1;
        }

        try {
            console.log(`[BLOCKS] parseEcoleDirecte called for: ${title}`);
            return await success({});
        } catch (e: any) {
            console.error(`[BLOCKS] Request Error:`, e.message);
            return -1;
        }
    }

    static async _saveAccounts(data: any, token: string) { }

    static async getSelectedChildAccount() { return await StorageHandler.getData("selectedAccount"); }
    static async setSelectedChildAccount(id: string) { await StorageHandler.saveData("selectedAccount", String(id)); }
    static async getMainAccount() {
        const accs = await StorageHandler.getData("accounts");
        return accs ? accs[0] : null;
    }
    static async getSpecificAccount(id: string) {
        const accs = await StorageHandler.getData("accounts");
        return Array.isArray(accs) ? accs.find((a: any) => String(a.id) === String(id)) : null;
    }

    static async refreshLogin() {
        let creds = await StorageHandler.getData("credentials") as any;
        if (!creds) return -1;
        return await this.login(creds.username, creds.password);
    }
}

export default BlocksDirecteEngine;
