import dayjs from "dayjs";

import AccountHandler from "./AccountHandler";
import APIEndpoints from "./APIEndpoints";
import ColorsHandler from "./ColorsHandler";
import CoefficientHandler from "./CoefficientHandler";
import { capitalizeWords, getLatestDate } from "../util/Utils";

import StorageHandler from "./StorageHandler";
import { parseHtmlData } from "../services/Encoding";


class MarksHandler {
  // Helper, needed to inform the user that guess parameters have been set automatically
  static showGuessParametersWarning = null;

  static async getAverages(accountID) {
    const cacheData = await StorageHandler.getData("marks");
    if (cacheData && cacheData[accountID] && cacheData[accountID].data) {
      const periods = cacheData[accountID].data;

      // Filter out "YEAR" to find real periods and sort them
      const realPeriodKeys = Object.keys(periods).filter(key => key !== "YEAR").sort();

      if (realPeriodKeys.length > 0) {
        // Find the first period that is NOT finished (active)
        let activePeriodKey = realPeriodKeys.find(key => !periods[key].isFinished);

        // If no active period found (all finished), take the last one (most recent)
        if (!activePeriodKey) {
          activePeriodKey = realPeriodKeys[realPeriodKeys.length - 1];
        }

        if (activePeriodKey && periods[activePeriodKey]) {
          return {
            general: periods[activePeriodKey].average,
            class: periods[activePeriodKey].classAverage,
            periodName: periods[activePeriodKey].title,
            history: periods[activePeriodKey].averageHistory,
          };
        }
      }

      // Fallback to "YEAR" only if no real periods found
      if (periods["YEAR"]) {
        return {
          general: periods["YEAR"].average,
          class: periods["YEAR"].classAverage,
          history: periods["YEAR"].averageHistory,
        };
      }
    }
    return null;
  }


  // Marks functions //

