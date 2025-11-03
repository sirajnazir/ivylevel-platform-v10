/**
 * Assessment Data Extraction using GPT-4o Structured Outputs
 *
 * Uses OpenAI's GPT-4o model with function calling to extract structured assessment
 * data from conversational responses. This replaces regex-based extraction with robust
 * LLM-powered understanding.
 *
 * Based on CAT-1/2/3 foundation: Intent classification + entity extraction
 * Model: gpt-4o (Latest GPT-4o with function calling support)
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// Assessment Data Schema (Zod-like, matching our database)
// ============================================================================

export interface ExtractedAssessmentData {
  // Academic Data
  gpa?: number;
  gpa_type?: "weighted" | "unweighted";
  sat_total?: number;
  sat_math?: number;
  sat_verbal?: number;
  act_composite?: number;
  ap_count?: number;
  class_rank?: number;
  class_rank_total?: number;

  // Student Profile
  grade?: number; // 9, 10, 11, 12
  high_school?: string;
  target_major?: string;
  target_colleges?: string[];

  // Personality / Social
  personality_type?: "quiet" | "outgoing" | "introverted" | "extroverted";
  friend_group_size?: "small" | "medium" | "large";
  friend_group_dynamic?: "competitive" | "collaborative";

  // Interests & Activities
  interests?: string[];
  activities?: string[];
  leadership_roles?: string[];

  // Goals & Aspirations
  career_goals?: string[];
  motivations?: string[];
}

// ============================================================================
// GPT-4 Extraction Function
// ============================================================================

const EXTRACTION_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "extract_assessment_data",
      description: "Extract structured assessment data from student's response. Extract ALL relevant data points mentioned, even if user provides multiple pieces of information at once.",
      parameters: {
        type: "object",
        properties: {
          gpa: {
            type: "number",
            description: "Student's GPA on 4.0 scale (or 5.0 for weighted). Extract numbers like '4.3 weighted GPA', '3.9 unweighted', etc."
          },
          gpa_type: {
            type: "string",
            enum: ["weighted", "unweighted"],
            description: "Whether GPA is weighted or unweighted. Default to weighted if GPA > 4.0."
          },
          sat_total: {
            type: "number",
            description: "SAT total score (400-1600). Extract from phrases like 'SAT 1450', 'scored 1500 on SAT', etc."
          },
          sat_math: {
            type: "number",
            description: "SAT Math section score (200-800)"
          },
          sat_verbal: {
            type: "number",
            description: "SAT Verbal/Reading section score (200-800)"
          },
          act_composite: {
            type: "number",
            description: "ACT composite score (1-36)"
          },
          ap_count: {
            type: "number",
            description: "Number of AP courses taken or planned. Extract from '5 APs', 'taking 3 AP classes', etc."
          },
          class_rank: {
            type: "number",
            description: "Student's class rank (e.g., 5 if they say 'ranked 5th in my class')"
          },
          class_rank_total: {
            type: "number",
            description: "Total students in class (e.g., 400 if they say 'ranked 5th out of 400')"
          },
          grade: {
            type: "number",
            enum: [9, 10, 11, 12],
            description: "Current grade level. Extract from '10th grade', 'junior' (11), 'senior' (12), 'sophomore' (10), 'freshman' (9)."
          },
          high_school: {
            type: "string",
            description: "Name of high school student attends"
          },
          target_major: {
            type: "string",
            description: "Intended college major or field of study"
          },
          target_colleges: {
            type: "array",
            items: { type: "string" },
            description: "List of colleges student is interested in or targeting"
          },
          personality_type: {
            type: "string",
            enum: ["quiet", "outgoing", "introverted", "extroverted"],
            description: "Student's self-described personality type"
          },
          friend_group_size: {
            type: "string",
            enum: ["small", "medium", "large"],
            description: "Size of student's friend group"
          },
          friend_group_dynamic: {
            type: "string",
            enum: ["competitive", "collaborative"],
            description: "Dynamic of student's friend group"
          },
          interests: {
            type: "array",
            items: { type: "string" },
            description: "Academic or personal interests mentioned (e.g., 'coding', 'film', 'biology')"
          },
          activities: {
            type: "array",
            items: { type: "string" },
            description: "Extracurricular activities mentioned (e.g., 'debate team', 'robotics club', 'volunteering')"
          },
          leadership_roles: {
            type: "array",
            items: { type: "string" },
            description: "Leadership positions held (e.g., 'president of coding club', 'team captain')"
          },
          career_goals: {
            type: "array",
            items: { type: "string" },
            description: "Career aspirations or goals mentioned"
          },
          motivations: {
            type: "array",
            items: { type: "string" },
            description: "What motivates the student or drives their interests"
          }
        },
        additionalProperties: false
      }
    }
  }
];

const SYSTEM_PROMPT = `You are an expert at extracting structured assessment data from student responses in college admissions conversations.

Your task: Analyze the student's message and extract ALL relevant data points into structured format.

Key extraction rules:
1. COMPREHENSIVE: Extract every data point mentioned, even if multiple facts in one message
2. ACCURATE: Only extract explicitly stated information - don't infer or assume
3. CONTEXT-AWARE: Use conversation history to understand references (e.g., "I'm in 10th" → grade: 10)
4. FLEXIBLE: Handle various phrasings:
   - "4.3 weighted GPA" or "GPA is 4.3" or "I have a 4.3"
   - "10th grade" or "sophomore" or "I'm in 10th"
   - "SAT 1450" or "scored 1450" or "got a 1450 on my SAT"

Examples:
Input: "I have a 4.3 weighted GPA and I'm in 10th grade"
Output: { gpa: 4.3, gpa_type: "weighted", grade: 10 }

Input: "I'm interested in computer science and film"
Output: { interests: ["computer science", "film"] }

Input: "I scored 1450 on my SAT - 720 math and 730 verbal. I've also taken 5 AP classes."
Output: { sat_total: 1450, sat_math: 720, sat_verbal: 730, ap_count: 5 }`;

/**
 * Extract structured assessment data from student's message using GPT-4o
 *
 * @param studentMessage - The student's response/message
 * @param conversationHistory - Previous conversation context (optional)
 * @returns Extracted structured data, or empty object if nothing extracted
 */
