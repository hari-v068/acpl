import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Create the model instance
const model = google('gemini-1.5-flash');

// Define the schema for our evaluation result
const evaluationSchema = z.object({
  matches_description: z.boolean(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  elements_found: z.array(z.string()),
  missing_elements: z.array(z.string()),
});

export async function evaluateImage(imageUrl: string, description: string) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();

  const prompt = `
  You are an image evaluator. Your task is to determine if the provided image matches the given description: "${description}"

  Analyze the image carefully and provide:
  - Whether the image matches the description
  - Your confidence level (0.0-1.0)
  - A brief explanation of why it matches or doesn't match
  - List of key elements found in the image
  - List of elements from the description that are missing in the image
  `;

  try {
    const { object: result } = await generateObject({
      model,
      schema: evaluationSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'file',
              data: imageBuffer,
              mimeType: 'image/jpeg',
            },
          ],
        },
      ],
    });

    return result;
  } catch (e) {
    throw e;
  }
}
