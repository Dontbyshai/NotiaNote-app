import UltimateLoginEngine from "./UltimateLoginEngine";

const AccountHandler = UltimateLoginEngine;

// Ensure properties required by components are available
if (!AccountHandler.USED_URL) {
  AccountHandler.USED_URL = "https://api.ecoledirecte.com";
}

// Fix for some components that expect AccountHandler.default (due to interop issues)
// Removed TypeScript casting to avoid lint errors in .js file
AccountHandler.default = AccountHandler;

export default AccountHandler;