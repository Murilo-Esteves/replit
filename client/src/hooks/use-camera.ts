import { useState, useRef, useCallback } from 'react';

interface CameraHookOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  aspectRatio?: number;
  quality?: number;
}

interface CameraHookReturnValue {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  photo: string | null;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  takePhoto: () => Promise<string | null>;
  resetPhoto: () => void;
  setPhoto: (photo: string | null) => void;
  isCameraSupported: boolean;
}

/**
 * A React hook for camera functionality
 */
export function useCamera(options: CameraHookOptions = {}): CameraHookReturnValue {
  const {
    width = 1280,
    height = 720,
    facingMode = 'environment',
    aspectRatio = 4/3,
    quality = 0.8
  } = options;
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check if camera is supported
  const isCameraSupported = typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices && 
    !!navigator.mediaDevices.getUserMedia;
  
  /**
   * Start the camera stream
   */
  const startCamera = useCallback(async () => {
    if (!isCameraSupported) {
      setError('Câmera não suportada neste dispositivo ou navegador');
      return;
    }
    
    try {
      // Stop any existing stream first
      if (stream) {
        stopCamera();
      }
      
      setError(null);
      
      // Get media stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
          aspectRatio: { ideal: aspectRatio }
        }
      });
      
      // Set the stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              setError(`Erro ao iniciar vídeo: ${err.message}`);
            });
          }
        };
      }
      
      setStream(mediaStream);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Acesso à câmera negado. Por favor, permita o acesso à câmera nas configurações do navegador.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Nenhuma câmera encontrada neste dispositivo.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('A câmera está sendo usada por outro aplicativo.');
        } else {
          setError(`Erro ao acessar a câmera: ${err.message}`);
        }
      } else {
        setError('Erro desconhecido ao acessar a câmera');
      }
      console.error('Camera error:', err);
    }
  }, [facingMode, width, height, aspectRatio, stream, isCameraSupported]);
  
  /**
   * Stop the camera stream
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);
  
  /**
   * Take a photo from the camera stream
   */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    if (!stream || !videoRef.current) {
      if (!stream && isCameraSupported) {
        // Try to start camera if not already started
        await startCamera();
      } else {
        setError('Câmera não iniciada');
        return null;
      }
    }
    
    try {
      const video = videoRef.current;
      if (!video) return null;
      
      // Create a canvas to capture the photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        setError('Não foi possível criar o contexto do canvas');
        return null;
      }
      
      // Draw the video frame to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      setPhoto(dataUrl);
      
      return dataUrl;
    } catch (err) {
      if (err instanceof Error) {
        setError(`Erro ao capturar foto: ${err.message}`);
      } else {
        setError('Erro desconhecido ao capturar foto');
      }
      console.error('Photo capture error:', err);
      return null;
    }
  }, [stream, isCameraSupported, quality, startCamera]);
  
  /**
   * Reset the captured photo
   */
  const resetPhoto = useCallback(() => {
    setPhoto(null);
  }, []);
  
  return {
    videoRef,
    isActive: !!stream,
    photo,
    error,
    startCamera,
    stopCamera,
    takePhoto,
    resetPhoto,
    setPhoto,
    isCameraSupported
  };
}

/**
 * A simpler version of the camera hook that just provides a takePhoto function
 * without requiring the component to manage video elements
 */
export function useCameraCapture(options: CameraHookOptions = {}) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const takePhoto = async (): Promise<string | null> => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode || 'environment',
          width: { ideal: options.width || 1280 },
          height: { ideal: options.height || 720 }
        }
      });
      
      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });
      
      // Give the camera some time to adjust
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Take the photo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Stop the camera
      stream.getTracks().forEach(track => track.stop());
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', options.quality || 0.8);
      return dataUrl;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error capturing photo');
      }
      console.error('Camera capture error:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };
  
  return {
    takePhoto,
    isCapturing,
    error
  };
}
