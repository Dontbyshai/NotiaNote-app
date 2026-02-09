import StorageHandler from "./StorageHandler";
import APIEndpoints from "./APIEndpoints";

const IPHONE_UA = "EcoleDirecte/7.8.3 iPhone15,2 iOS/17.5.1";
const API_VERSION = "4.75.0";

class LoginEngineV11 {
    static BUNDLE_ID = "ENGINE_V12_CLEANUP";
    static temporary2FAToken = "";
    static temporaryLoginToken = "";
    static wantToOpenDoubleAuthPopup = false;
    static openDoubleAuthPopup: (() => void) | null = null;

    /**
     * Main login entry point - V12 CLEANUP
     */
    static async login(username, password) {
        console.log(`[V12-CLEAN] >>> ATTEMPTING MINIMALIST LOGIN <<<`);
        console.log(`[V12-CLEAN] User: ${username} | Version: ${API_VERSION}`);

        if (StorageHandler.removeData) await StorageHandler.removeData("gtk");
        this.temporary2FAToken = "";

        try {
            // 1. Get GTK Token
            const gtkRes = await fetch(`${APIEndpoints.OFFICIAL_API}/v3/login.awp?gtk=1&v=${API_VERSION}`, {
                method: 'GET',
                headers: {
                    'User-Agent': IPHONE_UA,
                    'Accept': 'application/json, text/plain, */*'
                }
            });

            const setCookie = gtkRes.headers.get("set-cookie") || "";
            const gtkMatch = setCookie.match(/GTK=([^; ,]+)/i);
            const gtk = gtkMatch ? gtkMatch[1] : "";
            const cookie = `GTK=${gtk}`;

            if (!gtk) {
                console.error("[V12-CLEAN] FAILED: No GTK");
                return -1;
            }

            console.log(`[V12-CLEAN] GTK: ${gtk.substring(0, 8)}`);

            // 2. Perform Login POST
            // STRIPPED PAYLOAD: This is the exact minimum required
            const bodyObj = {
                identifiant: String(username).trim(),
                motdepasse: String(password),
                isReLogin: false,
                uuid: ""
            };

            const requestBody = "data=" + encodeURIComponent(JSON.stringify(bodyObj));

            const response = await fetch(`${APIEndpoints.OFFICIAL_API}/v3/login.awp?v=${API_VERSION}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json, text/plain, */*',
                    'X-Gtk': gtk,
                    'X-Cookie': gtk, // Triple header as observed in successful logs
                    'Cookie': cookie,
                    'User-Agent': IPHONE_UA,
                    'Origin': 'https://www.ecoledirecte.com',
                    'Referer': 'https://www.ecoledirecte.com/'
                },
                body: requestBody
            });

            const responseText = await response.text();
            let data: any = {};
            try { data = JSON.parse(responseText); } catch (e) { data = { raw: responseText }; }

            const code = data.code || data.status;
            console.log(`[V12-CLEAN] SERVER_CODE: ${code}`);

            if (code === 200) {
                await this._saveAccounts(data.data, data.token);
                await StorageHandler.saveData("credentials", { username, password });
                return 1;
            } else if (code === 250) {
                console.log("[V12-CLEAN] 250! Success, starting 2FA flow.");
                this.temporaryLoginToken = data.token || "";
                this.temporary2FAToken = response.headers.get("2fa-token") || response.headers.get("2FA-TOKEN") || "";
                this.wantToOpenDoubleAuthPopup = true;
                if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                return 3;
            } else if (code === 505) {
                return 0; // Wrong password indicator
            }

            return -1;
        } catch (e: any) {
            console.error("[V12-CLEAN] Error:", e.message);
            return -1;
        }
    }

    /**
     * Authenticated Request Helper
     */
    static async parseEcoleDirecte(title, id, url, body, success, verbe = "post") {
        const accs = await StorageHandler.getData("accounts") || [];
        const acc = (accs as any[]).find(a => String(a.id) === String(id)) || accs[0];
        const tk = acc?.connectionToken || await StorageHandler.getData("token");

        try {
            const response = await fetch(url + (url.includes('?') ? '&' : '?') + `v=${API_VERSION}`, {
                method: verbe.toUpperCase(),
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Token": tk,
                    "User-Agent": IPHONE_UA,
                    "Accept": "application/json, text/plain, */*"
                },
                body: body
            });
            const data = await response.json();
            if (response.status === 200 && data.code === 200) return await success(data.data);
        } catch (e: any) {
            console.error(`[V12-CLEAN] Error ${title}:`, e.message);
        }
        return -1;
    }

    static async _saveAccounts(data, token) {
        if (!data.accounts || !Array.isArray(data.accounts)) return;
        const mapped = data.accounts.map(acc => ({ ...acc, id: String(acc.id), connectionToken: token }));
        await StorageHandler.saveData("token", token);
        await StorageHandler.saveData("accounts", mapped);
        await StorageHandler.saveData("selectedAccount", mapped[0].id);
    }

    static async getSelectedChildAccount() { return await StorageHandler.getData("selectedAccount"); }
    static async setSelectedChildAccount(id) { await StorageHandler.saveData("selectedAccount", String(id)); }
    static async getMainAccount() { const accs = await StorageHandler.getData("accounts"); return accs ? accs[0] : null; }
    static async getSpecificAccount(id) { const accs = await StorageHandler.getData("accounts"); return Array.isArray(accs) ? accs.find(a => String(a.id) === String(id)) : null; }

    static async refreshLogin() {
        let creds = await StorageHandler.getData("credentials") as any;
        if (!creds) return -1;
        return await this.login(creds.username, creds.password);
    }
}

export default LoginEngineV11; // We keep the filename for the proxy
