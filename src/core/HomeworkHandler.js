import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import AccountHandler from "./AccountHandler";
import APIEndpoints from "./APIEndpoints";
import { capitalizeWords, formatDate3, parseHtmlData, decodeHtmlData } from "../util/Utils";
import StorageHandler from "./StorageHandler";
import EcoleDirecteApi from "../services/EcoleDirecteApi";


// This class contains all the functions used for logic and cache handling in the app
class HomeworkHandler {
  // Homework functions //
  static async getAllHomework(accountID) {
    console.log(`[HomeworkHandler] getAllHomework for ${accountID}`);
    const payload = `data=${JSON.stringify({})}`;
    return AccountHandler.parseEcoleDirecte(
      "homework",
      accountID,
      `${AccountHandler.USED_URL}${APIEndpoints.ALL_HOMEWORK(accountID)}`,
      payload,
      async (data) => {
        console.log(`[HomeworkHandler] Params: ${JSON.stringify(data)}`); // Log raw response keys
        return await this.saveHomework(accountID, data);
      }
    );
  }
  static async saveHomework(accountID, homeworks) {
    console.log(`[HomeworkHandler] saveHomework keys: ${Object.keys(homeworks)}`);
    var abstractHomework = {
      homeworks: {},
      days: {},
      weeks: {},
      subjectsWithExams: {},
    };

    Object.keys(homeworks).forEach(day => {
      let diff = dayjs(day, "YYYY-MM-DD").diff(dayjs().startOf('day'));
      console.log(`[HomeworkHandler] Processing day: ${day}, diff: ${diff}`);
      if (diff < 0) { return; }

      homeworks[day].forEach(homework => {
        let finalHomework = {
          id: homework.idDevoir,
          subjectID: homework.codeMatiere,
          subjectTitle: capitalizeWords(homework.matiere),
          done: homework.effectue,
          dateFor: day,
          dateGiven: new Date(homework.donneLe),
          isExam: homework.interrogation,
          isExam: homework.interrogation,
          content: parseHtmlData(homework.contenu || homework.aFaire), // Try both keys
          prof: homework.nomProf, // Add prof for matching (crucial for DS detection)
          files: homework.documents || [],
        };

        if (finalHomework.isExam) { // Check if exam is in less than 3 weeks
          let diff = new Date(day) - new Date();
          if (diff >= 0 && diff <= 3 * 7 * 24 * 60 * 60 * 1000) {
            abstractHomework.subjectsWithExams[finalHomework.subjectID] ??= [];
            abstractHomework.subjectsWithExams[finalHomework.subjectID].push(finalHomework.id);
          }
        }

        abstractHomework.days[day] ??= [];
        abstractHomework.days[day].push(finalHomework.id);

        // Add homework to corresponding week
        let dateObj = dayjs(day, 'YYYY-MM-DD', 'fr'); // TODO: fix this looking at the formatting of EcoleDirecte homework days

        let startOfWeek = new Date(dateObj);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1));

        let endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        let key = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}/${endOfWeek.getFullYear()}-${endOfWeek.getMonth() + 1}-${endOfWeek.getDate()}`;
        abstractHomework.weeks[key] ??= {
          "id": key,
          "title": `${formatDate3(key.split("/")[0])}  -  ${formatDate3(key.split("/")[1])}`,
          "data": [],
        };
        if (!abstractHomework.weeks[key].data.includes(day)) {
          abstractHomework.weeks[key].data.push(day);
        }

        abstractHomework.homeworks[finalHomework.id] = finalHomework;
      });
    });

    // Save data
    var cacheData = (await StorageHandler.getData("homework")) ?? {};
    const accID = `${accountID}`;
    cacheData[accID] = {
      data: abstractHomework,
      date: new Date(),
    };
    console.log(`[HomeworkHandler] Saving homework to storage for ${accID}`);
    await StorageHandler.saveData("homework", cacheData);

    return 1;
  }

  // Day-specific functions
  static async getSpecificHomeworkForDay(accountID, day) {
    const payload = `data=${JSON.stringify({})}`;
    return AccountHandler.parseEcoleDirecte(
      "specific-homework",
      accountID,
      `${AccountHandler.USED_URL}${APIEndpoints.SPECIFIC_HOMEWORK(accountID, day)}`,
      payload,
      async (data) => {
        return await this.saveSpecificHomeworkForDay(accountID, data);
      }
    );
  }
  static async saveSpecificHomeworkForDay(accountID, homeworks) {
    const day = homeworks.date;

    var cacheData = (await StorageHandler.getData("specific-homework")) ?? {};
    cacheData[accountID] ??= {
      homeworks: {},
      days: {},
    };

    // Reset day data to avoid duplicates and ensure we have fresh data
    cacheData[accountID].days[day] = {
      homeworkIDs: [],
      date: new Date()
    };

    homeworks.matieres?.forEach(homework => {
      // Logic from Web: try root session content first, then fallback to aFaire
      let sessionData = homework.contenuDeSeance;
      if (!sessionData && homework.aFaire) {
        sessionData = homework.aFaire.contenuDeSeance;
      }

      const rawSessionFiles = sessionData?.documents || [];
      const rawTodoFiles = homework.aFaire?.documents || [];
      const allFiles = [...rawSessionFiles, ...rawTodoFiles];
      // Deduplicate files by ID
      const uniqueFiles = Array.from(new Map(allFiles.map(f => [f.id, f])).values());

      const finalHomework = {
        id: homework.id,
        subject: homework.matiere,
        subjectCode: homework.codeMatiere,
        givenBy: homework.nomProf,
        todo: parseHtmlData(homework.aFaire?.contenu).trim(),
        sessionContent: parseHtmlData(sessionData?.contenu).trim(),
        sessionContentHtml: decodeHtmlData(sessionData?.contenu),
        files: uniqueFiles.map(document => {
          return {
            id: document.id,
            title: document.libelle,
            size: document.taille,
            fileType: document.type,
          };
        }),
      };
      cacheData[accountID].homeworks[homework.id] = finalHomework;
      cacheData[accountID].days[day] ??= { homeworkIDs: [] };
      cacheData[accountID].days[day].homeworkIDs.push(homework.id);
      cacheData[accountID].days[day].date = new Date();
    });

    await StorageHandler.saveData("specific-homework", cacheData);
    return 1;
  }

  // Other
  static async markHomeworkAsDone(accountID, homeworkID, done) {
    const status = await AccountHandler.parseEcoleDirecte(
      "mark-homework-status",
      accountID,
      `${AccountHandler.USED_URL}${APIEndpoints.ALL_HOMEWORK(accountID)}`,
      `data=${JSON.stringify({
        idDevoirsEffectues: done ? [homeworkID] : [],
        idDevoirsNonEffectues: done ? [] : [homeworkID],
      })}`,
      async (data) => {
        const cacheData = await StorageHandler.getData("homework");
        cacheData[accountID].data.homeworks[homeworkID].done = done;
        await StorageHandler.saveData("homework", cacheData);
        return 1;
      },
      "put",
    );

    return (status == 1) ? done : !done;
  }
  static async downloadHomeworkFile(accountID, file) {
    // Get login token
    const mainAccount = await AccountHandler._getMainAccountOfAnyAccount(accountID);
    const token = mainAccount.connectionToken;

    console.log(`Downloading ${file.title}...`);

    // Check if file exists in cache (optional, already handled by UI?)
    // But we want to download FRESH if not exists.

    try {
      // Sync token to API Service
      EcoleDirecteApi.token = token;

      let effectiveFileType = file.fileType;
      if (!effectiveFileType || effectiveFileType === 0 || effectiveFileType === "0" || typeof effectiveFileType === 'number') {
        effectiveFileType = "FICHIER_CDT";
      }

      console.log(`[HomeworkHandler] Downloading fileID: ${file.id}, fileType: ${file.fileType} -> using: ${effectiveFileType} `);

      const base64Data = await EcoleDirecteApi.downloadAttachment(file.id, effectiveFileType);

      const path = await StorageHandler.saveBase64Document(base64Data, file.title);
      console.log(`[HomeworkHandler] Saved to ${path} `);

      return {
        promise: Promise.resolve(),
        localFile: path
      };
    } catch (e) {
      console.error("[HomeworkHandler] Download Failed:", e);
      // Fallback to old method? Or just throw.
      throw e;
    }
  }

  // Helpers
  static async getLastTimeUpdatedHomework(accountID) {
    const cacheData = (await StorageHandler.getData("homework")) ?? {};
    if (accountID in cacheData) {
      return cacheData[accountID].date;
    }
  }
  static async getSubjectHasExam(accountID) {
    const cacheData = (await StorageHandler.getData("homework")) ?? {};
    if (accountID in cacheData) {
      return cacheData[accountID].data.subjectsWithExams;
    }
    return {};
  }
}

export default HomeworkHandler;