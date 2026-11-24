import eslint from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const TEXT_ATTRIBUTES = '/^(aria-label|aria-description|alt|title|placeholder)$/';

export default defineConfig([
  {
    ignores: ['dist', 'src/api/schema.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      jsxA11y.flatConfigs.strict,
      reactHooks.configs.flat.recommended,
    ],
    rules: {
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/**/*.spec.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/\\p{L}/u]',
          message: 'Text for users comes from src/i18n/messages.ts.',
        },
        {
          selector: `JSXAttribute[name.name=${TEXT_ATTRIBUTES}] > Literal`,
          message: 'Text for users comes from src/i18n/messages.ts.',
        },
        {
          selector: 'JSXExpressionContainer > Literal[value=/\\p{L}/u]',
          message: 'Text for users comes from src/i18n/messages.ts.',
        },
      ],
    },
  },
]);
