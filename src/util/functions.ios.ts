import { Platform } from "react-native";
let sslFetch;
// Enable for both iOS and Android
if (Platform.OS == "ios" || Platform.OS == "android") {
    try {
        const { fetch } = require("react-native-ssl-pinning");
        sslFetch = fetch;
    } catch (e) {
        console.warn("react-native-ssl-pinning not found/loaded in functions.ios.ts");
    }
}

import axios from "axios";
import StorageHandler from "../core/StorageHandler";
import APIEndpoints from "../core/APIEndpoints";


// Parse ÉcoleDirecte - iOS Specific (Axios)
function useSecureFetch(url: string): boolean {
    return false; // Force Axios on iOS
}

async function fetchED(url: string, { method, headers, body = null, parseJson = true }) {
    if (useSecureFetch(url) && sslFetch) {
        // Unused block in iOS file but kept for structure
        return sslFetch(url, {
            method: method,
            timeoutInterval: 10000,
            sslPinning: { certs: [] },
            headers: headers,
            body: (body == null) ? undefined : body,
            disableAllSecurity: true,
        }).then(response => {
            let data = response.bodyString;
            if (parseJson && typeof data === 'string' && data.length > 0) {
                try { data = JSON.parse(data); } catch (e) { }
            }
            return { status: response.status, data: data, headers: response.headers };
        }).catch(err => { throw err; });
    } else {
        // Always used on iOS
        if (method == "GET") {
            return axios.get(url, { headers: headers });
        } else {
            return axios.post(url, body, { headers: headers });
        }
    }
}


// Get token for login
async function getGtkToken(urlBase: string): Promise<{ gtk: string; cookie: string }> {
    var url = new URL(`${urlBase}/v3/login.awp`);
    url.searchParams.set("v", "4.75.0");
    url.searchParams.set("gtk", "1");

    try {
        const response = await fetchED(url.toString(), {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                "Accept": "application/json, text/plain, */*",
                "Accept-Encoding": "identity",
                "Host": "api.ecoledirecte.com",
                "Connection": "keep-alive",
            },
        });

        var res = { gtk: "", cookie: "" };
        // Handle both cases for headers
        const setCookieHeader = response.headers["Set-Cookie"] || response.headers["set-cookie"];

        if (!setCookieHeader) {
            console.warn("No Set-Cookie header found");
            return { gtk: "", cookie: "" };
        }

        const cookiePart = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

        if (!cookiePart) {
            throw new Error("Empty cookie part");
        }

        // Parsing ROBUSTE
        let cookieString = "";
        if (Array.isArray(setCookieHeader)) {
            cookieString = setCookieHeader.join("; ");
        } else {
            cookieString = String(setCookieHeader);
        }

        // Regex pour trouver "GTK=xxxxx;"
        const gtkMatch = cookieString.match(/GTK=([^;]+)/);

        if (gtkMatch && gtkMatch[1]) {
            const XGTK = gtkMatch[1];
            res = { gtk: XGTK, cookie: cookieString };
            await StorageHandler.saveData("gtk", res);
        } else {
            console.warn("Could not find GTK in cookies via Regex, trying permissive fallback");
            try {
                const firstPart = cookieString.split(';')[0];
                if (firstPart && firstPart.includes('=')) {
                    const parts = firstPart.split('=');
                    const candidate1 = parts[0];
                    const candidate2 = parts[1];
                    const XGTK = candidate2.length > candidate1.length ? candidate2 : candidate1;
                    const cleanCookie = `${firstPart}`;
                    res = { gtk: XGTK, cookie: cleanCookie };
                    await StorageHandler.saveData("gtk", res);
                } else {
                    const XGTK = firstPart;
                    res = { gtk: XGTK, cookie: firstPart };
                    await StorageHandler.saveData("gtk", res);
                }
            } catch (e) {
                console.warn("Permissive fallback exception:", e);
                return { gtk: "", cookie: "" };
            }
        }

        return res;
    } catch (e) {
        console.warn("An error occured while getting GTK : ", e);
        return { gtk: "", cookie: "" };
    }
}

// Do the login
async function doLogin(username: string, password: string, gtk: string, cookie: string, twoFAToken: string, cn: string, cv: string, onError: Function, urlBase: string) {
    var url = new URL(`${urlBase}/v3/login.awp`);
    url.searchParams.set("v", "4.75.0");

    const body = {
        identifiant: encodeURIComponent(username),
        motdepasse: encodeURIComponent(password),
        isReLogin: false,
        uuid: "",
        fa: [{ cn: cn, cv: cv }],
        cn: cn, cv: cv
    };

    /* Login Body Standard (Axios-compatible) */
    // iOS FIX: ENCODE THE JSON BODY FOR AXIOS
    const requestBody = `data=${encodeURIComponent(JSON.stringify(body))}`;

    const loginResponse = await fetchED(url.toString(), {
        method: "POST",
        body: requestBody,
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "X-Gtk": gtk ?? "---",
            "Cookie": cookie ?? "---",
            "Accept-Encoding": "gzip, compress, deflate, br",
            "Host": "api.ecoledirecte.com",
            "Connection": "keep-alive",
            "2fa-Token": twoFAToken,
        },
    }).then(async (response) => {
        let parsedData = response.data;
        if (useSecureFetch(url.toString())) {
            try {
                if (typeof response.json === 'function') {
                    parsedData = await response.json();
                } else if (response.bodyString) {
                    parsedData = JSON.parse(response.bodyString);
                } else if (typeof response.data === 'string') {
                    parsedData = JSON.parse(response.data);
                }
            } catch (e) {
                console.warn("Error parsing response JSON", e);
                parsedData = response.data || {};
            }
        }
        return {
            status: response.status,
            data: parsedData,
            headers: response.headers,
        };
    }).catch((error) => {
        onError(error);
        return;
    });

    return loginResponse;
}

export { getGtkToken, doLogin, fetchED, useSecureFetch };
