import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { parseHtmlData } from './Encoding';
import { fetchED } from '../util/functions';
import AccountHandler from '../core/AccountHandler'; // Import AccountHandler

// Configuration
const API_URL = 'https://api.ecoledirecte.com';
const API_VERSION = '4.75.0';
const USER_AGENT = 'Mozilla/5.0';

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
                            token: AccountHandler.getMainAccount()?.connectionToken // Pass current token
                        }
                    });
                    return 1;
                },
                verbe,
                accountId
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
        // endpoint: eleves/{id}/viescolaire.awp
        // verbe: get
        return this._bridgeToAccountHandler(
            "Vie Scolaire",
            accountId,
            `eleves/${accountId}/viescolaire.awp?v=${API_VERSION}`,
            {},
            "get"
        );
    }

    // --- Messaging ---

    async getMessages(accountId, type = "received", folderId = 0) {
        const schoolYear = this.getSchoolYear();
        const args = `&force=false&typeRecuperation=${type}&idClasseur=${folderId}&orderBy=date&order=desc&query=&onlyRead=&getAll=1`;

        return this._bridgeToAccountHandler(
            "Messages",
            accountId,
            `eleves/${accountId}/messages.awp?v=${API_VERSION}&anneeMessages=${schoolYear}${args}`,
            { anneeMessages: schoolYear },
            "get"
        );
    }

    async createMessageFolder(name) {
        // Note: Needs an accountId to route properly in AccountHandler context.
        // Assuming context is known or passed. If not, might be tricky.
        // For now, let's try to get main account ID from storage if possible or error.
        const mainAccount = await AccountHandler.getMainAccount();
        const accountId = mainAccount?.id || 0;

        return this._bridgeToAccountHandler(
            "Create Folder",
            accountId,
            `messagerie/classeurs.awp?v=${API_VERSION}`,
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
            `messagerie/classeur/${folderId}.awp?v=${API_VERSION}`,
            {},
            "delete"
        );
    }

    async getMessageContent(accountId, messageId) {
        const schoolYear = this.getSchoolYear();
        return this._bridgeToAccountHandler(
            "Message Content",
            accountId,
            `eleves/${accountId}/messages/${messageId}.awp?v=${API_VERSION}&mode=destinataire&anneeMessages=${schoolYear}`,
            { anneeMessages: schoolYear },
            "get"
        );
    }

    async markAsRead(accountId, messageId) {
        return this._bridgeToAccountHandler(
            "Mark Read",
            accountId,
            `eleves/${accountId}/messages/${messageId}.awp?v=${API_VERSION}`,
            { read: true },
            "put"
        );
    }

    async deleteMessage(accountId, messageId) {
        return this._bridgeToAccountHandler(
            "Delete Message",
            accountId,
            `eleves/${accountId}/messages/${messageId}.awp?v=${API_VERSION}`,
            {},
            "delete"
        );
    }

    async moveMessage(accountId, messageId, folderId) {
        return this._bridgeToAccountHandler(
            "Move Message",
            accountId,
            `eleves/${accountId}/messages.awp?v=${API_VERSION}`,
            {
                action: "deplacer",
                idClasseur: folderId,
                ids: [`${messageId}:-1`]
            },
            "put"
        );
    }

    // --- Downloads ---

    async downloadAttachment(fileId, fileType = "FICHIER_CDT") {
        const StorageHandler = require('../core/StorageHandler').default;

        // 1. Get Token
        const mainAccount = await AccountHandler.getMainAccount();
        const token = mainAccount?.connectionToken || AccountHandler.temporaryLoginToken;

        // 2. Get GTK
        const savedGtk = await StorageHandler.getData("gtk");
        const { cookie, gtk } = savedGtk || { cookie: "", gtk: "" };

        // 3. Request
        // Note: Endpoint typically uses 'telechargement.awp'
        const url = `${API_URL}/v3/telechargement.awp?verbe=get&v=${API_VERSION}&leTypeDeFichier=${fileType}&fichierId=${fileId}`;
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
            'Host': 'api.ecoledirecte.com',
            'Connection': 'keep-alive',
            'X-Token': token,
            'X-Gtk': gtk,
            'Cookie': cookie,
        };

        try {
            console.log(`[EcoleDirecteApi] Downloading ${fileId} (${fileType})...`);
            const response = await this.fetchED(url, {
                method: 'POST',
                headers,
                body: 'data={}',
                parseJson: false
            });

            if (response.status === 200) {
                return response.data; // Should be base64 string
            } else {
                console.warn(`Download failed: ${response.status}`);
                throw new Error(`Download failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("Download Error:", error);
            throw error;
        }
    }
    getSchoolYear() {
        const today = new Date();
        const month = today.getMonth(); // 0-11
        const year = today.getFullYear();
        return (month >= 8) ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }
}

export default new EcoleDirecteApi();
