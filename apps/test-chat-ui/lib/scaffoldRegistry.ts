/**
 * Scaffold Registry - loads and manages answer templates
 * Supports Handlebars templates with chip selection logic
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import Handlebars from "handlebars";
import type { Hit } from "./types";

export type Scaffold = {
  id: string;
  priority: number;
  requires?: {
    anyTag?: string[];
    anyType?: string[];
    anyNamespace?: string[];
    minScore?: number;
  };
  select?: Record<string, any>;
  template: string;
  outputs?: {
    chips?: string[];
  };
};

type ScaffoldEntry = {
  tpl: HandlebarsTemplateDelegate;
  conf: Scaffold;
};

let REGISTRY: ScaffoldEntry[] = [];

const normType = (md: any) =>
  (md?.type || md?.chip_type || md?.category || "UnknownType").toString();

export function loadScaffolds(dir = "config/scaffolds") {
  const fullPath = path.resolve(process.cwd(), dir);
  console.log(`[ScaffoldRegistry] Loading from: ${fullPath}`);

  if (!fs.existsSync(fullPath)) {
    console.warn(`[ScaffoldRegistry] Directory not found: ${fullPath}`);
    return 0;
  }

  REGISTRY = fs
    .readdirSync(fullPath)
    .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map(f => {
      try {
        const conf = yaml.load(
          fs.readFileSync(path.join(fullPath, f), "utf8")
        ) as Scaffold;
        const tpl = Handlebars.compile(conf.template, { noEscape: true });
        console.log(`[ScaffoldRegistry] Loaded: ${conf.id} (priority: ${conf.priority})`);
        return { tpl, conf };
      } catch (e) {
        console.error(`[ScaffoldRegistry] Failed to load ${f}:`, e);
        return null;
      }
    })
    .filter((entry): entry is ScaffoldEntry => entry !== null);

  console.log(`[ScaffoldRegistry] Loaded ${REGISTRY.length} scaffolds`);
  return REGISTRY.length;
}

export function selectScaffold(
  queryTags: string[],
  hits: Hit[]
): ScaffoldEntry | null {
  const candidates = REGISTRY.filter(({ conf }) => {
    const r = conf.requires || {};

    // Check tag match
    const tagOk =
      !r.anyTag || r.anyTag.some(t => queryTags.includes(t));

    // Check namespace match
    const nsOk =
      !r.anyNamespace ||
      r.anyNamespace.some(ns => hits.some(h => h.namespace === ns));

    // Check type match
    const typeOk =
      !r.anyType ||
      r.anyType.some(t => hits.some(h => normType(h.metadata) === t));

    // Check score threshold
    const scoreOk = r.minScore == null || (hits[0]?.score ?? 0) >= r.minScore;

    const match = tagOk && nsOk && typeOk && scoreOk;

    if (match) {
      console.log(`[ScaffoldRegistry] Candidate: ${conf.id} (priority: ${conf.priority})`);
    }

    return match;
  }).sort((a, b) => (b.conf.priority || 0) - (a.conf.priority || 0));

  const selected = candidates[0] || null;
  if (selected) {
    console.log(`[ScaffoldRegistry] Selected: ${selected.conf.id}`);
  } else {
    console.log(`[ScaffoldRegistry] No scaffold matched`);
  }

  return selected;
}

export function fillTemplate(
  entry: ScaffoldEntry,
  slots: Record<string, any>
): string {
  return entry.tpl(slots);
}
