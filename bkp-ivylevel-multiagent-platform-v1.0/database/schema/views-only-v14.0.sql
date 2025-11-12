CREATE VIEW compat.v_academics_latest AS
 SELECT vital_facts.student_id,
    max(
        CASE
            WHEN (vital_facts.kind = 'sat_total_score'::text) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS sat_total,
    max(
        CASE
            WHEN (vital_facts.kind = 'sat_math'::text) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS sat_math,
    max(
        CASE
            WHEN (vital_facts.kind = 'sat_ebrw'::text) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS sat_ebrw,
    max(
        CASE
            WHEN ((vital_facts.kind = 'act_composite'::text) AND (vital_facts.numeric_value IS NOT NULL)) THEN vital_facts.numeric_value
            ELSE NULL::integer
        END) AS act_composite,
    max(
        CASE
            WHEN (vital_facts.kind = 'gpa_weighted'::text) THEN compat.try_num(vital_facts.value)
            ELSE NULL::numeric
        END) AS gpa_weighted,
    max(
        CASE
            WHEN (vital_facts.kind = 'gpa_unweighted'::text) THEN compat.try_num(vital_facts.value)
            ELSE NULL::numeric
        END) AS gpa_unweighted,
    count(DISTINCT
        CASE
            WHEN ((vital_facts.kind = 'ap_score'::text) AND ((compat.try_num(vital_facts.value) >= (1)::numeric) AND (compat.try_num(vital_facts.value) <= (5)::numeric))) THEN vital_facts.fact_id
            ELSE NULL::uuid
        END) AS ap_count,
    now() AS computed_at
   FROM public.vital_facts
  GROUP BY vital_facts.student_id;


--
-- Name: VIEW v_academics_latest; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_academics_latest IS 'Latest academic vitals (SAT, ACT, GPA, AP count) from vital_facts';


--
-- Name: v_academics_series; Type: VIEW; Schema: compat; Owner: -
--
CREATE VIEW compat.v_academics_series AS
 SELECT vf.student_id,
    vf.fact_date AS as_of,
        CASE
            WHEN (vf.kind = 'sat_total_score'::text) THEN 'sat_total'::text
            WHEN (vf.kind = 'sat_math'::text) THEN 'sat_math'::text
            WHEN (vf.kind = 'sat_ebrw'::text) THEN 'sat_ebrw'::text
            WHEN (vf.kind = 'act_composite'::text) THEN 'act_composite'::text
            WHEN (vf.kind = 'gpa_weighted'::text) THEN 'gpa_weighted'::text
            WHEN (vf.kind = 'gpa_unweighted'::text) THEN 'gpa_unweighted'::text
            WHEN (vf.kind = 'ap_score'::text) THEN 'ap_score'::text
            ELSE NULL::text
        END AS metric,
    COALESCE((vf.numeric_value)::numeric, compat.try_num(vf.value)) AS value_num,
    vf.value AS value_text,
    jsonb_build_object('confidence', (vf.confidence)::text, 'modality', vf.modality, 'unit', vf.unit) AS meta,
    vf.source_id,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE ((vf.kind = ANY (ARRAY['sat_total_score'::text, 'sat_math'::text, 'sat_ebrw'::text, 'act_composite'::text, 'gpa_weighted'::text, 'gpa_unweighted'::text, 'ap_score'::text])) AND ((vf.numeric_value IS NOT NULL) OR (compat.try_num(vf.value) IS NOT NULL)));


--
-- Name: VIEW v_academics_series; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_academics_series IS 'Time-series academic data (SAT/ACT/GPA progression) from vital_facts';


--
-- Name: v_awards_final; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_awards_final AS
 SELECT DISTINCT ON (vf.student_id, vf.value) vf.student_id,
    vf.value AS award_name,
    vf.fact_date AS won_date,
    vf.source_id,
    vf.confidence,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE (vf.kind = 'award_won'::text)
  ORDER BY vf.student_id, vf.value, vf.fact_date DESC;


--
-- Name: VIEW v_awards_final; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_awards_final IS 'Final/won awards from vital_facts';


--
-- Name: v_kb_items; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_kb_items AS
 SELECT vf.student_id,
        CASE
            WHEN (vf.kind ~~ 'ec:%'::text) THEN 'ec'::text
            WHEN (vf.kind ~~ 'program:%'::text) THEN 'program'::text
            WHEN (vf.kind ~~ 'award:%'::text) THEN 'award'::text
            ELSE 'fact'::text
        END AS item_type,
    split_part(vf.kind, ':'::text, 2) AS item_key,
    vf.value AS item_value,
    vf.fact_date AS as_of,
    jsonb_build_object('confidence', (vf.confidence)::text, 'modality', vf.modality, 'kind', vf.kind) AS meta,
    vf.source_id,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE ((vf.kind ~~ 'ec:%'::text) OR (vf.kind ~~ 'program:%'::text) OR (vf.kind ~~ 'award:%'::text));


--
-- Name: VIEW v_kb_items; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_kb_items IS 'ECs, programs, awards from vital_facts, compatible with v3.0 kb_items schema';


--
-- Name: v_outcomes; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_outcomes AS
 SELECT vf.student_id,
    'award_won'::text AS outcome_type,
    vf.value AS title,
    NULL::text AS tier,
    vf.fact_date AS occurred_at,
    jsonb_build_object('confidence', (vf.confidence)::text, 'modality', vf.modality, 'unit', vf.unit) AS meta,
    vf.source_id,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE (vf.kind = 'award_won'::text);


--
-- Name: VIEW v_outcomes; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_outcomes IS 'Awards won from vital_facts, compatible with v3.0 outcomes table schema';


--
-- Name: v_sat_timeline; Type: VIEW; Schema: compat; Owner: -
--

CREATE VIEW compat.v_sat_timeline AS
 SELECT vf.student_id,
    vf.numeric_value AS total_score,
    vf.fact_date,
    vf.source_id,
    vf.confidence,
    row_number() OVER (PARTITION BY vf.student_id ORDER BY vf.fact_date) AS attempt_number,
    vf.created_ts
   FROM public.vital_facts vf
  WHERE ((vf.kind = 'sat_total_score'::text) AND (vf.numeric_value IS NOT NULL))
  ORDER BY vf.student_id, vf.fact_date;


--
-- Name: VIEW v_sat_timeline; Type: COMMENT; Schema: compat; Owner: -
--

COMMENT ON VIEW compat.v_sat_timeline IS 'SAT scores with temporal ordering (attempt 1, 2, 3...) from vital_facts';


--
-- Name: academic_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_courses (
    course_id text NOT NULL,
    student_id text NOT NULL,
    term_id text NOT NULL,
    course_code text,
    subject_area text,
    course_title text NOT NULL,
    level text,
    source_id text NOT NULL,
    confidence text DEFAULT 'medium'::text NOT NULL,
    created_ts timestamp with time zone DEFAULT now(),
    updated_ts timestamp with time zone DEFAULT now(),
    CONSTRAINT academic_courses_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: academic_gpa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_gpa (
    gpa_id text NOT NULL,
    student_id text NOT NULL,
    scope text NOT NULL,
    scope_key text,
    gpa_unweighted numeric,
    gpa_weighted numeric,
--
CREATE VIEW public.eq_cue_summary AS
 SELECT ss.student_id,
    ss.phase,
    s.cue,
    count(*) AS signal_count,
    avg(s.strength) AS avg_strength,
    array_agg(DISTINCT s.exemplar) FILTER (WHERE (s.exemplar IS NOT NULL)) AS exemplars
   FROM (public.eq_signals s
     JOIN public.eq_signal_sets ss ON ((s.set_id = ss.id)))
  GROUP BY ss.student_id, ss.phase, s.cue;


--
-- Name: VIEW eq_cue_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_cue_summary IS 'Aggregated cue statistics per student/phase';


--
-- Name: eq_cues_by_source; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_cues_by_source AS
 SELECT
        CASE
            WHEN (ss.source_path ~~ '%imsg%'::text) THEN 'imsg'::text
            WHEN (ss.source_path ~~ '%session%'::text) THEN 'sessions'::text
            ELSE 'unknown'::text
        END AS source_type,
    s.cue AS cue_type,
    count(*) AS signal_count,
    avg(s.strength) AS avg_strength,
    count(DISTINCT ss.id) AS n_files
   FROM (public.eq_signals s
     JOIN public.eq_signal_sets ss ON ((s.set_id = ss.id)))
  GROUP BY
        CASE
            WHEN (ss.source_path ~~ '%imsg%'::text) THEN 'imsg'::text
            WHEN (ss.source_path ~~ '%session%'::text) THEN 'sessions'::text
            ELSE 'unknown'::text
        END, s.cue;


--
-- Name: VIEW eq_cues_by_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_cues_by_source IS 'Cue distribution by source type (imsg/sessions)';


--
-- Name: eq_signal_cues; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_signal_cues AS
 SELECT s.id AS signal_id,
    s.set_id,
    s.cue AS cue_type,
    s.strength AS score,
    s.exemplar,
    s.provenance
   FROM public.eq_signals s;


--
-- Name: VIEW eq_signal_cues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_signal_cues IS 'Compatibility view: maps eq_signals to cue-focused format';


--
-- Name: eq_utterances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eq_utterances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid,
    speaker text,
    text text,
    move_type text,
    cues jsonb,
    provenance jsonb
);


--
-- Name: TABLE eq_utterances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.eq_utterances IS 'Turn-level conversation spans with style annotations';


--
-- Name: eq_signal_tactics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_signal_tactics AS
 SELECT u.id AS utterance_id,
    u.set_id AS signal_id,
    u.move_type AS tactic_type,
    u.speaker,
    u.text,
    u.cues,
    u.provenance
   FROM public.eq_utterances u
  WHERE (u.move_type IS NOT NULL);


--
-- Name: VIEW eq_signal_tactics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_signal_tactics IS 'Compatibility view: maps eq_utterances to tactic-focused format';


--
-- Name: eq_tactics_by_student; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.eq_tactics_by_student AS
 SELECT ss.student_id,
    ss.phase,
    u.move_type AS tactic_type,
    count(*) AS usage_count,
    array_agg("left"(u.text, 100)) AS sample_texts
   FROM (public.eq_utterances u
     JOIN public.eq_signal_sets ss ON ((u.set_id = ss.id)))
  WHERE (u.move_type IS NOT NULL)
  GROUP BY ss.student_id, ss.phase, u.move_type;


--
-- Name: VIEW eq_tactics_by_student; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.eq_tactics_by_student IS 'Tactic usage patterns per student/phase';


--
-- Name: evidence_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidence_links (
    evidence_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    source_id text NOT NULL,
    snippet_id text,
    offset_start integer,
    offset_end integer,
    quote text,
    created_ts timestamp with time zone DEFAULT now()
);


--
-- Name: fact_kind_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kind_rules (
    kind text NOT NULL,
    datatype public.fact_datatype NOT NULL,
    min_numeric double precision,
    max_numeric double precision,
    enum_values text[],
    regex text,
    unit text,
    prefer_confidence boolean DEFAULT true,
    freshness_half_life_d integer DEFAULT 365,
    source_priority jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
--
CREATE VIEW public.facts_normalized AS
 SELECT f.fact_id,
    f.student_id,
    f.kind,
    f.value,
    f.unit,
    f.fact_date,
    f.source_id,
    f.created_ts,
    f.confidence,
    r.datatype,
        CASE
            WHEN (r.datatype = 'int'::public.fact_datatype) THEN
            CASE
                WHEN (f.value ~ '^\d+$'::text) THEN ((f.value)::bigint)::text
                WHEN (f.value ~ '^\d+\.\d+$'::text) THEN ((round((f.value)::numeric))::bigint)::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'float'::public.fact_datatype) THEN
            CASE
                WHEN (f.value ~ '^\d+(\.\d+)?$'::text) THEN ((f.value)::double precision)::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'boolean'::public.fact_datatype) THEN
            CASE
                WHEN (lower(f.value) = ANY (ARRAY['true'::text, 'false'::text, '1'::text, '0'::text, 'yes'::text, 'no'::text, 't'::text, 'f'::text, 'y'::text, 'n'::text])) THEN ((lower(f.value) = ANY (ARRAY['true'::text, '1'::text, 'yes'::text, 't'::text, 'y'::text])))::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'date'::public.fact_datatype) THEN
            CASE
                WHEN (f.value ~ '^\d{4}-\d{2}-\d{2}'::text) THEN ((f.value)::date)::text
                ELSE NULL::text
            END
            WHEN (r.datatype = 'enum'::public.fact_datatype) THEN f.value
            ELSE f.value
        END AS normalized_value,
        CASE
            WHEN (r.kind IS NULL) THEN false
            WHEN (r.datatype = ANY (ARRAY['int'::public.fact_datatype, 'float'::public.fact_datatype])) THEN
            CASE
                WHEN (f.value ~ '^\d+(\.\d+)?$'::text) THEN (((r.min_numeric IS NULL) OR (((f.value)::numeric)::double precision >= r.min_numeric)) AND ((r.max_numeric IS NULL) OR (((f.value)::numeric)::double precision <= r.max_numeric)))
                ELSE false
            END
            WHEN (r.datatype = 'boolean'::public.fact_datatype) THEN (lower(f.value) = ANY (ARRAY['true'::text, 'false'::text, '1'::text, '0'::text, 'yes'::text, 'no'::text, 't'::text, 'f'::text, 'y'::text, 'n'::text]))
            WHEN (r.datatype = 'date'::public.fact_datatype) THEN (f.value ~ '^\d{4}-\d{2}-\d{2}'::text)
            WHEN (r.datatype = 'enum'::public.fact_datatype) THEN ((r.enum_values IS NULL) OR (f.value = ANY (r.enum_values)))
            WHEN (r.datatype = 'string'::public.fact_datatype) THEN ((r.regex IS NULL) OR (f.value ~ r.regex))
            ELSE false
        END AS is_valid,
        CASE
            WHEN (r.kind IS NULL) THEN ('Unknown fact kind: '::text || f.kind)
--
CREATE VIEW public.fact_invalid_examples AS
 SELECT facts_normalized.kind,
    facts_normalized.student_id,
    facts_normalized.value AS invalid_value,
    facts_normalized.validation_error,
    facts_normalized.source_id,
    facts_normalized.fact_date
   FROM public.facts_normalized
  WHERE (facts_normalized.is_valid = false)
  ORDER BY facts_normalized.fact_date DESC
 LIMIT 100;


--
-- Name: fact_kinds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_kinds (
    kind text NOT NULL,
    description text
);


--
-- Name: fact_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fact_observations (
    obs_id text NOT NULL,
    student_id text NOT NULL,
    kind text NOT NULL,
    value_numeric numeric,
    value_text text,
    unit text,
    is_official boolean DEFAULT false NOT NULL,
    is_practice boolean DEFAULT false NOT NULL,
    attempt_no integer,
    event_date date NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source_id text NOT NULL,
    confidence text NOT NULL,
    origin text NOT NULL,
    dedupe_fingerprint text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT fact_observations_confidence_check CHECK ((confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);


--
-- Name: fact_priorities; Type: TABLE; Schema: public; Owner: -
--
--
CREATE VIEW public.fact_quality_report AS
 SELECT facts_normalized.kind,
    count(*) FILTER (WHERE (facts_normalized.is_valid = true)) AS valid_count,
    count(*) FILTER (WHERE (facts_normalized.is_valid = false)) AS invalid_count,
    round(((100.0 * (count(*) FILTER (WHERE (facts_normalized.is_valid = true)))::numeric) / (NULLIF(count(*), 0))::numeric), 2) AS validity_pct,
    array_agg(DISTINCT facts_normalized.validation_error ORDER BY facts_normalized.validation_error) FILTER (WHERE (facts_normalized.validation_error IS NOT NULL)) AS error_types
   FROM public.facts_normalized
  GROUP BY facts_normalized.kind
  ORDER BY (count(*) FILTER (WHERE (facts_normalized.is_valid = false))) DESC, facts_normalized.kind;


--
-- Name: factor_feature_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factor_feature_map (
    rubric_id text NOT NULL,
    factor_id text NOT NULL,
    feature_id text NOT NULL,
    weight_pct numeric NOT NULL
);


--
-- Name: facts_normalized_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.facts_normalized_mv AS
 SELECT facts_normalized.fact_id,
    facts_normalized.student_id,
    facts_normalized.kind,
    facts_normalized.value,
    facts_normalized.unit,
    facts_normalized.fact_date,
    facts_normalized.source_id,
    facts_normalized.created_ts,
    facts_normalized.confidence,
    facts_normalized.datatype,
    facts_normalized.normalized_value,
    facts_normalized.is_valid,
    facts_normalized.validation_error
   FROM public.facts_normalized
  WITH NO DATA;


--
-- Name: feature_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_defs (
    feature_id text NOT NULL,
--
CREATE VIEW public.recent_traces AS
SELECT
    NULL::uuid AS id,
    NULL::text AS session_id,
    NULL::text AS student_id,
    NULL::text AS message,
    NULL::text AS intent,
    NULL::text[] AS detected_fact_kinds,
    NULL::timestamp with time zone AS start_time,
    NULL::integer AS duration_ms,
    NULL::text AS model_used,
    NULL::text AS error,
    NULL::bigint AS event_count,
    NULL::bigint AS api_providers_used;


--
-- Name: sat_timeline_enum; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sat_timeline_enum (
    id bigint NOT NULL,
    student_id text NOT NULL,
    as_of date NOT NULL,
    numeric_value integer NOT NULL,
    type text,
    confidence text,
    source_id text,
    raw_name text,
    raw_value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE sat_timeline_enum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sat_timeline_enum IS 'SAT score timeline from Facts.csv with temporal ordering';


--
-- Name: sat_timeline_enum_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sat_timeline_enum_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
--
CREATE VIEW public.v_academics_latest AS
 SELECT DISTINCT ON (academics_vitals.student_id) academics_vitals.student_id,
    academics_vitals.week_no,
    academics_vitals.as_of_date,
    academics_vitals.gpa_unweighted,
    academics_vitals.gpa_weighted,
    academics_vitals.ap_count_cum,
    academics_vitals.honors_count_cum,
    academics_vitals.core_stem_load,
    academics_vitals.workload_hours_week
   FROM public.academics_vitals
  ORDER BY academics_vitals.student_id, academics_vitals.week_no DESC;


--
-- Name: VIEW v_academics_latest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_academics_latest IS 'Latest academic vitals for quick lookups';


--
-- Name: v_gpa_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_latest AS
 SELECT DISTINCT ON (academic_gpa.student_id, academic_gpa.scope, academic_gpa.scope_key) academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, academic_gpa.scope, academic_gpa.scope_key, (academic_gpa.source_id = 'SRC-COMMONAPP-UNC'::text) DESC, academic_gpa.confidence DESC, academic_gpa.recorded_at DESC;


--
-- Name: v_academics_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_academics_overview AS
 WITH sat_progress AS (
         SELECT sat_timeline_enum.student_id,
            sat_timeline_enum.as_of AS sat_date,
            sat_timeline_enum.numeric_value AS sat_score,
            sat_timeline_enum.type,
            sat_timeline_enum.confidence,
            sat_timeline_enum.source_id
           FROM public.sat_timeline_enum
        )
 SELECT g.student_id,
    g.scope,
    g.scope_key,
    g.gpa_unweighted,
    g.gpa_weighted,
    g.recorded_at AS gpa_recorded_at,
    g.source_id AS gpa_source,
    s.sat_date,
    s.sat_score,
    s.type AS sat_type,
    s.source_id AS sat_source
   FROM (public.v_gpa_latest g
     LEFT JOIN sat_progress s ON ((s.student_id = g.student_id)))
  ORDER BY g.student_id, g.recorded_at DESC, s.sat_date;


--
-- Name: v_academics_trend; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_academics_trend AS
 SELECT academics_vitals.student_id,
    min(academics_vitals.week_no) AS first_week,
    max(academics_vitals.week_no) AS last_week,
    min(academics_vitals.gpa_unweighted) FILTER (WHERE (academics_vitals.gpa_unweighted IS NOT NULL)) AS gpa_u_min,
    max(academics_vitals.gpa_unweighted) FILTER (WHERE (academics_vitals.gpa_unweighted IS NOT NULL)) AS gpa_u_max,
    min(academics_vitals.gpa_weighted) FILTER (WHERE (academics_vitals.gpa_weighted IS NOT NULL)) AS gpa_w_min,
    max(academics_vitals.gpa_weighted) FILTER (WHERE (academics_vitals.gpa_weighted IS NOT NULL)) AS gpa_w_max,
    max(academics_vitals.ap_count_cum) AS ap_max,
    count(*) AS weeks_recorded
   FROM public.academics_vitals
  GROUP BY academics_vitals.student_id;


--
-- Name: VIEW v_academics_trend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_academics_trend IS 'Academic trend aggregates (min/max GPA, AP count) for analysis';


--
-- Name: v_awards_won; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_won AS
 SELECT outcomes.student_id,
    COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'label'::text), (outcomes.details_json ->> 'title'::text), '(award)'::text) AS award_name,
    COALESCE((outcomes.details_json ->> 'tier'::text), (outcomes.details_json ->> 'level'::text)) AS tier,
    (outcomes.occurred_at)::date AS won_date,
    outcomes.source_id,
    (outcomes.outcome_id)::text AS chip_id,
    'outcomes'::text AS chip_table
   FROM public.outcomes
  WHERE (outcomes.type = 'achievement'::public.outcome_type);


--
-- Name: VIEW v_awards_won; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_won IS 'Awards won from final awards (alias of v_awards_final)';


--
-- Name: v_features_academics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_academics AS
 WITH latest_gpa_unweighted AS (
         SELECT DISTINCT ON (academic_gpa.student_id) academic_gpa.student_id,
            academic_gpa.gpa_id,
            academic_gpa.source_id,
            academic_gpa.gpa_unweighted,
            academic_gpa.recorded_at
           FROM public.academic_gpa
          WHERE (academic_gpa.gpa_unweighted IS NOT NULL)
          ORDER BY academic_gpa.student_id, academic_gpa.recorded_at DESC
        ), latest_gpa_weighted AS (
         SELECT DISTINCT ON (academic_gpa.student_id) academic_gpa.student_id,
            academic_gpa.gpa_id,
            academic_gpa.source_id,
            academic_gpa.gpa_weighted,
            academic_gpa.recorded_at
           FROM public.academic_gpa
          WHERE (academic_gpa.gpa_weighted IS NOT NULL)
          ORDER BY academic_gpa.student_id, academic_gpa.recorded_at DESC
        )
 SELECT latest_gpa_unweighted.student_id,
    'academic_gpa'::text AS chip_table,
    latest_gpa_unweighted.gpa_id AS chip_id,
    latest_gpa_unweighted.source_id,
    'academics'::text AS domain,
    'gpa_unweighted'::text AS feature_key,
    latest_gpa_unweighted.gpa_unweighted AS feature_value,
    latest_gpa_unweighted.recorded_at AS measured_at
   FROM latest_gpa_unweighted
UNION ALL
 SELECT latest_gpa_weighted.student_id,
    'academic_gpa'::text AS chip_table,
    latest_gpa_weighted.gpa_id AS chip_id,
    latest_gpa_weighted.source_id,
    'academics'::text AS domain,
    'gpa_weighted'::text AS feature_key,
    latest_gpa_weighted.gpa_weighted AS feature_value,
    latest_gpa_weighted.recorded_at AS measured_at
   FROM latest_gpa_weighted
UNION ALL
 SELECT academic_courses.student_id,
    'academic_courses'::text AS chip_table,
    academic_courses.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'academics'::text AS domain,
    'ap_courses_count'::text AS feature_key,
    (count(*))::numeric AS feature_value,
    max(academic_courses.updated_ts) AS measured_at
   FROM public.academic_courses
  WHERE (academic_courses.level = 'AP'::text)
  GROUP BY academic_courses.student_id;
--
CREATE VIEW public.v_features_awards AS
 SELECT v_awards_won.student_id,
    'v_awards_won'::text AS chip_table,
    v_awards_won.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'awards'::text AS domain,
    'national_awards_count'::text AS feature_key,
    (count(*) FILTER (WHERE (v_awards_won.tier = 'National'::text)))::numeric AS feature_value,
    max((v_awards_won.won_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_awards_won
  GROUP BY v_awards_won.student_id
UNION ALL
 SELECT v_awards_won.student_id,
    'v_awards_won'::text AS chip_table,
    v_awards_won.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'awards'::text AS domain,
    'regional_awards_count'::text AS feature_key,
    (count(*) FILTER (WHERE (v_awards_won.tier = 'Regional'::text)))::numeric AS feature_value,
    max((v_awards_won.won_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_awards_won
  GROUP BY v_awards_won.student_id
UNION ALL
 SELECT v_awards_won.student_id,
    'v_awards_won'::text AS chip_table,
    v_awards_won.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'awards'::text AS domain,
    'international_awards_count'::text AS feature_key,
    (count(*) FILTER (WHERE (v_awards_won.tier = 'International'::text)))::numeric AS feature_value,
    max((v_awards_won.won_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_awards_won
  GROUP BY v_awards_won.student_id;


--
-- Name: VIEW v_features_awards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_awards IS 'Awards features: Award counts by tier from v_awards_won';


--
-- Name: v_features_ecs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_ecs AS
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'ecs'::text AS domain,
    'leadership_roles_count'::text AS feature_key,
    (count(*) FILTER (WHERE ((kb_items.title_name ~~* '%president%'::text) OR (kb_items.title_name ~~* '%founder%'::text) OR (kb_items.title_name ~~* '%captain%'::text) OR (kb_items.title_name ~~* '%director%'::text))))::numeric AS feature_value,
    max(kb_items.updated_ts) AS measured_at
   FROM public.kb_items
  WHERE (kb_items.item_type = ANY (ARRAY['ec'::text, 'activity'::text]))
  GROUP BY kb_items.student_id
UNION ALL
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'ecs'::text AS domain,
    'scale_signal_ecs_count'::text AS feature_key,
    (count(*))::numeric AS feature_value,
    max(kb_items.updated_ts) AS measured_at
   FROM public.kb_items
  WHERE ((kb_items.item_type = ANY (ARRAY['ec'::text, 'activity'::text])) AND ((kb_items.key_metric_value IS NOT NULL) OR (kb_items.tier1_state IS NOT NULL)))
  GROUP BY kb_items.student_id;


--
-- Name: VIEW v_features_ecs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_ecs IS 'EC features: Leadership roles and scale signals from kb_items';


--
-- Name: v_features_narrative; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_narrative AS
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'narrative'::text AS domain,
    'essay_completeness_pct'::text AS feature_key,
    round((((count(*) FILTER (WHERE (kb_items.status_detail IS NOT NULL)))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS feature_value,
    max(kb_items.updated_ts) AS measured_at
   FROM public.kb_items
  WHERE (kb_items.item_type = 'narrative'::text)
  GROUP BY kb_items.student_id
UNION ALL
 SELECT kb_items.student_id,
    'kb_items'::text AS chip_table,
    kb_items.item_id AS chip_id,
    kb_items.source_ref AS source_id,
    'narrative'::text AS domain,
    'personal_statement_word_count'::text AS feature_key,
        CASE
            WHEN (kb_items.key_metric_value ~ '^[0-9]+$'::text) THEN (kb_items.key_metric_value)::numeric
            ELSE (0)::numeric
        END AS feature_value,
    kb_items.updated_ts AS measured_at
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'narrative'::text) AND (kb_items.title_name ~~* '%personal statement%'::text));


--
-- Name: VIEW v_features_narrative; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_narrative IS 'Narrative features: Essay completeness from kb_items';


--
-- Name: v_programs_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_final AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.title_name AS program_name,
    COALESCE(kb_items.status_detail, 'N/A'::text) AS provider,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.source_ref AS source_id,
    kb_items.item_id AS chip_id,
    'kb_items'::text AS chip_table
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'ec'::text) AND (kb_items.subtype = 'summer_program'::text) AND (kb_items.tier1_state = 'Submitted'::text));


--
-- Name: v_features_programs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_programs AS
 SELECT v_programs_final.student_id,
    'v_programs_final'::text AS chip_table,
    v_programs_final.student_id AS chip_id,
    'aggregate'::text AS source_id,
    'programs'::text AS domain,
    'acceptances_count'::text AS feature_key,
    (count(*))::numeric AS feature_value,
    max((v_programs_final.submit_date AT TIME ZONE 'UTC'::text)) AS measured_at
   FROM public.v_programs_final
  GROUP BY v_programs_final.student_id;


--
-- Name: VIEW v_features_programs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_programs IS 'Programs features: Summer program counts from v_programs_final';


--
-- Name: v_features_testing; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_testing AS
 SELECT DISTINCT ON (sat_timeline_enum.student_id) sat_timeline_enum.student_id,
    'sat_timeline_enum'::text AS chip_table,
    (sat_timeline_enum.id)::text AS chip_id,
    sat_timeline_enum.source_id,
    'testing'::text AS domain,
    'sat_composite'::text AS feature_key,
    (sat_timeline_enum.numeric_value)::numeric AS feature_value,
    (sat_timeline_enum.as_of AT TIME ZONE 'UTC'::text) AS measured_at
   FROM public.sat_timeline_enum
  WHERE ((sat_timeline_enum.type = 'official'::text) AND (sat_timeline_enum.numeric_value IS NOT NULL))
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of DESC;


--
-- Name: VIEW v_features_testing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_features_testing IS 'Testing features: Latest SAT score from sat_timeline_enum';


--
-- Name: v_features_all; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_features_all AS
 SELECT v_features_testing.student_id,
    v_features_testing.chip_table,
    v_features_testing.chip_id,
    v_features_testing.source_id,
    v_features_testing.domain,
    v_features_testing.feature_key,
    v_features_testing.feature_value,
    v_features_testing.measured_at
   FROM public.v_features_testing
UNION ALL
 SELECT v_features_awards.student_id,
    v_features_awards.chip_table,
    v_features_awards.chip_id,
    v_features_awards.source_id,
    v_features_awards.domain,
    v_features_awards.feature_key,
    v_features_awards.feature_value,
    v_features_awards.measured_at
   FROM public.v_features_awards
UNION ALL
 SELECT v_features_ecs.student_id,
    v_features_ecs.chip_table,
    v_features_ecs.chip_id,
    v_features_ecs.source_id,
    v_features_ecs.domain,
    v_features_ecs.feature_key,
    v_features_ecs.feature_value,
    v_features_ecs.measured_at
   FROM public.v_features_ecs
UNION ALL
 SELECT v_features_narrative.student_id,
    v_features_narrative.chip_table,
    v_features_narrative.chip_id,
    v_features_narrative.source_id,
    v_features_narrative.domain,
    v_features_narrative.feature_key,
    v_features_narrative.feature_value,
    v_features_narrative.measured_at
   FROM public.v_features_narrative
UNION ALL
 SELECT v_features_academics.student_id,
    v_features_academics.chip_table,
    v_features_academics.chip_id,
    v_features_academics.source_id,
    v_features_academics.domain,
    v_features_academics.feature_key,
    v_features_academics.feature_value,
    v_features_academics.measured_at
   FROM public.v_features_academics
UNION ALL
--
CREATE VIEW public.v_factor_scores_current AS
 WITH feature_values AS (
         SELECT v_features_all.student_id,
            v_features_all.domain,
            v_features_all.feature_key,
            v_features_all.feature_value
           FROM public.v_features_all
        ), academics_score AS (
         SELECT fv.student_id,
            'academics'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, ((COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'gpa_unweighted'::text))), (0)::numeric) * (25)::numeric) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'ap_courses_count'::text))), (0)::numeric) * (5)::numeric)))), 2) AS score,
            0.40 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), awards_score AS (
         SELECT fv.student_id,
            'awards'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, (((COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'international_awards_count'::text))), (0)::numeric) * (40)::numeric) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'national_awards_count'::text))), (0)::numeric) * (20)::numeric)) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'regional_awards_count'::text))), (0)::numeric) * (10)::numeric)))), 2) AS score,
            0.25 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), leadership_score AS (
         SELECT fv.student_id,
            'leadership'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, ((COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'leadership_roles_count'::text))), (0)::numeric) * (15)::numeric) + (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'scale_signal_ecs_count'::text))), (0)::numeric) * (10)::numeric)))), 2) AS score,
            0.20 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
        ), programs_score AS (
         SELECT fv.student_id,
            'programs'::text AS factor,
            round(LEAST((100)::numeric, GREATEST((0)::numeric, (COALESCE(( SELECT feature_values.feature_value
                   FROM feature_values
                  WHERE ((feature_values.student_id = fv.student_id) AND (feature_values.feature_key = 'acceptances_count'::text))), (0)::numeric) * (20)::numeric))), 2) AS score,
            0.10 AS weight
           FROM ( SELECT DISTINCT feature_values.student_id
                   FROM feature_values) fv
--
CREATE VIEW public.v_ivyready_current AS
 SELECT v_factor_scores_current.student_id,
    round(sum((v_factor_scores_current.score * v_factor_scores_current.weight)), 2) AS ivy_ready_score,
    jsonb_object_agg(v_factor_scores_current.factor, v_factor_scores_current.score ORDER BY v_factor_scores_current.factor) AS factor_breakdown,
    now() AS calculated_at
   FROM public.v_factor_scores_current
  GROUP BY v_factor_scores_current.student_id;


--
-- Name: VIEW v_ivyready_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ivyready_current IS 'Composite IvyReady score (0-100) with factor breakdown';


--
-- Name: v_action_ivyready_delta; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_action_ivyready_delta AS
 WITH base_scores AS (
         SELECT v_ivyready_current.student_id,
            v_ivyready_current.ivy_ready_score AS base_score,
            v_ivyready_current.factor_breakdown
           FROM public.v_ivyready_current
        ), sat_actions AS (
         SELECT bs.student_id,
            'raise_sat_to'::text AS action_type,
            (targets.target_sat)::text AS action_param,
            bs.base_score,
            round((bs.base_score + (((((targets.target_sat)::numeric / 1600.0) * (60)::numeric) - COALESCE((((bs.factor_breakdown ->> 'academics'::text))::numeric * 0.6), (0)::numeric)) * 0.40)), 2) AS projected_score,
            round((((((targets.target_sat)::numeric / 1600.0) * (60)::numeric) - COALESCE((((bs.factor_breakdown ->> 'academics'::text))::numeric * 0.6), (0)::numeric)) * 0.40), 2) AS delta
           FROM (base_scores bs
             CROSS JOIN ( SELECT generate_series(1200, 1600, 50) AS target_sat) targets)
        ), award_actions AS (
         SELECT bs.student_id,
            'win_award_tier'::text AS action_type,
            tiers.tier AS action_param,
            bs.base_score,
            round((bs.base_score + ((tiers.tier_bump)::numeric * 0.25)), 2) AS projected_score,
            round(((tiers.tier_bump)::numeric * 0.25), 2) AS delta
           FROM (base_scores bs
             CROSS JOIN ( VALUES ('International'::text,40), ('National'::text,20), ('Regional'::text,10)) tiers(tier, tier_bump))
        )
 SELECT sat_actions.student_id,
    sat_actions.action_type,
    sat_actions.action_param,
    sat_actions.base_score,
    sat_actions.projected_score,
    sat_actions.delta
   FROM sat_actions
UNION ALL
 SELECT award_actions.student_id,
    award_actions.action_type,
    award_actions.action_param,
    award_actions.base_score,
    award_actions.projected_score,
    award_actions.delta
   FROM award_actions;


--
-- Name: VIEW v_action_ivyready_delta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_action_ivyready_delta IS 'Pre-calculated what-if deltas for SAT targets and award tiers';


--
-- Name: v_applications_timeline; Type: VIEW; Schema: public; Owner: -
--
CREATE VIEW public.v_applications_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Application'::text)
  ORDER BY kb_items.student_id, COALESCE(kb_items.submit_date, kb_items.deadline_date);


--
-- Name: v_award_targets_asof; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_award_targets_asof AS
 SELECT at1.id,
    at1.student_id,
    at1.award_label,
    at1.tier,
    at1.rationale,
    at1.phase,
    at1.as_of,
    at1.confidence,
    at1.source_id,
    at1.created_at,
    at1.updated_at
   FROM (public.award_targets at1
     JOIN ( SELECT award_targets.student_id,
            max(award_targets.as_of) AS max_as_of
           FROM public.award_targets
          GROUP BY award_targets.student_id) last ON (((last.student_id = at1.student_id) AND (last.max_as_of = at1.as_of))));


--
-- Name: v_award_targets_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_award_targets_initial AS
 SELECT award_targets.id,
    award_targets.student_id,
    award_targets.award_label,
    award_targets.tier,
    award_targets.rationale,
    award_targets.phase,
    award_targets.as_of,
    award_targets.confidence,
    award_targets.source_id,
    award_targets.created_at,
    award_targets.updated_at
   FROM public.award_targets
  WHERE (award_targets.phase = 'initial'::text);


--
-- Name: v_award_targets_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_award_targets_summary AS
 SELECT award_targets.student_id,
    award_targets.phase,
    count(*) AS target_count,
    award_targets.as_of,
    string_agg(award_targets.award_label, '; '::text ORDER BY award_targets.award_label) AS awards_list,
    award_targets.source_id
   FROM public.award_targets
  GROUP BY award_targets.student_id, award_targets.phase, award_targets.as_of, award_targets.source_id;


--
-- Name: v_awards_enum_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_enum_final AS
 SELECT award_targets_enum.id,
    award_targets_enum.student_id,
    award_targets_enum.phase,
    award_targets_enum.item_label,
    award_targets_enum.as_of,
    award_targets_enum.source_id,
    award_targets_enum.jtbd_id,
    award_targets_enum.created_at,
    award_targets_enum.updated_at
   FROM public.award_targets_enum
  WHERE (award_targets_enum.phase = 'final'::text)
  ORDER BY award_targets_enum.as_of, award_targets_enum.item_label;


--
-- Name: v_awards_enum_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_enum_initial AS
 SELECT award_targets_enum.id,
    award_targets_enum.student_id,
    award_targets_enum.phase,
    award_targets_enum.item_label,
    award_targets_enum.as_of,
    award_targets_enum.source_id,
    award_targets_enum.jtbd_id,
    award_targets_enum.created_at,
    award_targets_enum.updated_at
   FROM public.award_targets_enum
  WHERE (award_targets_enum.phase = 'initial'::text)
  ORDER BY award_targets_enum.as_of, award_targets_enum.item_label;


--
-- Name: v_awards_enum_won; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_enum_won AS
 SELECT plan_events.student_id,
    plan_events.as_of,
    plan_events.text AS evidence,
    plan_events.source_id,
    plan_events.jtbd_id,
    plan_events.snippet_id
   FROM public.plan_events
  WHERE (plan_events.event = 'award_won'::text)
  ORDER BY plan_events.as_of;


--
-- Name: VIEW v_awards_enum_won; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_enum_won IS 'Awards won from execution timeline (plan_events)';


--
-- Name: v_awards_final_targets; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_final_targets AS
 SELECT award_targets.student_id,
    award_targets.award_label AS award_name,
    award_targets.tier,
    award_targets.rationale,
    (award_targets.as_of)::date AS as_of,
    award_targets.source_id,
    (award_targets.id)::text AS chip_id
   FROM public.award_targets
  WHERE (award_targets.phase = 'final'::text);


--
-- Name: v_awards_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_initial AS
 WITH base AS (
         SELECT award_targets_enum.student_id,
            award_targets_enum.item_label AS award_label,
            ''::text AS tier,
            ''::text AS rationale,
            award_targets_enum.as_of,
            award_targets_enum.source_id,
            NULL::text AS chip_id,
            public.canon_label(award_targets_enum.item_label) AS canon
           FROM public.award_targets_enum
          WHERE (award_targets_enum.phase = 'initial'::text)
        )
 SELECT DISTINCT ON (base.student_id, base.canon) base.student_id,
    base.award_label AS award_name,
    base.tier,
    base.rationale,
    base.as_of,
    base.source_id,
    base.chip_id
   FROM base
  ORDER BY base.student_id, base.canon, base.as_of DESC;


--
-- Name: VIEW v_awards_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_awards_initial IS 'Initial award targets with canonicalized label de-duplication';


--
-- Name: v_awards_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_awards_progression AS
 WITH t AS (
         SELECT award_targets.student_id,
            award_targets.award_label AS award_name,
            'target'::text AS phase,
            (award_targets.as_of)::date AS as_of,
            award_targets.source_id,
            (award_targets.id)::text AS chip_id,
            'award_targets'::text AS chip_table
           FROM public.award_targets
        ), w AS (
         SELECT outcomes.student_id,
            COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text), '(award)'::text) AS award_name,
            'won'::text AS phase,
            (outcomes.occurred_at)::date AS as_of,
            outcomes.source_id,
            (outcomes.outcome_id)::text AS chip_id,
            'outcomes'::text AS chip_table
           FROM public.outcomes
          WHERE ((outcomes.type)::text = 'award'::text)
        )
 SELECT u.student_id,
    u.award_name,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT t.student_id,
            t.award_name,
            t.phase,
            t.as_of,
            t.source_id,
            t.chip_id,
            t.chip_table
           FROM t
        UNION ALL
         SELECT w.student_id,
            w.award_name,
            w.phase,
            w.as_of,
            w.source_id,
            w.chip_id,
            w.chip_table
           FROM w) u
  ORDER BY u.student_id, u.award_name, u.as_of;


