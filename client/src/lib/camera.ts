import { useState } from "react";

interface CameraOptions {
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
}

// Helper function to create a camera stream
const createCameraStream = async (options: CameraOptions = {}) => {
  const constraints = {
    video: {
      facingMode: options.facingMode || "environment",
      width: options.width || { ideal: 1280 },
      height: options.height || { ideal: 720 }
    }
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error("Error accessing camera:", error);
    throw new Error("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
  }
};

// Helper function to take a photo from a video stream
const takePhotoFromVideo = (videoElement: HTMLVideoElement): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw the video frame to the canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get the data URL from the canvas
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataUrl);
    } else {
      throw new Error("Could not get canvas context");
    }
  });
};

export const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async (options: CameraOptions = {}): Promise<HTMLVideoElement> => {
    // Stop any existing stream
    if (stream) {
      stopCamera();
    }
    
    const newStream = await createCameraStream(options);
    setStream(newStream);
    
    // Create and setup a video element
    const video = document.createElement("video");
    video.srcObject = newStream;
    video.autoplay = true;
    
    // Wait for the video to be ready
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = async (options: CameraOptions = {}): Promise<string> => {
    try {
      const video = await startCamera(options);
      
      // Give some time for the camera to adjust
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const photoDataUrl = await takePhotoFromVideo(video);
      
      // Clean up
      stopCamera();
      
      return photoDataUrl;
    } catch (error) {
      console.error("Error taking photo:", error);
      stopCamera();
      throw error;
    }
  };

  return {
    startCamera,
    stopCamera,
    takePhoto,
    isActive: !!stream
  };
};
