import StorageHandler from "./StorageHandler";
import APIEndpoints from "./APIEndpoints";

const IPHONE_UA = "EcoleDirecte/7.8.3 iPhone15,2 iOS/17.5.1";
const API_VERSION = "4.75.0";

class DebugEngine {
    static BUNDLE_ID = "DEBUG_PAYLOAD_DUMP";
    static temporary2FAToken = "";
    static temporaryLoginToken = "";
    static wantToOpenDoubleAuthPopup = false;
    static openDoubleAuthPopup: (() => void) | null = null;

    static async login(username, password) {
        console.log(`[DEBUG] >>> DIAGNOSTIC MODE ACTIVE <<<`);
        console.log(`[DEBUG] Username: '${username}' (length: ${username.length})`);
        console.log(`[DEBUG] Password: '${password}' (length: ${password.length})`);

        if (StorageHandler.removeData) await StorageHandler.removeData("gtk");
        this.temporary2FAToken = "";

        try {
            // 1. Get GTK Token
            const gtkRes = await fetch(`${APIEndpoints.OFFICIAL_API}/v3/login.awp?gtk=1&v=${API_VERSION}`, {
                method: 'GET',
                headers: { 'User-Agent': IPHONE_UA }
            });

            const setCookie = gtkRes.headers.get("set-cookie") || "";
            console.log(`[DEBUG] Set-Cookie header: ${setCookie}`);

            // CRITICAL FIX: Split on comma to get individual cookies first
            // The Set-Cookie header may contain multiple cookies separated by commas
            const cookies = setCookie.split(',').map(c => c.trim());
            console.log(`[DEBUG] Found ${cookies.length} cookies in header`);

            // Find the GTK cookie specifically
            const gtkCookie = cookies.find(c => c.startsWith('GTK='));
            console.log(`[DEBUG] GTK cookie string: ${gtkCookie}`);

            let gtk = "";
            if (gtkCookie) {
                // Extract just the value (everything between GTK= and first semicolon)
                const match = gtkCookie.match(/^GTK=([^;]+)/);
                gtk = match ? match[1].trim() : "";
            }

            console.log(`[DEBUG] Extracted GTK value: ${gtk}`);

            const cookie = `GTK=${gtk}`;

            if (!gtk) {
                console.error("[DEBUG] FAILED: No GTK after cleaning");
                return -1;
            }

            console.log(`[DEBUG] GTK extracted (cleaned): ${gtk}`);

            // 2. Build body object
            const bodyObj = {
                identifiant: String(username).trim(),
                motdepasse: String(password).trim(),
                isReLogin: false,
                uuid: ""
            };

            console.log(`[DEBUG] Body object (before JSON):`, JSON.stringify(bodyObj, null, 2));

            const jsonString = JSON.stringify(bodyObj);
            console.log(`[DEBUG] JSON string: ${jsonString}`);

            const encodedData = encodeURIComponent(jsonString);
            console.log(`[DEBUG] Encoded data (first 100 chars): ${encodedData.substring(0, 100)}`);

            const requestBody = "data=" + encodedData;
            console.log(`[DEBUG] Full request body length: ${requestBody.length}`);

            // 3. Perform Login POST
            console.log(`[DEBUG] === SENDING REQUEST ===`);
            console.log(`[DEBUG] URL: ${APIEndpoints.OFFICIAL_API}/v3/login.awp?v=${API_VERSION}`);
            console.log(`[DEBUG] Headers:`);
            console.log(`[DEBUG]   Content-Type: application/x-www-form-urlencoded`);
            console.log(`[DEBUG]   X-Gtk: ${gtk}`);
            console.log(`[DEBUG]   Cookie: ${cookie}`);
            console.log(`[DEBUG]   User-Agent: ${IPHONE_UA}`);

            const response = await fetch(`${APIEndpoints.OFFICIAL_API}/v3/login.awp?v=${API_VERSION}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json, text/plain, */*',
                    'X-Gtk': gtk,
                    'X-Cookie': gtk,
                    'Cookie': cookie,
                    'User-Agent': IPHONE_UA
                },
                body: requestBody
            });

            const responseText = await response.text();
            console.log(`[DEBUG] Response status: ${response.status}`);
            console.log(`[DEBUG] Response body: ${responseText}`);

            let data: any = {};
            try { data = JSON.parse(responseText); } catch (e) { data = { raw: responseText }; }

            const code = data.code || data.status;
            console.log(`[DEBUG] Parsed code: ${code}`);

            // Log response headers
            console.log(`[DEBUG] Response headers:`);
            response.headers.forEach((value, key) => {
                console.log(`[DEBUG]   ${key}: ${value}`);
            });

            if (code === 200) {
                await this._saveAccounts(data.data, data.token);
                await StorageHandler.saveData("credentials", { username, password });
                return 1;
            } else if (code === 250) {
                console.log("[DEBUG] 250! Double Auth detected.");
                this.temporaryLoginToken = data.token || "";
                this.temporary2FAToken = response.headers.get("2fa-token") || "";
                this.wantToOpenDoubleAuthPopup = true;
                if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                return 3;
            } else if (code === 505) {
                console.error("[DEBUG] 505 - Server rejected credentials");
                return 0;
            }

            return -1;
        } catch (e: any) {
            console.error("[DEBUG] Fatal Exception:", e.message, e.stack);
            return -1;
        }
    }

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
                    "User-Agent": IPHONE_UA
                },
                body: body
            });
            const data = await response.json();
            if (response.status === 200 && data.code === 200) return await success(data.data);
        } catch (e: any) {
            console.error(`[DEBUG] Request Error:`, e.message);
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

export default DebugEngine;
