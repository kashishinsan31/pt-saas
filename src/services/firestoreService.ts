import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
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
  const err = error as { code?: string; message?: string };
  console.error(`Firestore error during [${operationContext}]:`, err?.message || error);
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
    await setDoc(docRef, { ...data, id: docId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, `setDocument:${collectionName}/${docId}`);
    throw error;
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
    await updateDoc(docRef, updates as any);
  } catch (error) {
    handleFirestoreError(error, `updateDocument:${collectionName}/${docId}`);
    throw error;
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
    throw error;
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
        batch.set(itemDocRef, item);
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
      await setDoc(docRef, defaultSettings);
      console.log('Seeded global system settings into Firestore');
    }
  } catch (error) {
    handleFirestoreError(error, 'seedSettingsIfEmpty');
  }
}
