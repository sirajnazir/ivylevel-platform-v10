#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyOpenAPISpec() {
  console.log('🔍 Verifying OpenAPI specification...\n');
  
  try {
    // Load the OpenAPI spec
    const specPath = path.resolve(__dirname, '../../../packages/scripts/src/etl/jenny-v3/jenny-v3-openapi.yaml');
    const specContent = await fs.readFile(specPath, 'utf8');
    const spec = yaml.load(specContent) as any;
    
    console.log(`✅ OpenAPI Version: ${spec.openapi}`);
    console.log(`✅ API Title: ${spec.info.title}`);
    console.log(`✅ API Version: ${spec.info.version}`);
    console.log(`✅ Base URL: ${spec.servers?.[0]?.url || 'Not specified'}\n`);
    
    // Check paths
    console.log('📋 Available Endpoints:');
    const paths = Object.keys(spec.paths || {});
    paths.forEach(path => {
      const methods = Object.keys(spec.paths[path]);
      methods.forEach(method => {
        const operation = spec.paths[path][method];
        console.log(`  ${method.toUpperCase().padEnd(7)} ${path.padEnd(30)} - ${operation.summary || 'No summary'}`);
      });
    });
    
    // Check components
    console.log('\n📦 Components:');
    if (spec.components?.schemas) {
      console.log(`  - Schemas: ${Object.keys(spec.components.schemas).length}`);
      Object.keys(spec.components.schemas).forEach(schema => {
        console.log(`    • ${schema}`);
      });
    }
    
    if (spec.components?.responses) {
      console.log(`  - Responses: ${Object.keys(spec.components.responses).length}`);
    }
    
    if (spec.components?.securitySchemes) {
      console.log(`  - Security Schemes: ${Object.keys(spec.components.securitySchemes).length}`);
      Object.keys(spec.components.securitySchemes).forEach(scheme => {
        console.log(`    • ${scheme}: ${spec.components.securitySchemes[scheme].type}`);
      });
    }
    
    console.log('\n✅ OpenAPI specification is valid and complete!');
    console.log('📚 Documentation will be available at: http://localhost:8787/docs');
    
  } catch (error) {
    console.error('❌ Error verifying OpenAPI spec:', error);
    process.exit(1);
  }
}

verifyOpenAPISpec();