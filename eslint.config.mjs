import coreWebVitals from 'eslint-config-next/core-web-vitals'

export default [
  ...coreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'public/sw.js'],
  },
  {
    rules: {
      // Türkçe metinlerdeki tırnaklar için kozmetik kural, kapalı
      'react/no-unescaped-entities': 'off',
    },
  },
]
