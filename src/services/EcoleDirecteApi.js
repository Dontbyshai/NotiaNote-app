import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { parseHtmlData } from './Encoding';
import { fetchED } from '../util/functions';
import AccountHandler from '../core/AccountHandler'; // Import AccountHandler
import UltimateLoginEngine from '../core/UltimateLoginEngine'; // Fix: Import directly for static methods

// Configuration
const API_URL = 'https://api.ecoledirecte.com';
const API_VERSION = '4.75.0';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

class EcoleDirecteApi {
    constructor() {
        this.token = null;
        this.accounts = null;
        this.gtk = null;
        this.cookie = null;
    }

    // --- Helpers ---
    getSchoolYear() {
        const today = new Date();
        const month = today.getMonth(); // 0-11
        const year = today.getFullYear();
        return (month >= 8) ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }

    // Helper to bridge to AccountHandler.parseEcoleDirecte
    async _bridgeToAccountHandler(title, accountId, endpoint, payload = {}, verbe = "post") {
        return new Promise(async (resolve) => {
            const url = `${AccountHandler.USED_URL}/v3/${endpoint}`;
            // Fix: Do NOT encode here. UltimateLoginEngine handles encoding.
            const body = `data=${JSON.stringify(payload)}`;

            const status = await AccountHandler.parseEcoleDirecte(
                title,
                accountId,
                url,
                body,
                async (data) => {
                    // Success callback: Resolve with a mocked axios-like structure
                    // The UI expects response.status = 200/etc
                    // And response.data to have { code: 200, data: ... }
                    resolve({
                        status: 200,
                        data: {
                            code: 200,
                            data: data, // The inner data from ED
                            token: (await AccountHandler.getMainAccount())?.connectionToken // Pass current token
                        }
                    });
                    return 1;
                },
                verbe
            );

            if (status !== 1) {
                // If AccountHandler failed (re-login failed or error), resolve with error
                resolve({
                    status: 500,
                    data: { code: 500, message: "Request failed via AccountHandler" }
                });
            }
        });
    }

    // --- Core Networking (Legacy/Internal) ---
    // Kept for methods that might still use 'request' directly if any, 
    // but we are migrating main features to bridge.
    async request(endpoint, payload = {}, options = {}) {
        // Fallback to bridge if possible for consistency
        if (options.accountId) {
            return this._bridgeToAccountHandler(
                endpoint,
                options.accountId,
                `${endpoint}?v=${API_VERSION}&verbe=${options.verbe || 'get'}${options.args || ''}`,
                payload,
                "post" // AccountHandler usually sends POST with verbe param in URL
            );
        }
        // ... (Old logic omitted for brevity, discouraged)
        return { status: 500, message: "Legacy request method deprecated for this operation" };
    }

    // --- 2FA Methods (Legacy/Backup) ---
    // DoubleAuthPopup uses fetchED directly now, so these are just safe stubs or backups.
    async getDoubleAuthQuestion(token, twoFaToken) {
        // ... implementation unrelated to current issue ...
        return { status: 500, message: "Use AccountHandler/Popup logic" };
    }
    async sendDoubleAuthResponse(token, twoFaToken, choiceRaw) {
        return { status: 500 };
    }


    // --- School Life (Vie Scolaire) ---
    async getSchoolLife(accountId) {
        return this._bridgeToAccountHandler(
            "Vie Scolaire",
            accountId,
            `eleves/${accountId}/viescolaire.awp`,
            {},
            "post" // Changed to post
        );
    }

    // --- Messaging ---

    async getMessages(accountId, type = "received", folderId = 0) {
        const schoolYear = this.getSchoolYear();
        const args = `force=false&typeRecuperation=${type}&idClasseur=${folderId}&orderBy=date&order=desc&query=&onlyRead=&getAll=1`;

        return this._bridgeToAccountHandler(
            "Messages",
            accountId,
            `eleves/${accountId}/messages.awp?anneeMessages=${schoolYear}&${args}`,
            { anneeMessages: schoolYear },
            "post" // Changed to post
        );
    }

    async createMessageFolder(name) {
        const mainAccount = await AccountHandler.getMainAccount();
        const accountId = mainAccount?.id || 0;

        return this._bridgeToAccountHandler(
            "Create Folder",
            accountId,
            `messagerie/classeurs.awp?verbe=post`,
            { libelle: name },
            "post"
        );
    }

    async deleteMessageFolder(folderId) {
        const mainAccount = await AccountHandler.getMainAccount();
        const accountId = mainAccount?.id || 0;

        return this._bridgeToAccountHandler(
            "Delete Folder",
            accountId,
            `messagerie/classeur/${folderId}.awp?verbe=delete`,
            {},
            "post"
        );
    }

    async getMessageContent(accountId, messageId) {
        const schoolYear = this.getSchoolYear();
        return this._bridgeToAccountHandler(
            "Message Content",
            accountId,
            `eleves/${accountId}/messages/${messageId}.awp?mode=destinataire&anneeMessages=${schoolYear}`,
            { anneeMessages: schoolYear },
            "post" // Changed to post
        );
    }

    async markAsRead(accountId, messageId) {
        return this._bridgeToAccountHandler(
            "Mark Read",
            accountId,
            `eleves/${accountId}/messages/${messageId}.awp`,
            { read: true },
            "put"
        );
    }

