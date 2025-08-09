# PowerShell script to run SQL fix without hanging
Write-Host "Running SQL fix for diary entries constraint..."

# Try different databases
$databases = @("school_db", "school_auth", "school_platform", "school_diary")

foreach ($db in $databases) {
    Write-Host "Trying database: $db"
    try {
        $result = docker run --rm --network local_school_network -v ${PWD}/fix_diary_constraint.sql:/tmp/fix_diary_constraint.sql -e PGPASSWORD=password postgres:15 psql -h school_postgres -U postgres -d $db -f /tmp/fix_diary_constraint.sql 2>&1
        Write-Host "Result for $db`: $result"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully fixed constraint in database: $db" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "Failed for database: $db" -ForegroundColor Red
    }
}

Write-Host "SQL fix completed!" 