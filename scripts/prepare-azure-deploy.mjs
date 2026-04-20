import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const frontendDistDir = resolve(repoRoot, 'frontend', 'dist', 'gilded', 'browser');
const backendDistDir = resolve(repoRoot, 'backend', 'dist');
const backendPackageJson = resolve(repoRoot, 'backend', 'package.json');
const artifactRoot = resolve(repoRoot, '.artifacts', 'azure-webapp');
const artifactBackendRoot = resolve(artifactRoot, 'backend');

async function ensureDirectory(path, label) {
  const details = await stat(path).catch(() => null);

  if (!details?.isDirectory()) {
    throw new Error(`${label} not found at ${path}. Run the corresponding build first.`);
  }
}

await ensureDirectory(frontendDistDir, 'Frontend build output');
await ensureDirectory(backendDistDir, 'Backend build output');

await rm(artifactRoot, { force: true, recursive: true });
await mkdir(artifactBackendRoot, { recursive: true });

await cp(backendDistDir, resolve(artifactBackendRoot, 'dist'), { recursive: true });
await cp(backendPackageJson, resolve(artifactBackendRoot, 'package.json'));
await cp(frontendDistDir, resolve(artifactBackendRoot, 'public'), { recursive: true });

console.log(`Prepared Azure App Service artifact at ${artifactRoot}`);
