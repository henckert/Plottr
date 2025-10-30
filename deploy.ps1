# Plottr Deployment Script
# Quick deploy to share with your partner

Write-Host "🚀 Plottr Deployment Helper" -ForegroundColor Cyan
Write-Host ""

# Check current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $branch" -ForegroundColor Yellow

# Show uncommitted changes
$status = git status --short
if ($status) {
    Write-Host ""
    Write-Host "⚠️  Uncommitted changes detected:" -ForegroundColor Red
    git status --short
    Write-Host ""
    $commit = Read-Host "Commit changes before deploying? (y/n)"
    if ($commit -eq "y") {
        $message = Read-Host "Commit message"
        git add -A
        git commit -m $message --no-verify
    }
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Green
git push origin $branch

Write-Host ""
Write-Host "✅ Code pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com and sign in with GitHub"
Write-Host "2. Click 'Add New Project' and import 'henckert/Plottr'"
Write-Host "3. Select branch: $branch"
Write-Host "4. Root Directory: web"
Write-Host "5. Add environment variables (see DEPLOYMENT_GUIDE.md)"
Write-Host "6. Click Deploy!"
Write-Host ""
Write-Host "Or install Vercel CLI and run: vercel --prod" -ForegroundColor Yellow
Write-Host ""
