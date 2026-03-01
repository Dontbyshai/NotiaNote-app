const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withAndroidResolutionStrategy(config) {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents += `
allprojects {
    configurations.all {
        resolutionStrategy {
            force "androidx.browser:browser:1.8.0"
        }
    }
}
      `;
        }
        return config;
    });
};
