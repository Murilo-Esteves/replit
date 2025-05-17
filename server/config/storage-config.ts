// Configuração para determinar qual provedor de armazenamento usar
// Default to Firebase for testing
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'firebase'; // 'postgres' ou 'firebase'

// Função para alternar entre os provedores de armazenamento
export function setStorageProvider(provider: 'postgres' | 'firebase'): void {
  // Em implementação real, esta alteração seria persistida no ambiente
  process.env.STORAGE_PROVIDER = provider;
  console.log(`Provedor de armazenamento alterado para: ${provider}`);
}

// Configurações específicas para cada provedor
export const storageConfig = {
  postgres: {
    enabled: true,
    autoFallback: true, // Se verdadeiro, tenta automaticamente alternar para Firebase quando o Postgres falhar
  },
  firebase: {
    enabled: true,
    autoSync: false, // Se verdadeiro, mantém os dados sincronizados entre Postgres e Firebase
  }
};