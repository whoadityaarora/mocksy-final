import { config } from 'dotenv';
config();

import '@/ai/flows/generate-brand-identity-from-prompt.ts';
import '@/ai/flows/suggest-brand-improvements.ts';
import '@/ai/flows/regenerate-brand-identity-from-critique.ts';
