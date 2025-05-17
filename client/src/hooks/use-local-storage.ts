import { useState, useEffect } from 'react';

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * Custom hook for using localStorage with automatic serialization and type safety
 * @param key The localStorage key
 * @param initialValue The initial value if nothing is found in localStorage
 * @returns A stateful value and a function to update it
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Get the initial value from localStorage or use initialValue
  const readValue = (): T => {
    // For SSR/Next.js, check if window is available
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue: SetValue<T> = (value) => {
    try {
      // Allow value to be a function to follow useState API
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
        
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Dispatch a custom event so other instances of this hook can update
        window.dispatchEvent(new Event('local-storage'));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };
    
    // When window is not defined (like in SSR), skip adding event listeners
    if (typeof window === 'undefined') return;
    
    // Listen for storage change events (including our custom event)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}

/**
 * A variant of useLocalStorage that just returns a simple getter/setter
 * without React state integration, useful for one-off operations
 */
export const createLocalStorageHelpers = <T>(key: string, initialValue: T) => {
  return {
    get: (): T => {
      try {
        const item = window.localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : initialValue;
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return initialValue;
      }
    },
    set: (value: T): void => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event('local-storage'));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    remove: (): void => {
      try {
        window.localStorage.removeItem(key);
        window.dispatchEvent(new Event('local-storage'));
      } catch (error) {
        console.warn(`Error removing localStorage key "${key}":`, error);
      }
    }
  };
};
