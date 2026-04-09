import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import toast from 'react-hot-toast';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Solo logueamos en modo desarrollo, nunca en producción
  if (import.meta.env.DEV) {
    console.error(`[DEV] Firestore Error [${operationType}]:`, errMessage);
  }
  
  if (errMessage.includes('permission-denied') || errMessage.includes('Missing or insufficient permissions')) {
    toast.error('Acceso denegado: no tienes permisos para esta acción.');
  } else {
    toast.error('Ocurrió un error. Por favor intente de nuevo.');
  }

  throw new Error(`FirestoreError:${operationType}`);
}
