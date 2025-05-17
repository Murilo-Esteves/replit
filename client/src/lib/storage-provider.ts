import { apiRequest } from "./queryClient";

// Interface para o status do provedor de armazenamento
export interface StorageStatus {
  currentProvider: "postgres" | "firebase";
  providers: {
    postgres: {
      enabled: boolean;
      autoFallback: boolean;
    };
    firebase: {
      enabled: boolean;
      autoSync: boolean;
    };
  };
  databaseUrl: string;
  firebaseUrl: string;
}

// Obter o provedor de armazenamento atual
export async function getStorageProvider(): Promise<StorageStatus> {
  try {
    const response = await apiRequest("GET", "/api/storage/status");
    return await response.json();
  } catch (error) {
    console.error("Erro ao obter o provedor de armazenamento:", error);
    // Se não conseguir obter o provedor, assume o padrão
    return {
      currentProvider: "firebase", // Usamos Firebase como fallback
      providers: {
        postgres: { enabled: false, autoFallback: true },
        firebase: { enabled: true, autoSync: false }
      },
      databaseUrl: "Não disponível",
      firebaseUrl: "Não disponível"
    };
  }
}

// Alternar para o Firebase
export async function switchToFirebase(): Promise<{
  success: boolean;
  message: string;
  currentProvider: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/storage/provider", {
      provider: "firebase"
    });
    return await response.json();
  } catch (error) {
    console.error("Erro ao alternar para Firebase:", error);
    return {
      success: false,
      message: "Não foi possível alternar para o Firebase",
      currentProvider: "postgres"
    };
  }
}

// Alternar para o PostgreSQL
export async function switchToPostgres(): Promise<{
  success: boolean;
  message: string;
  currentProvider: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/storage/provider", {
      provider: "postgres"
    });
    return await response.json();
  } catch (error) {
    console.error("Erro ao alternar para PostgreSQL:", error);
    return {
      success: false,
      message: "Não foi possível alternar para o PostgreSQL",
      currentProvider: "firebase"
    };
  }
}

// Migrar dados para o Firebase
export async function migrateToFirebase(): Promise<{
  success: boolean;
  message: string;
  currentProvider: string;
}> {
  try {
    const response = await apiRequest("POST", "/api/storage/migrate");
    return await response.json();
  } catch (error) {
    console.error("Erro ao migrar dados para Firebase:", error);
    return {
      success: false,
      message: "Não foi possível migrar dados para o Firebase",
      currentProvider: "postgres"
    };
  }
}