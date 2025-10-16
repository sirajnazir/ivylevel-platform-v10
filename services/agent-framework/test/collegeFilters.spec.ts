import { extractCollegeFiltersGuardrail, extractScholarshipFiltersGuardrail } from '../src/intent/extractors/guardrails';

describe('UAPX college guardrails (v4.6.2b)', () => {
  test('accepted synonyms - "get into"', () => {
    const q = 'which colleges did I actually get into?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.decision_result).toBe('Accepted');
  });

  test('accepted synonyms - "admitted"', () => {
    const q = 'which colleges admitted me?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.decision_result).toBe('Accepted');
  });

  test('attending detection', () => {
    const q = 'which college am I attending?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });

  test('attending detection - "going to"', () => {
    const q = 'where am I going to college?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });

  test('reach waitlist phrasing', () => {
    const q = 'which reach schools waitlisted me?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.category).toBe('Reach');
    expect(f.decision_result).toBe('Waitlisted');
  });

  test('match accepted phrasing', () => {
    const q = 'which of my match schools accepted me?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.category).toBe('Match');
    expect(f.decision_result).toBe('Accepted');
  });

  test('plan normalization - EA', () => {
    const q = 'which schools did I get in EA?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.decision_plan).toBe('EA');
  });

  test('plan normalization - early action', () => {
    const q = 'which schools did I get in early action?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.decision_plan).toBe('EA');
  });

  test('rejected detection', () => {
    const q = 'which schools rejected me?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.decision_result).toBe('Rejected');
  });

  test('deferred detection', () => {
    const q = 'where was I deferred?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.decision_result).toBe('Deferred');
  });

  test('safety schools', () => {
    const q = 'which safety schools did I get into?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.category).toBe('Safety');
    expect(f.decision_result).toBe('Accepted');
  });

  test('respect existing LLM filters', () => {
    const q = 'show me colleges';
    const llmFilters = { decision_result: 'Accepted', category: 'Reach' };
    const f = extractCollegeFiltersGuardrail(q, llmFilters);
    expect(f.decision_result).toBe('Accepted');
    expect(f.category).toBe('Reach');
  });

  test('fill missing filters only', () => {
    const q = 'which reach schools did I get into?';
    const llmFilters = { decision_result: 'Waitlisted' }; // LLM got it wrong
    const f = extractCollegeFiltersGuardrail(q, llmFilters);
    expect(f.decision_result).toBe('Waitlisted'); // Respect LLM if valid
    expect(f.category).toBe('Reach'); // But fill missing ones
  });
});

describe('UAPX college guardrails v4.6.2c (attending/decided)', () => {
  test('decided to go → attending=true', () => {
    const q = 'which college did I finally decide to go?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });

  test('chose to attend → attending=true', () => {
    const q = 'which school did I choose to attend?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });

  test('enrolling/matriculating → attending=true', () => {
    const q = 'what college am I enrolling at?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });

  test('final choice → attending=true', () => {
    const q = 'show my final college choice';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });

  test('decided on regex pattern → attending=true', () => {
    const q = 'which college did I decide on?';
    const f = extractCollegeFiltersGuardrail(q, {});
    expect(f.attending).toBe(true);
  });
});

describe('UAPX scholarship guardrails (v4.6.2b)', () => {
  test('accepted/received detection', () => {
    const q = 'which scholarships did I receive?';
    const f = extractScholarshipFiltersGuardrail(q, {});
    expect(f.application_status).toBe('Accepted');
  });

  test('won detection', () => {
    const q = 'show me scholarships I won';
    const f = extractScholarshipFiltersGuardrail(q, {});
    expect(f.application_status).toBe('Accepted');
  });

  test('pending detection', () => {
    const q = 'which scholarships are pending?';
    const f = extractScholarshipFiltersGuardrail(q, {});
    expect(f.application_status).toBe('Applied');
  });

  test('waiting detection', () => {
    const q = 'what scholarships am I waiting to hear back from?';
    const f = extractScholarshipFiltersGuardrail(q, {});
    expect(f.application_status).toBe('Applied');
  });

  test('rejected detection', () => {
    const q = 'which scholarships rejected me?';
    const f = extractScholarshipFiltersGuardrail(q, {});
    expect(f.application_status).toBe('Rejected');
  });
});