export async function extractAssessmentDataGPT(
  studentMessage: string,
  conversationHistory?: string
): Promise<ExtractedAssessmentData> {
  try {
    console.log('\n========== GPT-4o ASSESSMENT EXTRACTION START ==========');
    console.log('[GPT4o_EXTRACT] Student message:', studentMessage);

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // Add conversation history if provided
    if (conversationHistory) {
      messages.push({
        role: "user",
        content: `Previous conversation context:\n${conversationHistory}\n\nNow extract data from the latest student response below.`
      });
    }

    messages.push({
      role: "user",
      content: `Extract all assessment data from this student response:\n\n"${studentMessage}"`
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Latest GPT-4o with function calling support
      messages,
      tools: EXTRACTION_TOOLS,
      tool_choice: { type: "function", function: { name: "extract_assessment_data" } },
      temperature: 0, // Deterministic extraction
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "extract_assessment_data") {
      console.log('[GPT4o_EXTRACT] ⚠️ No tool call returned');
      console.log('========== GPT-4o ASSESSMENT EXTRACTION END ==========\n');
      return {};
    }

    const extractedData = JSON.parse(toolCall.function.arguments) as ExtractedAssessmentData;

    console.log('[GPT4o_EXTRACT] ✅ Extracted data:', extractedData);
    console.log('[GPT4o_EXTRACT] Extraction count:', Object.keys(extractedData).length);
    console.log('========== GPT-4o ASSESSMENT EXTRACTION END ==========\n');

    return extractedData;

  } catch (error) {
    console.error('[GPT4o_EXTRACT] ❌ Error during extraction:', error);
    console.error('[GPT4o_EXTRACT] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.log('========== GPT-4o ASSESSMENT EXTRACTION END (ERROR) ==========\n');
    return {};
  }
}

/**
 * Validate and normalize extracted data
 * Ensures data meets database constraints and business rules
 */
export function validateAndNormalizeData(data: ExtractedAssessmentData): ExtractedAssessmentData {
  const normalized: ExtractedAssessmentData = {};

  // Validate GPA (0.0 - 5.0)
  if (data.gpa !== undefined && data.gpa >= 0 && data.gpa <= 5.0) {
    normalized.gpa = data.gpa;
    // Auto-detect weighted if > 4.0
    normalized.gpa_type = data.gpa_type || (data.gpa > 4.0 ? "weighted" : "unweighted");
  }

  // Validate SAT (400 - 1600)
  if (data.sat_total !== undefined && data.sat_total >= 400 && data.sat_total <= 1600) {
    normalized.sat_total = data.sat_total;
  }

  if (data.sat_math !== undefined && data.sat_math >= 200 && data.sat_math <= 800) {
    normalized.sat_math = data.sat_math;
  }

  if (data.sat_verbal !== undefined && data.sat_verbal >= 200 && data.sat_verbal <= 800) {
    normalized.sat_verbal = data.sat_verbal;
  }

  // Validate ACT (1 - 36)
  if (data.act_composite !== undefined && data.act_composite >= 1 && data.act_composite <= 36) {
    normalized.act_composite = data.act_composite;
  }

  // Validate AP count (0 - 20 reasonable max)
  if (data.ap_count !== undefined && data.ap_count >= 0 && data.ap_count <= 20) {
    normalized.ap_count = data.ap_count;
  }

  // Validate grade level (9-12)
  if (data.grade !== undefined && data.grade >= 9 && data.grade <= 12) {
    normalized.grade = data.grade;
  }

  // Pass through other fields
  if (data.class_rank !== undefined) normalized.class_rank = data.class_rank;
  if (data.class_rank_total !== undefined) normalized.class_rank_total = data.class_rank_total;
  if (data.high_school) normalized.high_school = data.high_school;
  if (data.target_major) normalized.target_major = data.target_major;
  if (data.target_colleges) normalized.target_colleges = data.target_colleges;
  if (data.personality_type) normalized.personality_type = data.personality_type;
  if (data.friend_group_size) normalized.friend_group_size = data.friend_group_size;
  if (data.friend_group_dynamic) normalized.friend_group_dynamic = data.friend_group_dynamic;
  if (data.interests) normalized.interests = data.interests;
  if (data.activities) normalized.activities = data.activities;
  if (data.leadership_roles) normalized.leadership_roles = data.leadership_roles;
  if (data.career_goals) normalized.career_goals = data.career_goals;
  if (data.motivations) normalized.motivations = data.motivations;

  return normalized;
}

// ============================================================================
// GPT-4o Student Engagement Analysis
// v27.0: Replaces regex-based pattern matching with LLM understanding
// ============================================================================

export interface StudentEngagementAnalysis {
  engagement_level: 'high' | 'medium' | 'low';
  confidence_score: number; // 0-10
  emotional_signals: string[];
  reasoning: string;
  synthesis_readiness: boolean;
}

const ENGAGEMENT_ANALYSIS_SYSTEM_PROMPT = `You are an expert at analyzing student engagement in college admissions coaching conversations.

Your task: Analyze the student's recent responses to determine their engagement level and readiness for identity synthesis.

Engagement Levels (based on 8+ real coaching transcripts):

HIGH ENGAGEMENT:
- Enthusiastic language ("I really want to...", "I love...", "I'm excited about...")
- Specific details and examples
- Questions showing curiosity
- Emotional investment in topic
- Multi-sentence responses with depth
Examples from transcripts:
- "Yeah, I really want to tie my two passions together!" (Huda)
- "That's so cool! Can you tell me more about that program?" (Aaryan)

MEDIUM ENGAGEMENT:
- Polite but not enthusiastic
- Answers questions directly without elaboration
- Shows some interest but not passionate
- Short responses (1-2 sentences)
Examples from transcripts:
- "That sounds interesting" (neutral acknowledgment)
- "I think so" (agreement without enthusiasm)

LOW ENGAGEMENT:
- Generic responses: "not really", "I don't know", "maybe", "sure", "okay"
- One-word answers
- No emotional markers
- Passive agreement without specifics
- Autopilot responses (just answering to answer)
Examples from transcripts:
- "not really" (Aarnav - 15+ times in 30 minutes)
- "sure" "okay" "yeah" (passive agreement)

Return engagement analysis with confidence score (0-10) and specific signals detected.`;

const ENGAGEMENT_ANALYSIS_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_student_engagement",
      description: "Analyze student's engagement level based on their recent responses in the assessment conversation",
      parameters: {
        type: "object",
        properties: {
          engagement_level: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Overall engagement level: high (enthusiastic, specific, passionate), medium (interested but not enthusiastic), low (generic, autopilot, disengaged)"
          },
          confidence_score: {
            type: "number",
            description: "Confidence in the synthesis being accurate (0-10). High=8-10 (multiple interests, clear passion), Medium=5-7 (some clarity), Low=0-4 (vague, no passion detected)"
          },
          emotional_signals: {
            type: "array",
            items: { type: "string" },
            description: "List of specific emotional/engagement signals detected in responses (e.g., 'enthusiastic language', 'specific examples', 'genuine curiosity', 'generic responses', 'one-word answers')"
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of why this engagement level was assigned, referencing specific patterns in student responses"
          },
          synthesis_readiness: {
            type: "boolean",
            description: "Is student ready for identity synthesis? True if engagement is medium-high AND enough data collected. False if still discovering or disengaged."
          }
        },
        required: ["engagement_level", "confidence_score", "emotional_signals", "reasoning", "synthesis_readiness"]
      }
    }
  }
];

