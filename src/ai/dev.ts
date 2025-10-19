import { config } from 'dotenv';
config();

import '@/ai/flows/estimate-fuel-spend.ts';
import '@/ai/flows/suggest-models-based-on-affordability.ts';
import '@/ai/flows/suggest-models-from-quiz.ts';