--
-- Name: VIEW v_awards_progression; Type: COMMENT; Schema: public; Owner: -
--
--
CREATE VIEW public.v_awards_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Award_Competition'::text)
  ORDER BY kb_items.student_id, COALESCE((kb_items.event_date)::timestamp with time zone, (kb_items.submit_date)::timestamp with time zone, (kb_items.outcome_date)::timestamp with time zone, (kb_items.deadline_date)::timestamp with time zone, kb_items.created_ts);


--
-- Name: v_college_readiness_correlation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_college_readiness_correlation AS
 SELECT c.student_id,
    c.college_name,
    c.bucket_category,
    c.decision_result,
    c.acceptance_rate,
    COALESCE(r.overall_score, (0)::numeric) AS ivyready_score_at_submit,
    rf.domain,
    rf.feature_key,
    rf.feature_value,
    (rf.feature_value / NULLIF(rfw.target_value, (0)::numeric)) AS relative_strength,
        CASE
            WHEN (c.decision_result = 'Accepted'::text) THEN (1)::numeric
            WHEN (c.decision_result = 'Waitlisted'::text) THEN 0.5
            ELSE (0)::numeric
        END AS acceptance_numeric
   FROM (((public.college_list c
     LEFT JOIN public.ivyready_snapshots r ON (((r.student_id = c.student_id) AND (r.snapshot_phase = 'final_submit'::text))))
     LEFT JOIN public.v_features_all rf ON ((rf.student_id = c.student_id)))
     LEFT JOIN public.readiness_feature_weights rfw ON ((rfw.feature_key = rf.feature_key)));


