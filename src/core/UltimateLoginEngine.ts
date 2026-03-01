import dayjs from "dayjs";
import { Client } from "@blockshub/blocksdirecte";
import StorageHandler from "./StorageHandler";
import { DemoData } from "./DemoData";
import { PronoteDriver } from "./drivers/PronoteDriver";
import { SkolengoDriver } from "./drivers/SkolengoDriver";

// VERSION 20250225_V8 - UNIVERSAL ENGINE (ED, PRONOTE, RESTORATION, UNIV)
class UltimateLoginEngine {
    static BUNDLE_ID = "ULTIMATE_20250225_V8";
    static USED_URL = "https://api.ecoledirecte.com";
    static temporary2FAToken = "";
    static wantToOpenDoubleAuthPopup = false;
    static openDoubleAuthPopup: (() => void) | null = null;
    static client: Client | null = null;
    static multipleAccounts = false;
    static backgroundReLogin = async () => { return await (UltimateLoginEngine as any).reLoginOnly(); };

    static async _getStableUUID() {
        const stored = await StorageHandler.getData("device_uuid") as any;
        if (stored && typeof stored === 'string') return stored;
        const newUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        await StorageHandler.saveData("device_uuid", newUUID);
        return newUUID;
    }

    static decodeToken(token: string): string {
        if (!token) return "";
        return token.trim();
    }

    static async login(username: string, password: string, serviceType: string = "ecoledirecte", extra: any = {}) {
        try {
            const deviceUUID = await this._getStableUUID();

            // --- APPLE REVIEWER / DEMO MODE ---
            if ((username === "apple_test" && password === "apple") || (username === "demo" && password === "demo")) {
                console.log("🍏 UNIVERSAL DEMO MODE ACTIVATED 🍏");
                return await this._handleDemoLogin(username, serviceType);
            }

            // --- DRIVER DISPATCH ---
            switch (serviceType) {
                case "pronote":
                    return await this._loginPronote(username, password, extra);
                case "skolengo_ent":
                    return await this._loginSkolengo(username, password, extra);
                case "restauration":
                case "turboself":
                case "alise":
                case "izly":
                case "ard":
                    return await this._loginRestoration(username, password, serviceType);
                case "uca":
                case "sorbonne":
                case "limoges":
                case "sciencepo":
                case "hec":
                case "appscho":
                    return await this._loginAppScho(username, password, serviceType);
                case "lorraine":
                case "nimes":
                case "uphf":
                    return await this._loginMulti(username, password, serviceType, extra);
                default:
                    return await this._loginED(username, password, deviceUUID, extra);
            }
        } catch (error: any) {
            console.error(`💥 LOGIN ERROR (${serviceType}):`, error.message);
            // Handle 2FA for EcoleDirecte
            if (error.constructor.name === 'Require2FA' || error.name === 'Require2FA' || error.message.includes("Require2FA") || error.message.includes("2FA")) {
                if (error.token) {
                    this.temporary2FAToken = error.token;
                    this.wantToOpenDoubleAuthPopup = true;
                    await StorageHandler.saveData("credentials", { username, password, serviceType });
                    if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                    return 3;
                }
            }
            return -1;
        }
    }

    static async _handleDemoLogin(username: string, serviceType: string) {
        if (!this.client) this.client = new Client();
        await StorageHandler.deleteFiles(["marks", "timetable", "homeworks", "messages", "customData"]);

        const mainId = "999999";
        const accountData = {
            ...DemoData.login.accounts[0],
            id: mainId,
            serviceType: serviceType || "ecoledirecte",
            connectionToken: "DEMO_TOKEN_123456789",
        };

        await StorageHandler.saveData("token", "DEMO_TOKEN_123456789");
        await StorageHandler.saveData("accounts", [accountData]);
        await StorageHandler.saveData("selectedAccount", mainId);
        await StorageHandler.saveData("credentials", { username: "apple_test", password: "apple", serviceType });
        return 1;
    }

