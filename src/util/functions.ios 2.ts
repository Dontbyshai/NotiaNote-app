/* 
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * ! V25 - NETWORK LAYER RECOVERY                                           !
 * ! SYNC TRIGGER: 2026-02-04 19:20                                         !
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */
import { Platform } from "react-native";
import StorageHandler from "../core/StorageHandler";

const STANDARD_UA = "EcoleDirecte/7.8.3 iPhone15,2 iOS/17.5.1";
const API_VERSION = "4.75.0";

async function fetchED(url: string, { method, headers, body = null }) {
    console.log(`[V25-NET] >>> ${method} ${url}`);

    try {
        const response = await fetch(url, {
            method,
            headers,
            body,
            cache: 'no-store'
        });

        const responseText = await response.text();
        let data = {};
        if (responseText) {
            try { data = JSON.parse(responseText); } catch (e) { data = { raw: responseText }; }
        }

        const resHeaders: any = {};
        if (response.headers) {
            resHeaders["set-cookie"] = response.headers.get("set-cookie") || "";
            resHeaders["2fa-token"] = response.headers.get("2fa-token") || response.headers.get("2FA-TOKEN") || "";
        }

        return { status: response.status, data, headers: resHeaders };
    } catch (error: any) {
        console.warn(`[V25-NET] ERR: ${error.message}`);
        return { status: 500, data: null, headers: {} };
    }
}

async function getGtkToken(urlBase: string): Promise<{ gtk: string; cookie: string }> {
    const url = `${urlBase}/v3/login.awp?gtk=1&v=${API_VERSION}`;
    try {
        const response = await fetchED(url, {
            method: "GET",
            headers: {
                "User-Agent": STANDARD_UA,
                "Accept-Language": "fr-FR,fr;q=0.9"
            }
        });

        const setCookie = response.headers["set-cookie"] || "";
        const gtkMatch = setCookie.match(/GTK=([^; ,]+)/i);
        const gtk = gtkMatch ? gtkMatch[1] : "";
        const cookie = `GTK=${gtk}`;

        return { gtk, cookie };
    } catch (e) {
        return { gtk: "", cookie: "" };
    }
}

async function doLogin(username, password, gtk, cookie, twoFAToken, cn, cv, onError, urlBase) {
    const url = `${urlBase}/v3/login.awp?v=${API_VERSION}`;

    // Structure STRICTE Turn 306 (Success 250)
    const bodyObj: any = {
        identifiant: String(username).trim(),
        motdepasse: String(password),
        isReLogin: (cn && cv) ? true : false
    };

    if (cn && cv) {
        bodyObj.fa = [{ cn, cv }];
    }

    const requestBody = "data=" + encodeURIComponent(JSON.stringify(bodyObj));

    // Headers qui ont donné le 250
    const headers: any = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json, text/plain, */*",
        "X-Gtk": gtk,
        "X-Cookie": gtk,
        "Cookie": cookie,
        "User-Agent": STANDARD_UA
    };

    if (twoFAToken) {
        headers["2fa-token"] = twoFAToken;
    }

    return await fetchED(url, {
        method: "POST",
        body: requestBody,
        headers: headers
    });
}

function useSecureFetch() { return false; }

export { getGtkToken, doLogin, fetchED, useSecureFetch };
