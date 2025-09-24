#!/usr/bin/env npx ts-node
/**
 * Nightly cron job for recomputing vitals and generating reports
 * Run with: npx ts-node cron/recompute.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://saadnazir@localhost/ivylevel'
});

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function ensureDirectories() {
  const dirs = [
    './data/reports/huda/v1.2.4',
    './data/reports/backup'
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function recomputeVitals(studentId: string) {
  console.log(`Recomputing vitals for ${studentId}...`);
  
  const response = await fetch(`${API_URL}/admin/recompute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to recompute vitals: ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log(`✓ Vitals recomputed for ${studentId}`);
  return result.vitals;
}

async function generateReport(studentId: string, type: 'yield' | 'temporal') {
  console.log(`Generating ${type} report for ${studentId}...`);
  
  const response = await fetch(`${API_URL}/reports/${studentId}?type=${type}`);
  
  if (!response.ok) {
    throw new Error(`Failed to generate ${type} report: ${response.statusText}`);
  }
  
  const report = await response.json();
  
  // Save to cache directory
  const reportPath = `./data/reports/${studentId}/v1.2.4/${type}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✓ ${type} report saved to ${reportPath}`);
  return report;
}

async function generateMarkdownReports(studentId: string, yieldReport: any, temporalReport: any) {
  // Generate yield markdown
  const yieldMd = formatYieldReportMarkdown(yieldReport);
  const yieldPath = `./data/reports/${studentId}/v1.2.4/yield_report.md`;
  fs.writeFileSync(yieldPath, yieldMd);
  
  // Generate temporal markdown
  const temporalMd = formatTemporalReportMarkdown(temporalReport);
  const temporalPath = `./data/reports/${studentId}/v1.2.4/temporal_report.md`;
  fs.writeFileSync(temporalPath, temporalMd);
  
  console.log(`✓ Markdown reports generated`);
}

function formatYieldReportMarkdown(report: any): string {
  const lines = [
    `# Opportunity Yield Report - ${report.studentId}`,
    `*Generated: ${report.generatedAt.split('T')[0]}*`,
    '',
    '## Executive Summary',
    `- **Overall Win Rate**: ${report.summary.overallWinRate}%`,
    `- **Total Applications**: ${report.summary.totalApplications}`,
    `- **Total Accepted**: ${report.summary.totalAccepted}`,
    '',
    '## Win Rates by Category',
    '',
    '| Category | Applications | Accepted | Win Rate |',
    '|----------|--------------|----------|----------|'
  ];
  
  report.categories.forEach((cat: any) => {
    lines.push(`| ${cat.category} | ${cat.total} | ${cat.accepted} | ${cat.win_rate_pct}% |`);
  });
  
  if (report.insights.highYield.length > 0) {
    lines.push('', '## High-Yield Categories (80%+)', '');
    report.insights.highYield.forEach((cat: any) => {
      lines.push(`- **${cat.category}**: ${cat.win_rate_pct}% win rate`);
    });
  }
  
  if (report.insights.challenging.length > 0) {
    lines.push('', '## Challenging Categories (<50%)', '');
    report.insights.challenging.forEach((cat: any) => {
      lines.push(`- **${cat.category}**: ${cat.win_rate_pct}% win rate (needs 3x buffer)`);
    });
  }
  
  return lines.join('\n');
}

function formatTemporalReportMarkdown(report: any): string {
  const lines = [
    `# Temporal Analysis Report - ${report.studentId}`,
    `*Generated: ${report.generatedAt.split('T')[0]}*`,
    '',
    '## Summary',
    `- **Total Weeks Analyzed**: ${report.summary.totalWeeks}`,
    `- **Bombardment Weeks**: ${report.summary.bombardmentWeeks}`,
    `- **Rejection Rebounds**: ${report.summary.rejectionRebounds}`,
    report.summary.avgReboundDays ? `- **Avg Rebound Time**: ${report.summary.avgReboundDays} days` : '',
    '',
    '## Bombardment Analysis',
    `- **Count**: ${report.patterns.bombardment.count} weeks`,
    `- **Avg Applications**: ${report.patterns.bombardment.avgApplications} per week`,
    `- **Avg Win Rate**: ${report.patterns.bombardment.avgWinRate}%`,
    ''
  ].filter(line => line !== '');
  
  if (report.patterns.resilience.rebounds > 0) {
    lines.push('## Resilience Metrics');
    lines.push(`- **Successful Rebounds**: ${report.patterns.resilience.rebounds}`);
    if (report.patterns.resilience.avgReboundDays) {
      lines.push(`- **Average Rebound Time**: ${report.patterns.resilience.avgReboundDays} days`);
    }
    lines.push('');
  }
  
  lines.push('## Recent Weekly Activity', '');
  lines.push('| Week | Applications | Wins | Losses | Win Rate |');
  lines.push('|------|--------------|------|--------|----------|');
  
  const recent = report.weeklyActivity.slice(-8); // Last 8 weeks
  recent.forEach((week: any) => {
    lines.push(`| ${week.week_start} | ${week.applications} | ${week.wins} | ${week.losses} | ${week.win_rate_pct || 0}% |`);
  });
  
  return lines.join('\n');
}

async function backupPreviousReports(studentId: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const sourceDir = `./data/reports/${studentId}/v1.2.4`;
  const backupDir = `./data/reports/backup/${studentId}_${timestamp}`;
  
  if (fs.existsSync(sourceDir)) {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy existing reports to backup
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      const source = path.join(sourceDir, file);
      const dest = path.join(backupDir, file);
      fs.copyFileSync(source, dest);
    }
    
    console.log(`✓ Backed up previous reports to ${backupDir}`);
  }
}

async function main() {
  console.log('=== Nightly Recompute Job Started ===');
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    // Ensure directories exist
    await ensureDirectories();
    
    // List of students to process
    const students = ['huda']; // Add more student IDs as needed
    
    for (const studentId of students) {
      console.log(`\nProcessing ${studentId}...`);
      
      // Backup previous reports
      await backupPreviousReports(studentId);
      
      // Recompute vitals
      await recomputeVitals(studentId);
      
      // Generate reports
      const yieldReport = await generateReport(studentId, 'yield');
      const temporalReport = await generateReport(studentId, 'temporal');
      
      // Generate markdown versions
      await generateMarkdownReports(studentId, yieldReport, temporalReport);
      
      console.log(`✓ Completed processing for ${studentId}`);
    }
    
    console.log('\n=== Nightly Recompute Job Completed ===');
    
  } catch (error) {
    console.error('Error in nightly recompute:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other scripts
export { recomputeVitals, generateReport };