  // Get marks
  static async getMarks(accountID) {
    return AccountHandler.parseEcoleDirecte(
      "marks",
      accountID,
      `${AccountHandler.USED_URL}${APIEndpoints.MARKS(accountID)}`,
      'data={"anneeScolaire": ""}',
      async (data) => {
        return await this.saveMarks(accountID, data);
      }
    );
  }
  // Save marks data to cache
  static async saveMarks(accountID, marks) {
    // Problem with ÉcoleDirecte
    if (!marks.periodes) {
      return 0;
    }

    // Detect right guess parameters
    if (!CoefficientHandler.didChooseIfEnable[accountID]) {
      await CoefficientHandler.setGuessMarkCoefficientEnabled(accountID, !(marks.parametrage?.coefficientNote ?? false));
      await CoefficientHandler.setGuessSubjectCoefficientEnabled(accountID, !((marks.parametrage.moyenneCoefMatiere ?? false) || (marks.parametrage.colonneCoefficientMatiere ?? false)));

      if ((CoefficientHandler.guessMarkCoefficientEnabled[accountID] || CoefficientHandler.guessSubjectCoefficientEnabled[accountID]) && this.showGuessParametersWarning) {
        this.showGuessParametersWarning(accountID);
      }
    }

    // Helper functions
    function createPeriod(
      id,
      title,
      isFinished,
      subjects,
      subjectGroups,
      sortedSubjectGroups,
      subjectsNotInSubjectGroup,
      appreciationPP,
      appreciationCE,
    ) {
      return {
        id: id, // String
        title: capitalizeWords(title), // String
        isFinished: isFinished, // Boolean
        subjects: subjects, // Map<ID, Subject>
        subjectGroups: subjectGroups, // Map<ID, SubjectGroup>
        sortedSubjectGroups: sortedSubjectGroups, // List<ID>
        subjectsNotInSubjectGroup: subjectsNotInSubjectGroup, // List<ID>
        marks: {}, // Map<ID, Mark>
        sortedMarks: [], // List<ID>

        appreciationPP: appreciationPP, // String
        appreciationCE: appreciationCE, // String

        averageHistory: [], // List<Float>
      };
    }
    function createSubjectGroup(id, periodID, title, defaultCoefficient) {
      return {
        id: id, // String
        periodID: periodID, // String

        title: title.toUpperCase(), // String

        isEffective: true, // Boolean
        defaultCoefficient: defaultCoefficient, // Float
        subjects: [], // List<ID>

        averageHistory: [], // List<Float>
      };
    }
    function createSubject(
      id,
      subID,
      subjectGroupID,
      periodID,
      title,
      teachers,

      defaultCoefficient,
      appreciations = [],
    ) {
      // Normalize IDs to ensure color matches everywhere
      const normalizedID = id ? id.toString().trim().toUpperCase() : id;
      ColorsHandler.registerSubjectColor(normalizedID, title);
      return {
        id: normalizedID, // String
        subID: subID, // String
        subjectGroupID: subjectGroupID, // String
        periodID: periodID, // String

        subSubjects: {}, // Map<ID, Subject>

        title: capitalizeWords(title), // String

        teachers: teachers, // List<String>
        appreciations: appreciations, // List<String>

        defaultIsEffective: true, // Boolean
        defaultCoefficient: defaultCoefficient, // Float
        marks: [], // List<ID>
        sortedMarks: [], // List<ID>

        averageHistory: [], // List<Float>
      };
    }

    // Create period objects
    var periods = {};
    const possiblePeriodCodes = ["A001", "A002", "A003"];
    for (const period of marks.periodes) {
      // Verify validity of period
      let periodID = period.codePeriode;
      if (!possiblePeriodCodes.includes(periodID)) {
        continue;
      }

      // Get period data
      let periodTitle = period.periode;
      let isPeriodFinished = period.cloture;
      if (!isPeriodFinished) { // Check if ending time has passed
        let endTime = dayjs(period.dateFin, "YYYY-MM-DD");
        let currentTime = dayjs();
        if (endTime.isBefore(currentTime)) {
          isPeriodFinished = true;
        }
      }

      // Fill period data
      let periodSubjects = {};
      let periodSubjectGroups = {};
      let periodSortedSubjectGroups = [];
      for (const subject of period.ensembleMatieres?.disciplines ?? []) {
        if (subject.groupeMatiere) {
          // Is a SubjectGroup
          // Check if already exists
          if (subject.id in periodSubjectGroups) {
            continue;
          }

          periodSubjectGroups[subject.id] = createSubjectGroup(
            subject.id,
            periodID,
            subject.discipline,
            parseFloat(`${subject.coef}`.replace(",", ".")),
          );
          periodSortedSubjectGroups.push(subject.id);
        } else {
          // Is a normal Subject
          let subjectID = subject.codeMatiere;
          let subSubjectID = subject.codeSousMatiere;
          let subjectTitle = subject.discipline;

          let subjectCoefficient = parseFloat(
            `${subject.coef}`.replace(",", "."),
          );
          if (!subjectCoefficient) {
            subjectCoefficient = 1;
          }

          let subjectTeachers = [];
          for (const teacher of subject.professeurs ?? []) {
            subjectTeachers.push(teacher.nom);
          }

          let subjectAppreciations = (subject.appreciations ?? []).map(parseHtmlData).filter(a => a.length > 0);

          if (subSubjectID) {
            // Is a SubSubject
            let finalSubject = createSubject(
              subjectID,
              subSubjectID,
              null,
              periodID,
              subjectTitle,
              subjectTeachers,

              subjectCoefficient,
              subjectAppreciations,
            );
            // Find parent Subject
            if (subjectID in periodSubjects) {
              let parentSubject = periodSubjects[subjectID];
              parentSubject.subSubjects[subSubjectID] = finalSubject;
            } else {
              // Create a parent Subject
              periodSubjects[subjectID] = createSubject(
                subjectID,
                null,
                null,
                periodID,
                subjectID,
                subjectTeachers,

                subjectCoefficient,
                [], // Parent subject might not have appreciations if subSubjects do, or we handle it differently. Usually appreciations are on the line item.
              );
              periodSubjects[subjectID].subSubjects[subSubjectID] = finalSubject;
            }
          } else {
            // Find subject group
            let subjectSubjectGroupID = subject.idGroupeMatiere;
            if (subjectSubjectGroupID) {
              if (!(subjectSubjectGroupID in periodSubjectGroups)) {
                periodSubjectGroups[subjectSubjectGroupID] = createSubjectGroup(
                  subjectSubjectGroupID,
                  periodID,
                  subjectSubjectGroupID,
                  0,
                );
                periodSortedSubjectGroups.push(subjectSubjectGroupID);
              }
              periodSubjectGroups[subjectSubjectGroupID].subjects.push(
                subjectID,
              );
            }

            // Set data
            periodSubjects[subjectID] = createSubject(
              subjectID,
              null,
              subjectSubjectGroupID,
              periodID,
              subjectTitle,
              subjectTeachers,
              subjectCoefficient,
              subjectAppreciations,
            );
          }
        }
      }

      // Detect what subjects are not in a subject group
      let subjectsNotInSubjectGroup = Object.values(periodSubjects).map(
        (subject) => subject.id,
      );
      Object.values(periodSubjectGroups).forEach((subjectGroup) => {
        subjectGroup.subjects.forEach((subjectID) => {
          subjectsNotInSubjectGroup = subjectsNotInSubjectGroup.filter(
            (subject) => subject != subjectID,
          );
        });
      });

      // Set period
      periods[periodID] = createPeriod(
        periodID,
        `${periodTitle}${isPeriodFinished ? " (fini)" : ""}`,
        isPeriodFinished,
        periodSubjects,
        periodSubjectGroups,
        periodSortedSubjectGroups,
        subjectsNotInSubjectGroup,
        parseHtmlData(period.ensembleMatieres?.appreciationPP ?? ""),
        parseHtmlData(period.ensembleMatieres?.appreciationCE ?? ""),
      );
    }

    // Add marks
    var sortedMarks = [];
    for (const mark of marks.notes ?? []) {
      let markID = mark.id;
      let periodID = `${mark.codePeriode}`.substring(0, 4);
      let subjectID = mark.codeMatiere;
      let subSubjectID = mark.codeSousMatiere;
      let markTitle = mark.devoir;
      let markDate = getLatestDate(
        new Date(mark.dateSaisie),
        new Date(mark.date),
      );
      let markCoefficient = parseFloat(mark.coef);
      if (!markCoefficient) {
        markCoefficient = 1;
      }

      // Check if mark has competences
      let markCompetences = [];
      let tempMarkCompetences = {};
      for (const competence of mark.elementsProgramme) {
        let competenceID = `${competence.idCompetence}-${competence.idElemProg}-${competence.idConnaissance}`;
        if (!tempMarkCompetences[competenceID]) {
          markCompetences.push({
            fullID: competenceID,
            id: competence.idCompetence,
            idElement: competence.idElemProg,
            idKnowledge: competence.idConnaissance,
            title: competence.libelleCompetence,
            description: competence.descriptif,
            value: parseFloat(`${competence.valeur}`),
          });
          tempMarkCompetences[competenceID] = true;
        }
      }

      // Check mark numerical value
      let isMarkEffective = !(mark.enLettre || mark.nonSignificatif);
      let markValueStr = `${mark.valeur}`.trim();
      let markValue = parseFloat(`${mark.valeur}`.replace(",", "."));
      let markValueOn = parseFloat(`${mark.noteSur}`.replace(",", "."));

      // Determine if the mark has a value or is empty
      let markHasValue = true;
      let markOnlyHasCompetences = false;
      if (!markValueOn) {
        isMarkEffective = false;
        markHasValue = false;
        markValueStr = "--";
        markValueOn = 20;

        // Loop through the competences and do a rounded average
        let totalCompetenceValue = 0;
        let totalCompetenceCount = 0;
        for (const competence of markCompetences) {
          if (competence.value > 0) {
            totalCompetenceValue += competence.value;
            totalCompetenceCount++;
          }
        }
        if (totalCompetenceCount > 0) {
          markValue = Math.round(totalCompetenceValue / totalCompetenceCount) - 1;
          markValueOn = 3;
          markValueStr = `${markValue}`;

          markHasValue = true;
          isMarkEffective = true;
          markOnlyHasCompetences = true;
        }
      }
      if (isNaN(markValue)) { markHasValue = false; }

      // Class values
      let markClassValue = parseFloat(
        `${mark.moyenneClasse}`.replace(",", "."),
      );
      let markMinClassValue = parseFloat(`${mark.minClasse}`.replace(",", "."));
      let markMaxClassValue = parseFloat(`${mark.maxClasse}`.replace(",", "."));

      // Final
      let finalMark = {
        id: markID,
        periodID: periodID,
        subjectID: subjectID,
        subSubjectID: subSubjectID,

        date: markDate,
        title: markTitle,
        type: capitalizeWords(mark.typeDevoir),
        comment: mark.commentaire,
        defaultIsEffective: isMarkEffective,
        hasValue: markHasValue,

        defaultCoefficient: markCoefficient,

        competences: markCompetences,
        onlyHasCompetences: markOnlyHasCompetences,

        valueStr: markValueStr,
        value: markValue,
        valueOn: markValueOn,

        classValue: markClassValue,
        minClassValue: markMinClassValue,
        maxClassValue: markMaxClassValue,
      };

      sortedMarks.push(finalMark);
    }
    sortedMarks.sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const mark of sortedMarks) {
      const { id, periodID, subjectID, subSubjectID } = mark;

      // Create period if it doesn't exist
      if (!(periodID in periods)) {
        console.log(`Got mark without period ! ${id}`);

        // Create the subject
        let tempSubjects = {};
        let tempSubject = createSubject(
          subjectID,
          subSubjectID,
          null,
          periodID,
          subjectID,
          [],
          [],
          1,
          [],
        );
        tempSubjects[subjectID] = tempSubject;

        periods[periodID] = createPeriod(
          periodID,
          periodID,
          true,
          tempSubjects,
          {},
          [],
          [subjectID],
        );
      }

      // Add mark to corresponding Subject (create if not existent)
      if (!(subjectID in periods[periodID].subjects)) {
        console.log(`Got mark without subject ! ${id}`);

        periods[periodID].subjects[subjectID] = createSubject(
          subjectID,
          null,
          null,
          periodID,
          subjectID,
          [],
          [],
          1,
          [],
        );
        periods[periodID].subjectsNotInSubjectGroup.push(subjectID);
      }
      periods[periodID].subjects[subjectID].marks.push(id);
      periods[periodID].subjects[subjectID].sortedMarks.push(id);

      // Add mark to corresponding SubSubject
      if (subSubjectID) {
        const parentSubject = periods[periodID].subjects[subjectID];
        if (!(subSubjectID in parentSubject.subSubjects)) {
          console.log(`Got mark without sub subject ! ${id}`);

          parentSubject.subSubjects[subSubjectID] = createSubject(
            subjectID,
            subSubjectID,
            null,
            periodID,
            subSubjectID,
            [],
            [],
            1,
            [],
          );
        }
        parentSubject.subSubjects[subSubjectID].marks.push(id);
        parentSubject.subSubjects[subSubjectID].sortedMarks.push(id);
      }

      // Add mark to corresponding Period
      periods[periodID].marks[id] = mark;
      periods[periodID].sortedMarks.push(id);

      // Enrich mark with subject name and aliases for compatibility
      const targetSubject = subSubjectID ? (periods[periodID].subjects[subjectID]?.subSubjects?.[subSubjectID] || periods[periodID].subjects[subjectID]) : periods[periodID].subjects[subjectID];
      if (targetSubject) {
        mark.subjectTitle = targetSubject.title;
        mark.matiere = targetSubject.title;
      }
      mark.scale = mark.valueOn;
      mark.valeur = mark.valueStr;
      mark.noteSur = mark.valueOn;
    }

