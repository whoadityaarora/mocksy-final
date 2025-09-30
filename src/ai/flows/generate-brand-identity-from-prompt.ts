'use server';
/**
 * @fileOverview Generates a brand identity mockup image from a text prompt.
 *
 * - generateBrandIdentityFromPrompt - A function that generates a brand identity mockup image from a text prompt.
 * - GenerateBrandIdentityFromPromptInput - The input type for the generateBrandIdentityFromPrompt function.
 * - GenerateBrandIdentityFromPromptOutput - The return type for the generateBrandIdentityFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBrandIdentityFromPromptInputSchema = z.object({
  prompt: z.string().describe('A detailed text prompt describing the desired brand identity, including the brand name, color scheme, style, and merchandise items to include in the mockup.'),
});
export type GenerateBrandIdentityFromPromptInput = z.infer<typeof GenerateBrandIdentityFromPromptInputSchema>;

const GenerateBrandIdentityFromPromptOutputSchema = z.object({
  imageUrl: z.string().describe('The generated brand identity mockup image as a data URI (PNG format).'),
});
export type GenerateBrandIdentityFromPromptOutput = z.infer<typeof GenerateBrandIdentityFromPromptOutputSchema>;

export async function generateBrandIdentityFromPrompt(input: GenerateBrandIdentityFromPromptInput): Promise<GenerateBrandIdentityFromPromptOutput> {
  return generateBrandIdentityFromPromptFlow(input);
}

const generateBrandIdentityPrompt = ai.definePrompt({
  name: 'generateBrandIdentityPrompt',
  input: {schema: GenerateBrandIdentityFromPromptInputSchema},
  output: {schema: GenerateBrandIdentityFromPromptOutputSchema},
  prompt: `You are an AI-powered brand identity generator. Your task is to create a single, high-quality, professional studio mockup image that visually represents a brand identity based on the user's text prompt.

User Prompt: {{{prompt}}}

Instructions:
- Create a cohesive set of visual designs for the brand, ensuring that all elements align with the provided text prompt.
- Products to be displayed should be relevant to the brand identity described in the prompt.  Incorporate at least 3 different products into the mockup.
- The overall design and presentation must reflect the style specified in the prompt. Ensure the logo is rendered clearly on all items with excellent lighting and resolution.
- The final image must be structured using a **2x3 grid layout** for high visual impact and clarity. Apply **universal spacing** (negative space) around each item to prevent clutter. The arrangement must emphasize **visual hierarchy** so that the most important items draw the viewer's eye first. Maintain a clean, studio-quality aesthetic.

Output:
Return a data URI containing the generated PNG image.  It is very important that this be a valid data URI.
`,
});

const generateBrandIdentityFromPromptFlow = ai.defineFlow(
  {
    name: 'generateBrandIdentityFromPromptFlow',
    inputSchema: GenerateBrandIdentityFromPromptInputSchema,
    outputSchema: GenerateBrandIdentityFromPromptOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: generateBrandIdentityPrompt.prompt(input).prompt,
    });
    return {imageUrl: media.url!};
  }
);
