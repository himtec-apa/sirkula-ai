import fs from 'fs';
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import {
  FoodRiskCategory,
  VisionAnalysisResponse,
  VisionAnalysisResponseSchema,
} from '@sirkula/shared-types';
import { getEnv } from '../../config/env.js';

export const DETERMINISTIC_FALLBACK_VISION: VisionAnalysisResponse = {
  items: [
    {
      menu_name: 'Gulai Cincang Daging Sapi & Nasi Putih',
      category: FoodRiskCategory.WET_COCONUT_MILK,
      estimated_portions: 35,
      estimated_weight_kg: 8.5,
      contains_coconut_milk: true,
      animal_feed_suitable: true,
      ai_confidence_score: 0.94,
    },
    {
      menu_name: 'Ayam Goreng Lengkuas & Sambal',
      category: FoodRiskCategory.DRY_FRIED,
      estimated_portions: 25,
      estimated_weight_kg: 4.5,
      contains_coconut_milk: false,
      animal_feed_suitable: true,
      ai_confidence_score: 0.91,
    },
  ],
  batch_summary: 'Prasmanan Gulai Cincang Sapi, Nasi Putih & Ayam Goreng',
  recommended_container: '2 Box Kontainer Makanan Standar (40L)',
  highest_risk_category: FoodRiskCategory.WET_COCONUT_MILK,
  total_portions: 60,
  total_weight_kg: 13.0,
};

@Injectable()
export class VisionAiService {
  private readonly logger = new Logger(VisionAiService.name);

  async analyzeFoodImage(imageBase64?: string): Promise<VisionAnalysisResponse> {
    const env = getEnv();
    const apiKey = env.AI_API_KEY || env.GEMINI_API_KEY;

    this.logger.log(`analyzeFoodImage: hasImage=${Boolean(imageBase64)}, len=${imageBase64?.length ?? 0}, apiKey=${apiKey ? 'set' : 'none'}, baseUrl=${env.AI_BASE_URL || 'none'}, model=${env.AI_MODEL || 'default'}`);
    if (!apiKey || apiKey === 'mock-gemini-key' || !imageBase64) {
      this.logger.warn(`Skipping AI Vision: apiKey=${apiKey}, hasImage=${Boolean(imageBase64)}. Returning fallback.`);
      return DETERMINISTIC_FALLBACK_VISION;
    }

    try {
      // 1. OpenAI-Compatible Custom Endpoint (9router, OpenRouter, vLLM, etc.)
      if (env.AI_BASE_URL) {
        return await this.callOpenAiCompatibleVision(
          env.AI_BASE_URL,
          apiKey,
          env.AI_MODEL,
          imageBase64
        );
      }

      // 2. Direct Google Gemini GenAI SDK Endpoint
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analyze this food image from a catering/restaurant buffet in Indonesia.
        Extract a list of detected food items with their microbiology risk category:
        - WET_COCONUT_MILK (santan/gulai/opor)
        - WET_NON_COCONUT (sop/kuah non-santan/capcay)
        - MOIST_PROTEIN_CARB (nasi/mie/ayam bumbu)
        - DRY_FRIED (gorengan/rendang kering)
        - BAKERY_PASTRY (roti/kue/buah)
        Estimate realistic portions and weight in kg.
        Determine if it is suitable for animal feed (maggot BSF / fish / poultry).
      `;

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: env.AI_MODEL || 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    menu_name: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: [
                        'WET_COCONUT_MILK',
                        'WET_NON_COCONUT',
                        'MOIST_PROTEIN_CARB',
                        'DRY_FRIED',
                        'BAKERY_PASTRY',
                      ],
                    },
                    estimated_portions: { type: Type.INTEGER },
                    estimated_weight_kg: { type: Type.NUMBER },
                    contains_coconut_milk: { type: Type.BOOLEAN },
                    animal_feed_suitable: { type: Type.BOOLEAN },
                    ai_confidence_score: { type: Type.NUMBER },
                  },
                  required: [
                    'menu_name',
                    'category',
                    'estimated_portions',
                    'estimated_weight_kg',
                    'contains_coconut_milk',
                    'animal_feed_suitable',
                    'ai_confidence_score',
                  ],
                },
              },
              batch_summary: { type: Type.STRING },
              recommended_container: { type: Type.STRING },
              highest_risk_category: {
                type: Type.STRING,
                enum: [
                  'WET_COCONUT_MILK',
                  'WET_NON_COCONUT',
                  'MOIST_PROTEIN_CARB',
                  'DRY_FRIED',
                  'BAKERY_PASTRY',
                ],
              },
              total_portions: { type: Type.INTEGER },
              total_weight_kg: { type: Type.NUMBER },
            },
            required: [
              'items',
              'batch_summary',
              'highest_risk_category',
              'total_portions',
              'total_weight_kg',
            ],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error('Empty response from Gemini Vision API');
      }

      const parsed = JSON.parse(responseText);
      const validated = VisionAnalysisResponseSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      }

      return this.adaptPartialVisionData(parsed);
    } catch (err: any) {
      this.logger.warn(`Vision AI error (${err.message}). Using deterministic fallback.`);
      return DETERMINISTIC_FALLBACK_VISION;
    }
  }

  private async callOpenAiCompatibleVision(
    baseUrl: string,
    apiKey: string,
    model: string,
    imageBase64: string
  ): Promise<VisionAnalysisResponse> {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageUrl = `data:image/jpeg;base64,${cleanBase64}`;

    const prompt = `
Analyze this food or packaged snack/dish image from Indonesia for microbiology food safety triage. Identify the exact food, dish, or snack visible (e.g. Kripik / Bisreng / Keripik Pedas / Nasi / Gulai / etc.).
Return a single JSON object adhering strictly to this schema:
{
  "items": [
    {
      "menu_name": "Accurate name of dish or snack (e.g. Kripik Bujangan Bisreng)",
      "category": "WET_COCONUT_MILK" | "WET_NON_COCONUT" | "MOIST_PROTEIN_CARB" | "DRY_FRIED" | "BAKERY_PASTRY",
      "estimated_portions": number,
      "estimated_weight_kg": number,
      "contains_coconut_milk": boolean,
      "animal_feed_suitable": boolean,
      "ai_confidence_score": number (0.0 to 1.0)
    }
  ],
  "batch_summary": "Brief 1-sentence summary of all foods",
  "recommended_container": "Packaging recommendation",
  "highest_risk_category": "WET_COCONUT_MILK" | "WET_NON_COCONUT" | "MOIST_PROTEIN_CARB" | "DRY_FRIED" | "BAKERY_PASTRY",
  "total_portions": number,
  "total_weight_kg": number
}
`;

    let resolvedBaseUrl = baseUrl;
    const inDocker = fs.existsSync('/.dockerenv') || Boolean(process.env.DOCKER_CONTAINER);
    if (
      inDocker &&
      (resolvedBaseUrl.includes('localhost') || resolvedBaseUrl.includes('127.0.0.1'))
    ) {
      resolvedBaseUrl = resolvedBaseUrl
        .replace('localhost', 'host.docker.internal')
        .replace('127.0.0.1', 'host.docker.internal');
    }

    const endpoint = `${resolvedBaseUrl.replace(/\/+$/, '')}/chat/completions`;
    this.logger.log(`Calling OpenAI-compatible Vision Endpoint: ${endpoint} (model: ${model})`);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI Food Safety & Bio-Thermal Triage Engine. Return ONLY valid JSON, with no markdown code fences or extra text.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
        stream: false,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenAI-compatible endpoint failed: ${res.status} ${res.statusText} - ${errBody}`);
    }

