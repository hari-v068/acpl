import { env } from '@acpl/config/env';

interface GenerationResponse {
  sdGenerationJob: {
    generationId: string;
  };
}

interface GenerationResult {
  generations_by_pk: {
    status: string;
    generated_images: Array<{
      url: string;
    }>;
  };
}

export async function generateMarketingImage(prompt: string): Promise<string> {
  const generationResponse = await fetch(
    'https://cloud.leonardo.ai/api/rest/v1/generations',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${env.LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        modelId: '6b645e3a-d64f-4341-a6d8-7a3690fbf042',
        contrast: 3.5,
        prompt,
        num_images: 1,
        width: 512,
        height: 768,
        ultra: true,
        styleUUID: '111dc692-d470-4eec-b791-3475abac4c46',
      }),
    },
  );

  if (!generationResponse.ok) {
    throw new Error(
      `Failed to create generation: ${generationResponse.statusText}`,
    );
  }

  const { sdGenerationJob } =
    (await generationResponse.json()) as GenerationResponse;

  let attempts = 0;
  const maxAttempts = 30;
  while (attempts < maxAttempts) {
    const resultResponse = await fetch(
      `https://cloud.leonardo.ai/api/rest/v1/generations/${sdGenerationJob.generationId}`,
      {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${env.LEONARDO_API_KEY}`,
        },
      },
    );

    if (!resultResponse.ok) {
      throw new Error(
        `Failed to get generation result: ${resultResponse.statusText}`,
      );
    }

    const { generations_by_pk } =
      (await resultResponse.json()) as GenerationResult;

    if (generations_by_pk.status === 'COMPLETE') {
      const url = generations_by_pk.generated_images[0]?.url;
      if (url) return url;
      throw new Error('No images generated');
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
    attempts++;
  }

  throw new Error('Generation timed out');
}
