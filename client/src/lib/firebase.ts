import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push, update, remove, query, orderByChild, equalTo, onValue, off, DatabaseReference, Query } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";

// Configuração do Firebase fornecida pelo usuário
export const firebaseConfig = {
  apiKey: "AIzaSyAYWJPS3RVMau-abNTtl_bfH9bhFhL_ISU",
  authDomain: "a-murilo-prazocerto.firebaseapp.com",
  databaseURL: "https://a-murilo-prazocerto-default-rtdb.firebaseio.com",
  projectId: "a-murilo-prazocerto",
  storageBucket: "a-murilo-prazocerto.firebasestorage.app",
  messagingSenderId: "142120436234",
  appId: "1:142120436234:web:d1e807e2d69dbf5ed755f3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Autenticação com Google
export const googleProvider = new GoogleAuthProvider();

// Funções para auth
export const loginWithGoogle = () => {
  signInWithRedirect(auth, googleProvider);
};

export const handleRedirect = () => {
  return getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const user = result.user;
        return { user, credential };
      }
      return null;
    })
    .catch((error) => {
      console.error("Erro no login:", error);
      throw error;
    });
};

// Funções de acesso ao banco de dados
export const dbRef = (path: string): DatabaseReference => {
  return ref(database, path);
};

export const queryRef = (reference: DatabaseReference, orderByField: string, matchValue: string | number): Query => {
  return query(reference, orderByChild(orderByField), equalTo(matchValue));
};

// Função para verificar a conexão com o Firebase
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    const connRef = ref(database, '.info/connected');
    const snapshot = await get(connRef);
    return snapshot.val() === true;
  } catch (error) {
    console.error("Erro ao verificar conexão:", error);
    return false;
  }
};

// Função para migrar dados para o Firebase
export const migrateToFirebase = async (): Promise<{ success: boolean, message: string }> => {
  try {
    const response = await fetch('/api/storage/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error("Erro ao migrar para o Firebase:", error);
    return {
      success: false,
      message: "Erro ao migrar dados para o Firebase"
    };
  }
};

// Função para obter o provedor de armazenamento atual
export const getStorageProvider = async (): Promise<"postgres" | "firebase"> => {
  try {
    const response = await fetch('/api/storage/status');
    const data = await response.json();
    return data.provider as "postgres" | "firebase";
  } catch (error) {
    console.error("Erro ao obter provedor de armazenamento:", error);
    return "postgres";
  }
};

// Função para trocar o provedor de armazenamento
export const setStorageProvider = async (provider: "postgres" | "firebase"): Promise<boolean> => {
  try {
    const response = await fetch('/api/storage/provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Erro ao definir provedor de armazenamento:", error);
    return false;
  }
};

export { app, database, storage, auth, ref, get, set, push, update, remove, query, orderByChild, equalTo, onValue, off };