    async deleteMessage(accountId, messageId) {
        return this._bridgeToAccountHandler(
            "Delete Message",
            accountId,
            `eleves/${accountId}/messages/${messageId}.awp`,
            {},
            "delete"
        );
    }

    async moveMessage(accountId, messageId, folderId) {
        return this._bridgeToAccountHandler(
            "Move Message",
            accountId,
            `eleves/${accountId}/messages.awp`,
            {
                action: "deplacer",
                idClasseur: folderId,
                ids: [`${messageId}:-1`]
            },
            "put"
        );
    }

    // --- Downloads ---

    async downloadAttachment(fileId, fileType = "FICHIER_CDT", isRetry = false, accountId = "") {
        const StorageHandler = require('../core/StorageHandler').default;
        // Resolve accountId before try block so it's accessible in catch/retry
        let resolvedAccountId = accountId;

        try {
            console.log(`[EcoleDirecteApi] Downloading ${fileId} (${fileType}) via Direct Fetch...`);

            // 1. Get Token & Headers
            const mainAccount = await AccountHandler.getMainAccount();
            const savedGtk = await StorageHandler.getData("gtk");
            const { cookie, gtk } = savedGtk || { cookie: "", gtk: "" };

            // Resolve accountId from mainAccount if not explicitly provided
            if (!resolvedAccountId) resolvedAccountId = String(mainAccount?.id || "");

            // 1. Prepare Request via ULTIMATE BRIDGE
            // We delegate the fetch to UltimateLoginEngine to ensure consistent Headers/Tokens/GTK
            // and avoid 520 errors due to mismatched User-Agents or Cookies.

            let text = "";
            try {
                // Pass accountId so PIECE_JOINTE uses the account-scoped URL
                text = await UltimateLoginEngine.downloadFile(fileId, fileType, resolvedAccountId);
            } catch (bridgeError) {
                // Map specific bridge errors to something we catch below
                if (bridgeError.message === "Token invalide !") {
                    throw new Error("Token invalide !");
                }
                throw bridgeError;
            }
            // (No response object here, we got the text directly)

            // 4. Validate & Parse
            const safeText = text || "";
            console.log(`[EcoleDirecteApi] Bridge returned ${safeText.length} chars. Preview: ${safeText.substring(0, 100)}`);

            if (safeText.startsWith("<!DOCTYPE") || safeText.includes("<html")) {
                // EcoleDirecte redirected to login page — genuine session issue, retry allowed
                console.warn("[EcoleDirecteApi] Download returned HTML (Login Redirect)");
                throw new Error("Session expirée ou invalide. Déconnexion requise.");
            }
            if (safeText.trim() === "") {
                // Completely empty body from server — not a session issue, don't retry
                console.warn("[EcoleDirecteApi] Download returned empty body (0 bytes)");
                throw new Error("Fichier vide ou inaccessible. Essayez depuis EcoleDirecte web.");
            }

            // ED often wraps the base64 in a JSON object, OR returns it raw.
            try {
                // Try parsing as JSON to detect errors/wrapper
                const json = JSON.parse(safeText);

                // Check for Session Expiry / Login Page JSON pattern
                if (json.accounts || (json.code >= 500) || (json.message)) {
                    console.warn("[EcoleDirecteApi] Download returned API Error/Login response:", JSON.stringify(json).substring(0, 100));
                    throw new Error("Session terminées ou fichier inaccessible.");
                }

                // Unwrap common patterns
                let content = json.data || json;
                if (content.content) content = content.content; // { data: { content: "..." } }

                if (typeof content !== 'string') {
                    console.warn("[EcoleDirecteApi] JSON Content is not a string (file missing):", JSON.stringify(content).substring(0, 100));
                    throw new Error("Fichier introuvable ou type incorrect.");
                }

                // If it is a string, it might be the base64
                return content;

            } catch (e) {
                // If JSON.parse fails, it wasn't JSON. 
                // We assume it's the raw base64 string because we checked for HTML above.
                // UNLESS the previous block threw a specific Error, which we should rethrow.
                if (e.message.includes("Session") || e.message.includes("Fichier")) {
                    throw e;
                }

                // It's likely the raw string
                if (safeText.length > 50) {
                    return safeText;
                }
                throw new Error("Contenu du fichier invalide (trop court)");
            }

        } catch (error) {
            console.error("Download Error:", error);

            // AUTO-RETRY LOGIC IF TOKEN EXPIRED
            if ((error.message.includes("Session") || error.message.includes("Token")) && !isRetry) {
                console.log("[EcoleDirecteApi] Auth failed during download. Attempting re-login...");
                try {
                    // Fix: Use UltimateLoginEngine directly to avoid default export confusion
                    const newToken = await UltimateLoginEngine.reLoginOnly();
                    if (newToken) {
                        console.log("[EcoleDirecteApi] Re-login success. Retrying download directly...");
                        // Call itself recursively ONCE
                        return this.downloadAttachment(fileId, fileType, true, resolvedAccountId);
                    } else {
                        throw new Error("Impossible de rafraîchir la session. Veuillez relancer l'app.");
                    }
                } catch (reloginError) {
                    console.error("[EcoleDirecteApi] Re-login failed:", reloginError);
                    throw error; // Throw original error
                }
            }

            throw error;
        }
    }
}

export default new EcoleDirecteApi();
