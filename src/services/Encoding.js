import { htmlToText } from 'html-to-text';
import { Buffer } from 'buffer';

export function parseHtmlData(data) {
    if (!data) return "";
    try {
        const binaryData = Buffer.from(data, 'base64').toString('binary');
        const utf8Data = decodeURIComponent(escape(binaryData));
        return htmlToText(utf8Data);
    } catch (e) {
        console.warn("Error parsing HTML data:", e);
        return "";
    }
}
