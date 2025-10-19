'use server';

/**
 * @fileOverview Estimates the fuel spend (Eco vs. Gas) for suggested models.
 *
 * - estimateFuelSpend - A function that estimates the fuel spend for a given car model.
 * - EstimateFuelSpendInput - The input type for the estimateFuelSpend function.
 * - EstimateFuelSpendOutput - The return type for the estimateFuelSpend function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateFuelSpendInputSchema = z.object({
  cityMpg: z.number().describe('EPA city MPG for the car model.'),
  combinedMpg: z.number().describe('EPA combined MPG for the car model.'),
  fuelPrice: z.number().describe('The current average fuel price.'),
  annualMileage: z.number().describe('The annual mileage driven.'),
});
export type EstimateFuelSpendInput = z.infer<typeof EstimateFuelSpendInputSchema>;

const EstimateFuelSpendOutputSchema = z.object({
  estimatedFuelCost: z
    .number()
    .describe('The estimated annual fuel cost for the car model.'),
});
export type EstimateFuelSpendOutput = z.infer<typeof EstimateFuelSpendOutputSchema>;

export async function estimateFuelSpend(input: EstimateFuelSpendInput): Promise<EstimateFuelSpendOutput> {
  return estimateFuelSpendFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateFuelSpendPrompt',
  input: {schema: EstimateFuelSpendInputSchema},
  output: {schema: EstimateFuelSpendOutputSchema},
  prompt: `You are a helpful assistant that estimates the annual fuel cost of a vehicle.

  Given the following information, calculate the estimated annual fuel cost:

  City MPG: {{{cityMpg}}}
  Combined MPG: {{{combinedMpg}}}
  Fuel Price: {{{fuelPrice}}}
  Annual Mileage: {{{annualMileage}}}

  First, calculate the average MPG by averaging the city and combined MPG values.
  Then, divide the annual mileage by the average MPG to get the gallons of fuel consumed per year.
  Finally, multiply the gallons of fuel consumed per year by the fuel price to get the estimated annual fuel cost.

  Return the estimated annual fuel cost in the output.
  `,
});

const estimateFuelSpendFlow = ai.defineFlow(
  {
    name: 'estimateFuelSpendFlow',
    inputSchema: EstimateFuelSpendInputSchema,
    outputSchema: EstimateFuelSpendOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
