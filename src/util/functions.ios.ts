import LoginSystem from "../core/LoginSystem";

const WIN_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";

export async function fetchED(url, { method, headers, body = null }) {
    // Proxying fetchED to LoginSystem's internal fetcher for consistency
    const hd = { ...headers, "User-Agent": WIN_UA };
    const response = await fetch(url, { method, headers: hd, body, cache: 'no-store' });
    const responseText = await response.text();
    let data = {};
    if (responseText) {
        try { data = JSON.parse(responseText); } catch (e) { data = { raw: responseText }; }
    }
    const resHeaders = {};
    if (response.headers) {
        response.headers.forEach((v, k) => { resHeaders[k.toLowerCase()] = v; });
    }
    return { status: response.status, data, headers: resHeaders };
}

export async function getGtkToken(urlBase) {
    // Redirect to whatever we currently consider the best way to get GTK
    return { gtk: "", cookie: "" };
}

export async function doLogin(username, password, gtk, cookie, twoFAToken, cn, cv, onError, urlBase) {
    // Redirect to the new LoginSystem
    return await LoginSystem.login(username, password);
}

export function useSecureFetch() { return false; }