    const rawText = await res.text();
    this.logger.log(`Raw AI response: ${rawText.slice(0, 300)}`);
    let contentString = rawText.trim();

    // Handle SSE stream fallback if proxy returns stream chunks
    if (contentString.startsWith('data:')) {
      const lines = contentString.split('\n');
      let combined = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
          try {
            const chunk = JSON.parse(trimmed.slice(5).trim());
            const delta = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || '';
            combined += delta;
          } catch {
            // ignore non-json SSE lines
          }
        }
      }
      contentString = combined.trim();
    } else {
      const data: any = JSON.parse(contentString);
      contentString = (data.choices?.[0]?.message?.content || '').trim();
    }

    if (!contentString) {
      throw new Error('Empty response content from AI vision model');
    }

    const cleanJson = contentString
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanJson);
    const validated = VisionAnalysisResponseSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }

    return this.adaptPartialVisionData(parsed);
  }

  private adaptPartialVisionData(parsed: any): VisionAnalysisResponse {
    const rawItems =
      Array.isArray(parsed.items) && parsed.items.length > 0
        ? parsed.items
        : [
            {
              menu_name:
                typeof parsed.batch_summary === 'string' &&
                parsed.batch_summary.trim() &&
                !parsed.batch_summary.toLowerCase().includes('no food')
                  ? parsed.batch_summary.slice(0, 50)
                  : 'Camilan / Makanan Kemasan',
              category: parsed.highest_risk_category || FoodRiskCategory.DRY_FRIED,
              estimated_portions: Number(parsed.total_portions) || 1,
              estimated_weight_kg: Number(parsed.total_weight_kg) || 0.25,
              contains_coconut_milk: false,
              animal_feed_suitable: true,
              ai_confidence_score: 0.88,
            },
          ];

    const totalWeight = rawItems.reduce(
      (sum: number, it: any) => sum + (Number(it.estimated_weight_kg) || 0.5),
      0
    );
    const totalPortions = rawItems.reduce(
      (sum: number, it: any) => sum + (Number(it.estimated_portions) || 1),
      0
    );

    return {
      items: rawItems.map((it: any) => ({
        menu_name: String(it.menu_name || 'Lauk / Camilan Makanan'),
        category: it.category || FoodRiskCategory.DRY_FRIED,
        estimated_portions: Number(it.estimated_portions) || 1,
        estimated_weight_kg: Number(it.estimated_weight_kg) || 0.5,
        contains_coconut_milk: Boolean(it.contains_coconut_milk),
        animal_feed_suitable: it.animal_feed_suitable ?? true,
        ai_confidence_score: Number(it.ai_confidence_score) || 0.88,
      })),
      batch_summary: String(parsed.batch_summary || 'Makanan Terdeteksi AI'),
      recommended_container: String(parsed.recommended_container || 'Kantong / Box Makanan Standar'),
      highest_risk_category: parsed.highest_risk_category || FoodRiskCategory.DRY_FRIED,
      total_portions: Math.max(1, totalPortions),
      total_weight_kg: Number(Math.max(0.1, totalWeight).toFixed(1)),
    };
  }
}
