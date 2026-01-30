const { withInfoPlist, withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAlternateIcons = (config, icons) => {
    // 1. Modify Info.plist to register alternate icons
    config = withInfoPlist(config, (config) => {
        const alternateIcons = {};

        for (const [name, iconPath] of Object.entries(icons)) {
            alternateIcons[name] = {
                CFBundleIconFiles: [name], // The file name in the bundle
                UIPrerenderedIcon: false,
            };
        }

        config.modResults.CFBundleIcons = {
            ...config.modResults.CFBundleIcons,
            CFBundleAlternateIcons: alternateIcons,
        };

        return config;
    });

    // 2. Copy icon files to the iOS project directory during prebuild
    config = withDangerousMod(config, [
        'ios',
        async (config) => {
            const iosRoot = config.modRequest.platformProjectRoot;
            const iosProjectFolder = path.join(iosRoot, config.modRequest.projectName);

            // 1. Copy Icon Images
            for (const [name, iconPath] of Object.entries(icons)) {
                const sourcePath = path.resolve(config.modRequest.projectRoot, iconPath);
                const descPath1 = path.join(iosRoot, name + ".png");
                const descPath2 = path.join(iosProjectFolder, name + ".png");

                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, descPath1);
                    fs.copyFileSync(sourcePath, descPath2);
                } else {
                    console.warn(`Warning: Icon file not found at ${sourcePath}`);
                }
            }

            // 2. Create Native Module Source File (IconChanger.m)
            const nativeModuleCode = `#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface IconChanger : NSObject <RCTBridgeModule>
@end

@implementation IconChanger

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(changeIcon:(NSString *)iconName resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *name = (!iconName || [iconName isEqualToString:@"default"] || [iconName length] == 0) ? nil : iconName;
    [[UIApplication sharedApplication] setAlternateIconName:name completionHandler:^(NSError * _Nullable error) {
      if (error) {
        reject(@"ICON_ERROR", error.localizedDescription, error);
      } else {
        resolve(name);
      }
    }];
  });
}

@end
`;
            // Write to BOTH locations to ensure Xcode finds it regardless of path resolution
            fs.writeFileSync(path.join(iosProjectFolder, "IconChanger.m"), nativeModuleCode);
            fs.writeFileSync(path.join(iosRoot, "IconChanger.m"), nativeModuleCode);

            return config;
        },
    ]);

    // 3. Add files to Xcode project
    config = withXcodeProject(config, (config) => {
        const xcodeProject = config.modResults;
        const projectName = config.modRequest.projectName;

        // Try to find 'Resources' group
        let groupKey = xcodeProject.findPBXGroupKey({ name: 'Resources' });
        if (!groupKey) {
            groupKey = xcodeProject.findPBXGroupKey({ name: projectName });
        }

        for (const [name, _] of Object.entries(icons)) {
            const fileName = name + ".png";
            // Clean up duplicates if any (safe wrap)
            try { xcodeProject.removeResourceFile(fileName, { target: xcodeProject.getFirstTarget().uuid }); } catch (e) { }

            const file = xcodeProject.addFile(fileName, groupKey);
            if (file) {
                file.target = xcodeProject.getFirstTarget().uuid;
                xcodeProject.addToPbxBuildFileSection(file);
                xcodeProject.addToPbxResourcesBuildPhase(file);
            }
        }

        // IconChanger.m Logic
        let mainGroup = xcodeProject.findPBXGroupKey({ name: projectName });

        // Safely remove existing reference to prevent duplicates/warnings
        try {
            xcodeProject.removeSourceFile("IconChanger.m", null);
        } catch (e) {
            // Ignore if file not found in clean build
        }

        // Add new reference
        const sourceFile = xcodeProject.addSourceFile("IconChanger.m", null, mainGroup);
        if (sourceFile) {
            const targetUuid = xcodeProject.getFirstTarget().uuid;
            sourceFile.target = targetUuid;
            xcodeProject.addToPbxSourcesBuildPhase(sourceFile);
        }

        return config;
    });

    return config;
};

module.exports = withAlternateIcons;
