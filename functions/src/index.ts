import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import CollectionReference = admin.firestore.CollectionReference;
import * as path from "path";

const fileName = "extracted-data.xlsx";
const filePath = path.resolve(__dirname, "..", "export", fileName);

admin.initializeApp();
const db = admin.firestore();

export const extractData = functions.https.onRequest(async (req, resp) => {
  const workbook = xlsx.utils.book_new();
  const collectionRefs = await db.listCollections();
  for (const collectionRef of collectionRefs) {
    const sheetName = collectionRef.id;
    const worksheet = xlsx.utils.aoa_to_sheet(
      await createSheetData(collectionRef),
    );
    workbook.SheetNames.push(sheetName);
    workbook.Sheets[sheetName] = worksheet;
  }
  xlsx.writeFile(workbook, filePath);
  resp.sendFile(filePath);
});

export const testExcelCreation = functions.https.onRequest((req, resp) => {
  const workbook = xlsx.utils.book_new();
  const sheetName1 = "Sheet1";
  const worksheet1 = xlsx.utils.aoa_to_sheet([
    ["header1", "header2"],
    ["data1", "data2"],
  ]);
  workbook.SheetNames.push(sheetName1);
  workbook.Sheets[sheetName1] = worksheet1;
  const sheetName2 = "Sheet2";
  const worksheet2 = xlsx.utils.aoa_to_sheet([
    ["header1", "header2"],
    ["data1", "data2"],
  ]);
  workbook.SheetNames.push(sheetName2);
  workbook.Sheets[sheetName2] = worksheet2;
  xlsx.writeFile(workbook, filePath);
  response.sendFile(filePath);
});

/**
 * Creates array of array extracted data for one sheet
 * @param {CollectionReference} collectionRef firebase reference of one
 * collection
 */
async function createSheetData(
  collectionRef: CollectionReference,
): Promise<string[][]> {
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
          if (Object.prototype.hasOwnProperty.call(data, header)) {
            dataRow.push(data[header]);
          }
        }
        for (const key in data) {
          if (
            Object.prototype.hasOwnProperty.call(data, key) &&
            !firstRow.includes(key)
          ) {
            firstRow.push(key);
            dataRow.push(data[key]);
          }
        }
      }
    }
  }

  return result;
}
