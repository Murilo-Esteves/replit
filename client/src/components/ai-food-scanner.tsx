import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/use-camera";
import { apiRequest } from "@/lib/queryClient";
import { Camera, ChevronRight, Loader, Book, Share2, Utensils, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@shared/schema";

interface AiFoodScannerProps {
  onClose: () => void;
  onRecipesGenerated: (products: Product[], additionalIngredients: string[]) => void;
  isOpen: boolean;
}

export const AiFoodScanner: React.FC<AiFoodScannerProps> = ({ 
  onClose, 
  onRecipesGenerated,
  isOpen
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("camera");
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  const options = {
    width: 1280,
    height: 720,
    facingMode: "environment" as "environment",
  };

  const { 
    videoRef, 
    isActive, 
    photo, 
    error, 
    startCamera, 
    takePhoto, 
    resetPhoto, 
    stopCamera,
    isCameraSupported,
    setPhoto
  } = useCamera(options);

  React.useEffect(() => {
    if (isOpen) {
      fetchAvailableProducts();
      if (activeTab === "camera" && isCameraSupported) {
        startCamera().catch(err => {
          setErrorMessage("Não foi possível iniciar a câmera. Verifique as permissões.");
          console.error("Erro ao iniciar câmera:", err);
        });
      }
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera, isCameraSupported]);

  const fetchAvailableProducts = async () => {
    try {
      const response = await apiRequest("GET", "/api/products");
      if (response) {
        const data = await response.json();
        setAvailableProducts(data as Product[]);
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar os produtos disponíveis.",
        variant: "destructive"
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photoData = await takePhoto();
      if (photoData) {
        setActiveTab("results");
        analyzePhoto(photoData);
      }
    } catch (err) {
      setErrorMessage("Erro ao capturar foto. Tente novamente.");
      console.error("Erro ao tirar foto:", err);
    }
  };

  const analyzePhoto = async (photoData: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await apiRequest("POST", "/api/ai/analyze-image", {
        image: photoData
      });
      
      const data = await response.json();
      
      if (data && 'ingredients' in data) {
        setDetectedIngredients(data.ingredients as string[]);
      } else {
        throw new Error("Não foi possível identificar os ingredientes na imagem.");
      }
    } catch (error) {
      console.error("Erro ao analisar imagem:", error);
      setErrorMessage("Erro ao analisar a imagem. Tente novamente.");
      toast({
        title: "Erro",
        description: "Não foi possível analisar a imagem.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecipe = () => {
    // Aqui podemos identificar quais produtos do inventário correspondem aos ingredientes detectados
    const matchedProducts = availableProducts.filter(product => 
      detectedIngredients.some(ingredient => 
        product.name.toLowerCase().includes(ingredient.toLowerCase())
      )
    );
    
    // Ingredientes que não correspondem a nenhum produto no inventário
    const additionalIngredients = detectedIngredients.filter(ingredient => 
      !availableProducts.some(product => 
        product.name.toLowerCase().includes(ingredient.toLowerCase())
      )
    );
    
    onRecipesGenerated(matchedProducts, additionalIngredients);
    onClose();
  };
  
  const resetScanner = () => {
    resetPhoto();
    setDetectedIngredients([]);
    setErrorMessage(null);
    setActiveTab("camera");
  };

  // Função para lidar com upload de arquivo
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPhoto(result);
      setActiveTab("results");
      analyzePhoto(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        stopCamera();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Scanner de Alimentos IA</DialogTitle>
          <DialogDescription>
            Tire uma foto ou carregue uma imagem dos alimentos para identificar ingredientes e gerar receitas.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="camera" disabled={isLoading}>
              <Camera className="w-4 h-4 mr-2" />
              Câmera
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!photo || isLoading}>
              <Utensils className="w-4 h-4 mr-2" />
              Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="flex-1 flex flex-col">
            {!isCameraSupported ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3">
                <Alert variant="destructive" className="w-full">
                  <AlertDescription>
                    Seu dispositivo não suporta acesso à câmera. Você ainda pode fazer upload de uma imagem.
                  </AlertDescription>
                </Alert>
                
                <div className="mt-4 text-center">
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('file-upload-scanner')?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Carregar imagem da galeria
                  </Button>
                  <input
                    id="file-upload-scanner"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="relative rounded-md overflow-hidden aspect-video mb-4 bg-gray-200 dark:bg-gray-800">
                  {!photo ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <img 
                      src={photo} 
                      alt="Captured food" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col gap-2 mt-auto">
                  {!photo ? (
                    <>
                      <Button 
                        onClick={handleTakePhoto} 
                        disabled={!isActive || isLoading}
                        className="flex-1"
                      >
                        {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        Tirar Foto
                      </Button>
                      
                      <div className="flex justify-center items-center">
                        <div className="flex-1 border-t my-3"></div>
                        <span className="px-3 text-xs text-muted-foreground">ou</span>
                        <div className="flex-1 border-t my-3"></div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('file-upload-scanner')?.click()}
                        className="flex-1 gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Carregar da galeria
                      </Button>
                      <input
                        id="file-upload-scanner"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={resetScanner}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Nova Foto
                      </Button>
                      <Button 
                        onClick={() => setActiveTab("results")}
                        disabled={isLoading}
                        className="flex-1"
                      >
                        Analisar
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="results" className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle>Ingredientes Identificados</CardTitle>
                <CardDescription>
                  {isLoading ? "Analisando a imagem..." : "Ingredientes detectados na imagem"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-32">
                    <Loader className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Processando com IA...</p>
                  </div>
                ) : (
                  <>
                    {errorMessage && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}
                    
                    {detectedIngredients.length > 0 ? (
                      <ScrollArea className="h-48 rounded-md border p-4">
                        <div className="flex flex-wrap gap-2">
                          {detectedIngredients.map((ingredient, index) => (
                            <Badge key={index} variant="outline" className="text-sm py-1">
                              {ingredient}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : !isLoading && !errorMessage ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum ingrediente identificado. Tente tirar outra foto com melhor iluminação.
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
              <Separator />
              <CardFooter className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={resetScanner} 
                  disabled={isLoading}
                >
                  Nova Foto
                </Button>
                <Button 
                  onClick={handleGenerateRecipe} 
                  disabled={isLoading || detectedIngredients.length === 0}
                >
                  <Book className="mr-2 h-4 w-4" />
                  Gerar Receitas
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};