--
-- Name: v_ecs_all; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_all AS
 SELECT kb_items.student_id,
    kb_items.title_name AS activity_name,
    kb_items.subtype AS category,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.evidence_links,
    kb_items.source_ref AS source_id,
    kb_items.confidence,
    kb_items.item_id AS chip_id
   FROM public.kb_items
  WHERE (lower(kb_items.item_type) = ANY (ARRAY['ec'::text, 'activity'::text]));


--
-- Name: VIEW v_ecs_all; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_all IS 'All ECs/Activities from kb_items';


--
-- Name: v_ecs_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_final AS
 SELECT v_ecs_all.student_id,
    v_ecs_all.activity_name,
    v_ecs_all.category,
    v_ecs_all.tier1_state,
    v_ecs_all.tier2_substate,
    v_ecs_all.status_detail,
    v_ecs_all.key_metric_type,
    v_ecs_all.key_metric_value,
    v_ecs_all.key_metric_unit,
    v_ecs_all.event_date,
    v_ecs_all.submit_date,
    v_ecs_all.outcome_date,
    v_ecs_all.evidence_links,
    v_ecs_all.source_id,
    v_ecs_all.confidence,
    v_ecs_all.chip_id
   FROM public.v_ecs_all
  WHERE (v_ecs_all.tier1_state = ANY (ARRAY['Submitted'::text, 'Outcome'::text]))
  ORDER BY COALESCE(v_ecs_all.outcome_date, v_ecs_all.submit_date), v_ecs_all.activity_name;


