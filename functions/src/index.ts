import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import CollectionReference = admin.firestore.CollectionReference;

const fileName = "extracted-data.xlsx";

admin.initializeApp();
const db = admin.firestore();

export const extractData = functions.https.onRequest(async (request, response) => {
  const workbook = xlsx.utils.book_new();
  const collectionRefs = await db.listCollections();
  for (const collectionRef of collectionRefs) {
    const sheetName = collectionRef.id;
    const worksheet = xlsx.utils.aoa_to_sheet(await createSheetData(collectionRef));
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = worksheet;
  }
  xlsx.writeFile(workbook, fileName);
  response.sendFile(fileName);
});

async function createSheetData(collectionRef: CollectionReference): Promise<string[][]> {
  const firstRow = ["Id"];
  const result = [firstRow];
  const docRefs = await collectionRef.listDocuments();
  for (const docRef of docRefs) {
    const snapshot = await docRef.get();
    if (snapshot.exists) {
      const dataRow = [snapshot.id];
      result.push(dataRow);
      const data = snapshot.data();
      if (data) {
        for (const header in firstRow.slice(1)) {
          if (data.hasOwnProperty(header)) {
            dataRow.push(data[header]);
          }
        }
        for (const key in data) {
          if (data.hasOwnProperty(key) && !firstRow.includes(key)) {
            firstRow.push(key);
            dataRow.push(data[key]);
          }
        }
      }
    }
  }

  return result;
}
