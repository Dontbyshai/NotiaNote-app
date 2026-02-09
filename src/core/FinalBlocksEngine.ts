import { Client } from "@blockshub/blocksdirecte";
import StorageHandler from "./StorageHandler";

class FinalBlocksEngine {
    static BUNDLE_ID = "FINAL_BLOCKS_2025";
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
        console.log(`[FINAL-BLOCKS] ========================`);
        console.log(`[FINAL-BLOCKS] NEW ENGINE VERSION 2025`);
        console.log(`[FINAL-BLOCKS] User: ${username}`);
        console.log(`[FINAL-BLOCKS] ========================`);

        if (StorageHandler.removeData) await StorageHandler.removeData("gtk");
        this.temporary2FAToken = "";

        try {
            this.client = new Client();
            const deviceUUID = this._generateUUID();

            console.log(`[FINAL-BLOCKS] Calling refreshToken...`);
            await this.client.auth.refreshToken(
                username,
                "E" as any,
                undefined as any,
                password,
                undefined,
                deviceUUID
            );
            console.log(`[FINAL-BLOCKS] ✅ refreshToken completed!`);

            // Inspect credentials directly
            console.log(`[FINAL-BLOCKS] Inspecting auth.credentials...`);
            const credentials: any = (this.client.auth as any).credentials;

            if (credentials && typeof credentials === 'object') {
                const credKeys = Object.keys(credentials);
                console.log(`[FINAL-BLOCKS] credentials keys:`, credKeys);

                // Log all properties
                for (const key of credKeys) {
                    const val = credentials[key];
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        console.log(`[FINAL-BLOCKS]   ${key}:`, `[Object] keys:`, Object.keys(val).slice(0, 10));
                    } else {
                        console.log(`[FINAL-BLOCKS]   ${key}:`, typeof val === 'string' ? val.substring(0, 50) : val);
                    }
                }

                // Check for account data
                if (credentials.account) {
                    console.log(`[FINAL-BLOCKS] ✅ Found credentials.account!`);
                    const account = credentials.account;

                    console.log(`[FINAL-BLOCKS] Account data:`);
                    console.log(`[FINAL-BLOCKS]   id:`, account.id);
                    console.log(`[FINAL-BLOCKS]   type:`, account.type);
                    console.log(`[FINAL-BLOCKS]   fullName:`, account.fullName);
                    console.log(`[FINAL-BLOCKS]   accessToken exists:`, !!account.accessToken);

                    if (account.id && account.accessToken) {
                        const accountData = {
                            id: String(account.id),
                            nom: account.fullName || "",
                            prenom: "",
                            typeCompte: account.type || "E",
                            connectionToken: account.accessToken,
                            modules: []
                        };

                        await StorageHandler.saveData("token", account.accessToken);
                        await StorageHandler.saveData("accounts", [accountData]);
                        await StorageHandler.saveData("selectedAccount", String(account.id));
                        await StorageHandler.saveData("credentials", {
                            username,
                            password,
                            additionals: {
                                username,
                                token: account.accessToken,
                                deviceUUID
                            }
                        });

                        console.log(`[FINAL-BLOCKS] ========================`);
                        console.log(`[FINAL-BLOCKS] ✅✅✅ LOGIN SUCCESS! ✅✅✅`);
                        console.log(`[FINAL-BLOCKS] ========================`);
                        return 1;
                    }
                }

                // If no account property, maybe it's stored differently
                console.log(`[FINAL-BLOCKS] No 'account' property found in credentials`);
                console.log(`[FINAL-BLOCKS] Full credentials object:`, JSON.stringify(credentials, null, 2).substring(0, 500));
            }

            console.log(`[FINAL-BLOCKS] ❌ Could not find account data`);
            return -1;

        } catch (error: any) {
            console.error("[FINAL-BLOCKS] FATAL ERROR:", error.message);
            console.error("[FINAL-BLOCKS] Stack:", error.stack);

            if (error.message && (error.message.includes("250") || error.message.includes("2FA"))) {
                console.log("[FINAL-BLOCKS] 2FA required!");
                this.wantToOpenDoubleAuthPopup = true;
                if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                return 3;
            }

            if (error.message && error.message.includes("505")) {
                console.error("[FINAL-BLOCKS] Invalid credentials");
                return 0;
            }

            return -1;
        }
    }

    static async parseEcoleDirecte(title: string, id: string, url: string, body: string, success: (data: any) => Promise<any>, verbe = "post") {
        return -1;
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

export default FinalBlocksEngine;
