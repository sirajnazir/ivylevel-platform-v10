import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupDocs(): Promise<Router> {
  const router = Router();
  
  try {
    // Path to the OpenAPI spec file
    const specPath = path.resolve(__dirname, '../../../packages/scripts/src/etl/jenny-v3/jenny-v3-openapi.yaml');
    
    // Read and parse the OpenAPI spec
    const specContent = await fs.readFile(specPath, 'utf8');
    const swaggerDocument = yaml.load(specContent) as any;
    
    // Configure Swagger UI options
    const options: swaggerUi.SwaggerUiOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Jenny API Documentation',
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        syntaxHighlight: {
          activated: true,
          theme: 'monokai'
        }
      }
    };
    
    // Serve Swagger UI
    router.use('/', swaggerUi.serve);
    router.get('/', swaggerUi.setup(swaggerDocument, options));
    
    console.log('Swagger UI documentation available at /docs');
    
  } catch (error) {
    console.error('Failed to setup Swagger documentation:', error);
    
    // Fallback error page
    router.get('/', (_req, res) => {
      res.status(500).json({
        error: 'Documentation unavailable',
        message: 'Failed to load OpenAPI specification'
      });
    });
  }
  
  return router;
}