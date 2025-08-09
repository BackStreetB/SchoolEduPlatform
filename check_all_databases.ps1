# Check all databases for diary_entries table
Write-Host "Checking all databases for diary_entries table..."

$databases = @("school_db", "school_auth", "school_platform", "school_diary", "school_reports", "school_community")

foreach ($db in $databases) {
    Write-Host "Checking database: $db"
    try {
        $result = docker run --rm --network local_school_network -v ${PWD}/check_diary_table.sql:/tmp/check_diary_table.sql -e PGPASSWORD=password postgres:15 psql -h school_postgres -U postgres -d $db -f /tmp/check_diary_table.sql 2>&1
        Write-Host "Result for $db`: $result"
        if ($result -like "*diary_entries*") {
            Write-Host "Found diary_entries table in: $db" -ForegroundColor Green
            # Now run the fix on this database
            $fixResult = docker run --rm --network local_school_network -v ${PWD}/fix_diary_constraint.sql:/tmp/fix_diary_constraint.sql -e PGPASSWORD=password postgres:15 psql -h school_postgres -U postgres -d $db -f /tmp/fix_diary_constraint.sql 2>&1
            Write-Host "Fix result for $db`: $fixResult" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Failed for database: $db" -ForegroundColor Red
    }
}

Write-Host "Database check completed!" 