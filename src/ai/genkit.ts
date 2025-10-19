import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const geminiApiKey =
  process.env.GOOGLE_API_KEY ??
  process.env.GEMINI_API_KEY ??
  'AIzaSyDmuPJT2z5yrXcEt41KxU90jHwZ87HZRks';

export const ai = genkit({
  plugins: [googleAI({ apiKey: geminiApiKey })],
  model: 'googleai/gemini-2.5-flash',
});
