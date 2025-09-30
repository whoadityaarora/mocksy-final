"use server";

import { generateBrandIdentityFromPrompt } from "@/ai/flows/generate-brand-identity-from-prompt";
import type { z } from "zod";
import type { brandFormSchema } from "@/lib/schema";

type BrandFormInput = z.infer<typeof brandFormSchema>;

export async function generateIdentityAction(
  values: BrandFormInput
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    const { brandName, merchandise, mainColor, style } = values;

    // The AI flow is text-only. The prompt will describe the brand, and the AI
    // will generate a logo and mockups based on this text description.
    const prompt = `Create a single, high-quality, professional studio mockup image for a brand named '${brandName}'.
The brand has a distinct logo that should be prominently and clearly displayed.
Products to be displayed should include: ${merchandise}.
The main visual color and color palette should be dominated by: ${mainColor}.
The overall design and presentation must be in a ${style} style. Ensure the logo is perfectly rendered on all items with excellent lighting and resolution.

The final image must be structured using a **2x3 grid layout** for high visual impact and clarity. Apply **universal spacing** (negative space) around each item to prevent clutter. The arrangement must emphasize **visual hierarchy** so that the most important items draw the viewer's eye first. Maintain a clean, studio-quality aesthetic.`;

    const result = await generateBrandIdentityFromPrompt({ prompt });

    if (!result.imageUrl) {
      throw new Error("The AI model did not return an image. Please try again.");
    }

    return { imageUrl: result.imageUrl };
  } catch (error: any) {
    console.error("Error in generateIdentityAction:", error);
    return { error: error.message || "An unknown error occurred." };
  }
}
