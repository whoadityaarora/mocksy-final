
'use server';
/**
 * @fileOverview Regenerates a brand identity mockup image from a text prompt, a logo image, and a critique of a previous version.
 *
 * - regenerateBrandIdentityFromCritique - A function that regenerates a brand identity mockup image.
 * - RegenerateBrandIdentityFromCritiqueInput - The input type for the function.
 * - RegenerateBrandIdentityFromCritiqueOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegenerateBrandIdentityFromCritiqueInputSchema = z.object({
  brandName: z.string().describe('The name of the brand.'),
  merchandise: z.string().describe('A comma-separated list of merchandise items.'),
  mainColor: z.string().describe('The main color theme for the brand.'),
  style: z.string().describe('The design style for the brand (e.g., Modern, Minimalist).'),
  logoDataUri: z.string().describe("A data URI of the brand's logo. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  previousImageUrl: z.string().describe('The data URI of the previous image that needs improvement.'),
  critique: z.string().describe('The text critique and suggestions for improving the image.'),
});
export type RegenerateBrandIdentityFromCritiqueInput = z.infer<typeof RegenerateBrandIdentityFromCritiqueInputSchema>;

const RegenerateBrandIdentityFromCritiqueOutputSchema = z.object({
  imageUrl: z.string().describe('The newly generated brand identity mockup image as a data URI (PNG format).'),
  error: z.string().optional().describe("An error message if the generation failed."),
});
export type RegenerateBrandIdentityFromCritiqueOutput = z.infer<typeof RegenerateBrandIdentityFromCritiqueOutputSchema>;

export async function regenerateBrandIdentityFromCritique(input: RegenerateBrandIdentityFromCritiqueInput): Promise<RegenerateBrandIdentityFromCritiqueOutput> {
  return regenerateBrandIdentityFromCritiqueFlow(input);
}

const regenerateBrandIdentityFromCritiqueFlow = ai.defineFlow(
  {
    name: 'regenerateBrandIdentityFromCritiqueFlow',
    inputSchema: RegenerateBrandIdentityFromCritiqueInputSchema,
    outputSchema: RegenerateBrandIdentityFromCritiqueOutputSchema,
  },
  async (input) => {
    try {
        const itemCount = input.merchandise.split(',').filter(item => item.trim() !== '').length;
        let gridInstruction = '';
        if (itemCount > 1) {
          let arrangement = '';
          if (itemCount === 2) {
            arrangement = 'in a 1x2 grid (one row, two columns)';
          } else if (itemCount === 3) {
            arrangement = `in a 1x3 grid (one row, three columns)`;
          } else if (itemCount === 4) {
            arrangement = `in a 2x2 grid`;
          } else { // 5 or 6 items
            arrangement = `in a 2x3 grid`;
          }
          gridInstruction = `The final image must be a photo collage, with each item displayed in its own section of a grid, arranged ${arrangement}. Each section should be separated by a single, clean, thin line. Do not repeat items.`;
        } else {
          gridInstruction = 'The final image should feature the single merchandise item prominently in a professional studio setting. Do not use any grid lines.';
        }
    
        const promptText = `You are an AI-powered brand identity generator. Your task is to REVISE a brand mockup based on a previous version and a set of critiques. Your goal is to create a NEW and IMPROVED image, not just a higher-quality version of the old one.

    **Original Brand Details:**
    - Brand Name: ${input.brandName}
    - Merchandise Items: ${input.merchandise}
    - Main Color Theme: ${input.mainColor}
    - Design Style: ${input.style}

    **Critique and Suggestions for Improvement:**
    "${input.critique}"

    **Instructions for Revision:**
    - You MUST address the points in the critique to create a new, improved image.
    - **Generate a new composition.** Try a different camera angle, change the product placement, or alter the background studio setting. Be creative.
    - Ensure the provided logo is prominently and clearly displayed on all merchandise items with perfect rendering, lighting, and resolution. **Crucially, do not add any text to the image yourself.** Only the visual logo from the uploaded image should appear on the merchandise.
    - The products displayed should be: ${input.merchandise}.
    - The main visual color and color palette should be dominated by: ${input.mainColor}.
    - The overall design and presentation must be in a ${input.style} style.
    - ${gridInstruction}
    - Maintain a clean, professional, studio-quality aesthetic throughout.

    **Output:**
    Return a data URI containing the generated PNG image. It is very important that this be a valid data URI.
    `;
    
        const {media} = await ai.generate({
          model: 'googleai/gemini-2.5-flash-image-preview',
          prompt: [
            {text: promptText},
            {media: {url: input.logoDataUri}},
            {media: {url: input.previousImageUrl}},
          ],
          config: {
            responseModalities: ['IMAGE'],
          },
        });
    
        if (!media?.url) {
          throw new Error('The AI model did not return an image. Please try again.');
        }
    
        return {imageUrl: media.url};
    } catch (e: any) {
        return { imageUrl: '', error: e.message || 'An unknown error occurred during regeneration.' };
    }
  }
);
