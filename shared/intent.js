"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInitialIntent = isInitialIntent;
exports.isAwardsTopic = isAwardsTopic;
exports.isECsTopic = isECsTopic;
// shared/intent.ts
function isInitialIntent(message) {
    const m = (message || "").toLowerCase();
    return /(initial|first|week 0|week0|w0|game\s*plan|gameplan|assessment)/i.test(m);
}
function isAwardsTopic(message) {
    return /\b(award|awards|honor|honors|achievement|achievements)\b/i.test(message);
}
function isECsTopic(message) {
    return /\b(ec|ecs|activities|extracurriculars?)\b/i.test(message);
}
