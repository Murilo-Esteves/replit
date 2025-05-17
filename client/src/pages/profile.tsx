import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/app-context";
import { useNotifications } from "@/hooks/use-notifications";
import { Loader2, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getStorageProvider, migrateToFirebase, switchToFirebase, switchToPostgres, StorageStatus } from "@/lib/storage-provider";

const Profile: React.FC = () => {
  const { user } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedNotificationDays, setSelectedNotificationDays] = useState<number[]>([]);
  const { supported, permission, requestPermission } = useNotifications();
  const [storageInfo, setStorageInfo] = useState<StorageStatus | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the user settings
  const { data: userData } = useQuery({
    queryKey: ['/api/users/current']
  });
  
  // Obter o status do provedor de armazenamento
  useEffect(() => {
    const fetchStorageStatus = async () => {
      try {
        setIsLoading(true);
        const status = await getStorageProvider();
        setStorageInfo(status);
      } catch (error) {
        console.error("Erro ao obter o status do armazenamento:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStorageStatus();
  }, []);
  
  // Update notification days when user data is loaded
  useEffect(() => {
    if (userData?.settings?.notificationDays) {
      setSelectedNotificationDays(userData.settings.notificationDays);
    }
  }, [userData]);
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return await apiRequest("PUT", "/api/users/settings", { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/current'] });
      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  });

  const handleDayToggle = (day: number) => {
    setSelectedNotificationDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  const handleSaveSettings = () => {
    const settings = {
      ...user?.settings,
      notificationDays: selectedNotificationDays
    };
    
    updateSettingsMutation.mutate(settings);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Perfil</h1>
      
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mr-4">
            <span className="material-icons text-2xl text-primary">person</span>
          </div>
          <div>
            <h2 className="text-lg font-medium">{user?.username || 'Usuário'}</h2>
            <p className="text-sm text-neutral-500">Controle seus produtos e evite desperdícios</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="text-lg font-medium mb-4">Notificações</h2>

        {!supported ? (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="material-icons text-yellow-500 mr-2">info</span>
              <div>
                <p className="text-sm text-yellow-700 mb-2">
                  Seu navegador não suporta notificações.
                </p>
                <p className="text-xs text-yellow-600">
                  Tente usar um navegador mais recente como Chrome, Firefox ou Edge.
                </p>
              </div>
            </div>
          </div>
        ) : permission !== 'granted' ? (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="material-icons text-blue-500 mr-2">notifications</span>
              <div>
                <p className="text-sm text-blue-700 mb-2">
                  Permita notificações para receber alertas de produtos próximos ao vencimento.
                </p>
                <button 
                  className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full"
                  onClick={requestPermission}
                >
                  Permitir notificações
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="material-icons text-green-500 mr-2">check_circle</span>
              <p className="text-sm text-green-700">
                Notificações ativadas! Você receberá alertas quando os produtos estiverem próximos do vencimento.
              </p>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <p className="text-sm text-neutral-600 mb-3">Receber alertas antes do vencimento:</p>
          
          <div className="flex flex-wrap gap-2">
            {[1, 3, 5, 7, 14, 30].map(day => (
              <button
                key={day}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedNotificationDays.includes(day)
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700'
                }`}
                onClick={() => handleDayToggle(day)}
              >
                {day} {day === 1 ? 'dia' : 'dias'}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          className="w-full bg-primary text-white rounded-lg py-3 font-medium"
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
      
      {/* Seção de armazenamento de dados */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Armazenamento de Dados</CardTitle>
          <CardDescription>
            Gerencie a forma como seus dados são armazenados e acessados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !storageInfo ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro de conexão</AlertTitle>
              <AlertDescription>
                Não foi possível obter informações sobre o armazenamento. 
                Tente novamente mais tarde.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Status atual */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Status do armazenamento:</h3>
                <div className="grid grid-cols-1 gap-3">
                  {/* PostgreSQL status */}
                  <div className={`flex items-start gap-2 p-3 rounded-lg ${
                    storageInfo.currentProvider === "postgres" 
                      ? "bg-green-50 border border-green-100" 
                      : "bg-neutral-50 border border-neutral-100"
                  }`}>
                    <Database className={`h-5 w-5 mt-0.5 ${
                      storageInfo.currentProvider === "postgres" 
                        ? "text-green-500" 
                        : "text-neutral-400"
                    }`} />
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">PostgreSQL</span>
                        {storageInfo.currentProvider === "postgres" && (
                          <Badge variant="success" className="ml-2">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Banco de dados principal do aplicativo.
                        {storageInfo.databaseUrl === "Não configurado" && (
                          <span className="text-red-500 block mt-1">
                            PostgreSQL não está configurado no momento
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Firebase status */}
                  <div className={`flex items-start gap-2 p-3 rounded-lg ${
                    storageInfo.currentProvider === "firebase" 
                      ? "bg-orange-50 border border-orange-100" 
                      : "bg-neutral-50 border border-neutral-100"
                  }`}>
                    <RefreshCw className={`h-5 w-5 mt-0.5 ${
                      storageInfo.currentProvider === "firebase" 
                        ? "text-orange-500" 
                        : "text-neutral-400"
                    }`} />
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">Firebase (Backup)</span>
                        {storageInfo.currentProvider === "firebase" && (
                          <Badge variant="warning" className="ml-2">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Provedor de dados alternativo usado quando o PostgreSQL não está disponível.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alerta de sistema */}
                {storageInfo.currentProvider === "firebase" && (
                  <Alert className="mt-4 bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Modo de Contingência Ativo</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      Você está usando o Firebase como banco de dados temporário. Os dados não serão 
                      sincronizados automaticamente com o PostgreSQL quando ele estiver disponível.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              {/* Ações de armazenamento */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium mb-2">Ações disponíveis:</h3>
                
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant={storageInfo.currentProvider === "postgres" ? "outline" : "default"}
                    className={storageInfo.currentProvider === "postgres" ? "border-green-200" : ""}
                    disabled={isMigrating || storageInfo.currentProvider === "postgres" || !storageInfo.providers.postgres.enabled}
                    onClick={async () => {
                      try {
                        setIsMigrating(true);
                        const result = await switchToPostgres();
                        
                        if (result.success) {
                          setStorageInfo({
                            ...storageInfo,
                            currentProvider: "postgres"
                          });
                          toast({
                            title: "Provedor alterado",
                            description: "Usando PostgreSQL como banco de dados",
                          });
                          // Recarregar dados
                          queryClient.invalidateQueries();
                        } else {
                          toast({
                            title: "Erro",
                            description: "Não foi possível alternar para PostgreSQL",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Falha ao comunicar com o servidor",
                          variant: "destructive",
                        });
                      } finally {
                        setIsMigrating(false);
                      }
                    }}
                  >
                    {isMigrating && storageInfo.currentProvider !== "postgres" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alternando para PostgreSQL...
                      </>
                    ) : (
                      <>Usar PostgreSQL como banco de dados</>
                    )}
                  </Button>
                  
                  <Button
                    variant={storageInfo.currentProvider === "firebase" ? "outline" : "default"}
                    className={storageInfo.currentProvider === "firebase" ? "border-orange-200" : ""}
                    disabled={isMigrating || storageInfo.currentProvider === "firebase"}
                    onClick={async () => {
                      try {
                        setIsMigrating(true);
                        const result = await switchToFirebase();
                        
                        if (result.success) {
                          setStorageInfo({
                            ...storageInfo,
                            currentProvider: "firebase"
                          });
                          toast({
                            title: "Provedor alterado",
                            description: "Usando Firebase como banco de dados temporário",
                          });
                          // Recarregar dados
                          queryClient.invalidateQueries();
                        } else {
                          toast({
                            title: "Erro",
                            description: "Não foi possível alternar para Firebase",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Falha ao comunicar com o servidor",
                          variant: "destructive",
                        });
                      } finally {
                        setIsMigrating(false);
                      }
                    }}
                  >
                    {isMigrating && storageInfo.currentProvider !== "firebase" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alternando para Firebase...
                      </>
                    ) : (
                      <>Usar Firebase como banco de dados temporário</>
                    )}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    disabled={isMigrating || storageInfo.currentProvider === "firebase"}
                    onClick={async () => {
                      try {
                        setIsMigrating(true);
                        const result = await migrateToFirebase();
                        
                        if (result.success) {
                          setStorageInfo({
                            ...storageInfo,
                            currentProvider: "firebase"
                          });
                          toast({
                            title: "Migração concluída",
                            description: "Dados migrados para o Firebase com sucesso",
                          });
                          // Recarregar dados
                          queryClient.invalidateQueries();
                        } else {
                          toast({
                            title: "Erro",
                            description: "Falha na migração para Firebase",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Não foi possível completar a migração",
                          variant: "destructive",
                        });
                      } finally {
                        setIsMigrating(false);
                      }
                    }}
                  >
                    {isMigrating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Migrando dados...
                      </>
                    ) : (
                      <>Migrar dados para Firebase</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="text-lg font-medium mb-4">Sobre o Prazo Certo</h2>
        
        <p className="text-sm text-neutral-600 mb-4">
          O Prazo Certo é um aplicativo para controle de validade de produtos através de fotos e notificações inteligentes.
        </p>
        
        <p className="text-sm text-neutral-600">
          <strong>Versão:</strong> 1.0.0
        </p>
      </div>
    </div>
  );
};

export default Profile;
