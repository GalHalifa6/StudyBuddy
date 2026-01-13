# Script to view PostgreSQL data
Write-Host "=== StudyBuddy PostgreSQL Database ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Connection Details:" -ForegroundColor Yellow
Write-Host "  Host: localhost"
Write-Host "  Port: 5433"
Write-Host "  Database: studybuddy"
Write-Host "  Username: studybuddy"
Write-Host "  Password: studybuddy_password"
Write-Host ""

Write-Host "=== Quick Data Overview ===" -ForegroundColor Cyan
Write-Host ""

# Count tables
$tables = docker exec studybuddy-db psql -U studybuddy -d studybuddy -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
Write-Host "Total Tables: $($tables.Trim())" -ForegroundColor Green

# Count users
$users = docker exec studybuddy-db psql -U studybuddy -d studybuddy -t -c "SELECT COUNT(*) FROM users;"
Write-Host "Total Users: $($users.Trim())" -ForegroundColor Green

# Count courses
$courses = docker exec studybuddy-db psql -U studybuddy -d studybuddy -t -c "SELECT COUNT(*) FROM courses;"
Write-Host "Total Courses: $($courses.Trim())" -ForegroundColor Green

# Count study groups
$groups = docker exec studybuddy-db psql -U studybuddy -d studybuddy -t -c "SELECT COUNT(*) FROM study_groups;"
Write-Host "Total Study Groups: $($groups.Trim())" -ForegroundColor Green

Write-Host ""
Write-Host "=== Access Methods ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Command Line (psql):" -ForegroundColor Yellow
Write-Host "   docker exec -it studybuddy-db psql -U studybuddy -d studybuddy"
Write-Host ""
Write-Host "2. Database GUI Tools:" -ForegroundColor Yellow
Write-Host "   - DBeaver (Free): https://dbeaver.io/"
Write-Host "   - pgAdmin (Free): https://www.pgadmin.org/"
Write-Host "   - DataGrip (Paid): https://www.jetbrains.com/datagrip/"
Write-Host "   Connection: localhost:5433, Database: studybuddy, User: studybuddy"
Write-Host ""
Write-Host "3. View all tables:" -ForegroundColor Yellow
Write-Host "   docker exec studybuddy-db psql -U studybuddy -d studybuddy -c '\dt'"
Write-Host ""

