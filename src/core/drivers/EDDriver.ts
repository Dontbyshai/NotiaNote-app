import { Client } from "@blockshub/blocksdirecte";
import StorageHandler from "../StorageHandler";

export class EDDriver {
    client: Client;

    constructor() {
        this.client = new Client();
    }

    async login(username: string, password: string, deviceUUID: string) {
        // Return existing logic adapted
        return (this.client.auth as any).loginUsername(
            username, password, "", "", true, deviceUUID
        );
    }
}
