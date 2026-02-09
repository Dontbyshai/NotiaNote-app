import { Client } from "@blockshub/blocksdirecte";
import StorageHandler from "./StorageHandler";

// VERSION 20250205_V7 - HEX DECODING + ID VALIDATION + URL CAPITALIZATION
class UltimateLoginEngine {
    static BUNDLE_ID = "ULTIMATE_20250205_V7";
    static USED_URL = "https://api.ecoledirecte.com";
    static temporary2FAToken = "";
    static wantToOpenDoubleAuthPopup = false;
    static openDoubleAuthPopup: (() => void) | null = null;
    static client: Client | null = null;

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
        // Return raw token without modification (BlocksDirecte uses raw Hex)
        // We verified that decoding it to Base64 caused 520 errors with Mobile Headers.
        if (!token) return "";
        return token.trim();
    }

    static async login(username: string, password: string, cn: string = "", cv: string = "") {
        try {
            if (!this.client) this.client = new Client();

            const deviceUUID = await this._getStableUUID();

            // FORCE TIMEOUT to avoid infinite hang
            const loginPromise = (this.client.auth as any).loginUsername(
                username, password, cn, cv, true, deviceUUID
            );

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("LOGIN_TIMEOUT_30S")), 30000)
            );

            const result = await Promise.race([loginPromise, timeoutPromise]) as any;

            if (result.accounts && result.accounts.length > 0) {
                const account = result.accounts[0];

                // --- ID SELECTION ---
                // Avoid using "undefined" as a string if account.id is missing
                const rawId = account.id || account.idLogin || (result as any).data?.accounts?.[0]?.id;
                const finalId = rawId ? String(rawId) : "";

                if (!finalId || finalId === "undefined") {
                    console.error("❌ CRITICAL: No valid Account ID found in login result!");
                    return -1;
                }

                // --- TOKEN SELECTION & DECODING ---
                // PRIORITIZE CLIENT TOKEN (UUID) - verified to be the correct session token
                const clientToken = (this.client as any).credentials?.token;

                const candidates = [
                    { val: clientToken, src: "client.credentials.token" },
                    { val: account.accessToken, src: "account.accessToken" },
                    { val: result.token, src: "result.token" }
                ].filter(c => c.val && typeof c.val === 'string' && c.val.length > 10);

                const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

                // If client token is UUID, pick it immediately
                let selected = candidates.find(c => c.src === "client.credentials.token" && isUUID(c.val)) ||
                    candidates.find(c => !isUUID(c.val)) ||
                    candidates[0];

                let mainToken = this.decodeToken(selected?.val || "");

                console.log(`🎯 SELECTED ID: ${finalId} | TOKEN SRC: ${selected?.src}`);
                console.log(`📋 Cleaned Token: ${mainToken.substring(0, 15)}...`);

                // Get the RAW JSON object to ensure we have all fields (etablissement, nomEtablissement, etc.)
                // BlockDirecte objects might hide fields or use getters that ...spread misses.
                const rawAccount = (result as any).data?.accounts?.[0] || {};

                const accountData = {
                    ...rawAccount, // 1. Base: Raw JSON from server (Highest fidelity)
                    ...account,    // 2. Overlay: BlockDirecte processed fields (if any)
                    id: finalId,   // 3. Enforce: Our calculated stable ID
                    idLogin: String(account.idLogin || ""),
                    connectionToken: mainToken,
                };

                await StorageHandler.saveData("token", mainToken);
                await StorageHandler.saveData("accounts", [accountData]);
                await StorageHandler.saveData("selectedAccount", finalId);
                await StorageHandler.saveData("credentials", {
                    username, password,
                    additionals: { username, token: mainToken, deviceUUID }
                });

                return 1;
            }

            console.warn("⚠️ LOGIN FAILED: No accounts in result or empty accounts array");
            console.warn("Result structure:", JSON.stringify(result).substring(0, 200));
            return -1;
        } catch (error: any) {
            console.error("💥 LOGIN ERROR:", error.message);
            if (error.constructor.name === 'Require2FA' || error.name === 'Require2FA' || error.message.includes("Require2FA") || error.message.includes("2FA")) {
                if (error.token) {
                    this.temporary2FAToken = error.token;
                    this.wantToOpenDoubleAuthPopup = true;

                    // CRITICAL: Save credentials so refreshLogin can use them with CN/CV
                    await StorageHandler.saveData("credentials", { username, password });

                    if (this.openDoubleAuthPopup) this.openDoubleAuthPopup();
                    return 3;
                }
            }
            return -1;
        }
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
            console.log("[ULTIMATE] Fetching GTK Cookie...");
            const response = await fetch("https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.69.1", {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Origin": "https://www.ecoledirecte.com",
                    "Referer": "https://www.ecoledirecte.com/"
                }
            });

            // Extract Set-Cookie header
            const setCookie = response.headers.get("set-cookie");
            if (setCookie) {
                const match = setCookie.match(/gtk=([^;]+)/);
                if (match && match[1]) {
                    console.log(`[ULTIMATE] GTK Found: ${match[1]}`);
                    return match[1];
                }
            }
        } catch (e) {
            console.warn("[ULTIMATE] Failed to get GTK:", e);
        }
        return "";
    }

    static async parseEcoleDirecte(title: string, id: string, url: string, body: string, success: (data: any) => Promise<any>, verbe = "post") {
        // --- ID HYGIENE ---
        if (!id || id === "undefined") {
            console.log(`[ULTIMATE] ⚠️ Refusing bridge fetch for ${title}: ID is undefined!`);
            return -1;
        }

        // --- AUTO-FIX URL VERBS ---
        // BlocksDirecte sends POST requests to these URLs but with verbe=get in the query string.
        // We must mimic this behavior.
        const endpointsNeedingVerbGet = ["notes.awp", "emploidutemps.awp", "cahierdetexte", "viescolaire.awp", "messages"];
        let autoAddVerb = false;

        let method = (verbe || "post").toUpperCase();

        // --- SPECIFIC HANDLING FOR 'PUT' (Updates like validating homework) ---
        if (method === 'PUT') {
            if (!url.includes("verbe=")) {
                console.log(`[ULTIMATE] Transforming PUT -> POST + verbe=put for: ${url}`);
                url += (url.includes('?') ? '&' : '?') + "verbe=put";
            }
            method = 'POST'; // ED API accepts updates via POST + verbe=put
        }
        // --- STANDARD HANDLING (Fetches: 'notes', 'cahierdetexte', etc.) ---
        else {
            if (endpointsNeedingVerbGet.some(ep => url.includes(ep)) && !url.includes("verbe=")) {
                console.log(`[ULTIMATE] Auto-fixing URL verb (get) for: ${url}`);
                url += (url.includes('?') ? '&' : '?') + "verbe=get";
                autoAddVerb = true;
                method = "POST"; // Force POST for these fake GETs (even if caller asked for GET)
            }
        }

        // Handling explicit GET request overrides (rare)
        if (url.includes("verbe=get") && !autoAddVerb && verbe === "get") {
            method = "GET";
        }

        const finalUrl = url + (url.includes('?') ? '&' : '?') + `v=7.8.2`;
        console.log(`[ULTIMATE] Bridge fetch: ${title} (${method}) -> ${finalUrl}`);

        let token = await StorageHandler.getData("token");
        token = this.decodeToken(token || "");

        // BlocksDirecte Signature Match

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const fetchOptions: any = {
                method: method,
                headers: {
                    "X-Token": token || "",
                    "Content-Type": "x-www-form-urlencoded",
                    "User-Agent": "BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  EDMOBILE v7.8.2"
                },
                signal: controller.signal
            };

            if (method === 'GET' || method === 'HEAD') {
                delete fetchOptions.headers["Content-Type"];
            } else if (body) {
                // ENCODING FIX: Ensure body is properly URL-encoded like BlocksDirecte
                if (typeof body === 'string' && body.startsWith("data=")) {
                    try {
                        const jsonPart = body.substring(5); // Remove "data=" prefix
                        fetchOptions.body = new URLSearchParams({ data: jsonPart }).toString();
                        console.log(`[ULTIMATE] Encoded Body: ${fetchOptions.body.substring(0, 50)}...`);
                    } catch (e) {
                        console.warn("[ULTIMATE] Failed to encode body, using raw:", e);
                        fetchOptions.body = body;
                    }
                } else {
                    fetchOptions.body = body;
                }
            }

            const response = await fetch(finalUrl, fetchOptions);
            clearTimeout(timeout);

            const text = await response.text();
            if (!text || text.trim() === "") return -1;

            let data;
            try { data = JSON.parse(text); } catch (e: any) {
                console.log(`[ULTIMATE] JSON Error for ${title}: ${e.message}`);
                console.log(`[ULTIMATE] Raw Response Preview: ${text.substring(0, 200)}`);
                return -1;
            }

            // RE-SAVE TOKEN if updated by server
            const newToken = response.headers.get("x-token");
            if (newToken) {
                console.log("[ULTIMATE] Updating Token from Response Header");
                await StorageHandler.saveData("token", newToken);
            }

            if (response.status === 200 && (data.code === 200 || data.code === 100)) {
                return await success(data.data);
            }

            console.log(`[ULTIMATE] Bridge failed for ${title}: ${data.message} (${data.code})`);
        } catch (e: any) {
            console.log(`[ULTIMATE] Bridge Exception for ${title}: ${e.message}`);
        }
        return -1;
    }

    static async getPreference(key: string, defaultValue: any = null) {
        const prefs = await StorageHandler.getData("user_preferences") || {};
        return prefs[key] !== undefined ? prefs[key] : defaultValue;
    }

    static async setPreference(key: string, value: any) {
        const prefs = await StorageHandler.getData("user_preferences") || {};
        prefs[key] = value;
        await StorageHandler.saveData("user_preferences", prefs);
    }

    static async getSelectedChildAccount() {
        const id = await StorageHandler.getData("selectedAccount");
        return (id === "undefined" || !id) ? null : id;
    }

    static async setSelectedChildAccount(id: string) {
        if (id && id !== "undefined") await StorageHandler.saveData("selectedAccount", String(id));
    }

    static async getMainAccount() {
        const accs = await StorageHandler.getData("accounts");
        if (!Array.isArray(accs) || accs.length === 0) return null;
        return accs[0].id === "undefined" ? null : accs[0];
    }

    static async getSpecificAccount(id: string) {
        const accs = await StorageHandler.getData("accounts");
        return Array.isArray(accs) ? accs.find((a: any) => String(a.id) === String(id)) : null;
    }

    static async _getMainAccountOfAnyAccount(id: string) {
        // For now, return the main account as fallback, or the specific if found.
        // In a true parent/child structure, we might need to lookup parent of 'id'.
        return await this.getSpecificAccount(id) || await this.getMainAccount();
    }

    static async refreshLogin() {
        let creds = await StorageHandler.getData("credentials") as any;
        if (!creds) return -1;

        // Check for 2FA tokens
        const daTokens = await StorageHandler.getData("double-auth-tokens") as any;
        const cn = daTokens?.cn || "";
        const cv = daTokens?.cv || "";

        console.log(`[Ultimate] Refreshing login (Has 2FA tokens: ${!!cn})`);
        return await this.login(creds.username, creds.password, cn, cv);
    }

    static async eraseData() {
        const keys = ["token", "accounts", "selectedAccount", "credentials", "user_preferences", "device_uuid"];
        for (const key of keys) await StorageHandler.removeData(key);
    }

    /**
     * Performs a background re-login solely to refresh the token.
     * Returns the new token string if successful, null otherwise.
     */
    static async reLoginOnly(): Promise<string | null> {
        try {
            console.log("[Ultimate] Background Re-Login initiated...");
            const creds = await StorageHandler.getData("credentials") as any;
            if (!creds || !creds.username || !creds.password) {
                console.warn("[Ultimate] Cannot re-login: Credentials missing.");
                return null;
            }

            // Retrieve 2FA tokens if they exist
            // Important: We use the stored ones, or check if 'creds' has them in 'fa' field
            let cn = "";
            let cv = "";

            // Try explicit storage first
            const daTokens = await StorageHandler.getData("double-auth-tokens") as any;
            if (daTokens) {
                cn = daTokens.cn || "";
                cv = daTokens.cv || "";
            } else if (creds.fa) {
                // Fallback to credentials object if it stored them
                cn = creds.fa.cn || "";
                cv = creds.fa.cv || "";
            }

            // Perform Login with extended timeout for background re-login
            // This updates Storage with new token automatically inside login()
            const loginPromise = this.login(creds.username, creds.password, cn, cv);
            const timeoutPromise = new Promise<number>((_, reject) =>
                setTimeout(() => reject(new Error("RELOGIN_TIMEOUT_45S")), 45000)
            );

            const resultReference = await Promise.race([loginPromise, timeoutPromise]) as number;

            if (resultReference === 1) {
                // Login succeeded! Now refresh GTK to get cookies that match this new session
                console.log("[Ultimate] Login succeeded, refreshing GTK for new session...");
                try {
                    await Promise.race([
                        this.refreshGTK(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("GTK_TIMEOUT")), 10000))
                    ]);
                } catch (gtkError) {
                    console.warn("[Ultimate] GTK refresh timeout/error after login:", gtkError);
                    // Continue anyway - we have the token at least
                }

                // Fetch the fresh token we just saved
                const newToken = await StorageHandler.getData("token");
                console.log("[Ultimate] Background Re-Login SUCCESS. New Token obtained.");
                return typeof newToken === 'string' ? newToken : null;
            } else {
                console.warn(`[Ultimate] Background Re-Login failed with code: ${resultReference}`);
                return null;
            }
        } catch (e) {
            console.error("[Ultimate] Background Re-Login Exception:", e);
            return null;
        }
    }

    static async downloadFile(fileId: string, fileType: string): Promise<string> {
        try {
            console.log(`[ULTIMATE] Bridge DOWNLOAD: ${fileId} (${fileType})`);

            const url = `${this.USED_URL}/v3/telechargement.awp?verbe=get&v=4.69.1&leTypeDeFichier=${fileType}&fichierId=${fileId}&forceDownload=1`;

            let token = await StorageHandler.getData("token");
            token = this.decodeToken(token || "");

            // Get Cookies
            const savedGtk = await StorageHandler.getData("gtk") as any;
            const { cookie, gtk } = savedGtk || { cookie: "", gtk: "" };
            console.log(`[ULTIMATE] Using Cookies for Download - GTK: ${gtk ? "YES" : "NO"} | Cookie: ${cookie ? "YES" : "NO"}`);

            const payload = {
                leTypeDeFichier: fileType,
                fichierId: fileId,
                forceDownload: 1
            };

            // Use the SAME encoding as parseEcoleDirecte (which works!)
            const body = `data=${JSON.stringify(payload)}`;
            const encodedBody = new URLSearchParams({ data: JSON.stringify(payload) }).toString();

            console.log(`[ULTIMATE] Download Body: ${encodedBody.substring(0, 100)}`);

            const fetchOptions: any = {
                method: "POST", // ED always POST
                headers: {
                    "X-Token": token || "",
                    "X-Gtk": gtk || "",
                    "Cookie": cookie || "",
                    "Content-Type": "x-www-form-urlencoded",
                    "User-Agent": "BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  EDMOBILE v7.8.2"
                },
                body: encodedBody
            };

            const response = await fetch(url, fetchOptions);
            const text = await response.text();

            console.log(`[ULTIMATE] Download Response Status: ${response.status}`);
            console.log(`[ULTIMATE] Download Response Preview: ${text.substring(0, 150)}...`);

            // Check if response is JSON Error
            try {
                const json = JSON.parse(text);
                if (json.code === 520 || json.message === "Token invalide !") {
                    console.warn("[ULTIMATE] Server returned 520 / Token Invalid");
                    throw new Error("Token invalide !"); // Rethrow for catcher
                }
                if (json.code && json.code !== 200) {
                    console.warn(`[ULTIMATE] Server returned error code: ${json.code} - ${json.message}`);
                    throw new Error(json.message || "Download failed");
                }
            } catch (e) {
                // Ignore JSON parse error, it means content is likely the file (good)
                // BUT if we threw "Token invalide" above, it will be caught here if we don't differentiate.
                if ((e as Error).message === "Token invalide !" || (e as Error).message === "Download failed") throw e;
            }

            return text;

        } catch (e) {
            console.error("[ULTIMATE] Download Bridge Error:", e);
            throw e;
        }
    }

    static async refreshGTK() {
        try {
            console.log("[ULTIMATE] Refreshing GTK Cookie & Storage...");
            // Use the Exact same UA as downloadAttachment to ensure cookie validity
            const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

            const response = await fetch("https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.69.1", {
                method: "GET",
                headers: {
                    "User-Agent": IOS_UA,
                    "Origin": "https://www.ecoledirecte.com",
                    "Referer": "https://www.ecoledirecte.com/"
                }
            });

            // Extract Set-Cookie header
            const setCookie = response.headers.get("set-cookie") || "";
            let gtkValue = "";

            if (setCookie) {
                const match = setCookie.match(/gtk=([^;]+)/);
                if (match && match[1]) {
                    gtkValue = match[1];
                }
                // Also support lowercase 'gtk' just in case
                if (!gtkValue) {
                    const match2 = setCookie.match(/GTK=([^;]+)/);
                    if (match2 && match2[1]) gtkValue = match2[1];
                }
            }

            if (gtkValue) {
                console.log(`[ULTIMATE] GTK Refreshed: ${gtkValue}`);
                await StorageHandler.saveData("gtk", { gtk: gtkValue, cookie: setCookie });
            } else {
                console.warn("[ULTIMATE] GTK Refresh failed: No GTK found in cookie");
            }
        } catch (e) {
            console.warn("[ULTIMATE] Failed to refresh GTK:", e);
        }
    }
}

// Interop fix: ensure some components can find it as .default
(UltimateLoginEngine as any).default = UltimateLoginEngine;

export default UltimateLoginEngine;
