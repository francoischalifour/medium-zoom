import playwright from '@playwright/test/package.json' with { type: 'json' }

console.log(`image=mcr.microsoft.com/playwright:v${playwright.version}-noble`)
