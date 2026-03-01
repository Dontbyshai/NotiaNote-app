
export const DemoData = {
    "login": {
        "code": 200,
        "token": "DEMO_TOKEN_123456789",
        "message": "",
        "accounts": [
            {
                "id": 999999,
                "idLogin": "999999",
                "typeCompte": "E",
                "nom": "Jobs",
                "prenom": "Steve",
                "civilite": "",
                "identifiant": "apple.test",
                "logo": "",
                "couleurAgenda": "#007AFF",
                "dicoEnLigne": "",
                "modules": [
                    { "code": "NOTES", "enable": true },
                    { "code": "VIE_SCOLAIRE", "enable": true },
                    { "code": "CAHIER_DE_TEXTES", "enable": true },
                    { "code": "EDT", "enable": true },
                    { "code": "MESSAGERIE", "enable": true }
                ],
                "parametresIndividuels": {
                    "laccueil": true,
                    "leCahierDeTextes": true,
                    "lesNotes": true,
                    "lEmploiDuTemps": true,
                    "laVieScolaire": true,
                    "laMessagerie": true
                },
                "profile": {
                    "sexe": "M",
                    "info": "Interne",
                    "classe": {
                        "id": 1,
                        "code": "T-G1",
                        "libelle": "Terminale Générale 1"
                    },
                    "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/800px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg"
                },
                "nomEtablissement": "Apple Academy",
                "email": "steve@apple.com",
                "anneeScolaireCourante": "2025-2026"
            }
        ],
        "data": {
            "accounts": [
                {
                    "id": 999999,
                    "idLogin": "999999",
                    "typeCompte": "E",
                    "nom": "Jobs",
                    "prenom": "Steve",
                    "civilite": "",
                    "identifiant": "apple.test",
                    "logo": "",
                    "couleurAgenda": "#007AFF",
                    "dicoEnLigne": "",
                    "modules": [
                        { "code": "NOTES", "enable": true },
                        { "code": "VIE_SCOLAIRE", "enable": true },
                        { "code": "CAHIER_DE_TEXTES", "enable": true },
                        { "code": "EDT", "enable": true },
                        { "code": "MESSAGERIE", "enable": true }
                    ],
                    "parametresIndividuels": {
                        "laccueil": true,
                        "leCahierDeTextes": true,
                        "lesNotes": true,
                        "lEmploiDuTemps": true,
                        "laVieScolaire": true,
                        "laMessagerie": true
                    },
                    "profile": {
                        "sexe": "M",
                        "info": "Interne",
                        "classe": {
                            "id": 1,
                            "code": "T-G1",
                            "libelle": "Terminale Générale 1"
                        },
                        "photo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/800px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg"
                    },
                    "nomEtablissement": "Apple Academy",
                    "email": "steve@apple.com",
                    "anneeScolaireCourante": "2025-2026"
                }
            ]
        }
    },
    "notes": {
        "code": 200,
        "token": "DEMO_TOKEN_123456789",
        "message": "",
        "data": {
            "periodes": [
                {
                    "idPeriode": "T1",
                    "codePeriode": "T1",
                    "libellePeriode": "Trimestre 1",
                    "dateDebut": "2025-09-01",
                    "dateFin": "2025-12-31",
                    "cloture": true,
                    "ensembleMatteres": {
                        "moyenneGenerale": "16.5",
                        "moyenneClasse": "12.3",
                        "moyenneMin": "8.0",
                        "moyenneMax": "19.5"
                    }
                },
                {
                    "idPeriode": "T2",
                    "codePeriode": "T2",
                    "libellePeriode": "Trimestre 2",
                    "dateDebut": "2026-01-01",
                    "dateFin": "2026-03-31",
                    "cloture": false,
                    "ensembleMatteres": {
                        "moyenneGenerale": "17.8",
                        "moyenneClasse": "11.9",
                        "moyenneMin": "6.5",
                        "moyenneMax": "19.0"
                    }
                }
            ],
            "notes": [
                { "id": 1, "devoir": "Algèbre Linéaire", "codePeriode": "T2", "codeMatiere": "MATHS", "libelleMatiere": "Mathématiques", "valeur": "19,0", "coef": "4", "noteSur": "20", "date": "2026-02-15", "moyenneClasse": "10,5", "minClasse": "4", "maxClasse": "19" },
                { "id": 2, "devoir": "Probabilités", "codePeriode": "T2", "codeMatiere": "MATHS", "libelleMatiere": "Mathématiques", "valeur": "16,5", "coef": "2", "noteSur": "20", "date": "2026-02-01", "moyenneClasse": "11", "minClasse": "5", "maxClasse": "20" },
                { "id": 3, "devoir": "Mécanique Quantique", "codePeriode": "T2", "codeMatiere": "PHY", "libelleMatiere": "Physique-Chimie", "valeur": "18,0", "coef": "3", "noteSur": "20", "date": "2026-02-10", "moyenneClasse": "12", "minClasse": "8", "maxClasse": "18" },
                { "id": 4, "devoir": "Chimie Organique", "codePeriode": "T2", "codeMatiere": "PHY", "libelleMatiere": "Physique-Chimie", "valeur": "15,5", "coef": "2", "noteSur": "20", "date": "2026-01-25", "moyenneClasse": "13", "minClasse": "9", "maxClasse": "17" },
                { "id": 5, "devoir": "Histoire du XXe siècle", "codePeriode": "T2", "codeMatiere": "HIST", "libelleMatiere": "Histoire-Géo", "valeur": "14,0", "coef": "2", "noteSur": "20", "date": "2026-02-05", "moyenneClasse": "12.5", "minClasse": "7", "maxClasse": "16" },
                { "id": 6, "devoir": "Géographie Mondiale", "codePeriode": "T2", "codeMatiere": "HIST", "libelleMatiere": "Histoire-Géo", "valeur": "16,0", "coef": "1", "noteSur": "20", "date": "2026-01-15", "moyenneClasse": "13", "minClasse": "10", "maxClasse": "18" },
                { "id": 7, "devoir": "Philosophy Essay", "codePeriode": "T2", "codeMatiere": "PHILO", "libelleMatiere": "Philosophie", "valeur": "17,0", "coef": "3", "noteSur": "20", "date": "2026-02-18", "moyenneClasse": "11", "minClasse": "5", "maxClasse": "18" },
                { "id": 8, "devoir": "Kant et la Morale", "codePeriode": "T2", "codeMatiere": "PHILO", "libelleMatiere": "Philosophie", "valeur": "15,0", "coef": "2", "noteSur": "20", "date": "2026-01-30", "moyenneClasse": "10", "minClasse": "6", "maxClasse": "16" },
                { "id": 9, "devoir": "Oral Anglais", "codePeriode": "T2", "codeMatiere": "ANG", "libelleMatiere": "Anglais LV1", "valeur": "20,0", "coef": "1", "noteSur": "20", "date": "2026-02-14", "moyenneClasse": "14", "minClasse": "8", "maxClasse": "20" },
                { "id": 10, "devoir": "Compréhension Écrite", "codePeriode": "T2", "codeMatiere": "ANG", "libelleMatiere": "Anglais LV1", "valeur": "18,5", "coef": "2", "noteSur": "20", "date": "2026-02-02", "moyenneClasse": "13", "minClasse": "7", "maxClasse": "19" },
                { "id": 11, "devoir": "Espagnol Conjugaison", "codePeriode": "T2", "codeMatiere": "ESP", "libelleMatiere": "Espagnol LV2", "valeur": "13,0", "coef": "1", "noteSur": "20", "date": "2026-02-12", "moyenneClasse": "12", "minClasse": "5", "maxClasse": "17" },
                { "id": 12, "devoir": "Volley-Ball", "codePeriode": "T2", "codeMatiere": "EPS", "libelleMatiere": "EPS", "valeur": "16,0", "coef": "1", "noteSur": "20", "date": "2026-02-10", "moyenneClasse": "14", "minClasse": "10", "maxClasse": "19" },
                { "id": 13, "devoir": "Course d'Orientation", "codePeriode": "T2", "codeMatiere": "EPS", "libelleMatiere": "EPS", "valeur": "12,0", "coef": "1", "noteSur": "20", "date": "2026-01-20", "moyenneClasse": "13", "minClasse": "8", "maxClasse": "18" },
                { "id": 14, "devoir": "Projet NSI", "codePeriode": "T2", "codeMatiere": "NSI", "libelleMatiere": "Numérique & Sc. Info.", "valeur": "19,5", "coef": "4", "noteSur": "20", "date": "2026-02-16", "moyenneClasse": "15", "minClasse": "10", "maxClasse": "20" },
                { "id": 15, "devoir": "Base de Données SQL", "codePeriode": "T2", "codeMatiere": "NSI", "libelleMatiere": "Numérique & Sc. Info.", "valeur": "18,0", "coef": "2", "noteSur": "20", "date": "2026-01-28", "moyenneClasse": "14", "minClasse": "9", "maxClasse": "19" }
            ],
            "parametrage": {
                "couleurTexte": "#000000",
                "affichageMoyenne": true,
                "affichageMoyenneDevoir": true,
                "affichagePositionMatiere": true,
                "affichageNoteSur": true,
                "affichageCoefficient": true
            }
        }
    },
    "emploidutemps": {
        "code": 200,
        "token": "DEMO_TOKEN_123456789",
        "message": "",
        "data": [
            { "id": 101, "matiere": "Mathématiques", "codeMatiere": "MATHS", "typeCours": "COURS", "start_date": "2026-02-19 08:00", "end_date": "2026-02-19 10:00", "color": "#FF5722", "salle": "B202", "prof": "M. Newton" },
            { "id": 102, "matiere": "Physique-Chimie", "codeMatiere": "PHY", "typeCours": "TP", "start_date": "2026-02-19 10:00", "end_date": "2026-02-19 12:00", "color": "#4CAF50", "salle": "Labo 2", "prof": "Mme. Curie" },
            { "id": 103, "matiere": "Cantine", "codeMatiere": "CANTINE", "typeCours": "REPAS", "start_date": "2026-02-19 12:00", "end_date": "2026-02-19 13:30", "color": "#FF9800", "salle": "Réfectoire", "prof": "" },
            { "id": 104, "matiere": "Anglais LV1", "codeMatiere": "ANG", "typeCours": "COURS", "start_date": "2026-02-19 13:30", "end_date": "2026-02-19 14:30", "color": "#9C27B0", "salle": "L204", "prof": "Mrs. Shakespeare" },
            { "id": 105, "matiere": "Histoire-Géographie", "codeMatiere": "HIST", "typeCours": "COURS", "start_date": "2026-02-19 14:30", "end_date": "2026-02-19 15:30", "color": "#2196F3", "salle": "H101", "prof": "M. Heródote" },
            { "id": 106, "matiere": "NSI", "codeMatiere": "NSI", "typeCours": "COURS", "start_date": "2026-02-19 15:30", "end_date": "2026-02-19 17:30", "color": "#607D8B", "salle": "Info 1", "prof": "M. Turing" },

            // Demain
            { "id": 107, "matiere": "Philosophie", "codeMatiere": "PHILO", "typeCours": "COURS", "start_date": "2026-02-20 08:00", "end_date": "2026-02-20 10:00", "color": "#E91E63", "salle": "P101", "prof": "M. Descartes" },
            { "id": 108, "matiere": "Espagnol LV2", "codeMatiere": "ESP", "typeCours": "COURS", "start_date": "2026-02-20 10:00", "end_date": "2026-02-20 11:00", "color": "#FFC107", "salle": "L102", "prof": "Sra. Cervantes" },
            { "id": 109, "matiere": "EPS", "codeMatiere": "EPS", "typeCours": "SPORT", "start_date": "2026-02-20 13:30", "end_date": "2026-02-20 15:30", "color": "#4CAF50", "salle": "Gymnase", "prof": "M. Bolt" }
        ]
    },
    "cahierdetexte": {
        "code": 200,
        "token": "DEMO_TOKEN_123456789",
        "message": "",
        "data": {
            "2026-02-20": [
                { "id": 501, "matiere": "Mathématiques", "codeMatiere": "MATHS", "aFaire": true, "contenu": "Exercices 12 page 45 (Livre).", "donneLe": "2026-02-18", "pourLe": "2026-02-20", "nomProf": "M. Newton" },
                { "id": 502, "matiere": "Philosophie", "codeMatiere": "PHILO", "aFaire": true, "contenu": "Lire le texte de Kant.", "donneLe": "2026-02-18", "pourLe": "2026-02-20", "nomProf": "M. Descartes" }
            ],
            "2026-02-23": [
                { "id": 503, "matiere": "NSI", "codeMatiere": "NSI", "aFaire": true, "contenu": "Terminer le projet Python.", "donneLe": "2026-02-16", "pourLe": "2026-02-23", "nomProf": "M. Turing" }
            ]
        }
    },
    "messagerie": {
        "code": 200,
        "token": "DEMO_TOKEN_123456789",
        "message": "",
        "data": {
            "messages": {
                "received": [
                    { "id": 901, "subject": "Réunion Parents-Profs", "content": "La réunion aura lieu le 15 mars...", "from": "Direction", "date": "2026-02-18 10:00", "read": false },
                    { "id": 902, "subject": "Sortie Scolaire", "content": "N'oubliez pas l'autorisation pour la sortie...", "from": "M. Heródote", "date": "2026-02-17 14:00", "read": true },
                    { "id": 903, "subject": "Absence Professeur", "content": "M. Newton sera absent ce vendredi.", "from": "Vie Scolaire", "date": "2026-02-16 09:00", "read": true },
                    { "id": 904, "subject": "Club Informatique", "content": "Le club reprendra la semaine prochaine.", "from": "M. Turing", "date": "2026-02-15 16:30", "read": true }
                ]
            }
        }
    }
};
