import { AccountKind, createSessionHandle, loginCredentials, loginToken, SessionHandle } from "pawnote";
import StorageHandler from "../StorageHandler";

export class PronoteDriver {
    static async login(username: string, password: string, url: string, cas: string, deviceUUID: string) {
        try {
            const handle = createSessionHandle();

            // Map the frontend UI string to actual pawnote AccountKind
            let kind = AccountKind.STUDENT; // Default
            if (url) {
                // Try to guess from url if possible.
                // Pawnote usually determines `url` and `kind` in its own methods,
                // but we take them from our UI's `extra` object.
            }

            const result = await loginCredentials(handle, {
                url: url,
                kind: kind,
                username: username,
                password: password,
                deviceUUID: deviceUUID
            });

            return await this._savePronoteAccount(result, username, password, cas, deviceUUID, kind);
        } catch (error) {
            console.error("Pronote Login Error:", error);
            return -1;
        }
    }

    static async loginWithToken(username: string, tokenString: string, url: string, cas: string, deviceUUID: string) {
        try {
            const handle = createSessionHandle();
            let kind = AccountKind.STUDENT;

            const result = await loginToken(handle, {
                url: url,
                kind: kind,
                username: username,
                token: tokenString,
                deviceUUID: deviceUUID
            });

            return await this._savePronoteAccount(result, username, "*****", cas, deviceUUID, kind);
        } catch (error) {
            console.error("Pronote LoginWithToken Error:", error);
            return -1;
        }
    }

    private static async _savePronoteAccount(result: any, originalUsername: string, originalPassword: string, cas: string, deviceUUID: string, kind: any) {
        // Map result to NotiaNote expected format
        const accountData = {
            id: result.username, // Using username as ID for ED compatibility if needed
            idLogin: result.username,
            typeCompte: "E", // Eleve
            nom: result.username, // Placeholder, might need better fetching if possible
            prenom: "",
            identifiant: originalUsername,
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
            nomEtablissement: "PRONOTE",
            email: "",
            anneeScolaireCourante: "2023-2024",
            serviceType: "pronote",
            connectionToken: result.token,
            pronoteSession: JSON.stringify(result),
            pronoteURL: result.url,
        };

        await StorageHandler.saveData("token", result.token);
        await StorageHandler.saveData("accounts", [accountData]);
        await StorageHandler.saveData("selectedAccount", String(result.username));
        await StorageHandler.saveData("credentials", {
            username: originalUsername,
            password: originalPassword,
            serviceType: "pronote",
            additionals: {
                instanceURL: result.url,
                kind: kind,
                cas: cas,
                deviceUUID: deviceUUID,
            }
        });

        return 1;
    }

    static async parseEcoleDirecte(title: string, id: string, url: string, body: string, success: (data: any) => Promise<any>, verbe = "post") {
        try {
            // We need to recreate the pawnote SessionHandle from stored token
            const accountData = await StorageHandler.getData("credentials") as any;
            if (!accountData || accountData.serviceType !== "pronote") return -1;

            const handle = createSessionHandle();
            // TODO: In a real environment, pawnote needs token login to recreate the session properly.
            // For now, we will just use the demo fetch if token is "DEMO_TOKEN_123456789"
            const token = await StorageHandler.getData("token");
            if (token === "DEMO_TOKEN_123456789") {
                // Let the engine's demo handle it (we'll modify engine to route demo fetches)
                return -1; // Temp fallback
            }

            console.log(`[PronoteDriver] Fetching: ${title}`);

            // To map Pronote to ED, we check the requested endpoint
            if (url.includes("notes.awp")) {
                return await success(await this._getMarksEDFormat(handle));
            } else if (url.includes("emploidutemps.awp") || title.toLowerCase().includes("emploi du temps")) {
                // Needs body parsing for dateDebut/dateFin
                let payload: any = {};
                try {
                    if (body.startsWith("data=")) {
                        payload = JSON.parse(decodeURIComponent(body.substring(5)));
                    } else {
                        payload = JSON.parse(body);
                    }
                } catch (e) { }
                return await success(await this._getTimetableEDFormat(handle, payload.dateDebut, payload.dateFin));
            } else if (url.includes("cahierdetexte") || title.toLowerCase().includes("homework")) {
                return await success(await this._getHomeworkEDFormat(handle));
            } else if (url.includes("viescolaire.awp")) {
                return await success(await this._getVieScolaireEDFormat(handle));
            }

            return -1;

        } catch (error) {
            console.error("[PronoteDriver] Fetch error:", error);
            return -1;
        }
    }

    // --- MAPPING FUNCTIONS (PRONOTE -> ECOLEDIRECTE JSON FORMAT) ---
    static async _getMarksEDFormat(handle: SessionHandle) {
        // Here we would call pawnote's fetchGrades and map them.
        // ED format expects: { periodes: [ {idPeriode, ..., ensembleMatieres: { disciplines: [{...}] } } ], notes: [...] }
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

    static async _getTimetableEDFormat(handle: SessionHandle, start: string, end: string) {
        // Return ED Timetable Array
        return [];
    }

    static async _getHomeworkEDFormat(handle: SessionHandle) {
        // ED Homework format: returns { "YYYY-MM-DD": [ { idDevoir, codeMatiere, matiere, aFaire, contenu, ...} ] }
        return {};
    }

    static async _getVieScolaireEDFormat(handle: SessionHandle) {
        return { absences: [], retards: [], sanctions: [], encouragements: [] };
    }
}