    // Reverse mark lists
    for (const periodID in periods) {
      periods[periodID].sortedMarks.reverse();
      for (const subjectID in periods[periodID].subjects) {
        periods[periodID].subjects[subjectID].sortedMarks.reverse();
        for (const subSubjectID in periods[periodID].subjects[subjectID].subSubjects) {
          periods[periodID].subjects[subjectID].subSubjects[subSubjectID].sortedMarks.reverse();
        }
      }
    }

    // Generate Year Period
    const yearPeriod = this._generateYearPeriod(periods);
    if (yearPeriod) {
      periods[yearPeriod.id] = yearPeriod;
    }

    // Save
    var cacheData = (await StorageHandler.getData("marks")) ?? {};
    cacheData[accountID] = {
      data: periods,
      date: new Date(),
    };
    await StorageHandler.saveData("marks", cacheData);
    await ColorsHandler.save();

    // Calculate average history
    await this.recalculateAverageHistory(accountID);
    return 1;
  }

  // Generate a virtual "Year" period merging all others
  static _generateYearPeriod(periods) {
    const yearPeriodID = "YEAR";
    const yearPeriod = {
      id: yearPeriodID,
      title: "Année",
      isFinished: false,
      subjects: {},
      subjectGroups: {},
      sortedSubjectGroups: [],
      subjectsNotInSubjectGroup: [],
      marks: {},
      sortedMarks: [],
      averageHistory: [],
      appreciationPP: "",
      appreciationCE: "",
    };

    const titleToSubjectGroupID = {};
    const titleToSubjectID = {};

    // 1. Iterate over real periods
    for (const period of Object.values(periods)) {
      if (period.id === yearPeriodID) continue;

      // Merge Marks
      for (const markID of period.sortedMarks) {
        const mark = period.marks[markID];
        if (!mark) continue;

        // Clone mark to avoid mutating original
        const yearMark = { ...mark, periodID: yearPeriodID };

        // Find or Create Subject Group
        let sgTitle = "AUTRES";
        const originalSubject = period.subjects[mark.subjectID];
        if (originalSubject && originalSubject.subjectGroupID && period.subjectGroups[originalSubject.subjectGroupID]) {
          sgTitle = period.subjectGroups[originalSubject.subjectGroupID].title;
        }

        let yearSgID = titleToSubjectGroupID[sgTitle];
        if (!yearSgID) {
          yearSgID = `YEAR_SG_${sgTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;
          if (!yearPeriod.subjectGroups[yearSgID]) {
            titleToSubjectGroupID[sgTitle] = yearSgID;
            yearPeriod.subjectGroups[yearSgID] = {
              id: yearSgID,
              periodID: yearPeriodID,
              title: sgTitle,
              isEffective: true,
              defaultCoefficient: 0,
              subjects: [],
              averageHistory: [],
              classAverage: undefined,
              average: undefined,
            };
            yearPeriod.sortedSubjectGroups.push(yearSgID);
          }
        }

        // Find or Create Subject
        let sTitle = "Inconnu";
        let sCoef = 1;
        if (originalSubject) {
          sTitle = originalSubject.title;
          sCoef = originalSubject.defaultCoefficient;
        }

        let yearSubjectID = titleToSubjectID[sTitle];
        if (!yearSubjectID) {
          yearSubjectID = `YEAR_SUB_${sTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;
          if (!yearPeriod.subjects[yearSubjectID]) {
            titleToSubjectID[sTitle] = yearSubjectID;
            yearPeriod.subjects[yearSubjectID] = {
              id: yearSubjectID,
              subID: null,
              subjectGroupID: yearSgID,
              periodID: yearPeriodID,
              subSubjects: {},
              title: sTitle,
              teachers: originalSubject ? originalSubject.teachers : [],
              appreciations: [], // Could merge?
              defaultIsEffective: true,
              defaultCoefficient: sCoef,
              marks: [],
              sortedMarks: [],
              averageHistory: [],
            };
            // Add to SG
            yearPeriod.subjectGroups[yearSgID].subjects.push(yearSubjectID);
            // Colors - Copy from original subject to maintain consistency
            if (originalSubject) {
              const originalColors = ColorsHandler.getSubjectColors(originalSubject.id);
              ColorsHandler.attribuatedSubjectColors[yearSubjectID] = [originalColors.dark, originalColors.light];
            } else {
              ColorsHandler.registerSubjectColor(yearSubjectID);
            }
          }
        }

        // Link Mark
        yearMark.subjectID = yearSubjectID;
        yearMark.subSubjectID = null; // Flatten

        // Add to Period
        yearPeriod.marks[yearMark.id] = yearMark;
        yearPeriod.sortedMarks.push(yearMark.id);

        // Add to Subject
        yearPeriod.subjects[yearSubjectID].marks.push(yearMark.id);
        yearPeriod.subjects[yearSubjectID].sortedMarks.push(yearMark.id);
      }
    }

    // Sort Global Marks by Date (newest first)
    yearPeriod.sortedMarks.sort((a, b) => {
      const dateA = new Date(yearPeriod.marks[a].date);
      const dateB = new Date(yearPeriod.marks[b].date);
      return dateB - dateA; // Reversed for newest first
    });

    // Sort Subject Marks (newest first)
    Object.values(yearPeriod.subjects).forEach(sub => {
      sub.sortedMarks.sort((a, b) => new Date(yearPeriod.marks[b].date) - new Date(yearPeriod.marks[a].date));
    });

    // Sort Subject Groups to match the order from original periods
    // Find the first period with subject groups to use as reference
    const referencePeriod = Object.values(periods).find(p => p.id !== yearPeriodID && p.sortedSubjectGroups?.length > 0);
    if (referencePeriod) {
      // Create a map of subject group titles to their order in the reference period
      const sgOrderMap = {};
      referencePeriod.sortedSubjectGroups.forEach((sgID, index) => {
        const sg = referencePeriod.subjectGroups[sgID];
        if (sg) {
          sgOrderMap[sg.title] = index;
        }
      });

      // Sort year period subject groups based on this order
      yearPeriod.sortedSubjectGroups.sort((a, b) => {
        const titleA = yearPeriod.subjectGroups[a]?.title || '';
        const titleB = yearPeriod.subjectGroups[b]?.title || '';
        const orderA = sgOrderMap[titleA] ?? 999;
        const orderB = sgOrderMap[titleB] ?? 999;
        return orderA - orderB;
      });

      // Also sort subjects within each group to match the reference order
      Object.values(yearPeriod.subjectGroups).forEach(yearSG => {
        // Find the corresponding subject group in the reference period
        const refSG = Object.values(referencePeriod.subjectGroups).find(sg => sg.title === yearSG.title);
        if (refSG) {
          // Create a map of subject titles to their order
          const subjectOrderMap = {};
          refSG.subjects.forEach((subID, index) => {
            const subject = referencePeriod.subjects[subID];
            if (subject) {
              subjectOrderMap[subject.title] = index;
            }
          });

          // Sort year subjects based on this order
          yearSG.subjects.sort((a, b) => {
            const titleA = yearPeriod.subjects[a]?.title || '';
            const titleB = yearPeriod.subjects[b]?.title || '';
            const orderA = subjectOrderMap[titleA] ?? 999;
            const orderB = subjectOrderMap[titleB] ?? 999;
            return orderA - orderB;
          });
        }
      });
    }

    // Always return year period even if empty, so the tab appears
    return yearPeriod;
  }
  // Set custom data
  static async applyCustomData(accountID, periods, isSinglePeriod = false) {
    const customData = await this._getAccountCustomData(accountID);
    if (!customData) {
      return;
    }

    // Reset all previous custom data
    (isSinglePeriod ? [periods] : Object.values(periods)).forEach(period => {
      Object.values(period.marks).forEach(mark => {
        mark.isCustomCoefficient = false;
      });
      Object.values(period.subjects).forEach(subject => {
        subject.isCustomCoefficient = false;
        Object.values(subject.subSubjects).forEach(subSubject => {
          subSubject.isCustomCoefficient = false;
        });
      });
    })

    // Marks (period specific)
    function applyMarkCustomData(period, markID, customData) {
      let correspondingMark = period.marks[markID];
      if (correspondingMark) {
        if (customData.marks[period.id][markID].coefficient) {
          correspondingMark.isCustomCoefficient = true;
        }
        if (!customData.marks[period.id][markID].isEffective) {
          correspondingMark.generalAverageInfluence = null;
          correspondingMark.subjectAverageInfluence = null;
          correspondingMark.subSubjectAverageInfluence = null;
        }
        Object.keys(customData.marks[period.id][markID]).forEach((key) => {
          correspondingMark[key] = customData.marks[period.id][markID][key];
        });
      }
    }

    Object.keys(customData.marks ?? {}).forEach((periodID) => {
      if (isSinglePeriod && periodID != periods.id) {
        return;
      }
      Object.keys(customData.marks[periodID] ?? {}).forEach((markID) => {
        applyMarkCustomData(
          isSinglePeriod ? periods : periods[periodID],
          markID,
          customData,
        );
      });
    });

    // Subjects (not period specific)
    Object.keys(customData.subjects ?? {}).forEach((fullSubjectID) => {
      Object.keys(periods).forEach((periodID) => {
        let subjectID = fullSubjectID.split("/")[0];
        let subSubjectID = fullSubjectID.split("/")[1];
        let correspondingSubject = (
          isSinglePeriod ? periods : periods[periodID]
        ).subjects[subjectID];
        if (subSubjectID) {
          correspondingSubject = correspondingSubject.subSubjects[subSubjectID];
        }

        if (correspondingSubject) {
          if (customData.subjects[fullSubjectID].coefficient) {
            correspondingSubject.isCustomCoefficient = true;
          }
          Object.keys(customData.subjects[fullSubjectID]).forEach((key) => {
            correspondingSubject[key] = customData.subjects[fullSubjectID][key];
          });
        }
      });
    });
  }
  // Set possibly missing data
  static applyMissingData(accountID, periods, isSinglePeriod = false) {
    Object.values(isSinglePeriod ? { [periods.id]: periods } : periods).forEach(
      (period) => {
        // Set missing mark data
        Object.values(period.marks).forEach((mark) => {
          if (mark.isEffective == undefined) { mark.isEffective = mark.defaultIsEffective; }

          // Guess coefficient if enabled
          if (!mark.isCustomCoefficient || isNaN(mark.coefficient)) {
            if (CoefficientHandler.guessMarkCoefficientEnabled[accountID]) {
              mark.coefficient = CoefficientHandler.chooseMarkCoefficient(mark.title);
            } else {
              mark.coefficient = mark.defaultCoefficient;
            }
          }
        });

        // Set missing subject data
        Object.values(period.subjects).forEach((subject) => {
          if (subject.isEffective == undefined) { subject.isEffective = subject.defaultIsEffective; }

          // Guess coefficient
          if (!subject.isCustomCoefficient || isNaN(subject.coefficient)) {
            if (CoefficientHandler.guessSubjectCoefficientEnabled[accountID]) {
              let subjectGroupTitle = "";
              if (subject.subjectGroupID) { subjectGroupTitle = period.subjectGroups[subject.subjectGroupID].title; }
              subject.coefficient = CoefficientHandler.chooseSubjectCoefficient(accountID, subject.title, subjectGroupTitle);
            } else {
              subject.coefficient = subject.defaultCoefficient;
            }
          }

          Object.values(subject.subSubjects).forEach((subSubject) => {
            if (subSubject.isEffective == undefined) { subSubject.isEffective = subSubject.defaultIsEffective; }

            // Guess coefficient
            if (!subSubject.isCustomCoefficient || isNaN(subSubject.coefficient)) {
              if (CoefficientHandler.guessSubjectCoefficientEnabled[accountID]) {
                subSubject.coefficient = CoefficientHandler.chooseSubjectCoefficient(accountID, subSubject.title, "");
              } else {
                subSubject.coefficient = subSubject.defaultCoefficient;
              }
            }
          });
        });
      },
    );
  }
  // Calculate all averages
  static async _refreshAverages(givenPeriod, averageDate, updateMarkGeneralInfluence, updateMarkSubjectAverageInfluence, updateMarkSubSubjectAverageInfluence) {
    // Preferences
    const countMarksWithOnlyCompetences = await AccountHandler.getPreference(
      "countMarksWithOnlyCompetences",
    );

    // Calculates the straight average for any given subject
    function _calculateSubjectAverage(subject, getMark, averageDate, customUpdateMarkSubjectAverageInfluence) {
      let nbOfCountedMarks = 0;

      let sumOfMarks = 0;
      let coefOfMarks = 0;
      let sumOfClassMarks = 0;
      let coefOfClassMarks = 0;

      subject.marks.forEach((markID) => {
        const mark = getMark(markID);
        if (mark.hasValue && mark.isEffective) {
          if (mark.onlyHasCompetences) {
            if (countMarksWithOnlyCompetences) {
              sumOfMarks += (mark.value / mark.valueOn * 20) * mark.coefficient;
              coefOfMarks += mark.coefficient;
              nbOfCountedMarks += 1;
            }
          } else if (mark.valueOn) {
            sumOfMarks += (mark.value / mark.valueOn) * 20 * mark.coefficient;
            coefOfMarks += mark.coefficient;
            if (mark.classValue) {
              sumOfClassMarks +=
                (mark.classValue / mark.valueOn) * 20 * mark.coefficient;
              coefOfClassMarks += mark.coefficient;
            }
            nbOfCountedMarks += 1;
          }
        }
      });

      if (coefOfClassMarks) {
        subject.classAverage = sumOfClassMarks / coefOfClassMarks;
        subject.hasClassAverage = true;
      }
      if (coefOfMarks) {
        subject.average = sumOfMarks / coefOfMarks;
        subject.hasAverage = true;

        if (
          nbOfCountedMarks !=
          subject.averageHistory[subject.averageHistory.length - 1]?.nbMarks
        ) {
          subject.averageHistory.push({
            value: subject.average,
            classValue: subject.classAverage,
            nbMarks: nbOfCountedMarks,
            date: averageDate,
          });
          customUpdateMarkSubjectAverageInfluence(subject.averageHistory[subject.averageHistory.length - 1].value - (subject.averageHistory[subject.averageHistory.length - 2]?.value ?? subject.averageHistory[subject.averageHistory.length - 1].value))
        }
      }

      return nbOfCountedMarks;
    }

    // Calculates the average of subjects that can contain subSubjects
    function calculateAllSubjectAverages(subject, getMark, averageDate) {
      let nbOfCountedMarks = 0;

      let sumOfSubSubjects = 0;
      let coefOfSubSubjects = 0;
      let sumOfClassSubSubjects = 0;
      let coefOfClassSubSubjects = 0;
      Object.values(subject.subSubjects).forEach((subSubject) => {
        let _nbOfCountedMarks = _calculateSubjectAverage(
          subSubject,
          getMark,
          averageDate,
          updateMarkSubSubjectAverageInfluence,
        );
        if (subSubject.isEffective) {
          if (subSubject.hasAverage) {
            sumOfSubSubjects += subSubject.average * subSubject.coefficient;
            coefOfSubSubjects += subSubject.coefficient;
            nbOfCountedMarks += _nbOfCountedMarks;
          }
          if (subSubject.hasClassAverage) {
            sumOfClassSubSubjects +=
              subSubject.classAverage * subSubject.coefficient;
            coefOfClassSubSubjects += subSubject.coefficient;
          }
        }
      });

      // To not count twice marks in subject containing sub subjects
      if (!coefOfSubSubjects && !coefOfClassSubSubjects) {
        _calculateSubjectAverage(subject, getMark, averageDate, updateMarkSubjectAverageInfluence);
      } else {
        if (coefOfClassSubSubjects) {
          subject.classAverage = sumOfClassSubSubjects / coefOfClassSubSubjects;
          subject.hasClassAverage = true;
        }
        if (coefOfSubSubjects) {
          subject.average = sumOfSubSubjects / coefOfSubSubjects;
          subject.hasAverage = true;

          if (
            nbOfCountedMarks !=
            subject.averageHistory[subject.averageHistory.length - 1]?.nbMarks
          ) {
            subject.averageHistory.push({
              value: subject.average,
              classValue: subject.classAverage,
              nbMarks: nbOfCountedMarks,
              date: averageDate,
            });
            updateMarkSubjectAverageInfluence(subject.averageHistory[subject.averageHistory.length - 1].value - (subject.averageHistory[subject.averageHistory.length - 2]?.value ?? subject.averageHistory[subject.averageHistory.length - 1].value));
          }
        }
      }
    }

    // Calculates the average of subjectGroups
    function calculateAllSubjectGroupsAverages(
      subjectGroup,
      getSubject,
      getMark,
      averageDate,
    ) {
      let sumOfSubjectAverages = 0;
      let coefOfSubjectAverages = 0;
      let sumOfClassSubjectAverages = 0;
      let coefOfClassSubjectAverages = 0;
      subjectGroup.subjects.forEach((subjectID) => {
        const subject = getSubject(subjectID);
        calculateAllSubjectAverages(subject, getMark, averageDate);

        if (subject.isEffective) {
          if (subject.hasAverage) {
            sumOfSubjectAverages += subject.average * subject.coefficient;
            coefOfSubjectAverages += subject.coefficient;
          }
          if (subject.hasClassAverage) {
            sumOfClassSubjectAverages +=
              subject.classAverage * subject.coefficient;
            coefOfClassSubjectAverages += subject.coefficient;
          }
        }
      });

      if (coefOfClassSubjectAverages) {
        subjectGroup.classAverage =
          sumOfClassSubjectAverages / coefOfClassSubjectAverages;
        subjectGroup.hasClassAverage = true;
      }
      if (coefOfSubjectAverages) {
        subjectGroup.average = sumOfSubjectAverages / coefOfSubjectAverages;
        subjectGroup.hasAverage = true;

        if (
          subjectGroup.averageHistory[subjectGroup.averageHistory.length - 1]
            ?.value != subjectGroup.average
        ) {
          subjectGroup.averageHistory.push({
            value: subjectGroup.average,
            classValue: subjectGroup.classAverage,
            date: averageDate,
          });
        }

        // Set coefficient if not existing
        if (!subjectGroup.defaultCoefficient) {
          subjectGroup.coefficient = coefOfSubjectAverages;
        }
      }
    }

    // Calculates the average of periods
    function calculatePeriodAverage(period, averageDate) {
      // Calculate subject groups averages
      let sumOfSubjectGroupsAverages = 0;
      let coefOfSubjectGroupsAverages = 0;
      let sumOfClassSubjectGroupsAverages = 0;
      let coefOfClassSubjectGroupsAverages = 0;
      Object.values(period.subjectGroups).forEach((subjectGroup) => {
        calculateAllSubjectGroupsAverages(
          subjectGroup,
          (subjectID) => period.subjects[subjectID],
          (markID) => period.marks[markID],
          averageDate,
        );

        if (subjectGroup.isEffective) {
          if (subjectGroup.hasAverage) {
            sumOfSubjectGroupsAverages +=
              subjectGroup.average * subjectGroup.coefficient;
            coefOfSubjectGroupsAverages += subjectGroup.coefficient;
          }
          if (subjectGroup.hasClassAverage) {
            sumOfClassSubjectGroupsAverages +=
              subjectGroup.classAverage * subjectGroup.coefficient;
            coefOfClassSubjectGroupsAverages += subjectGroup.coefficient;
          }
        }
      });

      // Calculate averages of remaining subjects
      period.subjectsNotInSubjectGroup.forEach((subjectID) => {
        const subject = period.subjects[subjectID];
        calculateAllSubjectAverages(
          subject,
          (markID) => period.marks[markID],
          averageDate,
        );
        if (subject.isEffective) {
          if (subject.hasAverage) {
            sumOfSubjectGroupsAverages += subject.average * subject.coefficient;
            coefOfSubjectGroupsAverages += subject.coefficient;
          }
          if (subject.hasClassAverage) {
            sumOfClassSubjectGroupsAverages +=
              subject.classAverage * subject.coefficient;
            coefOfClassSubjectGroupsAverages += subject.coefficient;
          }
        }
      });

      // Calculate global average
      if (coefOfClassSubjectGroupsAverages) {
        period.classAverage =
          sumOfClassSubjectGroupsAverages / coefOfClassSubjectGroupsAverages;
        period.hasClassAverage = true;
      }
      if (coefOfSubjectGroupsAverages) {
        period.average =
          sumOfSubjectGroupsAverages / coefOfSubjectGroupsAverages;
        period.hasAverage = true;

        if (
          period.averageHistory[period.averageHistory.length - 1]?.value !=
          period.average
        ) {
          period.averageHistory.push({
            value: period.average,
            classValue: period.classAverage,
            date: averageDate,
          });
          updateMarkGeneralInfluence(period.averageHistory[period.averageHistory.length - 1].value - (period.averageHistory[period.averageHistory.length - 2]?.value ?? period.averageHistory[period.averageHistory.length - 1].value))
        }
      }
    }

    // Calculate averages
    if (givenPeriod) {
      var generalAverageInfluence = calculatePeriodAverage(givenPeriod, averageDate);
    }

    return generalAverageInfluence;
  }
  // Calculate the whole average history of a given period
  static async recalculateAverageHistory(accountID) {
    // Get given period
    const cacheData = (await StorageHandler.getData("marks")) ?? {};

    for (const givenPeriod of Object.values(cacheData[accountID]?.data ?? {})) {
      // Reset average history and marks
      givenPeriod.averageHistory = [];
      givenPeriod.average = undefined;
      Object.values(givenPeriod.subjectGroups).forEach((subjectGroup) => {
        subjectGroup.averageHistory = [];
        subjectGroup.hasAverage = false;
        subjectGroup.average = undefined;
        subjectGroup.hasClassAverage = false;
        subjectGroup.classAverage = undefined;
      });
      Object.values(givenPeriod.subjects).forEach((subject) => {
        subject.averageHistory = [];
        subject.marks = [];
        subject.hasAverage = false;
        subject.average = undefined;
        subject.hasClassAverage = false;
        subject.classAverage = undefined;
        subject.isEffective = true;
        Object.values(subject.subSubjects).forEach((subSubject) => {
          subSubject.averageHistory = [];
          subSubject.marks = [];
          subSubject.hasAverage = false;
          subSubject.average = undefined;
          subSubject.hasClassAverage = false;
          subSubject.classAverage = undefined;
          subSubject.isEffective = true;
        });
      });


      // CLEANUP: Remove old simulated marks from subject.sortedMarks to prevent ghost marks
      Object.values(givenPeriod.subjects).forEach(subject => {
        subject.sortedMarks = subject.sortedMarks.filter(markID => {
          const mark = givenPeriod.marks[markID];
          return mark && !mark.isSimulated;
        });
      });

      Object.values(givenPeriod.marks).forEach((mark) => {
        mark.isEffective = undefined;
      });


      await this.applyCustomData(accountID, givenPeriod, true);
      this.applyMissingData(accountID, givenPeriod, true);

      // Add the marks one by one
      var listOfMarks = givenPeriod.sortedMarks.slice().reverse();

      // INJECT SIMULATION
      const simulatedMarks = await this.getSimulatedMarks(accountID);
      simulatedMarks.forEach(sm => {
        if (sm.periodID && sm.periodID !== givenPeriod.id) return;

        // Add to period map
        // Add to period map
        givenPeriod.marks[sm.id] = {
          ...sm,
          value: parseFloat(sm.value),
          valueOn: parseFloat(sm.scale),
          valueStr: `${sm.value}`,
          coefficient: parseFloat(sm.coefficient || 1),
          hasValue: true,
          isEffective: true,
          classValue: null,
          competences: [],
        };

        // Add to subject
        if (givenPeriod.subjects[sm.subjectID]) {
          // Do not add to marks (loop below does it)
          if (!givenPeriod.subjects[sm.subjectID].sortedMarks.includes(sm.id)) {
            givenPeriod.subjects[sm.subjectID].sortedMarks.push(sm.id);
          }
        }

        listOfMarks.push(sm.id);
      });
      for (const markID of listOfMarks) {
        // Add to corresponding subject
        let mark = givenPeriod.marks[markID];
        let subject = givenPeriod.subjects[mark.subjectID];
        subject.marks.push(markID);
        if (mark.subSubjectID) {
          let subSubject = subject.subSubjects[mark.subSubjectID];
          subSubject.marks.push(markID);
        }

        // Reset influences
        givenPeriod.marks[markID].generalAverageInfluence = undefined;
        givenPeriod.marks[markID].subjectAverageInfluence = undefined;
        givenPeriod.marks[markID].subSubjectAverageInfluence = undefined;

        await this._refreshAverages(
          givenPeriod,
          givenPeriod.marks[markID].date,
          (generalAverageInfluence) => {
            mark.generalAverageInfluence = generalAverageInfluence;
          },
          (subjectAverageInfluence) => {
            if (subjectAverageInfluence) { mark.subjectAverageInfluence = subjectAverageInfluence; }
          },
          (subSubjectAverageInfluence) => {
            if (subSubjectAverageInfluence) { mark.subSubjectAverageInfluence = subSubjectAverageInfluence; }
          }
        );
      }
    }

    // Save data
    await StorageHandler.saveData("marks", cacheData);
  }
  // Helper function
  static async getLastTimeUpdatedMarks(accountID) {
    const marks = await StorageHandler.getData("marks");
    if (marks && accountID in marks) {
      return marks[accountID].date;
    }
  }

  // Custom data //

  // Account specific data
  static async _setAccountCustomData(accountID, data) {
    const customData = (await StorageHandler.getData("customData")) ?? {};
    customData[accountID] = data;
    await StorageHandler.saveData("customData", customData);
  }
  static async _getAccountCustomData(accountID) {
    const customData = (await StorageHandler.getData("customData")) ?? {};
    if (accountID in customData) {
      return customData[accountID];
    }
    return {};
  }
  // Direct functions
  static async setCustomData(
    accountID,
    dataType,
    itemID,
    property,
    value,
    periodID = null,
  ) {
    const customData = await this._getAccountCustomData(accountID);
    if (!customData[dataType]) {
      customData[dataType] = {};
    }
    if (periodID) {
      if (!customData[dataType][periodID]) {
        customData[dataType][periodID] = {};
      }
      if (!customData[dataType][periodID][itemID]) {
        customData[dataType][periodID][itemID] = {};
      }
      customData[dataType][periodID][itemID][property] = value;
    } else {
      if (!customData[dataType][itemID]) {
        customData[dataType][itemID] = {};
      }
      customData[dataType][itemID][property] = value;
    }
    await this._setAccountCustomData(accountID, customData);
  }
  static async removeCustomData(accountID, dataType, itemID, property, periodID = null) {
    const customData = await this._getAccountCustomData(accountID);
    if (dataType in customData && (itemID in customData[dataType] || periodID in customData[dataType])) {
      if (periodID) {
        delete customData[dataType][periodID][itemID][property];
      } else {
        delete customData[dataType][itemID][property];
      }
    }
    await this._setAccountCustomData(accountID, customData);
  }
  static async resetCoefficients(account, updateGlobalDisplay) {
    await StorageHandler.deleteFiles(["customData"]);
    if (account.accountType == "E") { await this.recalculateAverageHistory(account.id); }
    else {
      for (const childID in account.children) {
        await this.recalculateAverageHistory(childID);
      }
    }

    updateGlobalDisplay();
  }
  // Simulation
  static async getSimulatedMarks(accountID) {
    const customData = await this._getAccountCustomData(accountID);
    return customData.simulatedMarks || [];
  }
  static async addSimulatedMark(accountID, markData) {
    const customData = await this._getAccountCustomData(accountID);
    if (!customData.simulatedMarks) customData.simulatedMarks = [];
    customData.simulatedMarks.push(markData);
    await this._setAccountCustomData(accountID, customData);
  }
  static async removeSimulatedMark(accountID, markID) {
    const customData = await this._getAccountCustomData(accountID);
    if (customData.simulatedMarks) {
      customData.simulatedMarks = customData.simulatedMarks.filter(m => m.id !== markID);
      await this._setAccountCustomData(accountID, customData);
    }
  }
}

export default MarksHandler;