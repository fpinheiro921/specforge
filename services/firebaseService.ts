
// services/firebaseService.ts
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';
import type { User, UserCredential } from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { SavedSpec } from '../components/SavedSpecsModal';

export const FREE_GENERATION_LIMIT = 3;

export interface UserProfile {
  uid: string;
  plan: 'free' | 'forge' | 'architect';
  generationsUsedThisMonth: number;
  monthlyCycleStart: Timestamp;
}

const handleFirestoreError = (error: any, context: string): Error => {
    console.error(`Error ${context}:`, error);
    if (error.code === 'permission-denied') {
        const firestoreRulesUrl = `https://console.firebase.google.com/project/dulcet-opus-461713-n0/firestore/rules`;
        const detailedMessage = `
Firestore Security Rules Error: Operation '${context}' failed. This is a configuration issue in your Firebase project, not a bug in the app.

To fix this, you MUST update your Firestore Security Rules in the Firebase Console.

1. Go to your Firestore rules editor:
${firestoreRulesUrl}

2. Replace the existing rules with the following code. This version is more robust and correctly handles all required operations (creating, reading, updating, deleting, and querying specs).

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Rule for user profiles
    // A user can read and write their own profile document, which is identified by their user ID (uid).
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Rules for the 'specs' collection
    match /specs/{specId} {
      
      // Allow a user to create a new spec document if the 'userId' in the new document
      // matches their authenticated user ID.
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      
      // Allow a user to read, update, or delete a spec if the 'userId' in the existing
      // document matches their authenticated user ID.
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      
      // Allow a signed-in user to query the 'specs' collection.
      // IMPORTANT: Client-side queries MUST be secured with a 'where("userId", "==", request.auth.uid)' clause.
      // This application's code already does this, so this rule is safe.
      allow list: if request.auth != null;
    }
  }
}

3. Click "Publish". The changes may take a few moments to apply.
4. After publishing, please refresh this application. The error should be resolved.
        `;
        return new Error(detailedMessage.trim());
    }
    return new Error(error.message || `An unknown error occurred during '${context}'.`);
};

export const getOrCreateUserProfile = async (userId: string): Promise<UserProfile> => {
    const userProfileRef = doc(db, 'userProfiles', userId);
    try {
        let userProfileDoc = await getDoc(userProfileRef);

        if (!userProfileDoc.exists()) {
            const newProfile: UserProfile = {
                uid: userId,
                plan: 'free',
                generationsUsedThisMonth: 0,
                monthlyCycleStart: Timestamp.now(),
            };
            await setDoc(userProfileRef, newProfile);
            return newProfile;
        } else {
            const profileData = userProfileDoc.data() as UserProfile;
            const cycleStartDate = profileData.monthlyCycleStart.toDate();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (cycleStartDate < thirtyDaysAgo) {
                const updatedProfileData = {
                    ...profileData,
                    generationsUsedThisMonth: 0,
                    monthlyCycleStart: Timestamp.now(),
                };
                await setDoc(userProfileRef, updatedProfileData, { merge: true });
                return updatedProfileData;
            }
            return profileData;
        }
    } catch (error: any) {
        throw handleFirestoreError(error, 'getting or creating user profile');
    }
};

export const incrementGenerationCount = async (userId: string): Promise<void> => {
    const userProfileRef = doc(db, 'userProfiles', userId);
    try {
        await updateDoc(userProfileRef, {
            generationsUsedThisMonth: increment(1)
        });
    } catch (error) {
        // We log the error but don't throw, to avoid breaking the user's flow after a successful generation.
        console.error("Failed to increment generation count:", error);
    }
};


export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    // This initiates a popup window for Google sign-in.
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    // The component that calls this will handle the specific error codes.
    console.error("Error during Google sign-in via popup:", error);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any)
  {
    console.error("Error signing out:", error);
    throw new Error(error.message || "An unknown error occurred during sign-out.");
  }
};

export const saveSpecToFirestore = async (
  userId: string,
  specData: Omit<SavedSpec, 'id' | 'savedAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "specs"), {
      ...specData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    throw handleFirestoreError(error, 'saving spec');
  }
};

export const updateSpecInFirestore = async (
  specId: string,
  specData: Partial<SavedSpec>
): Promise<void> => {
  try {
    const specRef = doc(db, "specs", specId);
    await updateDoc(specRef, {
      ...specData,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    throw handleFirestoreError(error, 'updating spec');
  }
};


export const getUserSpecs = async (userId: string): Promise<SavedSpec[]> => {
    try {
        const specsRef = collection(db, "specs");
        const q = query(specsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const specs: SavedSpec[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            specs.push({
                id: doc.id,
                name: data.name,
                ideaText: data.ideaText,
                generatedSpec: data.generatedSpec,
                selectedModules: data.selectedModules,
                savedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
            });
        });

        specs.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

        return specs;
    } catch (error: any) {
        throw handleFirestoreError(error, 'loading user specs');
    }
};


export const deleteSpecFromFirestore = async (specId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "specs", specId));
  } catch (error: any) {
    throw handleFirestoreError(error, 'deleting spec');
  }
};