    static async _loginED(username: string, password: string, deviceUUID: string, extra: any) {
        if (!this.client) this.client = new Client();

        const cn = extra.cn || "";
        const cv = extra.cv || "";

        const loginPromise = (this.client.auth as any).loginUsername(
            username, password, cn, cv, true, deviceUUID
        );

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("LOGIN_TIMEOUT_30S")), 30000)
        );

        const result = await Promise.race([loginPromise, timeoutPromise]) as any;
        const accounts = result.accounts || (result.data && result.data.accounts);

        if (accounts && accounts.length > 0) {
            const account = accounts[0];
            const rawId = account.id || account.idLogin || result.data?.accounts?.[0]?.id;
            const finalId = rawId ? String(rawId) : "";

            const clientToken = (this.client as any).credentials?.token;
            let mainToken = this.decodeToken(clientToken || result.token || "");

            const accountData = {
                ...((result as any).data?.accounts?.[0] || {}),
                ...account,
                id: finalId,
                serviceType: "ecoledirecte",
                connectionToken: mainToken,
            };

            await StorageHandler.saveData("token", mainToken);
            await StorageHandler.saveData("accounts", [accountData]);
            await StorageHandler.saveData("selectedAccount", finalId);
            await StorageHandler.saveData("credentials", { username, password, serviceType: "ecoledirecte" });

            return 1;
        }
        return -1;
    }

    static async _loginPronote(username: string, password: string, extra: any) {
        console.log("🔗 Pronote Login via PronoteDriver");
        return await PronoteDriver.login(username, password, extra?.url || "", extra?.cas || "", await this._getStableUUID());
    }

    static async _loginAppScho(username: string, password: string, serviceType: string) {
        console.log(`🔗 AppScho Login (${serviceType}) - Integration pending appscho wrapper`);
        return await this._handleDemoLogin("demo", serviceType);
    }

    static async _loginRestoration(username: string, password: string, serviceType: string) {
        console.log(`🔗 Restoration Login (${serviceType}) - Integration pending wrappers`);
        return await this._handleDemoLogin("demo", serviceType);
    }

    static async _loginSkolengo(username: string, password: string, extra: any) {
        console.log("🔗 Skolengo Login via SkolengoDriver");
        return await SkolengoDriver.login(username, password, extra?.url || "", extra?.cas || "", await this._getStableUUID());
    }

    static async _loginMulti(username: string, password: string, serviceType: string, extra: any) {
        console.log(`🔗 Multi-ENT Login (${serviceType})`);
        return await this._handleDemoLogin("demo", serviceType);
    }

    static async refreshLogin() {
        let creds = await StorageHandler.getData("credentials") as any;
        if (!creds) return -1;

        const daTokens = await StorageHandler.getData("double-auth-tokens") as any;
        const extra = {
            cn: daTokens?.cn || "",
            cv: daTokens?.cv || ""
        };

        return await this.login(creds.username, creds.password, creds.serviceType || "ecoledirecte", extra);
    }

    static async get2FAQuestion() {
        if (!this.client) this.client = new Client();
        return await (this.client.auth as any).get2FAQuestion(this.temporary2FAToken);
    }

    static async send2FAResponse(answer: string) {
        if (!this.client) return null;
        return await (this.client.auth as any).send2FAQuestion(answer, this.temporary2FAToken);
    }

    static async getGTK(): Promise<string> {
        try {
            const response = await fetch("https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.69.1", {
                method: "GET",
                headers: { "User-Agent": "Mozilla/5.0", "Origin": "https://www.ecoledirecte.com" }
            });
            const setCookie = response.headers.get("set-cookie");
            if (setCookie) {
                const match = setCookie.match(/gtk=([^;]+)/i);
                if (match && match[1]) return match[1];
            }
        } catch (e) { }
        return "";
    }

    static async refreshGTK() {
        try {
            const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
            const response = await fetch("https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.69.1", {
                method: "GET",
                headers: { "User-Agent": IOS_UA, "Origin": "https://www.ecoledirecte.com", "Referer": "https://www.ecoledirecte.com/" }
            });
            const setCookie = response.headers.get("set-cookie") || "";
            let gtkValue = "";
            if (setCookie) {
                const match = setCookie.match(/gtk=([^;]+)/i);
                if (match && match[1]) gtkValue = match[1];
            }
            if (gtkValue) {
                await StorageHandler.saveData("gtk", { gtk: gtkValue, cookie: setCookie });
            }
        } catch (e) { }
    }

    static async reLoginOnly(): Promise<string | null> {
        try {
            const result = await this.refreshLogin();
            if (result === 1) {
                await this.refreshGTK();
                const newToken = await StorageHandler.getData("token");
                return typeof newToken === 'string' ? newToken : null;
            }
        } catch (e) { }
        return null;
    }

    static async downloadFile(fileId: string, fileType: string, accountId?: string): Promise<string> {
        try {
            console.log(`[ULTIMATE] Bridge DOWNLOAD: ${fileId} (${fileType}) accountId: ${accountId || 'none'}`);

            // Always use generic telechargement.awp URL (account-scoped /eleves/{id}/ path returns 404)
            // idEleve goes into the POST body, not the URL path
            const url = `${this.USED_URL}/v3/telechargement.awp?verbe=get&v=4.69.1&leTypeDeFichier=${fileType}&fichierId=${fileId}&forceDownload=0`;

            let token = await StorageHandler.getData("token");
            token = this.decodeToken(typeof token === 'string' ? token : "");

            // Get Cookies
            const savedGtk = await StorageHandler.getData("gtk") as any;
            const { cookie, gtk } = savedGtk || { cookie: "", gtk: "" };
            console.log(`[ULTIMATE] Using Cookies for Download - GTK: ${gtk ? "YES" : "NO"} | Cookie: ${cookie ? "YES" : "NO"}`);

            const payload: any = {
                leTypeDeFichier: fileType,
                fichierId: fileId,
                forceDownload: 0
            };
            if (accountId) payload.idEleve = accountId;

            const encodedBody = new URLSearchParams({ data: JSON.stringify(payload) }).toString();

            console.log(`[ULTIMATE] Download Body: ${encodedBody.substring(0, 100)}`);

            const fetchOptions: any = {
                method: "POST",
                headers: {
                    "X-Token": token || "",
                    "X-Gtk": gtk || "",
                    // Send proper Cookie header: 'gtk=VALUE' not the full Set-Cookie string
                    "Cookie": gtk ? `gtk=${gtk}` : "",
                    "Content-Type": "x-www-form-urlencoded",
                    // Range header triggers content-range serve for PIECE_JOINTE endpoint
                    "Range": "bytes=0-",
                    "User-Agent": "BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  EDMOBILE v7.8.2"
                },
                body: encodedBody
            };

            const response = await fetch(url, fetchOptions);

            // Check HTTP status first — specific codes need specific handling
            if (response.status === 404) throw new Error("Fichier introuvable (404).");
            if (response.status === 401 || response.status === 403) throw new Error("Token invalide !");

            // Use arrayBuffer to correctly handle BOTH text (JSON/base64) and binary file content
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);

            let text = "";
            if (bytes.length > 0) {
                // First try UTF-8 decode (covers JSON error responses and ED base64 text)
                const decoder = new TextDecoder('utf-8', { fatal: false });
                text = decoder.decode(buffer);
                // Heuristic: if content has many non-printable chars, treat as raw binary
                const nonPrintable = bytes.filter(b => b < 0x09 || (b > 0x0D && b < 0x20)).length;
                if (nonPrintable > bytes.length * 0.05) {
                    // Raw binary file — re-encode as base64 for FileSystem.writeAsStringAsync
                    const binary = bytes.reduce((acc, b) => acc + String.fromCharCode(b), '');
                    text = btoa(binary);
                }
            }

            // Log all response headers for debugging
            const allHeaders: Record<string, string> = {};
            response.headers.forEach((v, k) => { allHeaders[k] = v; });
            console.log(`[ULTIMATE] Download Response Status: ${response.status} | Headers: ${JSON.stringify(allHeaders)}`);
            console.log(`[ULTIMATE] Download Response Preview: ${text.substring(0, 150)}...`);

            // Check if response is JSON Error
            try {
                const json = JSON.parse(text);
                if (json.code === 520 || json.message === "Token invalide !") {
                    console.warn("[ULTIMATE] Server returned 520 / Token Invalid");
                    throw new Error("Token invalide !");
                }
                if (json.code && json.code !== 200) {
                    console.warn(`[ULTIMATE] Server returned error code: ${json.code} - ${json.message}`);
                    throw new Error(json.message || "Download failed");
                }
            } catch (e) {
                if ((e as Error).message === "Token invalide !" || (e as Error).message === "Download failed") throw e;
            }

            return text;

        } catch (e) {
            console.error("[ULTIMATE] Download Bridge Error:", e);
            throw e;
        }
    }

    static async parseEcoleDirecte(title: string, id: string, url: string, body: string, success: (data: any) => Promise<any>, verbe = "post") {
        if (!id || id === "undefined") return -1;

        // Check the account serviceType to route the request
        const account = await this.getSpecificAccount(id);
        if (account && account.serviceType === "pronote") {
            return await PronoteDriver.parseEcoleDirecte(title, id, url, body, success, verbe);
        } else if (account && account.serviceType === "skolengo_ent") {
            return await SkolengoDriver.parseEcoleDirecte(title, id, url, body, success, verbe);
        }

        const endpointsNeedingVerbGet = ["notes.awp", "emploidutemps.awp", "cahierdetexte", "viescolaire.awp", "messages"];
        let method = (verbe || "post").toUpperCase();

        if (method === 'PUT') {
            url += (url.includes('?') ? '&' : '?') + "verbe=put";
            method = 'POST';
        } else if (endpointsNeedingVerbGet.some(ep => url.includes(ep)) && !url.includes("verbe=")) {
            url += (url.includes('?') ? '&' : '?') + "verbe=get";
            method = "POST";
        }

        const finalUrl = url + (url.includes('?') ? '&' : '?') + `v=7.8.2`;
        let token = await StorageHandler.getData("token");
        token = this.decodeToken(typeof token === 'string' ? token : "");

        if (token === "DEMO_TOKEN_123456789") {
            return await this._handleDemoFetch(title, success);
        }

        try {
            const fetchOptions: any = {
                method: method,
                headers: {
                    "X-Token": token || "",
                    "Content-Type": "x-www-form-urlencoded",
                    "User-Agent": "BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) EDMOBILE v7.8.2"
                }
            };

            if (method !== 'GET' && method !== 'HEAD' && body) {
                if (typeof body === 'string' && body.startsWith("data=")) {
                    fetchOptions.body = new URLSearchParams({ data: body.substring(5) }).toString();
                } else {
                    fetchOptions.body = body;
                }
            }

            const response = await fetch(finalUrl, fetchOptions);
            const data = await response.json();

            const newToken = response.headers.get("x-token");
            if (newToken) await StorageHandler.saveData("token", newToken);

            if (response.status === 200 && (data.code === 200 || data.code === 100)) {
                return await success(data.data);
            }
        } catch (e) { }
        return -1;
    }

    static async _handleDemoFetch(title: string, success: (data: any) => Promise<any>) {
        console.log(`[ULTIMATE] 🍏 DEMO FETCH: ${title}`);
        await new Promise(r => setTimeout(r, 400));

        if (title.includes("marks") || title.includes("Notes")) {
            return await success(DemoData.notes.data);
        }
        if (title.includes("Emploi du temps")) {
            return await success(DemoData.emploidutemps.data);
        }
        if (title.includes("Cahier de texte")) {
            return await success(DemoData.cahierdetexte.data);
        }
        if (title.includes("messages")) {
            return await success(DemoData.messagerie.data);
        }
        return await success({});
    }

    static async getPreference(key: string, defaultValue: any = null) {
        const prefs = await StorageHandler.getData("user_preferences") as any || {};
        return prefs[key] !== undefined ? prefs[key] : defaultValue;
    }

    static async setPreference(key: string, value: any) {
        const prefs = await StorageHandler.getData("user_preferences") as any || {};
        prefs[key] = value;
        await StorageHandler.saveData("user_preferences", prefs);
    }

    static async getSelectedAccount() {
        const id = await StorageHandler.getData("selectedAccount");
        return (id === "undefined" || !id) ? null : id;
    }

    static async setSelectedAccount(id: string) {
        if (id && id !== "undefined") await StorageHandler.saveData("selectedAccount", String(id));
    }

    static async getMainAccount() {
        const accs = await StorageHandler.getData("accounts");
        if (!Array.isArray(accs) || accs.length === 0) return null;
        return accs[0];
    }

    static async getSpecificAccount(id: string) {
        const accs = await StorageHandler.getData("accounts");
        if (!Array.isArray(accs)) return null;
        return accs.find((a: any) => String(a.id) === String(id)) || null;
    }

    static async eraseData() {
        const keys = ["token", "accounts", "selectedAccount", "credentials", "user_preferences", "device_uuid"];
        for (const key of keys) await StorageHandler.removeData(key);
    }
}

export default UltimateLoginEngine;
