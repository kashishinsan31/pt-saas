import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDocsFromServer,
  getDocFromServer,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  User,
  Client,
  Trainer,
  PackageDefinition,
  ClientPackage,
  SessionBooking,
  SessionTransaction,
  PaymentRecord,
  SubscriptionRecord,
  SavedCard,
  AuditLogItem,
  SystemSettings,
  NotificationItem,
  DashboardSlide,
  PromoCode,
} from '../types';

export function handleFirestoreError(error: unknown, operationContext: string) {
  const err = error as { code?: string; message?: string; name?: string };
  const msg = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
  if (
    err?.name === 'AbortError' ||
    err?.code === 'cancelled' ||
    msg.includes('aborted') ||
    msg.includes('failed to fetch')
  ) {
    // Ignore benign stream aborts and reconnect fetches when unmounting or switching tabs
    return;
  }
  console.error(`Firestore error during [${operationContext}]:`, err?.message || error);
}

/**
 * Recursively strips any keys with value `undefined` from objects and arrays,
 * because Firestore setDoc/updateDoc throws on `undefined` values.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedFields(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Subscribe to any collection with real-time updates
export function subscribeCollection<T extends { id: string }>(
  collectionName: string,
  callback: (items: T[]) => void
): Unsubscribe {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })) as T[];
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, `subscribeCollection:${collectionName}`);
      }
    );
  } catch (error) {
    handleFirestoreError(error, `subscribeCollectionInit:${collectionName}`);
    return () => {};
  }
}

// Single document subscriber
export function subscribeDocument<T>(
  collectionName: string,
  docId: string,
  callback: (item: T | null) => void
): Unsubscribe {
  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as T);
        } else {
          callback(null);
        }
      },
      (error) => {
        handleFirestoreError(error, `subscribeDocument:${collectionName}/${docId}`);
      }
    );
  } catch (error) {
    handleFirestoreError(error, `subscribeDocumentInit:${collectionName}/${docId}`);
    return () => {};
  }
}

// Save or overwrite a document
export async function setDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleaned = removeUndefinedFields({ ...data, id: docId });
    await setDoc(docRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, `setDocument:${collectionName}/${docId}`);
  }
}

// Update specific fields of a document
export async function updateDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleaned = removeUndefinedFields(updates);
    await updateDoc(docRef, cleaned as any);
  } catch (error) {
    handleFirestoreError(error, `updateDocument:${collectionName}/${docId}`);
  }
}

// Delete a document
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, `deleteDocument:${collectionName}/${docId}`);
  }
}

// Seed initial dataset to Firestore if collection is empty
export async function seedCollectionIfEmpty<T extends { id: string }>(
  collectionName: string,
  initialItems: T[]
): Promise<void> {
  if (!initialItems || initialItems.length === 0) return;
  try {
    const colRef = collection(db, collectionName);
    const existing = await getDocs(colRef);
    if (existing.empty) {
      const batch = writeBatch(db);
      for (const item of initialItems) {
        const itemDocRef = doc(db, collectionName, item.id);
        batch.set(itemDocRef, removeUndefinedFields(item));
      }
      await batch.commit();
      console.log(`Seeded ${initialItems.length} documents into Firestore collection: ${collectionName}`);
    }
  } catch (error) {
    handleFirestoreError(error, `seedCollectionIfEmpty:${collectionName}`);
  }
}

// Seed settings document if missing
export async function seedSettingsIfEmpty(defaultSettings: SystemSettings): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const snap = await getDocs(collection(db, 'settings'));
    if (snap.empty) {
      await setDoc(docRef, removeUndefinedFields(defaultSettings));
      console.log('Seeded global system settings into Firestore');
    }
  } catch (error) {
    handleFirestoreError(error, 'seedSettingsIfEmpty');
  }
}

/**
 * Directly fetch all documents in a collection from the Firestore server,
 * explicitly bypassing any local cache (IndexedDB/memory).
 */
export async function fetchCollectionFromServer<T extends { id: string }>(
  collectionName: string
): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocsFromServer(colRef);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    })) as T[];
  } catch (error) {
    handleFirestoreError(error, `fetchCollectionFromServer:${collectionName}`);
    // If direct server fetch hits transient offline error, fallback to getDocs
    try {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as T[];
    } catch {
      return [];
    }
  }
}

/**
 * Directly fetch a specific document from the Firestore server, bypassing cache.
 */
export async function fetchDocumentFromServer<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDocFromServer(docRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as unknown as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, `fetchDocumentFromServer:${collectionName}/${docId}`);
    return null;
  }
}

