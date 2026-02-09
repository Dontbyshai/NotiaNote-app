// This enum contains all the endpoints of the api used in the app
class APIEndpoints {
  static OFFICIAL_API = "https://api.ecoledirecte.com";
  static CUSTOM_API = process.env.EXPO_PUBLIC_API_URL;

  static LOGIN = "/v3/login.awp";
  static RENEW_TOKEN = "/v3/renewtoken.awp";
  static DOUBLE_AUTH = "/v3/connexion/doubleauth.awp";

  // Using 'Eleves' (Capital E) as baseline for student endpoints 
  static MARKS(accountID: string) { return `/v3/Eleves/${accountID}/notes.awp`; }
  static ALL_HOMEWORK(accountID: string) { return `/v3/Eleves/${accountID}/cahierdetexte.awp`; }
  static SPECIFIC_HOMEWORK(accountID: string, day: string) { return `/v3/Eleves/${accountID}/cahierdetexte/${day}.awp`; }
  static DOWNLOAD_HOMEWORK_ATTACHEMENT(fileID: string, fileType: string) { return `/v3/telechargement.awp?verbe=get&fichierId=${fileID}&leTypeDeFichier=${fileType}`; }

  static MESSAGES(accountID: string) { return `/v3/Eleves/${accountID}/messages.awp`; }
  static SCHOOL_LIFE(accountID: string) { return `/v3/Eleves/${accountID}/viescolaire.awp`; }
  static TIMETABLE(accountID: string) { return `/v3/E/${accountID}/emploidutemps.awp`; }
}

export default APIEndpoints;