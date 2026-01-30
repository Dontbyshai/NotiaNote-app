import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * StorageHandler - Gestion du stockage local
 * Wrapper autour d'AsyncStorage pour sauvegarder/récupérer des données JSON
 */
class StorageHandler {
    // Vérifie si une donnée existe
    static async dataExists(fileName) {
        const jsonData = await AsyncStorage.getItem(fileName);
        return jsonData !== null;
    }

    // Sauvegarde des données JSON
    static async saveData(fileName, data) {
        await AsyncStorage.setItem(fileName, JSON.stringify(data));
    }

    // Récupère des données JSON
    static async getData(fileName) {
        const data = await AsyncStorage.getItem(fileName);
        return data ? JSON.parse(data) : null;
    }

    // Supprime des fichiers spécifiques ou dossiers (profils)
    static async deleteFiles(fileNames) {
        const FileSystem = require('expo-file-system');
        for (const name of fileNames) {
            if (name === "profiles") {
                const cacheDir = `${FileSystem.cacheDirectory}profiles/`;
                const info = await FileSystem.getInfoAsync(cacheDir);
                if (info.exists) {
                    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
                }
            } else {
                await AsyncStorage.removeItem(name);
            }
        }
    }

    // Vide tout le stockage
    static async clear() {
        await AsyncStorage.clear();
    }
}

export default StorageHandler;
