"use server";

import { generateBrandIdentityFromPrompt } from "@/ai/flows/generate-brand-identity-from-prompt";
import type { z } from "zod";
import type { brandFormSchema } from "@/lib/schema";

type BrandFormInput = z.infer<typeof brandFormSchema>;

// Helper function to convert a file to a data URI
async function fileToDataUri(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function generateIdentityAction(
  values: BrandFormInput
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    const { brandName, merchandise, mainColor, style, logoFile } = values;

    if (!logoFile || logoFile.length === 0) {
      return { error: 'Logo file is required.' };
    }

    const logoDataUri = await fileToDataUri(logoFile[0]);

    const result = await generateBrandIdentityFromPrompt({ 
      brandName,
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