--
-- Name: VIEW v_ecs_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_final IS 'Final ECs (Submitted/Outcome states)';


--
-- Name: v_commonapp_activities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_commonapp_activities AS
 WITH src AS (
         SELECT v_ecs_final.student_id,
            v_ecs_final.activity_name,
            v_ecs_final.category,
            v_ecs_final.tier1_state,
            v_ecs_final.tier2_substate,
            v_ecs_final.status_detail,
            v_ecs_final.key_metric_type,
            v_ecs_final.key_metric_value,
            v_ecs_final.key_metric_unit,
            v_ecs_final.event_date,
            v_ecs_final.submit_date,
            v_ecs_final.outcome_date,
            v_ecs_final.evidence_links,
            v_ecs_final.source_id,
            v_ecs_final.confidence,
            v_ecs_final.chip_id,
            public.canon_label(v_ecs_final.activity_name) AS canon_title,
                CASE
                    WHEN (v_ecs_final.activity_name ~* '^(founder|president|lead|captain|co-?founder|vp|director)\b'::text) THEN 2
                    ELSE 1
                END AS role_rank
           FROM public.v_ecs_final
        ), pick AS (
         SELECT DISTINCT ON (src.student_id, src.canon_title) src.student_id,
            src.activity_name,
            src.category,
            src.tier2_substate AS subcategory,
            src.status_detail AS role,
            src.key_metric_value AS metrics,
            src.submit_date,
            src.source_id,
            src.chip_id
           FROM src
          ORDER BY src.student_id, src.canon_title, src.role_rank DESC, src.submit_date DESC NULLS LAST
        )
 SELECT pick.student_id,
    pick.activity_name,
    pick.category,
    pick.subcategory,
    pick.role,
    pick.metrics,
    pick.submit_date,
    pick.source_id,
    pick.chip_id
   FROM pick
  ORDER BY COALESCE(pick.submit_date, CURRENT_DATE), pick.activity_name;


