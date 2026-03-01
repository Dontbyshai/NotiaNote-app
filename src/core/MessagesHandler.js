import AccountHandler from "./AccountHandler";
import APIEndpoints from "./APIEndpoints";
import { Alert } from "react-native";

class MessagesHandler {
    // Fetch latest received messages
    static async getReceivedMessages(accountID) {
        // Match exactly what EcoleDirecteApi.getMessages uses
        const args = "&force=false&typeRecuperation=received&idClasseur=0&orderBy=date&order=desc&query=&onlyRead=&getAll=1";
        const url = `${AccountHandler.USED_URL}${APIEndpoints.MESSAGES(accountID)}${args}`;

        // Calculate dynamic school year
        const today = new Date();
        const month = today.getMonth(); // 0-11
        const year = today.getFullYear();
        const schoolYear = (month >= 8) ? `${year}-${year + 1}` : `${year - 1}-${year}`;

        console.log("[MessagesHandler] Fetching messages for school year:", schoolYear);

        return AccountHandler.parseEcoleDirecte(
            "received-messages",
            accountID,
            url,
            `data=${JSON.stringify({ anneeMessages: schoolYear })}`,
            async (data) => {
                const messages = data?.messages?.received || [];
                return messages;
            }
        ).then(result => {
            return result;
        });
    }

    // Fetch full content of a message (if needed, usually subject + snippet is enough for detection)
    static async getMessageContent(accountID, messageID) {
        // Implementation if deep scan needed via `messagerie/{id}.awp`
        return null;
    }
}

export default MessagesHandler;
