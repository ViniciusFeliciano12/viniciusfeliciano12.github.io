import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from './firebase';

export interface AuthSession {
  user: User;
  isGM: boolean;
}

async function loadIsGM(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(getDb(), 'gm_users', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

/** Upsert do e-mail do usuário na coleção `users` (chamado a cada login/cadastro). */
async function registerUser(user: User): Promise<void> {
  try {
    await setDoc(doc(getDb(), 'users', user.uid), { email: user.email }, { merge: true });
  } catch {
    // best-effort — não bloqueia o fluxo de login
  }
}

/** Resolve com a sessão da vez que o Firebase já tinha em cache, ou null se deslogado. */
export function initAuth(): Promise<AuthSession | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      unsubscribe();
      if (!user) {
        resolve(null);
        return;
      }
      const isGM = await loadIsGM(user.uid);
      await registerUser(user);
      resolve({ user, isGM });
    });
  });
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  const isGM = await loadIsGM(user.uid);
  await registerUser(user);
  return { user, isGM };
}

export async function signup(email: string, password: string): Promise<AuthSession> {
  const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await registerUser(user);
  return { user, isGM: false };
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth());
}
