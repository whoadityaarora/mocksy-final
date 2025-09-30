'use server';

/**
 * @fileOverview A brand improvement suggestion AI agent.
 *
 * - suggestBrandImprovements - A function that suggests improvements to a brand identity.
 * - SuggestBrandImprovementsInput - The input type for the suggestBrandImprovements function.
 * - SuggestBrandImprovementsOutput - The return type for the suggestBrandImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBrandImprovementsInputSchema = z.object({
  brandName: z.string().describe('The name of the brand.'),
  mainColor: z.string().describe('The main color used in the brand.'),
  style: z.string().describe('The style of the brand.'),
  merchandise: z.string().describe('The merchandise items associated with the brand.'),
  generatedImageUrl: z
    .string()
    .describe(
      'The URL of the generated brand identity mockup image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type SuggestBrandImprovementsInput = z.infer<typeof SuggestBrandImprovementsInputSchema>;

const SuggestBrandImprovementsOutputSchema = z.object({
  improvements: z.string().describe('Suggestions for improving the brand identity, including alternative color palettes or merchandise options.'),
});
export type SuggestBrandImprovementsOutput = z.infer<typeof SuggestBrandImprovementsOutputSchema>;

export async function suggestBrandImprovements(input: SuggestBrandImprovementsInput): Promise<SuggestBrandImprovementsOutput> {
  return suggestBrandImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBrandImprovementsPrompt',
  input: {schema: SuggestBrandImprovementsInputSchema},
  output: {schema: SuggestBrandImprovementsOutputSchema},
  prompt: `You are a branding expert providing suggestions for improving brand identities.

  Based on the following brand details and the generated mockup image, suggest improvements to the brand identity, including alternative color palettes or merchandise options.

  Brand Name: {{{brandName}}}
  Main Color: {{{mainColor}}}
  Style: {{{style}}}
  Merchandise: {{{merchandise}}}
  Mockup Image: {{media url=generatedImageUrl}}
  \n  Provide concrete and actionable suggestions.
  `,
});

const suggestBrandImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestBrandImprovementsFlow',
    inputSchema: SuggestBrandImprovementsInputSchema,
    outputSchema: SuggestBrandImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
