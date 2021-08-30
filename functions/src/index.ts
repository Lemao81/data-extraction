import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as xlsx from "xlsx";
import CollectionReference = admin.firestore.CollectionReference;
import * as path from "path";
import * as os from "os";
import * as csvParse from "csv-parse";
// prettier-ignore
import {firestore} from "firebase-admin";
import Timestamp = firestore.Timestamp;

const sortOrderObj: { [key: string]: string[] } = {
  collection1: ["field1", "field3", "field2"],
  collection2: ["field4", "field2"],
};

const idHeader = "Id";
const fileName = "extracted-data.xlsx";

admin.initializeApp();
const db = admin.firestore();

export const extractData = functions.https.onRequest(async (req, resp) => {
  try {
    const workbook = xlsx.utils.book_new();
    const collRefs = await db.listCollections();
    if (!collRefs?.length) {
      workbook.SheetNames.push("Sheet1");
      workbook.Sheets.Sheet1 = xlsx.utils.aoa_to_sheet([[]]);
    } else {
      for (const collRef of collRefs) {
        const sheetName = collRef.id;
        const worksheet = xlsx.utils.aoa_to_sheet(
          await createSheetData(collRef),
        );
        workbook.SheetNames.push(sheetName);
        workbook.Sheets[sheetName] = worksheet;
      }
    }

    const filePath = path.join(os.tmpdir(), fileName);
    xlsx.writeFile(workbook, filePath);
    resp.download(filePath, fileName);
  } catch (error) {
    sendFailure(resp, error);
  }
});

export const bulkUpdate = functions.https.onRequest(async (req, resp) => {
  try {
    if (!(req.body instanceof Buffer)) {
      sendFailure(resp, new Error("Irregular upload format"));
    }

    csvParse(req.body as Buffer, async (error, records: Array<any>) => {
      if (error) {
        sendFailure(resp, error);
        return;
      }

      for (const record of records) {
        if (record.length !== 2) {
          continue;
        }

        const docRef = await db.collection(record[0]).doc(record[1]);
        if ((await docRef.get()).exists) {
          // prettier-ignore
          await docRef.update({deleted: Timestamp.now().toMillis()});
        }
      }

      resp.send("Bulk update succeeded");
    });
  } catch (error) {
    sendFailure(resp, error);
  }
});

/**
 * Creates array of array as extracted data for one sheet
 * @param {CollectionReference} collRef Firebase reference of one
 * collection
 */
async function createSheetData(
  collRef: CollectionReference,
): Promise<string[][]> {
  const columnsObj: { [key: string]: string[] } = {
    Id: [],
  };
  const docRefs = await collRef.listDocuments();
  let docCount = 0;
  for (const docRef of docRefs) {
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      continue;
    }

    const docKeyValues = docSnapshot.data();
    if (!docKeyValues) {
      continue;
    }

    columnsObj.Id.push(docSnapshot.id);
    for (const key in docKeyValues) {
      if (!Object.prototype.hasOwnProperty.call(docKeyValues, key)) {
        continue;
      }

      if (key === idHeader) {
        throw new Error("'Id' header is reserved");
      }

      const value = docKeyValues[key];
      if (key in columnsObj) {
        columnsObj[key].push(value);
      } else {
        columnsObj[key] = fillWithEmptyString(docCount).concat([value]);
      }
    }

    docCount++;
  }

  const columns = [];
  for (const key in columnsObj) {
    if (!Object.prototype.hasOwnProperty.call(columnsObj, key)) {
      continue;
    }

    columns.push([key].concat(columnsObj[key]));
  }

  const sortOrder = collRef.id in sortOrderObj ? sortOrderObj[collRef.id] : [];
  const columnsSorted = columns.sort((first, second) =>
    sortColumns(first, second, sortOrder),
  );

  return transformToRowsArray(columnsSorted);
}

/**
 * Returns array with count empty strings
 * @param {int} count Amount of empty strings
 * @return {Array<string>} Array containing empty strings
 */
function fillWithEmptyString(count: number): string[] {
  const result = new Array<string>(count);
  for (let i = 0; i < count; i++) {
    result[i] = "";
  }

  return result;
}

/**
 * Sort extracted data columns
 * @param {string[]} first Left side array
 * @param {string[]} second Right side array
 * @param {string[]} sortOrder Sort order array
 * @return {int} Order number
 */
function sortColumns(
  first: string[],
  second: string[],
  sortOrder: string[],
): number {
  const firstHeader = first[0];
  const secondHeader = second[0];

  if (firstHeader === idHeader) {
    return -1;
  } else if (secondHeader === idHeader) {
    return 1;
  } else if (
    sortOrder.includes(firstHeader) &&
    !sortOrder.includes(secondHeader)
  ) {
    return -1;
  } else if (
    sortOrder.includes(secondHeader) &&
    !sortOrder.includes(firstHeader)
  ) {
    return 1;
  } else if (
    sortOrder.includes(firstHeader) &&
    sortOrder.includes(secondHeader)
  ) {
    // prettier-ignore
    return sortOrder.indexOf(firstHeader) < sortOrder.indexOf(secondHeader) ?
      -1 :
      1;
  } else {
    return firstHeader < secondHeader ? -1 : 1;
  }
}

/**
 * Tronsforms column array to row array
 * @param {string[]} columnsArray Columns array to transform
 * @return {string[]} Rows array
 */
function transformToRowsArray(columnsArray: string[][]): string[][] {
  const rowCount = columnsArray[0].length;
  const columnCount = columnsArray.length;
  const result: string[][] = new Array<string[]>(rowCount);

  for (let i = 0; i < rowCount; i++) {
    result[i] = new Array<string>(columnCount);
    for (let j = 0; j < columnCount; j++) {
      result[i][j] = columnsArray[j][i];
    }
  }

  return result;
}

/**
 * Set failure code + message
 * @param {functions.Response} resp Response object
 * @param {Error | undefined} error Error object
 */
function sendFailure(resp: functions.Response, error: Error | undefined) {
  resp.status(500);
  resp.send("Bulk update failed. " + error?.message);
}
