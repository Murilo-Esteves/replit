import { createWorker } from 'tesseract.js';

// Regex patterns for common date formats
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/g,
  
  // MM/DD/YYYY or MM-DD-YYYY
  /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/g,
  
  // YYYY/MM/DD or YYYY-MM-DD
  /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/g,
  
  // DD MMM YYYY (e.g., 01 JAN 2023)
  /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|FEB|APR|MAY|AUG|SEP|OCT|DEC)\s+(\d{2,4})/gi,
  
  // Valid until, best before, etc.
  /(?:valido até|válido até|consumir até|vence em|val:|validade:)\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/gi,
  
  // Expiry/expiration date
  /(?:data de validade|vencimento|exp|expira em):\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/gi,
  
  // Looking for sequences of numbers that might be dates
  /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g
];

// Month abbreviations in Portuguese and English
const MONTH_ABBR: { [key: string]: number } = {
  'JAN': 0, 'FEV': 1, 'MAR': 2, 'ABR': 3, 'MAI': 4, 'JUN': 5,
  'JUL': 6, 'AGO': 7, 'SET': 8, 'OUT': 9, 'NOV': 10, 'DEZ': 11,
  'FEB': 1, 'APR': 3, 'MAY': 4, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'DEC': 11
};

// Pre-process image before OCR to improve accuracy
const preprocessImage = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      console.log("Dimensões da imagem original:", img.width, "x", img.height);
      
      // Create a canvas to manipulate the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn("Contexto de canvas não disponível, usando imagem original");
        resolve(dataUrl);
        return;
      }
      
      // Determine if we need to resize (limite máximo para melhor performance)
      let targetWidth = img.width;
      let targetHeight = img.height;
      const MAX_DIMENSION = 1200;
      
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        if (img.width > img.height) {
          targetWidth = MAX_DIMENSION;
          targetHeight = Math.floor(img.height * (MAX_DIMENSION / img.width));
        } else {
          targetHeight = MAX_DIMENSION;
          targetWidth = Math.floor(img.width * (MAX_DIMENSION / img.height));
        }
        console.log("Redimensionando imagem para:", targetWidth, "x", targetHeight);
      }
      
      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Draw original image with resizing if needed
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Processamento para melhorar contraste e nitidez
      for (let i = 0; i < data.length; i += 4) {
        // Converter para escala de cinza com pesos para melhor leitura de texto
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Fórmula melhorada para texto legível (dá mais peso aos verdes onde texto é geralmente mais visível)
        let grayValue = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Aumentar contraste
        grayValue = grayValue < 120 ? 0 : (grayValue > 200 ? 255 : grayValue);
        
        // Aplicar threshold adaptativo para melhorar reconhecimento de texto
        const newValue = grayValue < 160 ? 0 : 255;
        
        // Set RGB to the new value
        data[i] = newValue;
        data[i + 1] = newValue;
        data[i + 2] = newValue;
      }
      
      // Put processed image back to canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Return processed image - uso PNG para manter nitidez de texto
      const processedImage = canvas.toDataURL('image/png', 1.0);
      console.log("Pré-processamento de imagem concluído");
      resolve(processedImage);
    };
    
    img.onerror = () => {
      console.error("Erro ao carregar imagem para pré-processamento");
      resolve(dataUrl); // Retorna a imagem original em caso de erro
    };
    
    img.src = dataUrl;
  });
};

// Parse a potential date string and return a Date object if valid
const parseDate = (dateStr: string): Date | null => {
  // Try to parse the date string in different formats
  const potentialDates: Date[] = [];
  
  // Process each date pattern
  for (const pattern of DATE_PATTERNS) {
    const matches = [...dateStr.matchAll(pattern)];
    
    for (const match of matches) {
      // Extract date components based on pattern
      let day, month, year;
      
      if (pattern.toString().includes('MMM')) {
        // Handle text month format (e.g., 01 JAN 2023)
        day = parseInt(match[1]);
        const monthStr = match[2].toUpperCase();
        month = MONTH_ABBR[monthStr];
        year = parseInt(match[3]);
        
        if (isNaN(month)) continue;
      } else if (pattern.toString().includes('YYYY')) {
        // YYYY/MM/DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1; // JavaScript months are 0-indexed
        day = parseInt(match[3]);
      } else {
        // Most common format: DD/MM/YYYY
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = parseInt(match[3]);
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 30 ? 2000 : 1900;
        }
      }
      
      // Validate date components
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
      
      // Create a date object and check if it's valid
      const date = new Date(year, month, day);
      
      // Only consider future dates as valid expiration dates
      if (date > new Date()) {
        potentialDates.push(date);
      }
    }
  }
  
  // Return the earliest future date or null if none found
  return potentialDates.length > 0 ? 
    potentialDates.sort((a, b) => a.getTime() - b.getTime())[0] : 
    null;
};

// Referência global para o worker do Tesseract
let tesseractWorker: any = null;

// Inicializar o worker do Tesseract uma única vez
const initializeTesseractWorker = async () => {
  if (!tesseractWorker) {
    console.log("Inicializando worker do Tesseract pela primeira vez...");
    try {
      // Criar worker sem logger
      tesseractWorker = await createWorker();
      
      // Carregar dados do idioma
      await tesseractWorker.loadLanguage('por+eng');
      await tesseractWorker.initialize('por+eng');
      
      // Configurar parâmetros otimizados para datas
      await tesseractWorker.setParameters({
        tessedit_char_whitelist: '0123456789/.-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
        tessedit_ocr_engine_mode: 1,
        preserve_interword_spaces: '1',
      });
      
      console.log("Worker do Tesseract inicializado com sucesso!");
    } catch (error) {
      console.error("Erro ao inicializar o worker do Tesseract:", error);
      tesseractWorker = null;
      throw error;
    }
  }
  
  return tesseractWorker;
};

// Reconhecer data de validade de uma imagem
export const recognizeExpirationDate = async (imageDataUrl: string): Promise<Date | null> => {
  try {
    console.log("Iniciando processamento OCR da imagem...");
    
    // Pré-processar imagem
    const processedImage = await preprocessImage(imageDataUrl);
    
    // Obter worker inicializado
    const worker = await initializeTesseractWorker();
    
    console.log("Realizando OCR na imagem processada...");
    
    // Realizar OCR
    const { data: { text } } = await worker.recognize(processedImage);
    console.log('OCR Result Text:', text);
    
    console.log("OCR concluído, processando texto para encontrar datas...");
    
    // Extrair data do resultado do OCR
    const date = parseDate(text);
    
    if (date) {
      console.log("Data encontrada:", date.toISOString());
    } else {
      console.log("Nenhuma data válida encontrada no texto");
    }
    
    return date;
  } catch (error) {
    console.error('Error recognizing expiration date:', error);
    // Se ocorrer erro, reinicializar o worker na próxima tentativa
    tesseractWorker = null;
    throw error;
  }
};
