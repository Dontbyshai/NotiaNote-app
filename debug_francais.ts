import StorageHandler from './src/core/StorageHandler';
import AccountHandler from './src/core/AccountHandler';

async function debug() {
    const data = await StorageHandler.getData("marks");
    const account = await AccountHandler.getMainAccount();
    const accID = account?.id;
    
    if (!data || !accID || !data[accID]) {
        console.log("No data found");
        return;
    }

    const periods = data[accID].data;
    const yearPeriod = periods["YEAR"];
    
    if (!yearPeriod) {
        console.log("No YEAR period found");
        return;
    }

    // Find Francais subject
    const subjKeys = Object.keys(yearPeriod.subjects);
    const francaisKey = subjKeys.find(k => k.includes("FRANCAIS") || k.includes("Francais"));
    
    if (!francaisKey) {
        console.log("Francais subject not found in YEAR. Available:", subjKeys);
        return;
    }

    const subject = yearPeriod.subjects[francaisKey];
    console.log("Subject Found:", francaisKey);
    console.log("Title:", subject.title);
    console.log("Sorted Marks Count:", subject.sortedMarks.length);
    console.log("Sorted Marks IDs:", subject.sortedMarks);

    // Check if these marks exist in period.marks
    subject.sortedMarks.forEach(mid => {
        const m = yearPeriod.marks[mid];
        console.log(`Mark ${mid} exists in period.marks? ${!!m}`);
        if (m) {
            console.log(`   -> SubjectID: ${m.subjectID}, Title: ${m.title}`);
        }
    });
}

debug();