--
--
CREATE VIEW public.v_commonapp_honors AS
 SELECT outcomes.student_id,
    COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text)) AS honor_name,
    NULLIF((outcomes.details_json ->> 'tier'::text), ''::text) AS level,
    (outcomes.occurred_at)::date AS date_received,
    outcomes.source_id,
    (outcomes.outcome_id)::text AS chip_id
   FROM public.outcomes
  WHERE (((outcomes.type)::text = 'achievement'::text) AND (COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text)) IS NOT NULL))
  ORDER BY ((outcomes.occurred_at)::date), COALESCE((outcomes.details_json ->> 'award_name'::text), (outcomes.details_json ->> 'title'::text));


--
-- Name: VIEW v_commonapp_honors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_commonapp_honors IS 'Common App honors/awards (max 5) with null filtering';


--
-- Name: v_commonapp_submitted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_commonapp_submitted AS
 SELECT s.student_id,
    ( SELECT jsonb_agg(row_to_json(a.*)) AS jsonb_agg
           FROM public.v_commonapp_activities a
          WHERE (a.student_id = s.student_id)) AS activities,
    ( SELECT jsonb_agg(row_to_json(h.*)) AS jsonb_agg
           FROM public.v_commonapp_honors h
          WHERE (h.student_id = s.student_id)) AS honors,
    ( SELECT jsonb_agg(row_to_json(v.*)) AS jsonb_agg
           FROM ( SELECT vital_facts.kind,
                    vital_facts.value,
                    vital_facts.numeric_value,
                    vital_facts.fact_date
                   FROM public.vital_facts
                  WHERE ((vital_facts.student_id = s.student_id) AND (vital_facts.kind = ANY (ARRAY['gpa_weighted'::text, 'gpa_unweighted'::text, 'sat_total_score'::text, 'sat_math'::text, 'sat_ebrw'::text])))
                  ORDER BY vital_facts.fact_date) v) AS academics
   FROM public.students s;


--
-- Name: VIEW v_commonapp_submitted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_commonapp_submitted IS 'Common App final template: Consolidated submission (activities + honors + academics)';


--
-- Name: v_cross_namespace_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cross_namespace_stats AS
 SELECT cross_namespace_links.relation_type,
    count(*) AS link_count,
    avg(cross_namespace_links.confidence) AS avg_confidence,
    count(DISTINCT cross_namespace_links.source_chip_id) AS unique_sources,
    count(DISTINCT cross_namespace_links.target_chip_id) AS unique_targets
   FROM public.cross_namespace_links
  GROUP BY cross_namespace_links.relation_type
  ORDER BY (count(*)) DESC;


--
-- Name: v_decisions_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_decisions_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Decision'::text)
  ORDER BY kb_items.student_id, COALESCE(kb_items.outcome_date, kb_items.event_date);


--
-- Name: v_ec_enum_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_enum_final AS
 SELECT ec_targets.id,
    ec_targets.student_id,
    ec_targets.phase,
    ec_targets.item_label,
    ec_targets.as_of,
    ec_targets.source_id,
    ec_targets.jtbd_id,
    ec_targets.created_at,
    ec_targets.updated_at
   FROM public.ec_targets
  WHERE (ec_targets.phase = 'final'::text)
  ORDER BY ec_targets.as_of, ec_targets.item_label;


--
-- Name: v_ec_enum_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_enum_initial AS
 SELECT ec_targets.id,
    ec_targets.student_id,
    ec_targets.phase,
    ec_targets.item_label,
    ec_targets.as_of,
    ec_targets.source_id,
    ec_targets.jtbd_id,
    ec_targets.created_at,
    ec_targets.updated_at
   FROM public.ec_targets
  WHERE (ec_targets.phase = 'initial'::text)
  ORDER BY ec_targets.as_of, ec_targets.item_label;


--
-- Name: v_ec_vitals_by_type; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_by_type AS
 SELECT ec_vitals.student_id,
    ec_vitals.metric_type,
    count(DISTINCT ec_vitals.chip_id) AS activities_count,
    count(DISTINCT ec_vitals.metric_name) AS metrics_count,
    count(*) AS total_snapshots,
    min(ec_vitals.as_of) AS earliest_snapshot,
    max(ec_vitals.as_of) AS latest_snapshot
   FROM public.ec_vitals
  GROUP BY ec_vitals.student_id, ec_vitals.metric_type;


--
-- Name: v_ec_vitals_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_latest AS
 SELECT DISTINCT ON (ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name) ec_vitals.vital_id,
    ec_vitals.student_id,
    ec_vitals.chip_id,
    ec_vitals.activity_name,
    ec_vitals.metric_type,
    ec_vitals.metric_name,
    ec_vitals.numeric_value,
    ec_vitals.text_value,
    ec_vitals.unit,
    ec_vitals.as_of,
    ec_vitals.source_id,
    ec_vitals.evidence_text
   FROM public.ec_vitals
  ORDER BY ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name, ec_vitals.as_of DESC;


--
-- Name: v_ec_vitals_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_progression AS
 SELECT ec_vitals.vital_id,
    ec_vitals.student_id,
    ec_vitals.chip_id,
    ec_vitals.activity_name,
    ec_vitals.metric_type,
    ec_vitals.metric_name,
    ec_vitals.numeric_value,
    ec_vitals.text_value,
    ec_vitals.unit,
    ec_vitals.as_of,
    ec_vitals.source_id,
    ec_vitals.evidence_text,
    row_number() OVER (PARTITION BY ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name ORDER BY ec_vitals.as_of) AS nth
   FROM public.ec_vitals
  ORDER BY ec_vitals.student_id, ec_vitals.chip_id, ec_vitals.metric_name, ec_vitals.as_of;


--
-- Name: v_ec_vitals_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ec_vitals_summary AS
 SELECT ec_vitals.student_id,
    count(DISTINCT ec_vitals.chip_id) AS activities_tracked,
    count(DISTINCT ec_vitals.metric_name) AS unique_metrics,
    count(*) AS total_snapshots,
    min(ec_vitals.as_of) AS tracking_start,
    max(ec_vitals.as_of) AS tracking_latest,
    array_agg(DISTINCT ec_vitals.metric_type ORDER BY ec_vitals.metric_type) AS metric_types_tracked
   FROM public.ec_vitals
  GROUP BY ec_vitals.student_id;


--
-- Name: v_ecs_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_initial AS
 SELECT v_ecs_all.student_id,
    v_ecs_all.activity_name,
    v_ecs_all.category,
    v_ecs_all.tier1_state,
    v_ecs_all.tier2_substate,
    v_ecs_all.status_detail,
    v_ecs_all.key_metric_type,
    v_ecs_all.key_metric_value,
    v_ecs_all.key_metric_unit,
    v_ecs_all.event_date,
    v_ecs_all.submit_date,
    v_ecs_all.outcome_date,
    v_ecs_all.evidence_links,
    v_ecs_all.source_id,
    v_ecs_all.confidence,
    v_ecs_all.chip_id
   FROM public.v_ecs_all
  WHERE (v_ecs_all.tier1_state = 'Planned'::text);


--
-- Name: VIEW v_ecs_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ecs_initial IS 'Initial EC targets (Planned state)';


--
-- Name: v_ecs_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ecs_progression AS
 WITH tgt AS (
         SELECT v_ecs_all.student_id,
            v_ecs_all.activity_name,
            v_ecs_all.category,
            'target'::text AS phase,
            COALESCE(v_ecs_all.event_date, v_ecs_all.submit_date, v_ecs_all.outcome_date) AS as_of,
            v_ecs_all.source_id,
            v_ecs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_ecs_all
          WHERE (v_ecs_all.tier1_state = 'Planned'::text)
        ), sub AS (
         SELECT v_ecs_all.student_id,
            v_ecs_all.activity_name,
            v_ecs_all.category,
            'submitted'::text AS phase,
            COALESCE(v_ecs_all.submit_date, v_ecs_all.event_date, v_ecs_all.outcome_date) AS as_of,
            v_ecs_all.source_id,
            v_ecs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_ecs_all
          WHERE (v_ecs_all.tier1_state = 'Submitted'::text)
        ), outc AS (
         SELECT v_ecs_all.student_id,
            v_ecs_all.activity_name,
            v_ecs_all.category,
            'outcome'::text AS phase,
            COALESCE(v_ecs_all.outcome_date, v_ecs_all.submit_date, v_ecs_all.event_date) AS as_of,
            v_ecs_all.source_id,
            v_ecs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_ecs_all
          WHERE (v_ecs_all.tier1_state = 'Outcome'::text)
        )
 SELECT u.student_id,
    u.activity_name,
    u.category,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT tgt.student_id,
            tgt.activity_name,
            tgt.category,
            tgt.phase,
            tgt.as_of,
            tgt.source_id,
            tgt.chip_id,
            tgt.chip_table
--
CREATE VIEW public.v_ecs_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type ~~ 'EC_%'::text)
  ORDER BY kb_items.student_id, COALESCE((kb_items.event_date)::timestamp with time zone, (kb_items.submit_date)::timestamp with time zone, kb_items.created_ts);


--
-- Name: v_eq_signals_flat; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_eq_signals_flat AS
 SELECT ss.id AS signal_set_id,
    ss.student_id,
    ss.phase,
    ss.weeks AS session_week,
    ss.source_path AS source_file,
        CASE
            WHEN (ss.source_path ~~ '%imsg%'::text) THEN 'imsg'::text
            WHEN (ss.source_path ~~ '%session%'::text) THEN 'sessions'::text
            ELSE 'unknown'::text
        END AS source_type,
    s.id AS signal_id,
    s.cue AS cue_type,
    s.strength AS intensity,
    s.exemplar,
    s.provenance,
    s.counts,
    s.meta,
    ss.summary AS raw_payload,
    ss.created_at
   FROM (public.eq_signal_sets ss
     LEFT JOIN public.eq_signals s ON ((s.set_id = ss.id)));


--
-- Name: VIEW v_eq_signals_flat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_eq_signals_flat IS 'Flattened view for runtime queries with denormalized data';


--
-- Name: v_eq_signals_runtime; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_eq_signals_runtime AS
 SELECT v_eq_signals_flat.cue_type,
    avg(v_eq_signals_flat.intensity) AS avg_intensity,
    count(*) AS n,
    count(DISTINCT v_eq_signals_flat.signal_set_id) AS n_sessions,
    array_agg(DISTINCT v_eq_signals_flat.student_id) AS students,
    array_agg(DISTINCT v_eq_signals_flat.phase) AS phases
   FROM public.v_eq_signals_flat
  WHERE (v_eq_signals_flat.cue_type IS NOT NULL)
  GROUP BY v_eq_signals_flat.cue_type;


