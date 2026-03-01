import StorageHandler from "../StorageHandler";

export class SkolengoDriver {
    // Skolengo needs to perform OAuth flow. For now, simulating similarly to Pronote
    static async login(username: string, password: string, url: string, cas: string, deviceUUID: string) {
        try {
            // TODO: Skolengo uses OAuth and WebView flow usually, or direct login if supported by skolengojs.
            // For now, logging a placeholder and returning success if username is provided.
            console.log("Skolengo login triggered for", username);

            if (!username) return -1;

            const fakeToken = "skolengo_auth_" + Date.now();

            const accountData = {
                id: username, // Using username as ID
                idLogin: username,
                typeCompte: "E", // Eleve
                nom: username,
                prenom: "",
                identifiant: username,
                logo: "",
                modules: [
                    { "code": "NOTES", "enable": true },
                    { "code": "VIE_SCOLAIRE", "enable": true },
                    { "code": "CAHIER_DE_TEXTES", "enable": true },
                    { "code": "EDT", "enable": true },
                    { "code": "MESSAGERIE", "enable": true }
                ],
                parametresIndividuels: {
                    "laccueil": true,
                    "leCahierDeTextes": true,
                    "lesNotes": true,
                    "lEmploiDuTemps": true,
                    "laVieScolaire": true,
                    "laMessagerie": true
                },
                profile: {
                    sexe: "M",
                    info: "",
                    classe: { id: 1, code: "", libelle: "" },
                    photo: ""
                },
                nomEtablissement: "SKOLENGO",
                email: "",
                anneeScolaireCourante: "2023-2024",
                serviceType: "skolengo_ent",
                connectionToken: fakeToken,
            };

            await StorageHandler.saveData("token", fakeToken);
            await StorageHandler.saveData("accounts", [accountData]);
            await StorageHandler.saveData("selectedAccount", String(username));
            await StorageHandler.saveData("credentials", {
                username,
                password,
                serviceType: "skolengo_ent",
            });

            return 1;
        } catch (error) {
            console.error("Skolengo Login Error:", error);
            return -1;
        }
    }

    static async loginWithOAuth(authData: any, schoolName: string, emsCode: string, tokenEndpoint: string) {
        try {
            console.log("Skolengo OAuth Login completing for", authData.firstName, authData.lastName);

            const userId = authData.username || `${authData.firstName}_${authData.lastName}`.toLowerCase();
            const token = authData.refreshToken || authData.accessToken;

            const accountData = {
                id: userId,
                idLogin: userId,
                typeCompte: "E", // Eleve
                nom: authData.lastName || "",
                prenom: authData.firstName || "",
                identifiant: userId,
                logo: "",
                modules: [
                    { "code": "NOTES", "enable": true },
                    { "code": "VIE_SCOLAIRE", "enable": true },
                    { "code": "CAHIER_DE_TEXTES", "enable": true },
                    { "code": "EDT", "enable": true },
                    { "code": "MESSAGERIE", "enable": true }
                ],
                parametresIndividuels: {
                    "laccueil": true,
                    "leCahierDeTextes": true,
                    "lesNotes": true,
                    "lEmploiDuTemps": true,
                    "laVieScolaire": true,
                    "laMessagerie": true
                },
                profile: {
                    sexe: "M",
                    info: "",
                    classe: { id: 1, code: authData.className || "", libelle: authData.className || "" },
                    photo: ""
                },
                nomEtablissement: schoolName || "SKOLENGO",
                email: "",
                anneeScolaireCourante: "2023-2024",
                serviceType: "skolengo_ent",
                connectionToken: token,
            };

            await StorageHandler.saveData("token", token);
            await StorageHandler.saveData("accounts", [accountData]);
            await StorageHandler.saveData("selectedAccount", String(userId));
            await StorageHandler.saveData("credentials", {
                username: userId,
                password: "*****",
                serviceType: "skolengo_ent",
                additionals: {
                    refreshUrl: authData.refreshURL,
                    wellKnown: authData.wellKnown,
                    tokenEndpoint: tokenEndpoint,
                    emsCode: emsCode
                }
            });

            return 1;
        } catch (error) {
            console.error("Skolengo OAuth Login Error:", error);
            return -1;
        }
    }

    static async parseEcoleDirecte(title: string, id: string, url: string, body: string, success: (data: any) => Promise<any>, verbe = "post") {
        try {
            const accountData = await StorageHandler.getData("credentials") as any;
            if (!accountData || accountData.serviceType !== "skolengo_ent") return -1;

            const token = await StorageHandler.getData("token");
            if (token === "DEMO_TOKEN_123456789") {
                return -1; // Let engine demo handle it
            }

            console.log(`[SkolengoDriver] Fetching: ${title}`);

            if (url.includes("notes.awp")) {
                return await success(await this._getMarksEDFormat());
            } else if (url.includes("emploidutemps.awp") || title.toLowerCase().includes("emploi du temps")) {
                return await success(await this._getTimetableEDFormat());
            } else if (url.includes("cahierdetexte") || title.toLowerCase().includes("homework")) {
                return await success(await this._getHomeworkEDFormat());
            } else if (url.includes("viescolaire.awp")) {
                return await success(await this._getVieScolaireEDFormat());
            }

            return -1;

        } catch (error) {
            console.error("[SkolengoDriver] Fetch error:", error);
            return -1;
        }
    }

    // --- MAPPING FUNCTIONS (SKOLENGO -> ECOLEDIRECTE JSON FORMAT) ---
    static async _getMarksEDFormat() {
        return {
            periodes: [],
            notes: [],
            parametrage: { // Required by MarksHandler
                coefficientNote: true,
                moyenneCoefMatiere: true,
                colonneCoefficientMatiere: true
            }
        };
    }

    static async _getTimetableEDFormat() {
        return [];
    }

    static async _getHomeworkEDFormat() {
        return {};
    }

    static async _getVieScolaireEDFormat() {
        return { absences: [], retards: [], sanctions: [], encouragements: [] };
    }
}
