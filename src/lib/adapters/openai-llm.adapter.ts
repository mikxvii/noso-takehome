/**
 * OpenAI LLM Adapter
 *
 * Concrete implementation of LLMAnalysisPort using OpenAI GPT models.
 * Handles structured JSON output with function calling for reliable schema adherence.
 */

import OpenAI from 'openai';
import { LLMAnalysisPort, AnalysisInput } from '@/lib/ports/llm-analysis.port';
import { Analysis } from '@/types/models';
import { analysisSchema } from '@/lib/validators/schemas';

export class OpenAILLMAdapter implements LLMAnalysisPort {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = model;
  }

  async analyze(input: AnalysisInput): Promise<Analysis> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    try {
      // First attempt: structured output
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse and validate
      const parsedData = JSON.parse(rawContent);
      const validated = await this.validateAnalysis(parsedData);

      return validated;
    } catch (error) {
      console.error('OpenAI analysis failed:', error);

      // Retry once with repair instruction
      try {
        return await this.retryWithRepair(input, systemPrompt, userPrompt);
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async retryWithRepair(
    input: AnalysisInput,
    systemPrompt: string,
    userPrompt: string
  ): Promise<Analysis> {
    const repairPrompt = `${userPrompt}\n\nIMPORTANT: The previous response had schema validation errors. Please ensure strict adherence to the JSON schema with all required fields.`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: repairPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Even lower temperature for repair
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Empty response from OpenAI on retry');
    }

    const parsedData = JSON.parse(rawContent);
    return await this.validateAnalysis(parsedData);
  }

  private async validateAnalysis(data: unknown): Promise<Analysis> {
    try {
      return analysisSchema.parse(data);
    } catch (error) {
      console.error('Schema validation failed:', error);
      throw new Error('LLM output does not match expected schema');
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert QA analyst for field-service phone calls. Your role is to analyze service call transcripts and produce comprehensive quality assessments.

CRITICAL: You MUST respond with valid JSON matching this exact structure. Do not include any text outside the JSON object.

{
  "scores": {
    "complianceOverall": <number 0-100>,
    "clarity": <number 0-100>,
    "empathy": <number 0-100>,
    "professionalism": <number 0-100>
  },
  "callTypePrediction": "<repair|maintenance|installation|other>",
  "stages": {
    "introduction": {
      "present": <boolean>,
      "quality": "<poor|ok|good|excellent>",
      "evidence": [{"quote": "<text>", "timestamp": <seconds>}],
      "notes": "<optional string>"
    },
    "diagnosis": { same structure },
    "solutionExplanation": { same structure },
    "upsell": { same structure },
    "maintenancePlan": { same structure },
    "closing": { same structure }
  },
  "salesInsights": [
    {
      "snippet": "<text>",
      "timestamp": <seconds>,
      "note": "<description>",
      "severity": "<low|med|high>"
    }
  ],
  "missedOpportunities": [
    {
      "recommendation": "<text>",
      "snippet": "<optional text>",
      "timestamp": <optional seconds>
    }
  ],
  "checklist": [
    {
      "id": "<unique-id>",
      "label": "<requirement description>",
      "passed": <boolean>,
      "evidence": "<optional justification>",
      "timestamp": <optional seconds>
    }
  ],
  "createdAt": <unix timestamp in milliseconds>
}

STAGE DEFINITIONS:
- Introduction: Greeting, tech introduces self, confirms customer details
- Diagnosis: Tech asks questions, identifies problem, explains findings
- Solution Explanation: Tech explains repair/solution clearly, addresses concerns
- Upsell: Tech suggests additional services or products (if applicable)
- Maintenance Plan: Tech recommends preventive maintenance or follow-up
- Closing: Summary, next steps, asks if customer has questions, thanks customer

CHECKLIST REQUIREMENTS:
1. Tech introduced themselves by name
2. Tech confirmed customer information
3. Tech asked diagnostic questions
4. Tech explained the problem clearly
5. Tech provided a solution with clear next steps
6. Tech asked if customer had any questions
7. Tech was polite and professional throughout
8. Tech spoke clearly without jargon (or explained technical terms)

Analyze carefully and provide evidence-based assessments.`;
  }

  private buildUserPrompt(input: AnalysisInput): string {
    const segmentsText = input.segments
      .map(seg => `[${Math.floor(seg.start)}s] ${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n');

    return `Analyze this service call transcript:

METADATA:
- Duration: ${input.metadata?.durationSec ? `${Math.floor(input.metadata.durationSec / 60)} minutes` : 'unknown'}
- Suspected Call Type: ${input.metadata?.callType || 'unknown'}

TRANSCRIPT (with speaker labels and timestamps):
${segmentsText}

Provide a comprehensive analysis following the JSON schema exactly.`;
  }

  getModelInfo() {
    return {
      provider: 'openai',
      model: this.model,
      version: 'gpt-4o-mini',
    };
  }
}
