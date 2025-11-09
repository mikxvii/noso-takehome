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

  constructor(apiKey?: string, model: string = 'gpt-4o') {
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
        temperature: 0.2, // Very low temperature for consistent, accurate analysis
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
      // Preprocess: convert null timestamps to undefined for optional fields
      const preprocessed = this.preprocessAnalysisData(data);
      return analysisSchema.parse(preprocessed);
    } catch (error) {
      console.error('Schema validation failed:', error);
      throw new Error('LLM output does not match expected schema');
    }
  }

  /**
   * Preprocess analysis data to convert null values to undefined for optional fields
   */
  private preprocessAnalysisData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const processed = { ...data };

    // Process checklist items
    if (Array.isArray(processed.checklist)) {
      processed.checklist = processed.checklist.map((item: any) => ({
        ...item,
        timestamp: item.timestamp === null ? undefined : item.timestamp,
      }));
    }

    // Process sales insights
    if (Array.isArray(processed.salesInsights)) {
      processed.salesInsights = processed.salesInsights.map((insight: any) => ({
        ...insight,
        timestamp: insight.timestamp === null ? undefined : insight.timestamp,
      }));
    }

    // Process missed opportunities
    if (Array.isArray(processed.missedOpportunities)) {
      processed.missedOpportunities = processed.missedOpportunities.map((opp: any) => ({
        ...opp,
        timestamp: opp.timestamp === null ? undefined : opp.timestamp,
      }));
    }

    // Process stage evidence
    if (processed.stages) {
      Object.keys(processed.stages).forEach((stageKey) => {
        const stage = processed.stages[stageKey];
        if (stage?.evidence && Array.isArray(stage.evidence)) {
          stage.evidence = stage.evidence.map((ev: any) => ({
            ...ev,
            timestamp: ev.timestamp === null ? undefined : ev.timestamp,
          }));
        }
      });
    }

    return processed;
  }

  private buildSystemPrompt(): string {
    return `You are an expert QA analyst specializing in field-service call analysis. Your role is to provide comprehensive, accurate, and evidence-based assessments of service call quality.

CRITICAL INSTRUCTIONS:
1. You MUST respond with valid JSON matching the exact structure below
2. ALWAYS provide direct quotes from the transcript as evidence
3. ALWAYS include accurate timestamps (in seconds) for all evidence
4. Be thorough, consistent, and objective in your analysis
5. Focus on specific, actionable insights rather than vague observations

JSON STRUCTURE (REQUIRED):
{
  "summary": "<2-3 sentence AI-generated summary of the call covering: what the customer needed, what the tech did, and the outcome>",
  "scores": {
    "complianceOverall": <number 0-100>,
    "clarity": <number 0-100>,
    "empathy": <number 0-100>,
    "professionalism": <number 0-100>
  },
  "callTypePrediction": "<descriptive label like 'HVAC Repair - No Cooling', 'Plumbing Installation - New Fixtures', 'Electrical Maintenance - Annual Service', etc. Be specific and include the service category and reason>",
  "stages": {
    "introduction": {
      "present": <boolean>,
      "quality": "<poor|ok|good|excellent>",
      "evidence": [{"quote": "<exact quote from transcript>", "timestamp": <seconds>}],
      "notes": "<detailed explanation of quality assessment>"
    },
    "diagnosis": { same structure },
    "solutionExplanation": { same structure },
    "upsell": { same structure },
    "maintenancePlan": { same structure },
    "closing": { same structure }
  },
  "salesInsights": [
    {
      "snippet": "<exact quote showing sales moment>",
      "timestamp": <seconds>,
      "note": "<specific insight about what was done well or could be improved>",
      "severity": "<low|med|high>"
    }
  ],
  "missedOpportunities": [
    {
      "recommendation": "<specific, actionable recommendation>",
      "snippet": "<quote showing the missed opportunity context>",
      "timestamp": <seconds>
    }
  ],
  "checklist": [
    {
      "id": "<unique-id>",
      "label": "<requirement description>",
      "passed": <boolean>,
      "evidence": "<quote from transcript or explanation why it failed>",
      "timestamp": <seconds or null>
    }
  ],
  "createdAt": <unix timestamp in milliseconds>
}

STAGE DEFINITIONS & QUALITY CRITERIA:

1. INTRODUCTION (0-30 seconds typically):
   - Quality "excellent": Tech greets warmly, states name/company, confirms customer name/address
   - Quality "good": Tech greets and introduces self, minor omissions
   - Quality "ok": Basic greeting present but lacks professionalism
   - Quality "poor": Rushed, impersonal, or missing key elements
   - Evidence: Provide exact quotes showing greeting, introduction, confirmation

2. DIAGNOSIS (varies):
   - Quality "excellent": Asks open-ended questions, listens actively, confirms understanding, identifies root cause
   - Quality "good": Asks relevant questions, identifies issue with minor gaps
   - Quality "ok": Basic questions asked but lacks depth or misses details
   - Quality "poor": Jumps to conclusions, doesn't ask diagnostic questions
   - Evidence: Provide quotes of key diagnostic questions and customer responses

3. SOLUTION EXPLANATION (varies):
   - Quality "excellent": Explains problem clearly, outlines solution step-by-step, checks for understanding, addresses concerns
   - Quality "good": Clear explanation with minor gaps in detail or verification
   - Quality "ok": Provides solution but lacks clarity or customer confirmation
   - Quality "poor": Vague explanation, technical jargon not explained, no verification
   - Evidence: Provide quotes showing how problem and solution were explained

4. UPSELL (if present):
   - Quality "excellent": Identifies customer needs, presents value proposition naturally, handles objections well
   - Quality "good": Attempts upsell relevantly but could be more persuasive
   - Quality "ok": Mentions additional services but weakly or awkwardly
   - Quality "poor": Pushy, irrelevant, or poorly timed upsell attempt
   - Evidence: Provide exact quotes of upsell attempts and customer responses

5. MAINTENANCE PLAN (if present):
   - Quality "excellent": Explains benefits clearly, ties to customer's specific situation, offers options
   - Quality "good": Mentions plan with some benefits explained
   - Quality "ok": Brief mention without much explanation
   - Quality "poor": No mention or very poor explanation
   - Evidence: Provide quotes about maintenance plan discussion

6. CLOSING (typically last 30-60 seconds):
   - Quality "excellent": Summarizes work, confirms satisfaction, asks for questions, provides next steps, thanks customer warmly
   - Quality "good": Good closure with 1-2 elements missing
   - Quality "ok": Basic thank you but rushed or incomplete
   - Quality "poor": Abrupt ending, no thank you or verification
   - Evidence: Provide quotes from the closing sequence

CHECKLIST REQUIREMENTS (provide evidence for each - use intuitive, readable labels starting with verbs):
1. tech-introduced-self: "Introduced themselves by name"
2. tech-stated-company: "Mentioned the company name"
3. confirmed-customer-info: "Confirmed customer name or address"
4. asked-diagnostic-questions: "Asked questions to understand the problem"
5. explained-problem-clearly: "Explained the issue in clear, understandable terms"
6. explained-solution: "Clearly described the solution or work performed"
7. provided-next-steps: "Explained what happens next or follow-up actions"
8. asked-for-questions: "Asked if the customer had any questions"
9. professional-tone: "Maintained a professional and courteous tone throughout"
10. clear-communication: "Communicated clearly without unexplained technical jargon"

SALES INSIGHTS GUIDELINES (BE COMPREHENSIVE):
- Identify ALL moments where tech successfully positioned value or could have positioned value
- Note EVERY customer buying signal, expressed need, concern, or interest
- Highlight effective sales techniques used (listening, questioning, value proposition, objection handling)
- Identify customer pain points that could lead to additional services
- Note customer questions about pricing, scheduling, or additional services
- Mark moments where customer showed interest but tech didn't follow up
- Include insights about customer satisfaction levels and potential for referrals
- Identify opportunities for maintenance plans, warranties, or recurring services
- Note any competitive mentions or comparisons
- Mark severity based on impact: "high" = significant revenue opportunity or missed revenue, "med" = moderate opportunity, "low" = minor opportunity
- Provide at least 5-10 sales insights per call if possible - be thorough and comprehensive

MISSED OPPORTUNITIES GUIDELINES:
- Look for customer pain points that weren't addressed
- Identify moments where additional services could have been suggested
- Note when customer expressed interest but tech didn't follow up
- Provide specific, actionable recommendations for improvement

SCORING GUIDELINES:
- complianceOverall (0-100): Average of all stage qualities + checklist completion
- clarity (0-100): How well tech communicated (clear language, organized, confirmed understanding)
- empathy (0-100): Active listening, acknowledging concerns, patient responses
- professionalism (0-100): Courteous tone, proper introduction/closing, respectful demeanor

CRITICAL REMINDERS:
- Every piece of evidence MUST include an exact quote and timestamp
- Be specific and detailed in your notes - avoid generic feedback
- Base all assessments on actual transcript content, not assumptions
- If a stage is not present, mark present: false and explain in notes
- Provide at least 2-3 pieces of evidence per stage when present
- Timestamps should reference the actual time in the transcript (in seconds)`;
  }

  private buildUserPrompt(input: AnalysisInput): string {
    const segmentsText = input.segments
      .map(seg => `[${Math.floor(seg.start)}s] ${seg.speaker.toUpperCase()}: ${seg.text}`)
      .join('\n');

    return `Analyze this service call transcript with maximum accuracy and detail.

METADATA:
- Duration: ${input.metadata?.durationSec ? `${Math.floor(input.metadata.durationSec / 60)} minutes ${Math.floor(input.metadata.durationSec % 60)} seconds` : 'unknown'}
- Suspected Call Type: ${input.metadata?.callType || 'unknown'}

TRANSCRIPT (with speaker labels and timestamps in seconds):
${segmentsText}

ANALYSIS REQUIREMENTS:
1. Read the ENTIRE transcript carefully before analyzing
2. For each stage, provide AT LEAST 2-3 pieces of evidence with exact quotes and timestamps
3. For sales insights, be COMPREHENSIVE - identify ALL moments where:
   - Value was positioned or could have been positioned
   - Customer showed buying signals, needs, concerns, or interests
   - Tech used effective sales techniques
   - Customer asked about pricing, scheduling, or additional services
   - Opportunities existed for upsells, maintenance plans, or recurring services
   Aim for 5-10+ sales insights per call - be thorough!
4. For missed opportunities, be specific about what should have been said and when
5. For the checklist, verify each item against the transcript and provide supporting evidence
6. For call type, provide a descriptive label that includes the service category and specific reason (e.g., "HVAC Repair - No Cooling" not just "repair")
7. Ensure all timestamps are accurate and correspond to actual moments in the transcript
8. Make your notes detailed and actionable - avoid vague statements like "could be better"
9. When quoting, use the exact words from the transcript, not paraphrases

Provide your comprehensive analysis in valid JSON format following the schema exactly.`;
  }

  getModelInfo() {
    return {
      provider: 'openai',
      model: this.model,
      version: 'gpt-4o-mini',
    };
  }
}
