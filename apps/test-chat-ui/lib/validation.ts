/**
 * Request validation for unified chat API
 */

export interface ChatRequest {
  message: string;
  student_id: string;
  week?: number;
  context?: {
    session_id?: string;
    history?: Array<{ role: string; content: string }>;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validateRequest(body: any): ValidationResult {
  const errors: string[] = [];

  if (!body) {
    return { valid: false, errors: ["Request body is required"] };
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    errors.push("message is required and must be a non-empty string");
  }

  if (typeof body.student_id !== "string" || !body.student_id.trim()) {
    errors.push("student_id is required and must be a non-empty string");
  }

  if (body.week !== undefined) {
    if (typeof body.week !== "number" || body.week < 0 || body.week > 52) {
      errors.push("week must be a number between 0 and 52");
    }
  }

  if (body.context !== undefined) {
    if (typeof body.context !== "object") {
      errors.push("context must be an object");
    } else {
      if (body.context.session_id !== undefined && typeof body.context.session_id !== "string") {
        errors.push("context.session_id must be a string");
      }
      if (body.context.history !== undefined) {
        if (!Array.isArray(body.context.history)) {
          errors.push("context.history must be an array");
        } else {
          for (let i = 0; i < body.context.history.length; i++) {
            const msg = body.context.history[i];
            if (!msg.role || !msg.content) {
              errors.push(`context.history[${i}] must have role and content fields`);
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
