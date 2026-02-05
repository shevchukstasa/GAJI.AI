# Gaji.AI — Coding Standards

## JavaScript

### Variables
- Use `const` and `let` only, never `var`
- `camelCase` for variables and functions
- `UPPER_SNAKE_CASE` for constants
- Use numeric separators: `12_000_000` not `12000000`

### Functions
- Named functions for complex logic
- Arrow functions for simple operations
- Pure functions for calculations (no side effects)

### Constants
```javascript
const BPJS_RATES = {
  health: { employee: 0.01, employer: 0.04, maxBase: 12_000_000 },
  jht: { employee: 0.02, employer: 0.037 },
  jp: { employee: 0.01, employer: 0.02, maxBase: 10_547_400 },
  jkk: 0.0054,
  jkm: 0.003
};
```

## HTML
- Semantic elements (`<header>`, `<main>`, `<section>`, `<nav>`)
- `kebab-case` for CSS classes
- All inputs must have labels
- Forms must have validation

## CSS
- CSS custom properties for theming
- Mobile-first responsive design
- Group styles by component
- No `!important` unless absolutely necessary

## Error Handling
- Try/catch for async operations
- Fallback to cache on API failures
- Confirm before destructive actions
- Validate all user inputs at boundaries

## Performance
- Batch DOM updates (innerHTML assignment, not incremental)
- Event delegation over per-element listeners
- Only render active tab content
- Cache external data (holidays, etc.)

## Comments
- Explain WHY, not WHAT
- Document complex calculation formulas
- Use JSDoc for public functions

## Language
- UI: Bahasa Indonesia (primary), English (secondary)
- Legal terms: Indonesian (PPh 21, BPJS, THR, Lembur, NPWP, PTKP)
- Code comments: English
