import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import CollectionReference = admin.firestore.CollectionReference;
import * as path from "path";
import * as os from "os";

const fileName = "extracted-data.xlsx";
const filePath = path.join(os.tmpdir(), fileName);

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
  resp.download(filePath, fileName);
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
  resp.download(filePath, fileName);
});

/**
 * Creates array of array as extracted data for one sheet
 * @param {CollectionReference} collectionRef firebase reference of one
 * collection
 */
async function createSheetData(
  collectionRef: CollectionReference,
): Promise<string[][]> {
  const headerRow = ["Id"];
  const result = [headerRow];
  const docRefs = await collectionRef.listDocuments();
  for (const docRef of docRefs) {
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      continue;
    }

    const data = snapshot.data();
    if (!data) {
      continue;
    }

    const dataRow = [snapshot.id];
    result.push(dataRow);

    headerRow.slice(1).forEach((header) => {
      if (Object.prototype.hasOwnProperty.call(data, header)) {
        dataRow.push(data[header]);
      } else {
        dataRow.push("");
      }
    });

    for (const key in data) {
      if (
        Object.prototype.hasOwnProperty.call(data, key) &&
        !headerRow.includes(key)
      ) {
        headerRow.push(key);
        dataRow.push(data[key]);
      }
    }
  }

  return result;
}