--
-- Name: VIEW v_eq_signals_runtime; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_eq_signals_runtime IS 'Aggregated cue statistics for runtime guards';


--
-- Name: v_fact_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fact_timeline AS
 WITH base AS (
         SELECT fo.student_id,
            fo.kind,
            fo.obs_id,
            fo.event_date,
            fo.recorded_at,
            fo.value_numeric,
            fo.value_text,
            fo.is_official,
            fo.is_practice,
            fo.confidence,
            fo.source_id,
            fo.meta,
            fo.attempt_no,
            ((
                CASE
                    WHEN fo.is_official THEN COALESCE(fp.weight_official, 100)
                    ELSE 0
                END +
                CASE fo.confidence
                    WHEN 'high'::text THEN COALESCE(fp.weight_conf_high, 30)
                    WHEN 'medium'::text THEN COALESCE(fp.weight_conf_med, 15)
                    ELSE 0
                END) +
                CASE
                    WHEN (fo.source_id = ANY (COALESCE(fp.preferred_sources, ARRAY[]::text[]))) THEN 5
                    ELSE 0
                END) AS policy_score
           FROM (public.fact_observations fo
             LEFT JOIN public.fact_priorities fp USING (kind))
          WHERE (fo.source_id <> ALL (COALESCE(fp.blocked_sources, ARRAY[]::text[])))
        ), ordered AS (
         SELECT base.student_id,
            base.kind,
            base.obs_id,
            base.event_date,
            base.recorded_at,
            base.value_numeric,
            base.value_text,
            base.is_official,
            base.is_practice,
            base.confidence,
            base.source_id,
            base.meta,
            base.attempt_no,
            base.policy_score,
            row_number() OVER (PARTITION BY base.student_id, base.kind ORDER BY base.event_date, base.policy_score DESC, base.recorded_at, base.obs_id) AS rank_chron,
            row_number() OVER (PARTITION BY base.student_id, base.kind ORDER BY base.event_date DESC, base.policy_score DESC, base.recorded_at DESC, base.obs_id DESC) AS rank_reverse
           FROM base
        ), numbered AS (
--
CREATE VIEW public.v_feature_gaps_current AS
 SELECT f.student_id,
    f.domain,
    f.feature_key,
    f.feature_value AS current_value,
    w.target_value,
    (w.target_value - f.feature_value) AS gap_raw,
    w.impact_coefficient,
    (w.impact_coefficient * GREATEST((w.target_value - f.feature_value), (0)::numeric)) AS gap_weighted,
    w.description
   FROM (public.v_features_all f
     JOIN public.readiness_feature_weights w USING (feature_key))
  WHERE (f.feature_value IS NOT NULL);


--
-- Name: VIEW v_feature_gaps_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_feature_gaps_current IS 'Current gap analysis between student features and Ivy+ benchmarks';


--
-- Name: v_gameplan_summary_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gameplan_summary_initial AS
 SELECT s.student_id,
    COALESCE(n_init.items, '[]'::jsonb) AS narrative_items,
    COALESCE(aw.items, '[]'::jsonb) AS award_targets,
    COALESCE(ec.items, '[]'::jsonb) AS ec_targets,
    COALESCE(pg.items, '[]'::jsonb) AS program_targets
   FROM ((((public.students s
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('category', kb_items.subtype, 'content', kb_items.title_name, 'chip', kb_items.item_id)) AS items
           FROM public.kb_items
          WHERE ((kb_items.student_id = s.student_id) AND (kb_items.item_type = 'narrative'::text) AND (kb_items.tier1_state = 'Planned'::text))) n_init ON (true))
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('label', award_targets_enum.item_label, 'as_of', award_targets_enum.as_of, 'source_id', award_targets_enum.source_id)) AS items
           FROM public.award_targets_enum
          WHERE ((award_targets_enum.student_id = s.student_id) AND (award_targets_enum.phase = 'initial'::text) AND (award_targets_enum.as_of = ( SELECT min(award_targets_enum_1.as_of) AS min
                   FROM public.award_targets_enum award_targets_enum_1
                  WHERE ((award_targets_enum_1.student_id = s.student_id) AND (award_targets_enum_1.phase = 'initial'::text)))))) aw ON (true))
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('label', ec_targets.item_label, 'as_of', ec_targets.as_of, 'source_id', ec_targets.source_id)) AS items
           FROM public.ec_targets
          WHERE ((ec_targets.student_id = s.student_id) AND (ec_targets.phase = 'initial'::text) AND (ec_targets.as_of = ( SELECT min(ec_targets_1.as_of) AS min
                   FROM public.ec_targets ec_targets_1
                  WHERE ((ec_targets_1.student_id = s.student_id) AND (ec_targets_1.phase = 'initial'::text)))))) ec ON (true))
     LEFT JOIN LATERAL ( SELECT jsonb_agg(jsonb_build_object('program', kb_items.title_name, 'provider', kb_items.subtype, 'chip', kb_items.item_id)) AS items
           FROM public.kb_items
          WHERE ((kb_items.student_id = s.student_id) AND (lower(kb_items.item_type) = ANY (ARRAY['program'::text, 'summer_program'::text])) AND (kb_items.tier1_state = 'Planned'::text))) pg ON (true));


--
-- Name: v_program_outcomes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_program_outcomes AS
 SELECT outcomes.student_id,
    COALESCE((outcomes.details_json ->> 'program_name'::text), (outcomes.details_json ->> 'title'::text), '(program)'::text) AS program_name,
    (outcomes.details_json ->> 'provider'::text) AS provider,
    (outcomes.details_json ->> 'decision'::text) AS decision,
    (outcomes.details_json ->> 'session'::text) AS session,
    (outcomes.details_json ->> 'site'::text) AS site,
    ((outcomes.details_json ->> 'attending'::text))::boolean AS attending,
    (outcomes.occurred_at)::date AS decision_date,
    outcomes.source_id,
    (outcomes.type)::text AS type,
    (outcomes.outcome_id)::text AS chip_id
   FROM public.outcomes
  WHERE ((outcomes.type)::text = ANY (ARRAY['program'::text, 'program_application'::text]));


--
-- Name: VIEW v_program_outcomes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_program_outcomes IS 'Program decisions from outcomes';


--
-- Name: v_programs_all; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_all AS
 SELECT kb_items.student_id,
    kb_items.title_name AS program_name,
    kb_items.subtype AS provider_or_track,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.source_ref AS source_id,
    kb_items.confidence,
    kb_items.item_id AS chip_id
   FROM public.kb_items
  WHERE (lower(kb_items.item_type) = ANY (ARRAY['program'::text, 'summer_program'::text]));


--
-- Name: VIEW v_programs_all; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_all IS 'All summer programs from kb_items';


--
-- Name: v_programs_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_progression AS
 WITH tgt AS (
         SELECT v_programs_all.student_id,
            v_programs_all.program_name,
            v_programs_all.provider_or_track AS provider,
            'target'::text AS phase,
            COALESCE(v_programs_all.event_date, v_programs_all.submit_date, v_programs_all.outcome_date) AS as_of,
            v_programs_all.source_id,
            v_programs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_programs_all
          WHERE (v_programs_all.tier1_state = 'Planned'::text)
        ), subm AS (
         SELECT v_programs_all.student_id,
            v_programs_all.program_name,
            v_programs_all.provider_or_track AS provider,
            'submitted'::text AS phase,
            COALESCE(v_programs_all.submit_date, v_programs_all.event_date, v_programs_all.outcome_date) AS as_of,
            v_programs_all.source_id,
            v_programs_all.chip_id,
            'kb_items'::text AS chip_table
           FROM public.v_programs_all
          WHERE ((v_programs_all.tier1_state = 'Submitted'::text) OR (v_programs_all.submit_date IS NOT NULL))
        ), "dec" AS (
         SELECT v_program_outcomes.student_id,
            v_program_outcomes.program_name,
            v_program_outcomes.provider,
                CASE
                    WHEN (v_program_outcomes.decision IS NULL) THEN 'outcome'::text
                    ELSE v_program_outcomes.decision
                END AS phase,
            v_program_outcomes.decision_date AS as_of,
            v_program_outcomes.source_id,
            v_program_outcomes.chip_id,
            'outcomes'::text AS chip_table
           FROM public.v_program_outcomes
        )
 SELECT u.student_id,
    u.program_name,
    u.provider,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT tgt.student_id,
            tgt.program_name,
            tgt.provider,
            tgt.phase,
            tgt.as_of,
            tgt.source_id,
