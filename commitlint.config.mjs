// Conventional Commits (https://www.conventionalcommits.org): tipo(alcance opcional): descripción.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [1, 'always', 100],
  },
};
