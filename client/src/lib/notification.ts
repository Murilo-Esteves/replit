// Helper function to check if notifications are supported
export const areNotificationsSupported = (): boolean => {
  return 'Notification' in window;
};

// Helper function to request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!areNotificationsSupported()) {
    console.warn('Notifications not supported in this browser');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get current notification permission
export const getNotificationPermission = (): NotificationPermission | null => {
  if (!areNotificationsSupported()) {
    return null;
  }
  
  return Notification.permission;
};

// Send a notification
export const sendNotification = (
  title: string, 
  options: NotificationOptions = {}
): Notification | null => {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') {
    console.warn('Notifications not supported or permission not granted');
    return null;
  }
  
  try {
    // Set default icon and badge if not provided
    const defaultOptions: NotificationOptions = {
      icon: 'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/schedule/default/48px.svg',
      badge: 'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/schedule/default/24px.svg',
      ...options
    };
    
    return new Notification(title, defaultOptions);
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

// Send a product expiration notification
export const sendExpirationNotification = (
  productName: string,
  daysUntilExpiration: number
): Notification | null => {
  let title: string;
  let body: string;
  
  if (daysUntilExpiration === 0) {
    title = '⚠️ Produto vencendo hoje!';
    body = `"${productName}" vence hoje. Utilize-o o quanto antes para evitar desperdício.`;
  } else if (daysUntilExpiration === 1) {
    title = '⚠️ Produto vencendo amanhã';
    body = `"${productName}" vence amanhã. Planeje utilizá-lo para evitar desperdício.`;
  } else {
    title = '📅 Produto próximo do vencimento';
    body = `"${productName}" vence em ${daysUntilExpiration} dias. Fique atento.`;
  }
  
  return sendNotification(title, { 
    body,
    tag: `expiration-${productName}`,
    vibrate: [200, 100, 200],
    requireInteraction: daysUntilExpiration <= 1 // Keep notification for immediate expiring items
  });
};

// Check for expired products and send notifications
export const checkAndNotifyExpirations = async (
  products: Array<{
    id: number;
    name: string;
    expirationDate: string | Date;
    notified?: boolean;
  }>,
  notificationDays: number[] = [0, 1, 3, 7]
): Promise<number> => {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') {
    return 0;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let notificationsSent = 0;
  
  for (const product of products) {
    // Skip already notified products
    if (product.notified) continue;
    
    const expirationDate = new Date(product.expirationDate);
    expirationDate.setHours(0, 0, 0, 0);
    
    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Check if we should notify for this day threshold
    if (notificationDays.includes(daysUntilExpiration)) {
      sendExpirationNotification(product.name, daysUntilExpiration);
      notificationsSent++;
      
      // Mark as notified (the caller should handle updating this in the database)
      product.notified = true;
    }
  }
  
  return notificationsSent;
};
