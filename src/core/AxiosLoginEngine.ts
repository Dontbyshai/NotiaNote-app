import axios from "axios";
import StorageHandler from "./StorageHandler";
import APIEndpoints from "./APIEndpoints";

const SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const API_VERSION = "4.75.0";

class AxiosLoginEngine {
    static BUNDLE_ID = "AXIOS_ANDROID_CLONE";
    static temporary2FAToken = "";
    static temporaryLoginToken = "";
    static wantToOpenDoubleAuthPopup = false;
    static openDoubleAuthPopup: (() => void) | null = null;

    static async login(username, password) {
        console.log(`[AXIOS-IOS] >>> LOGIN ATTEMPT (ANDROID CLONE) <<<`);
        console.log(`[AXIOS-IOS] User: ${username} | Pass length: ${password.length}`);

        if (StorageHandler.removeData) await StorageHandler.removeData("gtk");
        this.temporary2FAToken = "";

        try {
            // 1. Get GTK Token (Axios GET)
            console.log(`[AXIOS-IOS] Fetching GTK...`);
            const gtkRes = await axios.get(`${APIEndpoints.OFFICIAL_API}/v3/login.awp?gtk=1&v=${API_VERSION}`, {
                headers: { 'User-Agent': SAFARI_UA }
            });

            // Extract GTK from Set-Cookie header
            const setCookie = gtkRes.headers['set-cookie'];
            console.log(`[AXIOS-IOS] Set-Cookie type: ${typeof setCookie}`);
            console.log(`[AXIOS-IOS] Set-Cookie value: ${JSON.stringify(setCookie)}`);

            let gtk = "";
            if (Array.isArray(setCookie)) {
                // Axios returns array of cookies
                const gtkCookie = setCookie.find((c: string) => c.startsWith('GTK='));
                if (gtkCookie) {
                    const match = gtkCookie.match(/GTK=([^;]+)/);
                    gtk = match ? match[1] : "";
                }
            } else if (typeof setCookie === 'string') {
                const match = setCookie.match(/GTK=([^;,]+)/);
                gtk = match ? match[1] : "";
            }

            if (!gtk) {
                console.error("[AXIOS-IOS] FAILED: No GTK");
                return -1;
            }

            console.log(`[AXIOS-IOS] GTK (first 30 chars): ${gtk.substring(0, 30)}...`);
            console.log(`[AXIOS-IOS] GTK (full length): ${gtk.length} characters`);
            console.log(`[AXIOS-IOS] GTK contains 0d0a: ${gtk.includes('0d0a')}`);

            // Check for actual CRLF characters (not the hex string)
            const hasCRLF = /[\r\n]/.test(gtk);
            console.log(`[AXIOS-IOS] GTK contains actual CRLF: ${hasCRLF}`);

            // 2. Perform Login POST (EXACTLY like Android)
            const bodyObj = {
                identifiant: username,
                motdepasse: password,
                isReLogin: false,
                uuid: "",
                fa: "",
                cn: "",
                cv: ""
            };

            const requestBody = "data=" + encodeURIComponent(JSON.stringify(bodyObj));
            console.log(`[AXIOS-IOS] Body prepared, length: ${requestBody.length}`);

            const response = await axios.post(
                `${APIEndpoints.OFFICIAL_API}/v3/login.awp?v=${API_VERSION}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Gtk': gtk,
                        'Cookie': `GTK=${gtk}`,
                        'User-Agent': SAFARI_UA
                    }
                }
            );

            console.log(`[AXIOS-IOS] Response status: ${response.status}`);
            console.log(`[AXIOS-IOS] Response data: ${JSON.stringify(response.data)}`);

            const data = response.data;
            const code = data.code || data.status;
            console.log(`[AXIOS-IOS] Code: ${code}`);

            if (code === 200) {
                await this._saveAccounts(data.data, data.token);
                await StorageHandler.saveData("credentials", { username, password });
                return 1;
            } else if (code === 250) {
                console.log("[AXIOS-IOS] 250! 2FA detected.");
                this.temporaryLoginToken = data.token || "";
                this.temporary2FAToken = response.headers['2fa-token'] || "";
                this.wantToOpenDoubleAuthPopup = true;
                if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                return 3;
            } else if (code === 505) {
                console.error("[AXIOS-IOS] 505 - Wrong credentials");
                return 0;
            }

            return -1;
        } catch (e: any) {
            console.error("[AXIOS-IOS] Error:", e.message);
            if (e.response) {
                console.error("[AXIOS-IOS] Error response:", e.response.status, e.response.data);
            }
            return -1;
        }
    }

    static async parseEcoleDirecte(title, id, url, body, success, verbe = "post") {
        const accs = await StorageHandler.getData("accounts") || [];
        const acc = (accs as any[]).find(a => String(a.id) === String(id)) || accs[0];
        const tk = acc?.connectionToken || await StorageHandler.getData("token");

        try {
            const response = await axios.post(url + (url.includes('?') ? '&' : '?') + `v=${API_VERSION}`, body, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Token": tk,
                    "User-Agent": SAFARI_UA
                }
            });
            if (response.status === 200 && response.data.code === 200) return await success(response.data.data);
        } catch (e: any) {
            console.error(`[AXIOS-IOS] Request Error:`, e.message);
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

export default AxiosLoginEngine;
