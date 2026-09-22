import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Config de Vitest para DevPlay 🧪 (rama feature/test-perfil)
 *
 * Bun resuelve el alias `@/` automáticamente desde los `paths` de tsconfig;
 * vitest NO → se lo damos aquí explícitamente (`@` → carpeta `src/`) para
 * poder testear módulos que importan la BD (`@/lib/db` → Prisma).
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
})
