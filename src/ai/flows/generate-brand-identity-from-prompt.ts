'use server';
/**
 * @fileOverview Generates a brand identity mockup image from a text prompt and a logo image.
 *
 * - generateBrandIdentityFromPrompt - A function that generates a brand identity mockup image.
 * - GenerateBrandIdentityFromPromptInput - The input type for the function.
 * - GenerateBrandIdentityFromPromptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBrandIdentityFromPromptInputSchema = z.object({
  brandName: z.string().describe('The name of the brand.'),
  merchandise: z.string().describe('A comma-separated list of merchandise items.'),
  mainColor: z.string().describe('The main color theme for the brand.'),
  style: z.string().describe('The design style for the brand (e.g., Modern, Minimalist).'),
  logoDataUri: z.string().describe("A data URI of the brand's logo. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateBrandIdentityFromPromptInput = z.infer<typeof GenerateBrandIdentityFromPromptInputSchema>;

const GenerateBrandIdentityFromPromptOutputSchema = z.object({
  imageUrl: z.string().describe('The generated brand identity mockup image as a data URI (PNG format).'),
});
export type GenerateBrandIdentityFromPromptOutput = z.infer<typeof GenerateBrandIdentityFromPromptOutputSchema>;

export async function generateBrandIdentityFromPrompt(input: GenerateBrandIdentityFromPromptInput): Promise<GenerateBrandIdentityFromPromptOutput> {
  return generateBrandIdentityFromPromptFlow(input);
}

const generateBrandIdentityFromPromptFlow = ai.defineFlow(
  {
    name: 'generateBrandIdentityFromPromptFlow',
    inputSchema: GenerateBrandIdentityFromPromptInputSchema,
    outputSchema: GenerateBrandIdentityFromPromptOutputSchema,
  },
  async (input) => {
    const itemCount = input.merchandise.split(',').filter(item => item.trim() !== '').length;
    
    let gridInstruction = '';
    if (itemCount > 1) {
      gridInstruction = 'The final image must be structured as a photo collage with clear grid lines separating each item.';
      if (itemCount <= 3) {
        gridInstruction += ' Arrange the items in a single row.';
      } else if (itemCount === 4) {
        gridInstruction += ' Arrange the items in a 2x2 grid.';
      } else { // 5 or 6 items
        gridInstruction += ' Arrange the items in a 2x3 grid.';
      }
      gridInstruction += " Do not repeat items to fill empty grid cells. The arrangement must emphasize visual hierarchy.";
    } else {
      gridInstruction = 'The final image should feature the single merchandise item prominently in a professional studio setting.';
    }


    const promptText = `You are an AI-powered brand identity generator. Your task is to create a single, high-quality, professional studio mockup image that visually represents a brand identity based on the user's logo and brand details.

Brand Details:
- Brand Name: ${input.brandName}
- Merchandise Items: ${input.merchandise}
- Main Color Theme: ${input.mainColor}
- Design Style: ${input.style}

Instructions:
- Create a cohesive set of visual designs for the brand, ensuring that all elements align with the provided brand details.
- The provided logo must be prominently and clearly displayed on all merchandise items.
- The products displayed should be: ${input.merchandise}.
- The main visual color and color palette should be dominated by: ${input.mainColor}.
- The overall design and presentation must be in a ${input.style} style. Ensure the logo is perfectly rendered on all items with excellent lighting and resolution.
- ${gridInstruction}
- Maintain a clean, studio-quality aesthetic throughout.

Output:
Return a data URI containing the generated PNG image. It is very important that this be a valid data URI.
`;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        {text: promptText},
        {media: {url: input.logoDataUri}},
      ],
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('The AI model did not return an image. Please try again.');
    }

    return {imageUrl: media.url};
  }
);
