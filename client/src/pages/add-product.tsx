import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Calendar, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCamera } from "@/hooks/use-camera";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Category, Product } from "@shared/schema";

// Função para comprimir imagens antes de enviar
const compressImage = (imageDataUrl: string, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Criar um canvas para desenhar a imagem
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto do canvas'));
        return;
      }
      
      // Calcular as dimensões máximas para manter a proporção
      const maxWidth = 1200;
      const maxHeight = 1200;
      let width = img.width;
      let height = img.height;
      
      // Redimensionar a imagem se for muito grande
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.floor(height * (maxWidth / width));
          width = maxWidth;
        } else {
          width = Math.floor(width * (maxHeight / height));
          height = maxHeight;
        }
      }
      
      // Definir dimensões do canvas
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para formato de imagem com qualidade reduzida
      const compressedImage = canvas.toDataURL('image/jpeg', quality);
      
      resolve(compressedImage);
    };
    
    img.onerror = (error) => {
      reject(error);
    };
    
    img.src = imageDataUrl;
  });
};

const AddProduct: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { takePhoto } = useCamera();
  
  // Estados para controlar os inputs do formulário
  const [productImage, setProductImage] = useState<string | null>(null);
  const [expirationImage, setExpirationImage] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | string>("");
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoReplenish, setAutoReplenish] = useState<boolean>(true);
  
  // Refs para os inputs de arquivo
  const productPhotoInputRef = useRef<HTMLInputElement>(null);
  const expirationPhotoInputRef = useRef<HTMLInputElement>(null);
  
  // Buscar categorias
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });
  
  // Mutation para criar produto
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      return await apiRequest("POST", "/api/products", productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/expiring'] });
      
      toast({
        title: "Produto cadastrado",
        description: "Produto cadastrado com sucesso!",
      });
      
      setLocation('/home');
    },
    onError: (error) => {
      console.error("Erro ao criar produto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o produto. Tente novamente.",
        variant: "destructive"
      });
    }
  });
  
  // Função para voltar à tela inicial
  const handleCancel = () => {
    setLocation('/home');
  };
  
  // Função para tirar foto do produto
  const handleTakeProductPhoto = async () => {
    try {
      const photo = await takePhoto();
      if (photo) {
        setProductImage(photo);
      }
    } catch (error) {
      console.error("Erro ao tirar foto do produto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível capturar a foto do produto.",
        variant: "destructive"
      });
    }
  };
  
  // Função para enviar foto do produto via arquivo
  const handleProductPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setProductImage(result);
    };
    reader.readAsDataURL(file);
  };
  
  // Função para tirar foto da data de validade
  const handleTakeExpirationPhoto = async () => {
    try {
      setIsProcessing(true);
      const photo = await takePhoto();
      if (photo) {
        setExpirationImage(photo);
        
        // Comprimir a imagem antes de enviar para a API
        let imageToSend = photo;
        if (photo.length > 500000) {
          try {
            imageToSend = await compressImage(photo, 0.7);
          } catch (compressError) {
            console.error("Erro ao comprimir imagem:", compressError);
          }
        }
        
        try {
          const response = await fetch('/api/ai/recognize-date', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageBase64: imageToSend }),
          });
          
          if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.expirationDate) {
            setExpirationDate(data.expirationDate);
            toast({
              title: "Data reconhecida automaticamente",
              description: `Data identificada: ${format(new Date(data.expirationDate), 'dd/MM/yyyy', { locale: ptBR })}`,
            });
          } else {
            toast({
              title: "Data não reconhecida",
              description: "Não foi possível reconhecer a data. Por favor, insira manualmente.",
              variant: "destructive"
            });
          }
        } catch (apiError) {
          console.error("Erro na API de reconhecimento:", apiError);
          toast({
            title: "Erro no processamento de imagem",
            description: "Não foi possível processar a data. Por favor, insira manualmente.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Erro ao tirar foto da data de validade:", error);
      toast({
        title: "Erro",
        description: "Não foi possível capturar a foto da data de validade.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Função para enviar foto da data de validade via arquivo
  const handleExpirationPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsProcessing(true);
        const result = e.target?.result as string;
        setExpirationImage(result);
        
        // Comprimir a imagem antes de enviar para a API
        let imageToSend = result;
        if (result.length > 500000) {
          try {
            imageToSend = await compressImage(result, 0.7);
          } catch (compressError) {
            console.error("Erro ao comprimir imagem:", compressError);
          }
        }
        
        try {
          const response = await fetch('/api/ai/recognize-date', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageBase64: imageToSend }),
          });
          
          if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.expirationDate) {
            setExpirationDate(data.expirationDate);
            toast({
              title: "Data reconhecida automaticamente",
              description: `Data identificada: ${format(new Date(data.expirationDate), 'dd/MM/yyyy', { locale: ptBR })}`,
            });
          } else {
            toast({
              title: "Data não reconhecida",
              description: "Não foi possível reconhecer a data. Por favor, insira manualmente.",
              variant: "destructive"
            });
          }
        } catch (apiError) {
          console.error("Erro na API de reconhecimento:", apiError);
          toast({
            title: "Erro no processamento de imagem",
            description: "Não foi possível processar a data. Por favor, insira manualmente.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({
          title: "Erro no processamento do arquivo",
          description: "Não foi possível processar o arquivo. Tente outro formato de imagem.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Função para salvar o produto
  const handleSaveProduct = () => {
    if (!productName) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o nome do produto.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCategoryId) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione uma categoria.",
        variant: "destructive"
      });
      return;
    }

    if (!expirationDate) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira a data de validade.",
        variant: "destructive"
      });
      return;
    }

    // Criar objeto do produto
    const productData = {
      name: productName,
      image: productImage,
      expirationDate: expirationDate,
      categoryId: Number(selectedCategoryId),
      autoReplenish: autoReplenish
    };

    createProductMutation.mutate(productData);
  };
  
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <header className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleCancel}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Adicionar Produto</h1>
      </header>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6">
          {/* Foto do Produto */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Foto do Produto</label>
            <div 
              className="bg-neutral-100 rounded-xl p-4 flex items-center justify-center h-48 mb-2 cursor-pointer"
              onClick={handleTakeProductPhoto}
            >
              {productImage ? (
                <img 
                  src={productImage} 
                  alt="Foto do produto" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <Camera className="w-12 h-12 text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-500">Tire uma foto do produto</p>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <button 
                type="button"
                className="flex items-center gap-2 text-neutral-600 text-sm py-1 px-2 rounded"
                onClick={() => productPhotoInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Enviar da galeria
              </button>
              <input
                ref={productPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleProductPhotoUpload}
                className="hidden"
              />
            </div>
          </div>
          
          {/* Foto da Data de Validade */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Data de Validade</label>
            <div 
              className="bg-neutral-100 rounded-xl p-4 flex items-center justify-center h-32 mb-2 border-2 border-dashed border-primary cursor-pointer"
              onClick={handleTakeExpirationPhoto}
            >
              {isProcessing ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-primary">Processando imagem...</p>
                </div>
              ) : expirationImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <img 
                    src={expirationImage} 
                    alt="Foto da data de validade" 
                    className="max-h-20 object-contain mb-2"
                  />
                  <p className="text-sm text-primary font-medium">
                    {expirationDate 
                      ? format(new Date(expirationDate), 'dd/MM/yyyy', { locale: ptBR }) 
                      : <span className="text-amber-500">Preencha a data manualmente abaixo</span>}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="w-12 h-12 text-primary mb-2" />
                  <p className="text-sm text-primary font-medium">Tire uma foto da data de validade</p>
                </div>
              )}
            </div>
            <div className="flex justify-center mb-2">
              <button 
                type="button"
                className="flex items-center gap-2 text-primary text-sm py-1 px-2 rounded"
                onClick={() => expirationPhotoInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Enviar da galeria
              </button>
              <input
                ref={expirationPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleExpirationPhotoUpload}
                className="hidden"
              />
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1" htmlFor="expiration-date">Data de Validade (Manual)</label>
              <div className="relative">
                <input 
                  type="date" 
                  id="expiration-date" 
                  className="w-full rounded-lg border border-neutral-300 p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  value={expirationDate ? new Date(expirationDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setExpirationDate(e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSaveProduct(); }}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="product-name">Nome do Produto</label>
            <input 
              type="text" 
              id="product-name" 
              className="w-full rounded-lg border border-neutral-300 p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
              placeholder="Ex: Leite Integral"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" htmlFor="product-category">Categoria</label>
            <select 
              id="product-category" 
              className="w-full rounded-lg border border-neutral-300 p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-replenish"
                className="rounded border-neutral-300 text-primary focus:ring-primary mr-2"
                checked={autoReplenish}
                onChange={(e) => setAutoReplenish(e.target.checked)}
              />
              <label htmlFor="auto-replenish" className="text-sm text-neutral-700">
                Adicionar automaticamente à lista de compras quando consumido
              </label>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              type="button" 
              className="flex-1 bg-neutral-200 text-neutral-700 rounded-lg py-3 font-medium"
              onClick={handleCancel}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-primary text-white rounded-lg py-3 font-medium"
              disabled={createProductMutation.isPending}
            >
              {createProductMutation.isPending ? "Salvando..." : "Salvar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;