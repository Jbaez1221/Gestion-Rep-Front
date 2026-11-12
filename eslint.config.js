// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    ignores: ['dist/', 'coverage/', '.angular/', 'node_modules/'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      prettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/no-async-lifecycle-method': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Seguridad (OWASP A03/A07): nada de ejecutar texto como código, saltarse la sanitización
      // de Angular ni guardar sesiones o datos sensibles en el almacenamiento del navegador.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^bypassSecurityTrust/]',
          message:
            'No desactivar la sanitización de Angular: es la defensa contra XSS. Si es imprescindible, documentar y revisar en PR.',
        },
        {
          selector: 'MemberExpression[property.name="innerHTML"]',
          message:
            'No escribir innerHTML a mano: usar plantillas o [innerHTML], que Angular sanitiza.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'La sesión vive en cookies HttpOnly. Para preferencias de UI, usar el servicio de preferencias.',
        },
        {
          name: 'sessionStorage',
          message:
            'La sesión vive en cookies HttpOnly. Para preferencias de UI, usar el servicio de preferencias.',
        },
      ],
    },
  },
  {
    // Los tests prueban a propósito entradas maliciosas (p. ej. URLs javascript:).
    files: ['**/*.spec.ts', 'e2e/**/*.ts'],
    rules: { 'no-script-url': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility, prettier],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/no-inline-styles': 'error',
      '@angular-eslint/template/button-has-type': 'error',
    },
  },
]);
