
"use server";

import { generateBrandIdentityFromPrompt } from "@/ai/flows/generate-brand-identity-from-prompt";
import { regenerateBrandIdentityFromCritique, type RegenerateBrandIdentityFromCritiqueInput } from "@/ai/flows/regenerate-brand-identity-from-critique";

import type { z } from "zod";
import type { brandFormSchema } from "@/lib/schema";

type BrandFormInput = z.infer<typeof brandFormSchema>;


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
    
    return { imageUrl: result.imageUrl };
  } catch (error: any) {
    console.error("Error in generateIdentityAction:", error);
    return { error: error.message || "An unknown error occurred." };
  }
}

export async function regenerateIdentityAction(
  values: RegenerateBrandIdentityFromCritiqueInput,
  userId: string | null
): Promise<{ imageUrl?: string; error?: string }> {
   if (!userId) {
    return { error: "User authentication failed. Please refresh and try again." };
  }

  try {
    const regenerationResult = await regenerateBrandIdentityFromCritique(values);

    if (regenerationResult.error) {
      throw new Error(regenerationResult.error);
    }

    return { imageUrl: regenerationResult.imageUrl };

  } catch (error: any) {
    console.error("Error in regenerateIdentityAction:", error);
    return { error: error.message || "An unknown error occurred." };
  }
}
