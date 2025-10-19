'use server';

/**
 * @fileOverview A flow to suggest car models based on a user's quiz answers.
 *
 * - suggestModelsFromQuiz - A function that suggests car models based on quiz results.
 */

import { ai } from '@/ai/genkit';
import {
    SuggestModelsFromQuizInputSchema,
    type SuggestModelsFromQuizInput,
    SuggestModelsFromQuizOutputSchema,
    type SuggestModelsFromQuizOutput
} from '@/types/quiz';


type QuizRequest = Omit<SuggestModelsFromQuizInput, 'availableVehicles'>;

export async function suggestModelsFromQuiz(
  input: QuizRequest
): Promise<SuggestModelsFromQuizOutput> {
  const availableVehicles = [
    {
      "model": "Corolla",
      "category": "Sedan",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["Efficiency"]
    },
    {
      "model": "Corolla Hatchback",
      "category": "Hatchback",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline"],
      "features": ["Efficiency"]
    },
    {
      "model": "Camry",
      "category": "Sedan",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["Efficiency", "Comfort"]
    },
    {
      "model": "Crown",
      "category": "Sedan",
      "seating_capacity": 5,
      "available_powertrains": ["Hybrid"],
      "features": ["Comfort", "Technology"]
    },
    {
      "model": "Mirai",
      "category": "Sedan",
      "seating_capacity": 5,
      "available_powertrains": ["Fuel Cell Electric"],
      "features": ["Efficiency", "Comfort", "Technology"]
    },
    {
      "model": "Prius",
      "category": "Hatchback",
      "seating_capacity": 5,
      "available_powertrains": ["Hybrid"],
      "features": ["Efficiency"]
    },
    {
      "model": "Prius Prime",
      "category": "Hatchback",
      "seating_capacity": 5,
      "available_powertrains": ["Plug-in Hybrid"],
      "features": ["Efficiency"]
    },
    {
      "model": "GR86",
      "category": "Coupe",
      "seating_capacity": 4,
      "available_powertrains": ["Gasoline"],
      "features": ["Performance"]
    },
    {
      "model": "GR Supra",
      "category": "Coupe",
      "seating_capacity": 2,
      "available_powertrains": ["Gasoline"],
      "features": ["Performance"]
    },
    {
      "model": "GR Corolla",
      "category": "Hatchback",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline"],
      "features": ["Performance"]
    },
    {
      "model": "Corolla Cross",
      "category": "SUV",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["Efficiency"]
    },
    {
      "model": "RAV4",
      "category": "SUV",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline", "Hybrid", "Plug-in Hybrid"],
      "features": ["Efficiency"]
    },
    {
      "model": "Venza",
      "category": "SUV",
      "seating_capacity": 5,
      "available_powertrains": ["Hybrid"],
      "features": ["Efficiency", "Comfort"]
    },
    {
      "model": "Highlander",
      "category": "SUV",
      "seating_capacity": 8,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["Family", "Efficiency"]
    },
    {
      "model": "Grand Highlander",
      "category": "SUV",
      "seating_capacity": 8,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["Family", "Efficiency"]
    },
    {
      "model": "4Runner",
      "category": "SUV",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline"],
      "features": ["OffRoad", "Utility"]
    },
    {
      "model": "Sequoia",
      "category": "SUV",
      "seating_capacity": 8,
      "available_powertrains": ["Hybrid"],
      "features": ["Family", "OffRoad", "Utility"]
    },
    {
      "model": "Land Cruiser",
      "category": "SUV",
      "seating_capacity": 5,
      "available_powertrains": ["Hybrid"],
      "features": ["OffRoad", "Technology", "Utility"]
    },
    {
      "model": "bZ4X",
      "category": "SUV",
      "seating_capacity": 5,
      "available_powertrains": ["Electric"],
      "features": ["Efficiency", "Technology"]
    },
    {
      "model": "Tacoma",
      "category": "Truck",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["OffRoad", "Utility"]
    },
    {
      "model": "Tundra",
      "category": "Truck",
      "seating_capacity": 5,
      "available_powertrains": ["Gasoline", "Hybrid"],
      "features": ["OffRoad", "Utility"]
    },
    {
      "model": "Sienna",
      "category": "Minivan",
      "seating_capacity": 8,
      "available_powertrains": ["Hybrid"],
      "features": ["Family", "Efficiency"]
    }
  ];

  return suggestModelsFromQuizFlow({...input, availableVehicles});
}

const suggestModelsFromQuizPrompt = ai.definePrompt({
  name: 'suggestModelsFromQuizPrompt',
  input: { schema: SuggestModelsFromQuizInputSchema },
  output: { schema: SuggestModelsFromQuizOutputSchema },
  prompt: `You are a helpful assistant at a Toyota dealership that helps customers find the perfect vehicle by asking them a series of questions. Based on their answers, you will recommend 3-5 Toyota models that are a great fit.

  Here is the list of available Toyota Models with their specs. You must only choose from this list:
  {{#each availableVehicles}}- {{model}}: category: {{category}}, seating: {{seating_capacity}}, powertrains: {{#each available_powertrains}}{{.}}, {{/each}}features: {{#each features}}{{.}}, {{/each}}{{/each}}

  Here are the user's answers:
  - Typical number of passengers: {{{passengers}}}
  - Primary use for the vehicle: {{{primaryUse}}}
  - Daily commute length: {{{commute}}}
  - Fuel preference: {{{fuelPreference}}}
  - What is most important in a vehicle: {{{priorities}}}

  Based on these answers, recommend 3 to 5 vehicles from the list above. For each vehicle, provide a short, compelling "rationale" (e.g., "Best for long commutes with its hybrid efficiency"). Also provide key specs (from the 'features' array in the data), an estimated monthly payment (calculate roughly based on a 60-month loan at 5% APR with $5000 down), and relevant badges. Ensure the photoUrl is a placeholder.

  Return the recommendations in the specified JSON format.
  `,
});

const suggestModelsFromQuizFlow = ai.defineFlow(
  {
    name: 'suggestModelsFromQuizFlow',
    inputSchema: SuggestModelsFromQuizInputSchema,
    outputSchema: SuggestModelsFromQuizOutputSchema,
  },
  async (input) => {
    const { output } = await suggestModelsFromQuizPrompt(input);
    return output!;
  }
);
