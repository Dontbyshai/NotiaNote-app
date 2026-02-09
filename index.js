// 1. Safe Polyfilling
try {
    // Buffer Polyfill
    if (typeof global.Buffer === 'undefined') {
        global.Buffer = require('buffer').Buffer;
    }

    // Process Polyfill (Minimal for library compatibility)
    if (typeof global.process === 'undefined') {
        global.process = {
            env: {},
            nextTick: (fn) => setTimeout(fn, 0)
        };
    } else if (typeof global.process.env === 'undefined') {
        global.process.env = {};
    }
} catch (e) {
    console.warn("[index] Polyfill failed:", e.message);
}

// 2. Standard Imports
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