/**
 * v27.0: GPT-4o-based engagement analysis
 * Replaces regex pattern matching with real understanding of student's emotional state
 *
 * Used to determine:
 * 1. Which synthesis follow-up pattern to use (high/medium/low confidence)
 * 2. Whether to switch from discovery mode to prescriptive mode
 * 3. Synthesis readiness
 */
export async function analyzeStudentEngagement(
  recentResponses: Array<{role: string; content: string}>,
  dataCollected: Record<string, any>
): Promise<StudentEngagementAnalysis> {
  try {
    console.log('\n========== GPT-4o ENGAGEMENT ANALYSIS START ==========');

    // Safety check: If no conversation history, return medium engagement as default
    if (!recentResponses || recentResponses.length === 0) {
      console.log('[GPT4o_ENGAGEMENT] ⚠️ No conversation history available, returning default medium engagement');
      return {
        engagement_level: 'medium',
        confidence_score: 5,
        emotional_signals: ['no_conversation_history'],
        reasoning: 'No conversation history available for analysis',
        synthesis_readiness: true, // Allow synthesis to proceed
      };
    }

    const conversationContext = recentResponses
      .map(r => `${r.role.toUpperCase()}: ${r.content}`)
      .join('\n');

    const dataContext = `
Data collected so far:
- Grade: ${dataCollected.grade || 'not provided'}
- School: ${dataCollected.high_school || 'not provided'}
- Interests: ${dataCollected.interests?.join(', ') || 'none yet'}
- Target Major: ${dataCollected.target_major || 'not provided'}
- Activities: ${dataCollected.activities?.join(', ') || 'none yet'}
`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: ENGAGEMENT_ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze this student's engagement level from their recent responses:\n\n${conversationContext}\n\n${dataContext}\n\nProvide engagement analysis.`
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: ENGAGEMENT_ANALYSIS_TOOLS,
      tool_choice: { type: "function", function: { name: "analyze_student_engagement" } },
      temperature: 0.3, // Slight creativity for nuanced analysis
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "analyze_student_engagement") {
      console.log('[GPT4o_ENGAGEMENT] ⚠️ No tool call returned, defaulting to medium engagement');
      return {
        engagement_level: 'medium',
        confidence_score: 5,
        emotional_signals: ['no_analysis_available'],
        reasoning: 'GPT analysis unavailable, using default',
        synthesis_readiness: false,
      };
    }

    const analysis = JSON.parse(toolCall.function.arguments) as StudentEngagementAnalysis;

    console.log('[GPT4o_ENGAGEMENT] ✅ Analysis:', analysis);
    console.log('========== GPT-4o ENGAGEMENT ANALYSIS END ==========\n');

    return analysis;

  } catch (error) {
    console.error('[GPT4o_ENGAGEMENT] ❌ Error during analysis:', error);
    console.log('========== GPT-4o ENGAGEMENT ANALYSIS END (ERROR) ==========\n');

    // Fallback to medium engagement
    return {
      engagement_level: 'medium',
      confidence_score: 5,
      emotional_signals: ['analysis_error'],
      reasoning: 'Error during analysis, using default medium engagement',
      synthesis_readiness: false,
    };
  }
}
