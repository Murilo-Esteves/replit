import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Firebase configuration from the project settings
const firebaseConfig = {
  apiKey: "AIzaSyAYWJPS3RVMau-abNTtl_bfH9bhFhL_ISU",
  authDomain: "a-murilo-prazocerto.firebaseapp.com",
  databaseURL: "https://a-murilo-prazocerto-default-rtdb.firebaseio.com",
  projectId: "a-murilo-prazocerto",
  storageBucket: "a-murilo-prazocerto.firebasestorage.app",
  messagingSenderId: "142120436234",
  appId: "1:142120436234:web:d1e807e2d69dbf5ed755f3"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

export { firebaseApp, database, firebaseConfig };