--
CREATE VIEW public.v_gameplan_vs_execution AS
 WITH awards AS (
         SELECT 'award'::text AS domain,
            v_awards_progression.student_id,
            v_awards_progression.award_name,
            v_awards_progression.phase,
            v_awards_progression.as_of,
            v_awards_progression.source_id,
            v_awards_progression.chip_id,
            v_awards_progression.chip_table
           FROM public.v_awards_progression
        ), ecs AS (
         SELECT 'ec'::text AS domain,
            v_ecs_progression.student_id,
            v_ecs_progression.activity_name,
            v_ecs_progression.category,
            v_ecs_progression.phase,
            v_ecs_progression.as_of,
            v_ecs_progression.source_id,
            v_ecs_progression.chip_id,
            v_ecs_progression.chip_table
           FROM public.v_ecs_progression
        ), progs AS (
         SELECT 'program'::text AS domain,
            v_programs_progression.student_id,
            v_programs_progression.program_name,
            v_programs_progression.provider,
            v_programs_progression.phase,
            v_programs_progression.as_of,
            v_programs_progression.source_id,
            v_programs_progression.chip_id,
            v_programs_progression.chip_table
           FROM public.v_programs_progression
        )
 SELECT u.domain,
    u.student_id,
    u.item,
    u.phase,
    u.as_of,
    u.source_id,
    u.chip_id,
    u.chip_table
   FROM ( SELECT awards.domain,
            awards.student_id,
            awards.award_name AS item,
            awards.phase,
            awards.as_of,
            awards.source_id,
            awards.chip_id,
            awards.chip_table
           FROM awards
--
CREATE VIEW public.v_gpa_final AS
 SELECT academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  WHERE (academic_gpa.source_id = 'SRC-COMMONAPP-UNC'::text);


--
-- Name: v_gpa_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_progression AS
 SELECT academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence,
    academic_gpa.gpa_id AS chip_id,
    'academic_gpa'::text AS chip_table
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, academic_gpa.scope, COALESCE(academic_gpa.scope_key, ''::text), academic_gpa.recorded_at;


--
-- Name: v_gpa_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_gpa_timeline AS
 SELECT academic_gpa.student_id,
    academic_gpa.scope,
    academic_gpa.scope_key,
    academic_gpa.scope_key AS scope_label,
    academic_gpa.gpa_unweighted,
    academic_gpa.gpa_weighted,
    academic_gpa.credits_attempted,
    academic_gpa.credits_earned,
    academic_gpa.calc_method,
    academic_gpa.recorded_at,
    academic_gpa.source_id,
    academic_gpa.confidence
   FROM public.academic_gpa
  ORDER BY academic_gpa.student_id, academic_gpa.recorded_at;


--
-- Name: VIEW v_gpa_timeline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_gpa_timeline IS 'Temporal GPA progression with scope labels for resolver';


--
-- Name: v_ivyready_assessment_vs_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_assessment_vs_final AS
 WITH a AS (
         SELECT ivyready_snapshots.snapshot_id,
            ivyready_snapshots.student_id,
            ivyready_snapshots.rubric_id,
            ivyready_snapshots.snapshot_phase,
            ivyready_snapshots.as_of,
            ivyready_snapshots.engine,
            ivyready_snapshots.overall_score,
            ivyready_snapshots.notes,
            ivyready_snapshots.source_id,
            ivyready_snapshots.created_ts
           FROM public.ivyready_snapshots
          WHERE (ivyready_snapshots.snapshot_phase = 'assessment'::text)
        ), f AS (
         SELECT ivyready_snapshots.snapshot_id,
            ivyready_snapshots.student_id,
            ivyready_snapshots.rubric_id,
            ivyready_snapshots.snapshot_phase,
            ivyready_snapshots.as_of,
            ivyready_snapshots.engine,
            ivyready_snapshots.overall_score,
            ivyready_snapshots.notes,
            ivyready_snapshots.source_id,
            ivyready_snapshots.created_ts
           FROM public.ivyready_snapshots
          WHERE (ivyready_snapshots.snapshot_phase = 'final_submit'::text)
        )
 SELECT a.student_id,
    a.as_of AS assessment_as_of,
    a.overall_score AS assessment_score,
    f.as_of AS final_as_of,
    f.overall_score AS final_score,
    (f.overall_score - a.overall_score) AS delta
   FROM (a
     JOIN f USING (student_id, rubric_id));


--
-- Name: v_ivyready_factor_deltas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_factor_deltas AS
 SELECT a.student_id,
    a.snapshot_id AS assessment_sid,
    f.snapshot_id AS final_sid,
    a_f.factor_id,
    a_f.raw_score AS assessment_factor,
    f_f.raw_score AS final_factor,
    (f_f.raw_score - a_f.raw_score) AS delta
   FROM (((public.ivyready_snapshots a
     JOIN public.ivyready_snapshots f ON (((f.student_id = a.student_id) AND (f.rubric_id = a.rubric_id) AND (a.snapshot_phase = 'assessment'::text) AND (f.snapshot_phase = 'final_submit'::text))))
     JOIN public.ivyready_snapshot_factors a_f ON ((a_f.snapshot_id = a.snapshot_id)))
     JOIN public.ivyready_snapshot_factors f_f ON (((f_f.snapshot_id = f.snapshot_id) AND (f_f.factor_id = a_f.factor_id))))
  ORDER BY a.student_id, a_f.factor_id;


--
-- Name: v_ivyready_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_latest AS
 SELECT DISTINCT ON (i.student_id) i.student_id,
    i.rubric_id,
    i.snapshot_phase,
    i.as_of,
    i.overall_score,
    i.snapshot_id
   FROM public.ivyready_snapshots i
  ORDER BY i.student_id, i.as_of DESC;


--
-- Name: v_ivyready_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ivyready_progression AS
 SELECT i.student_id,
    i.rubric_id,
    i.snapshot_phase,
    i.as_of,
    i.overall_score,
    jsonb_object_agg(f.factor_id, f.raw_score ORDER BY f.factor_id) AS factor_scores
   FROM (public.ivyready_snapshots i
     JOIN public.ivyready_snapshot_factors f USING (snapshot_id))
  GROUP BY i.student_id, i.rubric_id, i.snapshot_phase, i.as_of, i.overall_score
  ORDER BY i.student_id, i.as_of;


--
-- Name: v_jtbd_weekly_by_week; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_by_week AS
 SELECT jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    count(*) AS total_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'in_progress'::text)) AS in_progress_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'planned'::text)) AS planned_jobs,
    array_agg(jtbd_weekly.job_type ORDER BY jtbd_weekly.job_type) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_job_types,
    array_agg(jtbd_weekly.job_description ORDER BY jtbd_weekly.job_description) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_descriptions
   FROM public.jtbd_weekly
  GROUP BY jtbd_weekly.student_id, jtbd_weekly.week_number, jtbd_weekly.week_start_date, jtbd_weekly.week_end_date;


--
-- Name: v_jtbd_weekly_completed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_completed AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE (jtbd_weekly.status = 'completed'::text)
  ORDER BY jtbd_weekly.completion_date;


--
-- Name: v_jtbd_weekly_milestones; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_milestones AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE ((jtbd_weekly.job_type = 'ec_milestone'::text) AND (jtbd_weekly.status = 'completed'::text))
  ORDER BY jtbd_weekly.completion_date;


--
-- Name: v_jtbd_weekly_pending; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_pending AS
 SELECT jtbd_weekly.jtbd_id,
    jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    jtbd_weekly.week_start_date,
    jtbd_weekly.week_end_date,
    jtbd_weekly.job_type,
    jtbd_weekly.job_description,
    jtbd_weekly.linked_chip_id,
    jtbd_weekly.linked_table,
    jtbd_weekly.status,
    jtbd_weekly.completion_date,
    jtbd_weekly.outcome_metric,
    jtbd_weekly.outcome_value,
    jtbd_weekly.outcome_unit,
    jtbd_weekly.source_id,
    jtbd_weekly.notes,
    jtbd_weekly.created_at
   FROM public.jtbd_weekly
  WHERE (jtbd_weekly.status = ANY (ARRAY['planned'::text, 'in_progress'::text]))
  ORDER BY jtbd_weekly.week_number;


