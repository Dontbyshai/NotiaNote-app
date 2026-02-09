import { useEffect, useState, useRef } from "react";
import { Image, Platform } from "react-native";
import { PressableScale } from "react-native-pressable-scale";
import { UserRoundIcon } from "lucide-react-native";
import * as FileSystem from 'expo-file-system';

import AccountHandler from "../../core/AccountHandler";
import StorageHandler from "../../core/StorageHandler";
import { hashString } from "../../util/Utils";
import { useGlobalAppContext } from "../../util/GlobalAppContext";

// Custom profile photo with robust Android bypass
function CustomProfilePhoto({ accountID, onPress, size = 60, style, hasOtherPressAction = false }) {
  const { theme } = useGlobalAppContext();
  const [photoSource, setPhotoSource] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!accountID) return;

    const loadPhoto = async () => {
      try {
        const account = await AccountHandler.getSpecificAccount(accountID);
        if (!account || !isMounted.current) return;

        let photoURL = account.photo || account.photoURL || account.profile?.photo;
        if (!photoURL || photoURL === "" || photoURL === "0") {
          if (isMounted.current) setPhotoSource(null);
          return;
        }

        // 1. URL Reconstruction
        photoURL = photoURL.trim();

        // Handle relative vs absolute
        let finalURL = photoURL;
        if (finalURL.startsWith("//")) {
          finalURL = `https:${finalURL}`;
        } else if (!finalURL.startsWith('http')) {
          // Detect if it should be API (v3/awp) or WWW (static)
          const isAPI = finalURL.includes('awp') || finalURL.startsWith('/v3');
          const baseURL = isAPI ? "https://api.ecoledirecte.com" : "https://www.ecoledirecte.com";

          if (!finalURL.includes('/') || finalURL.startsWith('./')) {
            const cleanName = finalURL.replace(/^\.\//, '').replace(/^\//, '');
            finalURL = isAPI ? cleanName : `/photos/eleves/${cleanName}`;
          }
          finalURL = `${baseURL.replace(/\/$/, '')}/${finalURL.replace(/^\//, '')}`;
        }
        // Force HTTPS
        finalURL = finalURL.replace('http://', 'https://');

        // 2. Authentication Data
        const gtkData = await StorageHandler.getData("gtk");
        const gtkToken = gtkData?.gtk || "";
        const gtkCookie = gtkData?.cookie || "";
        const photoCookie = await StorageHandler.getData("photoCookie") || "";

        const mainAccount = await AccountHandler._getMainAccountOfAnyAccount(accountID);
        const token = mainAccount?.connectionToken || "";

        const combinedCookie = [gtkCookie, photoCookie].filter(Boolean).join('; ');

        // 3. Android Specific loading (Download then Show)
        if (Platform.OS === 'android') {
          // Fallback for base64
          if (finalURL.startsWith('data:image')) {
            if (isMounted.current) setPhotoSource({ uri: finalURL });
            return;
          }

          const fileDir = `${FileSystem.cacheDirectory}profiles/`;
          const fileName = `pp_${hashString(finalURL).replace(/-/g, 'n')}.jpg`;
          const localUri = `${fileDir}${fileName}`;

          const dirInfo = await FileSystem.getInfoAsync(fileDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(fileDir, { intermediates: true });
          }

          const checkFile = async (path) => {
            const info = await FileSystem.getInfoAsync(path);
            if (!info.exists || info.size < 300) return false;
            // Check if it's not actually an HTML error page (common for 403s)
            const content = await FileSystem.readAsStringAsync(path, { length: 50, encoding: 'utf8' }).catch(() => "");
            return !content.startsWith('<!DOCTYPE') && !content.startsWith('<html');
          };

          if (!(await checkFile(localUri))) {
            const tryDownload = async (url, includeAuth = true) => {
              console.log(`[Photo] 📥 Attempting download: ${url} (Auth: ${includeAuth})`);
              try {
                const headers = includeAuth ? {
                  'Cookie': combinedCookie,
                  'X-Token': token,
                  'X-Gtk': gtkToken,
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                  'Referer': 'https://www.ecoledirecte.com/',
                } : {
                  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                };
                await FileSystem.downloadAsync(url, localUri, { headers });
                const ok = await checkFile(localUri);
                console.log(`[Photo] ${ok ? '✅ SUCCESS' : '❌ FAILED (Invalid file)'} for ${url}`);
                return ok;
              } catch (e) {
                console.error(`[Photo] 🚨 ERROR downloading ${url}:`, e);
                return false;
              }
            };

            // 1. Try primary URL with auth
            let success = await tryDownload(finalURL, true);

            // 2. Try fallback URL (www instead of api) with auth if primary failed
            if (!success && finalURL.includes('api.ecoledirecte.com')) {
              const fallbackURL = finalURL.replace('api.ecoledirecte.com', 'www.ecoledirecte.com');
              success = await tryDownload(fallbackURL, true);
            }

            // 3. Try primary URL WITHOUT auth (some schools have public CDN/photo urls)
            if (!success) {
              success = await tryDownload(finalURL, false);
            }
          }

          if (await checkFile(localUri)) {
            if (isMounted.current) {
              console.log("[Photo] 🖼️ Showing local file:", localUri);
              setPhotoSource({ uri: localUri });
            }
          } else {
            if (isMounted.current) {
              console.log("[Photo] 🚫 No valid photo found after all attempts.");
              setPhotoSource(null);
            }
          }
        } else {
          // iOS
          if (isMounted.current) {
            setPhotoSource({
              uri: finalURL,
              headers: {
                'Cookie': combinedCookie,
                'X-Token': token,
                'X-Gtk': gtkToken,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://www.ecoledirecte.com/'
              }
            });
          }
        }
      } catch (e) {
        console.warn("[CustomProfilePhoto] Error:", e);
        if (isMounted.current) setPhotoSource(null);
      }
    };

    loadPhoto();
  }, [accountID]);

  return (
    <PressableScale style={{
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: size / 2,
      overflow: "hidden",
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.surfaceOutline,
      ...style,
    }} onPress={onPress} activeScale={onPress ? 0.95 : 1} onLongPress={hasOtherPressAction ? () => { } : undefined}>
      {photoSource ? (
        <Image
          key={photoSource.uri}
          source={photoSource}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          resizeMode="cover"
          onError={async () => {
            if (Platform.OS === 'android' && photoSource.uri && photoSource.uri.startsWith('file')) {
              await FileSystem.deleteAsync(photoSource.uri, { idempotent: true });
            }
            if (isMounted.current) setPhotoSource(null);
          }}
        />
      ) : (
        <UserRoundIcon size={size / 2} color={theme.colors.onSurfaceDisabled} />
      )}
    </PressableScale>
  );
}

export default CustomProfilePhoto;