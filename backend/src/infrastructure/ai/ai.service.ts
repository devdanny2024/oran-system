import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface QuotePlanItem {
  productId: string;
  quantity: number;
}

interface QuotePlan {
  economy: QuotePlanItem[];
  standard: QuotePlanItem[];
  luxury: QuotePlanItem[];
}

@Injectable()
export class AiService {
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  }

  /**
   * Ask Gemini to propose product quantities for Economy, Standard and Luxury quotes.
   * Falls back to null on any error so callers can use deterministic logic instead.
   */
  async generateQuotePlan(input: {
    project: {
      roomsCount: number | null;
      buildingType: string | null;
    };
    onboarding: {
      projectStatus?: string | null;
      constructionStage?: string | null;
      needsInspection?: boolean | null;
      selectedFeatures?: string[] | null;
      stairSteps?: number | null;
    } | null;
    products: {
      id: string;
      name: string;
      category: string;
      priceTier: string;
    }[];
  }): Promise<QuotePlan | null> {
    if (!this.apiKey) {
      return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent`;

    const prompt = this.buildPrompt(input);

    try {
      // eslint-disable-next-line no-console
      console.log('[AiService] Calling Gemini model', this.model);
      const res = await fetch(
        `${endpoint}?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            // Keep generationConfig minimal for broad compatibility.
            // We rely on the prompt to request JSON.
          }),
        },
      );

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error(
          '[AiService] Gemini request failed',
          res.status,
          await res.text(),
        );
        return null;
      }

      const data: any = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ??
        data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!text || typeof text !== 'string') {
        return null;
      }

      // eslint-disable-next-line no-console
      console.log('[AiService] Gemini raw response text', text);

      // Gemini may occasionally wrap JSON in prose or code fences.
      // Try to safely extract the first JSON object from the text.
      const trimmed = text.trim();
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        // eslint-disable-next-line no-console
        console.error(
          '[AiService] Gemini response did not contain JSON braces',
          trimmed,
        );
        return null;
      }

      const jsonSlice = trimmed.slice(firstBrace, lastBrace + 1);

      let parsed: QuotePlan;
      try {
        parsed = JSON.parse(jsonSlice) as QuotePlan;
      } catch (parseError) {
        // eslint-disable-next-line no-console
        console.error(
          '[AiService] Failed to parse Gemini JSON',
          parseError,
          'raw:',
          trimmed,
        );
        return null;
      }

      if (!parsed.economy || !parsed.standard || !parsed.luxury) {
        return null;
      }

      return parsed;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AiService] Failed to call Gemini', error);
      return null;
    }
  }

  private buildPrompt(input: {
    project: { roomsCount: number | null; buildingType: string | null };
    onboarding: {
      projectStatus?: string | null;
      constructionStage?: string | null;
      needsInspection?: boolean | null;
      selectedFeatures?: string[] | null;
      stairSteps?: number | null;
    } | null;
    products: {
      id: string;
      name: string;
      category: string;
      priceTier: string;
    }[];
  }): string {
    const rooms = input.project.roomsCount ?? 1;
    const building = input.project.buildingType ?? 'unknown';
    const features = input.onboarding?.selectedFeatures ?? [];

    const productsJson = JSON.stringify(
      input.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        priceTier: p.priceTier,
      })),
    );

    const featureList =
      features && features.length
        ? features.join(', ')
        : 'no specific features selected';

    return `
You are an ORAN smart home configuration assistant.

The customer has a project with:
- Building type: ${building}
- Approximate rooms: ${rooms}
- Desired features: ${featureList}

You have the following automation products available (JSON array):
${productsJson}

Each product has:
- id: internal identifier you must refer to
- category: one of LIGHTING, CLIMATE, ACCESS, SURVEILLANCE, GATE, STAIRCASE
- priceTier: ECONOMY, STANDARD, or LUXURY

TASK:
Design three configuration tiers for this project:
- economy
- standard
- luxury

For each tier, choose a reasonable set of products and quantities that match the project needs and tier level.
Use only product ids from the list above. Do not invent new ids.

RETURN STRICT JSON ONLY with this exact shape:
{
  "economy": [{ "productId": "string", "quantity": number }],
  "standard": [{ "productId": "string", "quantity": number }],
  "luxury": [{ "productId": "string", "quantity": number }]
}

Rules:
- economy: prioritize fewer devices and more affordable (ECONOMY) products.
- standard: balanced coverage, mostly STANDARD tier where available.
- luxury: richer coverage and more premium (LUXURY) products.
- Quantities should scale with the number of rooms.
- For gate and staircase products, at most quantity 1 each unless stairSteps is very high.
`;
  }
}
