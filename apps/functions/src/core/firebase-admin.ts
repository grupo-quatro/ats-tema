import * as admin from "firebase-admin";

//establece la conexion con servicios de Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const storage = admin.storage();
export const auth = admin.auth();