--
-- Name: v_jtbd_weekly_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jtbd_weekly_progression AS
 SELECT jtbd_weekly.student_id,
    jtbd_weekly.week_number,
    count(*) AS total_jobs,
    count(*) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)) AS completed_jobs,
    round(((100.0 * (count(*) FILTER (WHERE (jtbd_weekly.status = 'completed'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS completion_rate
   FROM public.jtbd_weekly
  GROUP BY jtbd_weekly.student_id, jtbd_weekly.week_number
  ORDER BY jtbd_weekly.student_id, jtbd_weekly.week_number;


--
-- Name: v_kb_items_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_kb_items_summary AS
 SELECT kb_items.student_id,
    kb_items.item_type,
    kb_items.tier1_state,
    count(*) AS item_count,
    string_agg(kb_items.title_name, '; '::text ORDER BY kb_items.title_name) AS items_list,
    min(COALESCE(kb_items.event_date, kb_items.submit_date, kb_items.deadline_date)) AS earliest_date,
    max(COALESCE(kb_items.outcome_date, kb_items.event_date, kb_items.submit_date)) AS latest_date
   FROM public.kb_items
  GROUP BY kb_items.student_id, kb_items.item_type, kb_items.tier1_state;


--
-- Name: v_kb_recent; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_kb_recent AS
 SELECT c.chip_id,
    c.student_id,
    c.chip_type,
    c.title,
    c.summary,
    c.tags,
    c.started_at,
    c.ended_at,
    c.content_json,
    d.filename,
    d.domain,
    d.dt_anchor,
    d.drive_file_id,
    COALESCE(c.ended_at, c.started_at, d.dt_anchor, c.created_ts) AS sort_ts
   FROM (public.kb_chips c
     JOIN public.kb_docs d ON ((d.doc_id = c.doc_id)))
  ORDER BY COALESCE(c.ended_at, c.started_at, d.dt_anchor, c.created_ts) DESC NULLS LAST;


--
-- Name: VIEW v_kb_recent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_kb_recent IS 'Recent KB chips ordered by temporal anchor (ended_at > started_at > dt_anchor > created_ts)';


--
-- Name: v_narrative_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narrative_final AS
 SELECT kb_items.student_id,
    kb_items.subtype AS narrative_category,
    kb_items.title_name AS content,
    kb_items.source_ref,
    kb_items.item_id
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'narrative'::text) AND (kb_items.tier1_state = 'Submitted'::text))
  ORDER BY kb_items.subtype;


--
-- Name: v_narrative_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narrative_initial AS
 SELECT kb_items.student_id,
    kb_items.subtype AS narrative_category,
    kb_items.title_name AS content,
    kb_items.source_ref,
    kb_items.item_id
   FROM public.kb_items
  WHERE ((kb_items.item_type = 'narrative'::text) AND (kb_items.tier1_state = 'Planned'::text))
  ORDER BY kb_items.subtype;


--
-- Name: v_narrative_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_narrative_summary AS
 SELECT narrative_targets.student_id,
    count(*) AS narrative_count,
    min(narrative_targets.as_of) AS earliest_date,
    string_agg("left"(narrative_targets.narrative, 100), ' | '::text) AS narrative_preview
   FROM public.narrative_targets
  GROUP BY narrative_targets.student_id;


--
-- Name: v_plan_events_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_plan_events_summary AS
 SELECT plan_events.student_id,
    plan_events.event,
    count(*) AS event_count,
    min(plan_events.as_of) AS first_date,
    max(plan_events.as_of) AS last_date,
    string_agg(DISTINCT plan_events.source_id, ', '::text) AS sources
   FROM public.plan_events
  GROUP BY plan_events.student_id, plan_events.event
  ORDER BY plan_events.student_id, (min(plan_events.as_of));


--
-- Name: v_programs_admits; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_admits AS
 SELECT v_programs_final.student_id,
    v_programs_final.program_name AS title_name,
    v_programs_final.provider,
    v_programs_final.event_date AS occurred_at,
    v_programs_final.source_id,
    v_programs_final.chip_id,
    v_programs_final.chip_table
   FROM public.v_programs_final;


--
-- Name: VIEW v_programs_admits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_admits IS 'Summer program admissions (alias of v_programs_final for GPT-5 intent router)';


--
-- Name: v_programs_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_initial AS
 SELECT v_programs_all.student_id,
    v_programs_all.program_name,
    v_programs_all.provider_or_track,
    v_programs_all.tier1_state,
    v_programs_all.tier2_substate,
    v_programs_all.status_detail,
    v_programs_all.key_metric_type,
    v_programs_all.key_metric_value,
    v_programs_all.key_metric_unit,
    v_programs_all.event_date,
    v_programs_all.submit_date,
    v_programs_all.outcome_date,
    v_programs_all.source_id,
    v_programs_all.confidence,
    v_programs_all.chip_id
   FROM public.v_programs_all
  WHERE (v_programs_all.tier1_state = 'Planned'::text);


--
-- Name: VIEW v_programs_initial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_initial IS 'Initial program targets (Planned)';


--
-- Name: v_programs_submitted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_programs_submitted AS
 SELECT v_programs_all.student_id,
    v_programs_all.program_name,
    v_programs_all.provider_or_track,
    v_programs_all.tier1_state,
    v_programs_all.tier2_substate,
    v_programs_all.status_detail,
    v_programs_all.key_metric_type,
    v_programs_all.key_metric_value,
    v_programs_all.key_metric_unit,
    v_programs_all.event_date,
    v_programs_all.submit_date,
    v_programs_all.outcome_date,
    v_programs_all.source_id,
    v_programs_all.confidence,
    v_programs_all.chip_id
   FROM public.v_programs_all
  WHERE ((v_programs_all.tier1_state = 'Submitted'::text) OR (v_programs_all.submit_date IS NOT NULL));


--
-- Name: VIEW v_programs_submitted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_programs_submitted IS 'Programs submitted';


--
-- Name: v_proof_health; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_proof_health AS
 SELECT date_trunc('day'::text, proof_registry."timestamp") AS day,
    proof_registry.artifact_type,
    count(*) AS total_artifacts,
    sum(
        CASE
            WHEN proof_registry.verified THEN 1
            ELSE 0
        END) AS verified_count,
    avg(proof_registry.score) AS avg_score,
    percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((proof_registry.score)::double precision)) AS median_score,
    min(proof_registry.score) AS min_score,
    max(proof_registry.score) AS max_score
   FROM public.proof_registry
  GROUP BY (date_trunc('day'::text, proof_registry."timestamp")), proof_registry.artifact_type
  ORDER BY (date_trunc('day'::text, proof_registry."timestamp")) DESC, proof_registry.artifact_type;


--
-- Name: v_readiness_weakspots; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_readiness_weakspots AS
 SELECT g.student_id,
    g.domain,
    g.feature_key,
    g.current_value,
    g.target_value,
    g.gap_raw,
    g.impact_coefficient,
    g.gap_weighted,
    rank() OVER (PARTITION BY g.student_id ORDER BY g.gap_weighted DESC) AS gap_rank
   FROM public.v_feature_gaps_current g
  WHERE (g.gap_weighted > (0)::numeric);


--
-- Name: v_readiness_top_priorities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_readiness_top_priorities AS
 SELECT w.student_id,
    w.domain,
    w.feature_key,
    w.current_value,
    w.target_value,
    w.gap_raw,
    w.gap_weighted,
        CASE w.domain
            WHEN 'testing'::text THEN 'Raise SAT/ACT via targeted prep/retake'::text
            WHEN 'awards'::text THEN 'Pursue higher-tier competitions (Nat/Intl)'::text
            WHEN 'ecs'::text THEN 'Scale users/funding/footprint; formalize leadership'::text
            WHEN 'academics'::text THEN 'Optimize GPA/rigor (AP adds or grade repair)'::text
            WHEN 'narrative'::text THEN 'Tighten essay coherence w/ identity–passion–cause'::text
            WHEN 'programs'::text THEN 'Apply to selective programs aligned to your narrative'::text
            ELSE 'Work on the highest impact domain gap'::text
        END AS recommended_action,
    'Next 4–6 weeks'::text AS recommended_window,
    round((w.gap_weighted * 1.5), 1) AS estimated_lift
   FROM public.v_readiness_weakspots w
  ORDER BY w.gap_weighted DESC
 LIMIT 10;


--
-- Name: v_rubric_scores_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_rubric_scores_latest AS
 SELECT s.student_id,
    s.rubric_id,
    s.snapshot_phase,
    s.as_of,
    sum(s.weighted_score) AS ivyready_score,
    jsonb_object_agg(s.factor_id, s.raw_score) FILTER (WHERE (s.factor_id IS NOT NULL)) AS factor_scores
   FROM ( SELECT DISTINCT ON (admissions_rubric_scores.student_id, admissions_rubric_scores.rubric_id, admissions_rubric_scores.snapshot_phase, admissions_rubric_scores.factor_id) admissions_rubric_scores.score_id,
            admissions_rubric_scores.student_id,
            admissions_rubric_scores.rubric_id,
            admissions_rubric_scores.snapshot_phase,
            admissions_rubric_scores.as_of,
            admissions_rubric_scores.factor_id,
            admissions_rubric_scores.raw_score,
            admissions_rubric_scores.weight_pct,
            admissions_rubric_scores.weighted_score,
            admissions_rubric_scores.details_json,
            admissions_rubric_scores.source_id,
            admissions_rubric_scores.created_ts
           FROM public.admissions_rubric_scores
          ORDER BY admissions_rubric_scores.student_id, admissions_rubric_scores.rubric_id, admissions_rubric_scores.snapshot_phase, admissions_rubric_scores.factor_id, admissions_rubric_scores.as_of DESC) s
  GROUP BY s.student_id, s.rubric_id, s.snapshot_phase, s.as_of;


--
-- Name: VIEW v_rubric_scores_latest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_rubric_scores_latest IS 'Latest rubric scores per student per snapshot phase with aggregated IvyReady score';


--
-- Name: v_rubric_scores_phase_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_rubric_scores_phase_latest AS
 SELECT s.student_id,
    s.rubric_id,
    s.snapshot_phase,
    max(s.as_of) AS as_of,
    sum(s.weighted_score) AS ivyready_score,
    jsonb_object_agg(s.factor_id, s.raw_score ORDER BY s.factor_id) AS factor_scores
   FROM public.admissions_rubric_scores s
  GROUP BY s.student_id, s.rubric_id, s.snapshot_phase;


--
-- Name: VIEW v_rubric_scores_phase_latest; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_rubric_scores_phase_latest IS 'Latest IvyReady rubric scores per snapshot phase (assessment, midpoint, final_submit)';


--
-- Name: v_sat_enum_first; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_enum_first AS
 SELECT DISTINCT ON (sat_timeline_enum.student_id) sat_timeline_enum.student_id,
    sat_timeline_enum.as_of,
    sat_timeline_enum.numeric_value,
    sat_timeline_enum.type,
    sat_timeline_enum.confidence,
    sat_timeline_enum.source_id
   FROM public.sat_timeline_enum
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of, sat_timeline_enum.numeric_value;


--
-- Name: v_sat_enum_latest; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_enum_latest AS
 SELECT DISTINCT ON (sat_timeline_enum.student_id) sat_timeline_enum.student_id,
    sat_timeline_enum.as_of,
    sat_timeline_enum.numeric_value,
    sat_timeline_enum.type,
    sat_timeline_enum.confidence,
    sat_timeline_enum.source_id
   FROM public.sat_timeline_enum
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of DESC, sat_timeline_enum.numeric_value DESC;


--
-- Name: v_sat_enum_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_enum_progression AS
 SELECT sat_timeline_enum.student_id,
    sat_timeline_enum.as_of,
    sat_timeline_enum.numeric_value,
    sat_timeline_enum.type,
    sat_timeline_enum.confidence,
    sat_timeline_enum.source_id,
    row_number() OVER (PARTITION BY sat_timeline_enum.student_id ORDER BY sat_timeline_enum.as_of) AS nth
   FROM public.sat_timeline_enum
  ORDER BY sat_timeline_enum.student_id, sat_timeline_enum.as_of;


--
-- Name: VIEW v_sat_enum_progression; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_sat_enum_progression IS 'SAT scores ordered chronologically with nth numbering';


--
-- Name: v_sat_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_sat_progression AS
 SELECT vital_facts.student_id,
    vital_facts.fact_date,
        CASE
            WHEN (vital_facts.value ~ '^[0-9]+$'::text) THEN (vital_facts.value)::integer
            ELSE NULL::integer
        END AS score_total,
    vital_facts.modality,
    vital_facts.confidence,
    vital_facts.source_id,
    row_number() OVER (PARTITION BY vital_facts.student_id ORDER BY vital_facts.fact_date, vital_facts.source_id) AS nth
   FROM public.vital_facts
  WHERE (vital_facts.kind = 'sat_total_score'::text);


--
-- Name: v_scholarship_impact; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_scholarship_impact AS
 SELECT sch.student_id,
    sch.scholarship_name,
    sch.amount_usd,
    sch.application_status,
    sch.decision_date,
    COALESCE(r.overall_score, (0)::numeric) AS ivyready_score_final,
    (sch.amount_usd / 1000.0) AS affordability_boost,
    (r.overall_score + (sch.amount_usd / 5000.0)) AS adjusted_readiness_score
   FROM (public.scholarships sch
     LEFT JOIN public.ivyready_snapshots r ON (((r.student_id = sch.student_id) AND (r.snapshot_phase = 'final_submit'::text))));


--
-- Name: v_testing_timeline; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_testing_timeline AS
 SELECT kb_items.item_id,
    kb_items.student_id,
    kb_items.item_type,
    kb_items.subtype,
    kb_items.title_name,
    kb_items.tier1_state,
    kb_items.tier2_substate,
    kb_items.status_detail,
    kb_items.key_metric_type,
    kb_items.key_metric_value,
    kb_items.key_metric_unit,
    kb_items.deadline_date,
    kb_items.event_date,
    kb_items.submit_date,
    kb_items.outcome_date,
    kb_items.owner,
    kb_items.cadence,
    kb_items.evidence_links,
    kb_items.source_ref,
    kb_items.confidence,
    kb_items.created_ts,
    kb_items.updated_ts
   FROM public.kb_items
  WHERE (kb_items.item_type = 'Test'::text)
  ORDER BY kb_items.student_id, COALESCE(kb_items.event_date, kb_items.submit_date);


--
-- Name: v_transcript_final; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transcript_final AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  WHERE ((t.source_id = 'SRC-COMMONAPP-UNC'::text) AND (g.status = 'final'::text));


--
-- Name: v_transcript_initial; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transcript_initial AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  WHERE ((t.source_id ~~ 'SRC-GAMEPLAN%'::text) OR ((t.source_id ~~ 'SRC-GP%'::text) AND (g.status = ANY (ARRAY['final'::text, 'in_progress'::text]))));


--
-- Name: v_transcript_progression; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_transcript_progression AS
 SELECT t.student_id,
    t.term_code,
    t.grade_level,
    c.course_title,
    c.subject_area,
    c.level,
    g.grade_letter,
    g.grade_percent,
    g.credits,
    g.weighting,
    g.status,
    t.start_date,
    t.end_date,
    g.recorded_at,
    t.source_id AS term_source,
    c.source_id AS course_source,
    g.source_id AS grade_source,
    LEAST(g.confidence, c.confidence, t.confidence) AS confidence,
    c.course_id AS chip_id,
    'academic_courses'::text AS chip_table
   FROM ((public.academic_terms t
     JOIN public.academic_courses c ON ((c.term_id = t.term_id)))
     JOIN public.academic_grades g ON ((g.course_id = c.course_id)))
  ORDER BY t.start_date, t.term_code, c.course_title;


--
-- Name: vw_facts_normalized; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_facts_normalized AS
 SELECT vf.student_id,
    vf.kind,
    vf.value,
    vf.numeric_value,
    (vf.fact_date)::date AS fact_date,
    vf.confidence,
    vf.source_id,
    COALESCE(vf.modality, 'any'::text) AS modality
   FROM public.vital_facts vf
  WHERE (vf.value IS NOT NULL);


--
-- Name: autonomy_loop_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autonomy_loop_log ALTER COLUMN id SET DEFAULT nextval('public.autonomy_loop_log_id_seq'::regclass);


--
-- Name: award_targets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets ALTER COLUMN id SET DEFAULT nextval('public.award_targets_id_seq'::regclass);


--
-- Name: award_targets_enum id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_targets_enum ALTER COLUMN id SET DEFAULT nextval('public.award_targets_enum_id_seq'::regclass);


--
-- Name: college_list college_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_list ALTER COLUMN college_id SET DEFAULT nextval('public.college_list_college_id_seq'::regclass);


--
-- Name: conversation_turns turn_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_turns ALTER COLUMN turn_id SET DEFAULT nextval('public.conversation_turns_turn_id_seq'::regclass);


--
-- Name: cross_namespace_links id; Type: DEFAULT; Schema: public; Owner: -
--
--
         WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE VIEW', 'ALTER VIEW', 'DROP VIEW', 'CREATE INDEX', 'ALTER INDEX', 'DROP INDEX', 'CREATE SCHEMA', 'DROP SCHEMA', 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW', 'DROP MATERIALIZED VIEW')
   EXECUTE FUNCTION compat.block_ddl();


--
-- Name: EVENT TRIGGER et_ddl_block; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EVENT TRIGGER et_ddl_block IS 'Enforces migration-only DDL to prevent schema drift';


--
-- PostgreSQL database dump complete
--

\unrestrict MD8B62r28eqsxccGwqKYyTEhI0s2hapBYkVzVnmR98GJOtTKD80DemImpxlxEbQ

