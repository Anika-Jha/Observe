
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const app = express();

app.use(express.json({ limit: '2mb' }));

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

const cache = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();

const inputSchema = z.object({
  expeditionId: z.string().min(1),
  note: z.string().max(8000),
  duration: z.number().int().positive().max(180),
  quests: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.string(),
      durationMinutes: z.number(),
    }),
  ).max(5),
});

const resultSchema = z.object({
  reflection: z.string().max(500),
  pattern: z.string().max(180),
  tomorrowQuest: z.object({
    title: z.string().max(80),
    description: z.string().max(240),
    category: z.enum([
      'nature',
      'sounds',
      'people',
      'places',
      'making',
      'care',
      'observation',
    ]),
    durationMinutes: z.number().int().min(5).max(45),
  }),
});

const categoryNames = {
  nature: 'Nature',
  sounds: 'Sounds',
  people: 'People & Neighborhood',
  places: 'Places',
  making: 'Food & Making',
  care: 'Care',
  observation: 'Observation',
} as const;

const fallback = {
  reflection:
    'You noticed something worth paying attention to. Tomorrow, choose one familiar route and look for something you have never noticed before.',
  pattern: 'A small detail became a reason to slow down.',
  tomorrowQuest: {
    title: 'Look Again',
    description:
      'Tomorrow, take a familiar route and notice one detail you have never really seen before.',
    category: 'Observation',
    durationMinutes: 15,
  },
};

app.post('/api/reflect', async (req, res) => {
  const parsed = inputSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid reflection request.',
    });
  }

  const { expeditionId, note, duration, quests } = parsed.data;

  if (cache.has(expeditionId)) {
    return res.json(cache.get(expeditionId));
  }

  const existingTask = pending.get(expeditionId);

  if (existingTask) {
    return res.json(await existingTask);
  }

  const task = (async () => {
    let result: z.infer<typeof resultSchema> = fallback;

    const key = process.env.GEMMA_API_KEY;
    const model = process.env.GEMMA_MODEL;

    // Gemma is optional. The core app works without API credentials.
    if (key && model && note.trim()) {
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const controller = new AbortController();

        timer = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': key,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: [
                      'You are Gemma, a thoughtful field-notebook reflection.',
                      'Reflect only what the person actually observed.',
                      'Identify one simple pattern and create one realistic outdoor observation for tomorrow.',
                      'Encourage attention to the physical world.',
                      'Never invent observations, identify species or people without evidence, offer generic wellness advice, encourage unsafe behavior, or suggest photographing strangers.',
                      'Return concise valid JSON only.',
                      'reflection <=80 words, pattern <=30 words, tomorrow description <=50 words.',
                      'JSON keys are reflection, pattern, tomorrowQuest.',
                      'tomorrowQuest has title, description, category, and durationMinutes.',
                      'category must be one of nature, sounds, people, places, making, care, observation, in lowercase.',
                    ].join(' '),
                  },
                ],
              },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: JSON.stringify({
                        fieldNote: note.slice(0, 4000),
                        durationMinutes: duration,
                        quests: quests.map((quest) => quest.title),
                      }),
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.55,
                maxOutputTokens: 280,
              },
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Gemma request failed: ${response.status}`);
        }

        const body = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const responseText = body.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || '')
          .join('');

        if (!responseText) {
          throw new Error('Gemma returned an empty response.');
        }

        const parsedResult = resultSchema.parse(JSON.parse(responseText));

        result = {
          ...parsedResult,
          tomorrowQuest: {
            ...parsedResult.tomorrowQuest,
            category: categoryNames[parsedResult.tomorrowQuest.category],
          },
        };
      } catch {
        // Preserve the journal experience if Gemma is unavailable.
        result = fallback;
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    }

    cache.set(expeditionId, result);
    return result;
  })();

  pending.set(expeditionId, task);

  try {
    const result = await task;
    return res.json(result);
  } finally {
    pending.delete(expeditionId);
  }
});

// Serve the production frontend and support client-side routes.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(here, 'dist');

  app.use(express.static(distPath));

  // Express 5 wildcard syntax: matches "/" and nested paths.
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`OBSERVE server listening on ${port}`);
});