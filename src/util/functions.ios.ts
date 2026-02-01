
// IOS SPECIFIC NETWORKING - AXIOS IMPLEMENTATION
import axios from "axios";
import StorageHandler from "../core/StorageHandler";

// Note: Using standard Axios which works reliably.

function useSecureFetch(url: string): boolean {
    return false; // Disable "Secure Fetch" logic for downstream
}

async function fetchED(url: string, { method, headers, body = null, parseJson = true }) {
    console.log(`[Axios] iOS Request to ${url}`);

    // Config object for Axios
    const config = {
        headers: headers
    };

    try {
        let response;
        if (method === "GET") {
            response = await axios.get(url, config);
        } else {
            // POST/PUT/etc
            response = await axios.post(url, body, config);
        }

        // Axios parses JSON by default in response.data
        // We need to normalize it to the shape the app expects: { status, data, headers }
        // The app expects 'data' to be the parsed object.

        return {
            status: response.status,
            data: response.data,
            headers: response.headers
        };
    } catch (error) {
        console.warn("[Axios] Error:", error.message);
        if (error.response) {
            console.warn("[Axios] Server responded with:", error.response.status, error.response.data);
            // Return the error response structure if available, so app logic (like 520 handling) can work
            return {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            };
        } else if (error.request) {
            console.warn("[Axios] No response received", error.request);
            throw new Error("Network Error: No response received");
        } else {
            throw error;
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
            },
        });

        // If request failed/returned empty structure
        if (!response || !response.headers) return { gtk: "", cookie: "" };

        var res = { gtk: "", cookie: "" };
        const setCookieHeader = response.headers["set-cookie"] || response.headers["Set-Cookie"];

        if (!setCookieHeader) return { gtk: "", cookie: "" };

        const cookiePart = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
        let cookieString = String(cookiePart);

        // Regex parsing
        const gtkMatch = cookieString.match(/GTK=([^;]+)/);

        if (gtkMatch && gtkMatch[1]) {
            const XGTK = gtkMatch[1];

            // SMART CLEANING: iOS Axios sends headers EXACTLY as provided.
            // Sending "Path=/" or "Domain=..." in a Cookie REQUEST header is invalid HTTP.
            // Android networking stack likely strips these automatically, but iOS doesn't.
            // We MUST clean them manually here.

            const cleanCookie = (raw: string) => {
                return raw.split(/[,;]/)
                    .map(p => p.trim())
                    .filter(p => {
                        const low = p.toLowerCase();
                        if (!low.includes('=')) return false;
                        const key = low.split('=')[0].trim();
                        // Noms d'attributs cookies indésirables dans une REQUÊTE
                        const blacklist = ['path', 'domain', 'expires', 'max-age', 'samesite', 'priority', 'secure', 'httponly'];
                        return !blacklist.includes(key);
                    })
                    .join('; ');
            };

            const smartCookie = cleanCookie(cookieString);

            res = { gtk: XGTK, cookie: smartCookie };
            await StorageHandler.saveData("gtk", res);
        } else {
            // Fallback parsing
            try {
                const firstPart = cookieString.split(';')[0];
                if (firstPart && firstPart.includes('=')) {
                    const XGTK = firstPart.split('=')[1];
                    res = { gtk: XGTK, cookie: cookieString };
                    await StorageHandler.saveData("gtk", res);
                }
            } catch (e) { }
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
        identifiant: username.trim(),
        motdepasse: password.trim(),
        isReLogin: false,
        uuid: "",
        fa: [{ cn: cn, cv: cv }],
        cn: cn, cv: cv
    };

    // Important: EcoleDirecte expects form-urlencoded body with a 'data' key containing the JSON
    const bodyStr = JSON.stringify(body);
    // Aligning Android with iOS standard fix
    const requestBody = `data=${encodeURIComponent(bodyStr)}`;

    const loginResponse = await fetchED(url.toString(), {
        method: "POST",
        body: requestBody,
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/x-www-form-urlencoded",
            // REVERT TO IPHONE USER AGENT (Standard)
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "X-Gtk": gtk ?? "---",
            "Cookie": cookie ?? "---",
            "Accept-Encoding": "gzip, compress, deflate, br",
            "2fa-Token": twoFAToken,
        },
    }).catch((error) => {
        onError(error);
        return;
    });

    return loginResponse;
}

export { getGtkToken, doLogin, fetchED, useSecureFetch };
