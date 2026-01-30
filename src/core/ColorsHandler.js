import StorageHandler from "./StorageHandler";

class ColorsHandler {
    // Map of subject ID to color
    static attribuatedSubjectColors = {};
    // Map of normalized names to IDs (to link "Maths" to "MATHEMATIQUES")
    static nameToID = {};

    // List of available default colors
    static defaultColors = [
        ["#EF4444", "#450A0A"], // Red
        ["#3B82F6", "#172554"], // Blue
        ["#10B981", "#064E3B"], // Green
        ["#F59E0B", "#451A03"], // Amber
        ["#8B5CF6", "#2E1065"], // Violet
        ["#EC4899", "#500724"], // Pink
        ["#06B6D4", "#083344"], // Cyan
        ["#6366f1", "#312e81"], // Indigo
        ["#d946ef", "#701a75"], // Fuchsia
        ["#84cc16", "#3f6212"], // Lime
    ];

    // Listeners for color changes
    static listeners = [];

    // Load colors from storage
    static async load() {
        const data = await StorageHandler.getData("subject-colors");
        if (data) {
            this.attribuatedSubjectColors = data.colors || data; // Handle both old and new format
            this.nameToID = data.nameToID || {};
        }
        this.notifyListeners();
    }

    // Save colors to storage
    static async save() {
        await StorageHandler.saveData("subject-colors", {
            colors: this.attribuatedSubjectColors,
            nameToID: this.nameToID
        });
        this.notifyListeners();
    }

    // Helper to normalize names (remove accents, lowercase)
    static normalize(str) {
        if (!str) return "";
        return str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // Get colors for a subject
    // Can be called with (id) or (code, name)
    static getSubjectColors(idOrCode, name = null) {
        // 1. Try by primary ID/Code directly
        if (idOrCode && this.attribuatedSubjectColors[idOrCode]) {
            const colors = this.attribuatedSubjectColors[idOrCode];
            return { dark: colors[0], light: colors[1] };
        }

        // 2. Try to find ID via Name mapping
        if (name) {
            const normName = this.normalize(name);
            const mappedID = this.nameToID[normName];
            if (mappedID && this.attribuatedSubjectColors[mappedID]) {
                const colors = this.attribuatedSubjectColors[mappedID];
                return { dark: colors[0], light: colors[1] };
            }
        }

        // 3. Try to find ID via Code as Name (sometimes code IS the name like "FRANCAIS")
        if (idOrCode) {
            const normCode = this.normalize(idOrCode);
            const mappedID = this.nameToID[normCode];
            if (mappedID && this.attribuatedSubjectColors[mappedID]) {
                const colors = this.attribuatedSubjectColors[mappedID];
                return { dark: colors[0], light: colors[1] };
            }
        }

        // Default fallback
        return { dark: "#8B5CF6", light: "#2E1065" };
    }

    // Register or generate a color for a subject
    static registerSubjectColor(subjectID, subjectTitle = "") {
        // Register the mapping Name -> ID
        if (subjectTitle) {
            const normTitle = this.normalize(subjectTitle);
            // Only register if not already pointing to something else or if ID matches
            if (!this.nameToID[normTitle]) {
                this.nameToID[normTitle] = subjectID;
            }
        }
        // Also register the ID itself as a name (for codes like "HISTOIRE")
        const normID = this.normalize(subjectID);
        if (!this.nameToID[normID]) {
            this.nameToID[normID] = subjectID;
        }

        if (!this.attribuatedSubjectColors[subjectID]) {
            // Logic to generate a deterministic color based on title or ID
            const str = subjectTitle || subjectID;
            const norm = this.normalize(str);

            // 1. Try to find a standard color by keyword
            const standardMappings = {
                "francais": 0, "philo": 0, "litt": 0, // Rouge
                "maths": 1, "mathematiques": 1, // Bleu
                "anglais": 3, "lv1": 3, "lva": 3, // Jaune/Ambre
                "espagnol": 8, "lv2": 8, "lvb": 8, // Fuchsia
                "allemand": 4, // Violet
                "italien": 2, // Vert
                "histoire": 7, "geo": 7, "emc": 7, // Indigo
                "svt": 2, "biologie": 2, "sciences": 2, // Vert
                "physique": 4, "chimie": 4, "science": 4, // Violet
                "eps": 6, "sport": 6, "educ": 6, // Cyan
                "ses": 9, "eco": 9, "social": 9, // Lime
                "arts": 5, "musique": 5, "dessin": 5, // Rose
                "techno": 6, "informatique": 6, "numerique": 1, // Cyan / Bleu
            };

            let colorIndex = -1;
            for (const key in standardMappings) {
                if (norm.includes(key)) {
                    colorIndex = standardMappings[key];
                    break;
                }
            }

            // 2. Fallback to hash if no keyword matches
            if (colorIndex === -1) {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                colorIndex = Math.abs(hash) % this.defaultColors.length;
            }

            this.attribuatedSubjectColors[subjectID] = this.defaultColors[colorIndex];
            this.save();
        }
    }

    // Manually set a color
    static setSubjectColor(subjectID, light, dark) {
        this.attribuatedSubjectColors[subjectID] = [dark, light];
        this.save();
    }

    // Remove a color
    static removeSubjectColor(subjectID) {
        if (this.attribuatedSubjectColors[subjectID]) {
            delete this.attribuatedSubjectColors[subjectID];

            // Clean up mappings pointing to this ID
            Object.keys(this.nameToID).forEach(key => {
                if (this.nameToID[key] === subjectID) {
                    delete this.nameToID[key];
                }
            });

            this.save();
        }
    }

    // Reset everything
    static resetSubjectColors() {
        this.attribuatedSubjectColors = {};
        this.nameToID = {};
        this.save();
    }

    // Event system
    static addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    static removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    static notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error("ColorsHandler listener error:", e);
            }
        });
    }
}

export default ColorsHandler;
