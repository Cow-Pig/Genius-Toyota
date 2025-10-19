import { z } from 'zod';

const VehicleSchema = z.object({
    model: z.string(),
    category: z.string(),
    seating_capacity: z.number(),
    available_powertrains: z.array(z.string()),
    features: z.array(z.string()),
});

export const SuggestModelsFromQuizInputSchema = z.object({
  passengers: z.string().describe('Typical number of passengers.'),
  primaryUse: z.string().describe('Primary use for the vehicle (e.g., commuting, family trips, adventure).'),
  commute: z.string().describe('Daily commute length.'),
  fuelPreference: z.string().describe('Preference for fuel type (e.g., Gas, Hybrid).'),
  priorities: z.array(z.string()).describe('What is most important in a vehicle (e.g., Tech, Safety, Performance).'),
  availableVehicles: z.array(VehicleSchema).describe('List of available vehicles to choose from.'),
});
export type SuggestModelsFromQuizInput = z.infer<
  typeof SuggestModelsFromQuizInputSchema
>;

const RecommendedModelSchema = z.object({
  modelName: z.string().describe('The name of the recommended car model.'),
  rationale: z.string().describe('A brief rationale for why this model is a good fit, highlighting a key feature.'),
  photoUrl: z.string().describe('URL of the car model photo.'),
  keySpecs: z.string().describe('Key specifications of the car.'),
  estimatedPayment: z.number().describe('Estimated monthly payment.'),
  badges: z.array(z.string()).describe('Badges for the car model (e.g., Hybrid, AWD, Safety Sense).'),
});


export const SuggestModelsFromQuizOutputSchema = z.object({
  recommendedModels: z
    .array(RecommendedModelSchema)
    .describe('An array of 3-5 recommended car models based on the quiz answers.'),
});
export type SuggestModelsFromQuizOutput = z.infer<
  typeof SuggestModelsFromQuizOutputSchema
>;
