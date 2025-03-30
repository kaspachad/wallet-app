#!/bin/bash

echo "🔒 Injecting ensureAuthenticated into protected backend routes..."

for file in backend/routes/*.js; do
  echo "📝 Processing $file..."

  # Skip specific public routes
  sed -i -E '
    /router\.get\('\''\/(login|price\/kaspa|token\/refresh-logo|fix-token-icons)/! s/router\.get\('\''([^'\'']+)'\'' *,/router.get('\''\1'\'', ensureAuthenticated,/
    /router\.post\('\''\/login/! s/router\.post\('\''([^'\'']+)'\'' *,/router.post('\''\1'\'', ensureAuthenticated,/
  ' "$file"
done

echo "✅ Injection complete. Check your git diff to verify."

