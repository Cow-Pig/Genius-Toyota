// This is a server action.
'use server';

/**
 * @fileOverview A flow to suggest car models based on the specified affordability cap.
 *
 * - suggestModelsBasedOnAffordability - A function that suggests car models based on the affordability cap.
 * - SuggestModelsBasedOnAffordabilityInput - The input type for the suggestModelsBasedOnAffordability function.
 * - SuggestModelsBasedOnAffordabilityOutput - The return type for the suggestModelsBasedOnAffordability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestModelsBasedOnAffordabilityInputSchema = z.object({
  affordabilityCap: z
    .number()
    .describe('The maximum monthly payment the user can afford.'),
});
export type SuggestModelsBasedOnAffordabilityInput = z.infer<
  typeof SuggestModelsBasedOnAffordabilityInputSchema
>;

const SuggestedModelSchema = z.object({
  modelName: z.string().describe('The name of the car model.'),
  photoUrl: z.string().describe('URL of the car model photo.'),
  keySpecs: z.string().describe('Key specifications of the car.'),
  estimatedPayment: z.number().describe('Estimated monthly payment.'),
  badges: z.array(z.string()).describe('Badges for the car model (e.g., Hybrid, AWD, Safety Sense).'),
  fuelEstimate: z.string().optional().describe('Estimated fuel spend (Eco vs Gas).'),
});

const SuggestModelsBasedOnAffordabilityOutputSchema = z.object({
  suggestedModels: z.array(SuggestedModelSchema).describe('An array of suggested car models.'),
});
export type SuggestModelsBasedOnAffordabilityOutput = z.infer<
  typeof SuggestModelsBasedOnAffordabilityOutputSchema
>;

export async function suggestModelsBasedOnAffordability(
  input: SuggestModelsBasedOnAffordabilityInput
): Promise<SuggestModelsBasedOnAffordabilityOutput> {
  return suggestModelsBasedOnAffordabilityFlow(input);
}

const fuelEstimateTool = ai.defineTool({
  name: 'getFuelEstimate',
  description: 'Estimates fuel spend for a given car model, comparing Eco vs. Gas versions if available.',
  inputSchema: z.object({
    modelName: z.string().describe('The name of the car model.'),
  }),
  outputSchema: z.string().describe('A comparison of fuel costs between Eco and Gas versions.'),
},
async (input) => {
  // TODO: Implement the actual fuel estimate calculation logic here.
  return `Fuel estimates for ${input.modelName} are not available at this time.`;
});

const suggestModelsBasedOnAffordabilityPrompt = ai.definePrompt({
  name: 'suggestModelsBasedOnAffordabilityPrompt',
  input: {schema: SuggestModelsBasedOnAffordabilityInputSchema},
  output: {schema: SuggestModelsBasedOnAffordabilityOutputSchema},
  tools: [fuelEstimateTool],
  prompt: `You are a helpful assistant that suggests car models based on the user's affordability cap.

  Suggest car models that have an estimated monthly payment less than or equal to the affordability cap.
  For each suggested model, provide the model name, a URL for a photo of the model, key specifications, the estimated monthly payment, and any relevant badges.
  If possible, use the getFuelEstimate tool to get a fuel estimate for each model.

  Affordability Cap: {{{affordabilityCap}}}

  Output the car models in JSON format.
  `,
});

const suggestModelsBasedOnAffordabilityFlow = ai.defineFlow(
  {
    name: 'suggestModelsBasedOnAffordabilityFlow',
    inputSchema: SuggestModelsBasedOnAffordabilityInputSchema,
    outputSchema: SuggestModelsBasedOnAffordabilityOutputSchema,
  },
  async input => {
    const {output} = await suggestModelsBasedOnAffordabilityPrompt(input);
    return output!;
  }
);
