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
  "generalFeedback": "<3-5 paragraph comprehensive feedback synthesizing the overall call quality, key strengths across all stages, primary areas for improvement, business impact assessment, and actionable recommendations for the technician. This should provide holistic, strategic guidance based on the complete analysis.>",
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
      "notes": "<structured feedback with: 'Strengths: [what was done well]. Weaknesses: [areas for improvement].' Be specific and actionable.>"
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
   - Notes Format: "**Strengths:**\n- [First specific strength with details]\n- [Second specific strength with details]\n\n**Weaknesses:**\n- [First specific weakness with actionable improvement]\n- [Second specific weakness with actionable improvement]"
   - Example: "**Strengths:**\n- Used a warm, friendly tone when greeting the customer\n- Clearly stated their full name and company affiliation\n\n**Weaknesses:**\n- Did not confirm the customer's address for verification\n- Introduction felt somewhat rushed without building initial rapport"

2. DIAGNOSIS (varies):
   - Quality "excellent": Asks open-ended questions, listens actively, confirms understanding, identifies root cause
   - Quality "good": Asks relevant questions, identifies issue with minor gaps
   - Quality "ok": Basic questions asked but lacks depth or misses details
   - Quality "poor": Jumps to conclusions, doesn't ask diagnostic questions
   - Evidence: Provide quotes of key diagnostic questions and customer responses
   - Notes Format: "**Strengths:**\n- [Specific strength with details]\n- [Another specific strength]\n\n**Weaknesses:**\n- [Specific weakness with improvement]\n- [Another specific weakness]"

3. SOLUTION EXPLANATION (varies):
   - Quality "excellent": Explains problem clearly, outlines solution step-by-step, checks for understanding, addresses concerns
   - Quality "good": Clear explanation with minor gaps in detail or verification
   - Quality "ok": Provides solution but lacks clarity or customer confirmation
   - Quality "poor": Vague explanation, technical jargon not explained, no verification
   - Evidence: Provide quotes showing how problem and solution were explained
   - Notes Format: "**Strengths:**\n- [Specific strength]\n- [Another strength]\n\n**Weaknesses:**\n- [Specific weakness]\n- [Another weakness]"

4. UPSELL (if present):
   - Quality "excellent": Identifies customer needs, presents value proposition naturally, handles objections well
   - Quality "good": Attempts upsell relevantly but could be more persuasive
   - Quality "ok": Mentions additional services but weakly or awkwardly
   - Quality "poor": Pushy, irrelevant, or poorly timed upsell attempt
   - Evidence: Provide exact quotes of upsell attempts and customer responses
   - Notes Format: "**Strengths:**\n- [Specific strength]\n- [Another strength]\n\n**Weaknesses:**\n- [Specific weakness]\n- [Another weakness]"

5. MAINTENANCE PLAN (if present):
   - Quality "excellent": Explains benefits clearly, ties to customer's specific situation, offers options
   - Quality "good": Mentions plan with some benefits explained
   - Quality "ok": Brief mention without much explanation
   - Quality "poor": No mention or very poor explanation
   - Evidence: Provide quotes about maintenance plan discussion
   - Notes Format: "**Strengths:**\n- [Specific strength]\n- [Another strength]\n\n**Weaknesses:**\n- [Specific weakness]\n- [Another weakness]"

6. CLOSING (typically last 30-60 seconds):
   - Quality "excellent": Summarizes work, confirms satisfaction, asks for questions, provides next steps, thanks customer warmly
   - Quality "good": Good closure with 1-2 elements missing
   - Quality "ok": Basic thank you but rushed or incomplete
   - Quality "poor": Abrupt ending, no thank you or verification
   - Evidence: Provide quotes from the closing sequence
   - Notes Format: "**Strengths:**\n- [Specific strength]\n- [Another strength]\n\n**Weaknesses:**\n- [Specific weakness]\n- [Another weakness]"

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

SCORING GUIDELINES (Be precise and granular - avoid round numbers like 70, 80, 90):
- complianceOverall (0-100): Calculate as weighted average: (stage quality scores × 0.6) + (checklist pass rate × 0.4). Use specific scores like 73, 84, 91, etc.
- clarity (0-100): Evaluate communication quality: clear language (30 pts), logical organization (30 pts), verified understanding (20 pts), avoided jargon (20 pts). Be granular: 67, 78, 85, etc.
- empathy (0-100): Assess customer care: active listening (35 pts), acknowledged concerns (35 pts), patient responses (30 pts). Use specific scores: 71, 82, 88, etc.
- professionalism (0-100): Evaluate demeanor: courteous tone (35 pts), proper intro/closing (35 pts), respectful throughout (30 pts). Be precise: 76, 83, 92, etc.

IMPORTANT: Scores should reflect actual performance with granularity. Use the full 0-100 range appropriately:
- 90-100: Exceptional, nearly flawless execution
- 80-89: Strong performance with minor areas for improvement
- 70-79: Satisfactory with notable gaps
- 60-69: Below expectations with significant issues
- Below 60: Poor performance requiring major improvement

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
2. For the generalFeedback field, provide CONCISE, easy-to-read feedback formatted as bullet points. Keep it brief and focused - avoid unnecessary details or verbose explanations. Structure it as follows:
   - Start with a brief overall call assessment (1-2 sentences) rating the call holistically and highlighting what the tech did best
   - Then use SHORT, focused bullet points to cover:
     • Key strengths - list the top 2-3 strengths in 1 sentence each
     • Primary improvement areas - identify the 2-3 most critical weaknesses in 1 sentence each
     • Business impact - one brief sentence on how call quality affects customer satisfaction and revenue
     • Actionable recommendations - provide 3-5 specific steps in 1 sentence each

   CRITICAL: Be CONCISE. Each bullet point should be 1 sentence maximum. Skip unnecessary context, examples, or explanations. Focus on the essential information only. Use professional, constructive language but keep it brief and scannable.

3. For each stage, provide AT LEAST 2-3 pieces of evidence with exact quotes and timestamps
4. For each stage's notes field, use this EXACT format with markdown bold and newlines:
   "**Strengths:**
   - [First specific strength with detailed explanation]
   - [Second specific strength with detailed explanation]

   **Weaknesses:**
   - [First specific weakness with actionable improvement suggestion]
   - [Second specific weakness with actionable improvement suggestion]"

   IMPORTANT: Be detailed and specific in each bullet point. Avoid generic statements.
5. For sales insights, be COMPREHENSIVE - identify ALL moments where:
   - Value was positioned or could have been positioned
   - Customer showed buying signals, needs, concerns, or interests
   - Tech used effective sales techniques
   - Customer asked about pricing, scheduling, or additional services
   - Opportunities existed for upsells, maintenance plans, or recurring services
   Aim for 5-10+ sales insights per call - be thorough!
6. For missed opportunities, be specific about what should have been said and when
7. For the checklist, verify each item against the transcript and provide supporting evidence
8. For call type, provide a descriptive label that includes the service category and specific reason (e.g., "HVAC Repair - No Cooling" not just "repair")
9. Ensure all timestamps are accurate and correspond to actual moments in the transcript
10. When quoting, use the exact words from the transcript, not paraphrases

IMPORTANT: The generalFeedback field should be CONCISE and easy to scan. Synthesize insights from other sections but keep it brief - no more than 8-10 bullet points total. Focus on the most important takeaways only. Avoid repeating details that are already covered in individual sections.

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
