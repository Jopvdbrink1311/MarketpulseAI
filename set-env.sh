#!/bin/bash
echo "https://elsbekfvncqgoxocsxpl.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production --force
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsc2Jla2Z2bmNxZ294b2NzeHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTMwODksImV4cCI6MjA5NzI2OTA4OX0.u-Ieuz3L9nkqlSJfGXtW1sNdiwdVnSPIhnpqxJPeaAA" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force
echo "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" | npx vercel env add ANTHROPIC_API_KEY production --force
echo "Klaar! Nu deployen met: npx vercel --prod"
