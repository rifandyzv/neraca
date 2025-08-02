"use client";

import React, { useEffect, useState, useCallback } from 'react';

// Define types
interface Transaction {
  id?: number;
  amount: number;
  category: string;
  timestamp: number;
  notes?: string;
  app?: string;
}

interface Category {
  id?: number;
  name: string;
}

// Custom hook for IndexedDB operations
export const useIndexedDB = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isDBReady, setIsDBReady] = useState(false);
  
  const dbName = 'pocketPalDB';
  const storeName = 'spendings';
  const categoryStoreName = 'categories';
  
  // Initialize IndexedDB
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const request = indexedDB.open(dbName, 2);
    
    request.onerror = (event) => {
      console.error('Database error:', (event.target as IDBOpenDBRequest).error);
    };
    
    request.onsuccess = (event) => {
      const database = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      setDb(database);
      setIsDBReady(true);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result as IDBDatabase;
      
      // Create spendings store if it doesn't exist
      if (!database.objectStoreNames.contains(storeName)) {
        const objectStore = database.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('category', 'category', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create categories store
      if (!database.objectStoreNames.contains(categoryStoreName)) {
        const categoryStore = database.createObjectStore(categoryStoreName, { keyPath: 'id', autoIncrement: true });
        categoryStore.createIndex('name', 'name', { unique: true });
      }
    };
  }, []);
  
  // Add default categories after DB is ready
  useEffect(() => {
    if (!isDBReady || !db) return;
    
    const addDefaultCategories = async () => {
      try {
        // Check if categories already exist
        const categories = await getCategories();
        if (categories.length === 0) {
          // Add default categories including "Other"
          const defaultCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Other'];
          for (const category of defaultCategories) {
            await addCategory({ name: category });
          }
        }
      } catch (error) {
        console.error('Error adding default categories:', error);
      }
    };
    
    addDefaultCategories();
  }, [isDBReady, db]);
  
  // Add a transaction
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transactionRequest = db.transaction([storeName], 'readwrite')
        .objectStore(storeName)
        .add(transaction);
      
      transactionRequest.onsuccess = () => {
        resolve();
      };
      
      transactionRequest.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }, [db]);
  
  // Get transactions by date range
  const getTransactionsByDateRange = useCallback((startTime: number, endTime: number): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index('timestamp');
      const range = IDBKeyRange.bound(startTime, endTime, false, false);
      
      const request = index.getAll(range);
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest<Transaction[]>).result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }, [db]);
  
  // Get all transactions
  const getAllTransactions = useCallback((): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const request = db.transaction([storeName], 'readonly')
        .objectStore(storeName)
        .getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest<Transaction[]>).result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }, [db]);
  
  // Get categories
  const getCategories = useCallback((): Promise<Category[]> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const request = db.transaction([categoryStoreName], 'readonly')
        .objectStore(categoryStoreName)
        .getAll();
      
      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest<Category[]>).result);
      };
      
      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }, [db]);
  
  // Add a category
  const addCategory = useCallback((category: Omit<Category, 'id'>): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transactionRequest = db.transaction([categoryStoreName], 'readwrite')
        .objectStore(categoryStoreName)
        .add(category);
      
      transactionRequest.onsuccess = () => {
        resolve();
      };
      
      transactionRequest.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }, [db]);
  
  return {
    isDBReady,
    addTransaction,
    getTransactionsByDateRange,
    getAllTransactions,
    getCategories,
    addCategory
  };
};