import { useState, useEffect } from 'react';
import { 
  areNotificationsSupported, 
  requestNotificationPermission, 
  getNotificationPermission, 
  sendNotification 
} from '@/lib/notification';

interface NotificationHookResult {
  supported: boolean;
  permission: NotificationPermission | null;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions) => Notification | null;
  isEnabled: boolean;
}

/**
 * A hook to handle browser notification permissions and sending notifications
 */
export function useNotifications(): NotificationHookResult {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  
  useEffect(() => {
    // Check if browser supports notifications
    const notificationsSupported = areNotificationsSupported();
    setSupported(notificationsSupported);
    
    // Get initial notification permission state
    if (notificationsSupported) {
      setPermission(getNotificationPermission());
    }
    
    // Listen for permission changes
    const handlePermissionChange = () => {
      setPermission(getNotificationPermission());
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handlePermissionChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handlePermissionChange);
      }
    };
  }, []);
  
  /**
   * Request notification permission from the user
   */
  const requestPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    return granted;
  };
  
  /**
   * Helper to determine if notifications are fully enabled
   */
  const isEnabled = supported && permission === 'granted';
  
  return {
    supported,
    permission,
    requestPermission,
    sendNotification,
    isEnabled
  };
}

/**
 * A hook to check and display expiration notifications for products
 */
export function useExpirationNotifications(
  products: Array<{
    id: number;
    name: string;
    expirationDate: string | Date;
    notified?: boolean;
  }> | undefined, 
  notificationDays: number[] = [0, 1, 3, 7]
): {
  checkExpirations: () => Promise<number>;
  notificationProducts: Array<{id: number, name: string, daysUntil: number}>;
} {
  const { isEnabled, sendNotification } = useNotifications();
  const [notificationProducts, setNotificationProducts] = useState<Array<{id: number, name: string, daysUntil: number}>>([]);
  
  /**
   * Check products for expiration and send notifications if needed
   */
  const checkExpirations = async (): Promise<number> => {
    if (!isEnabled || !products || products.length === 0) {
      return 0;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const notifyProducts: Array<{id: number, name: string, daysUntil: number}> = [];
    let notificationsSent = 0;
    
    for (const product of products) {
      if (product.notified) continue;
      
      const expirationDate = new Date(product.expirationDate);
      expirationDate.setHours(0, 0, 0, 0);
      
      // Calculate days until expiration
      const daysUntilExpiration = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Check if we should notify for this day threshold
      if (notificationDays.includes(daysUntilExpiration)) {
        // Store for UI display
        notifyProducts.push({
          id: product.id,
          name: product.name,
          daysUntil: daysUntilExpiration
        });
        
        if (isEnabled) {
          // Create notification title and body
          let title: string;
          let body: string;
          
          if (daysUntilExpiration === 0) {
            title = '⚠️ Produto vencendo hoje!';
            body = `"${product.name}" vence hoje. Utilize-o o quanto antes para evitar desperdício.`;
          } else if (daysUntilExpiration === 1) {
            title = '⚠️ Produto vencendo amanhã';
            body = `"${product.name}" vence amanhã. Planeje utilizá-lo para evitar desperdício.`;
          } else {
            title = '📅 Produto próximo do vencimento';
            body = `"${product.name}" vence em ${daysUntilExpiration} dias. Fique atento.`;
          }
          
          sendNotification(title, { 
            body,
            tag: `expiration-${product.id}`,
            vibrate: [200, 100, 200],
            requireInteraction: daysUntilExpiration <= 1
          });
          
          notificationsSent++;
        }
      }
    }
    
    setNotificationProducts(notifyProducts);
    return notificationsSent;
  };
  
  return {
    checkExpirations,
    notificationProducts
  };
}
