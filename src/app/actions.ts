"use server";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateBrandIdentityFromPrompt } from "@/ai/flows/generate-brand-identity-from-prompt";
import { suggestBrandImprovements } from "@/ai/flows/suggest-brand-improvements";
import type { SuggestBrandImprovementsInput } from "@/ai/flows/suggest-brand-improvements";
import type { z } from "zod";
import type { brandFormSchema } from "@/lib/schema";

type BrandFormInput = z.infer<typeof brandFormSchema>;

const MAX_GENERATIONS = 5;

// ---- Firestore Usage Tracking Functions ----

/**
 * Gets the current generation count for a given user.
 * @param userId The ID of the user.
 * @returns The user's current generation count.
 */
export async function getUserUsage(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const userDocRef = doc(db, "userUsage", userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data().count || 0 : 0;
  } catch (error) {
    console.error("Error getting user usage:", error);
    // In case of error, we allow generation to proceed to not block the user.
    return 0;
  }
}

/**
 * Increments the generation count for a given user.
 * @param userId The ID of the user.
 */
async function incrementUserUsage(userId: string): Promise<void> {
   if (!userId) return;
  try {
    const userDocRef = doc(db, "userUsage", userId);
    const userDoc = await getDoc(userDocRef);
    const currentCount = userDoc.exists() ? userDoc.data().count || 0 : 0;

    await setDoc(userDocRef, { 
      count: currentCount + 1,
      lastUpdated: serverTimestamp() 
    }, { merge: true });

  } catch (error) {
    console.error("Error incrementing user usage:", error);
  }
}


// ---- Main Actions ----

async function fileToDataUri(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function generateIdentityAction(
  values: BrandFormInput,
  userId: string | null
): Promise<{ imageUrl?: string; error?: string }> {
  if (!userId) {
    return { error: "User authentication failed. Please refresh and try again." };
  }
  
  try {
    const currentUsage = await getUserUsage(userId);
    if (currentUsage >= MAX_GENERATIONS) {
      return { error: "You have reached your generation limit of 5 mockups." };
    }

    const { brandName, merchandise, mainColor, style, logoFile } = values;

    if (!logoFile) {
      return { error: 'Logo file is required.' };
    }

    const logoDataUri = await fileToDataUri(logoFile);

    const result = await generateBrandIdentityFromPrompt({ 
      brandName: brandName ?? 'brand',
      merchandise,
      mainColor,
      style,
      logoDataUri,
    });

    if (!result.imageUrl) {
      throw new Error("The AI model did not return an image. Please try again.");
    }
    
    // Increment count after successful generation
    await incrementUserUsage(userId);

    return { imageUrl: result.imageUrl };
  } catch (error: any) {
    console.error("Error in generateIdentityAction:", error);
    return { error: error.message || "An unknown error occurred." };
  }
}

export async function suggestImprovementsAction(
  values: SuggestBrandImprovementsInput
): Promise<{ improvements?: string; error?: string }> {
  try {
    const result = await suggestBrandImprovements(values);
    return { improvements: result.improvements };
  } catch (error: any) {
    console.error("Error in suggestImprovementsAction:", error);
    return { error: error.message || "An unknown error occurred." };
  }
}
