# 🌌 NotiaNote V2

## 📖 Présentation
**NotiaNote** est une application mobile moderne et performante conçue pour les élèves et parents utilisant le service **ÉcoleDirecte**. Elle permet de suivre ses résultats scolaires avec une précision et une fluidité inégalées, tout en offrant des outils d'analyse avancés.

Cette **V2** est une refonte complète visant la performance, une esthétique premium (Galaxy Design) et une expérience utilisateur optimale.

## 🚀 Fonctionnalités
- **Mode Sombre & Design Premium** : Une interface moderne avec des gradients et des effets de flou (Glassmorphism).
- **Gestion des Notes** :
  - Calcul des moyennes générales et par matière.
  - **Simulation de notes** pour anticiper vos moyennes.
  - Graphiques d'évolution dynamiques.
- **Organisation** :
  - **Emploi du temps** détaillé et synchronisé.
  - **Cahier de texte** avec gestion des devoirs (Fait/À faire).
  - Téléchargement et visualisation des fichiers joints.
- **Vie Scolaire & Messagerie** :
  - Suivi des absences, retards et sanctions.
  - Messagerie complète pour rester en contact avec les professeurs.
- **Widgets Android** : Suivez votre moyenne directement depuis votre écran d'accueil.
- **Sécurité** : Support de l'authentification biométrique (FaceID/TouchID).

## ⚛️ Installation & Développement
NotiaNote est propulsée par **React Native** et **Expo** (SDK 54).

### Pré-requis
- **Node.js** (LTS)
- **Watchman** (pour macOS)
- **Java 17** (pour la compilation Android)
- **Xcode** (pour la compilation iOS)

### Installation
1. **Cloner le projet** :
   ```bash
   git clone https://github.com/Dontbyshai/NotiaNote-app.git
   cd NotiaNote-app
   ```

2. **Installer les dépendances** :
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Préparer les fichiers natifs** :
   ```bash
   npx expo prebuild
   ```

4. **Lancer l'application** :
   - **iOS** : `npx expo run:ios`
   - **Android** : `npx expo run:android`

### 🔧 Astuces de Développement

**Problème de build Android (Java Version) ?**
Si vous rencontrez des erreurs liées à la version de Java lors du build Android, utilisez cette commande pour forcer l'usage du JDK 17 correct :
```bash
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.18/libexec/openjdk.jdk/Contents/Home && npx expo run:android
```

## 💬 Support & Bugs
Pour garantir une réactivité optimale :
- **Signalements de bugs** : Les rapports de crash ou fichiers de debug envoyés par les utilisateurs sont automatiquement centralisés sur notre **serveur Discord** dédié pour une analyse rapide par l'équipe.
- **Suggestions** : N'hésitez pas à ouvrir une *Issue* sur ce dépôt GitHub.

## 🛡️ License
Ce projet est sous licence **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**.
- **Attribution** : Vous devez citer l'auteur original.
- **Non-Commercial** : Vous ne pouvez pas utiliser ce projet à des fins commerciales.
- **Partage à l'identique** : Si vous modifiez le projet, vous devez le partager sous la même licence.

---
*Fait avec ❤️ pour les élèves.*
