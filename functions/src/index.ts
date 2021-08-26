import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const extractData = functions.https.onRequest((request, response) => {
  const ids: string[] = [];
  db.listCollections().then((collectionRefs) => {
    collectionRefs.forEach((collectionRef, index, _) => {
      ids.push(collectionRef.id);
      collectionRef.listDocuments().then((docRefs) => {
        docRefs.forEach((docRef) => {
          ids.push(docRef.id);
          docRef.get().then((snapshot) => {
            if (snapshot.exists) {
              const data = snapshot.data();
              if (data) {
                functions.logger.info(JSON.stringify(data));
              }
            }
          });
        });
      });
    });
  });
  response.send("Data extracted " + JSON.stringify(ids));
});
