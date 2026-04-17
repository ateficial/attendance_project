$ErrorActionPreference = "Stop"

function Call-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        $Body
    )

    try {
        if ($null -ne $Body) {
            $resp = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
        else {
            $resp = Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
        }

        $respStatus = "ok"
        if ($resp -and $resp.PSObject.Properties.Name -contains "status" -and $resp.status) {
            $respStatus = [string]$resp.status
        }

        return [PSCustomObject]@{
            name   = $Name
            ok     = $true
            detail = $respStatus
        }
    }
    catch {
        $msg = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($msg)) {
            $msg = $_.Exception.Message
        }

        return [PSCustomObject]@{
            name   = $Name
            ok     = $false
            detail = $msg
        }
    }
}

$base = "http://127.0.0.1:8090"
$results = @()

$profLogin = Invoke-RestMethod -Method Post -Uri "$base/api/custom/auth/login" -ContentType "application/json" -Body '{"role":"professor","email":"ahmed.hassan@university.edu","password":"Professor@123"}'
$studentLogin = Invoke-RestMethod -Method Post -Uri "$base/api/custom/auth/login" -ContentType "application/json" -Body '{"role":"student","email":"sara.mohamed.hassan@students.edu","password":"Student@123"}'
$taLogin = Invoke-RestMethod -Method Post -Uri "$base/api/custom/auth/login" -ContentType "application/json" -Body '{"role":"ta","email":"ahmed.nasser.ta@university.edu","password":"TA@123"}'
$adminLogin = Invoke-RestMethod -Method Post -Uri "$base/api/collections/_superusers/auth-with-password" -ContentType "application/json" -Body '{"identity":"admin@attendance.edu","password":"adminpassword123"}'

$hProf = @{ Authorization = "Bearer $($profLogin.access_token)" }
$hStudent = @{ Authorization = "Bearer $($studentLogin.access_token)" }
$hTa = @{ Authorization = "Bearer $($taLogin.access_token)" }
$hAdmin = @{ Authorization = "Bearer $($adminLogin.token)" }

$profReportSubjectId = "subj00000000002"
try {
    $profCourses = Invoke-RestMethod -Method Get -Uri "$base/api/custom/professor/courses" -Headers $hProf
    $profItems = @()
    if ($profCourses.data) {
        if ($profCourses.data.subjects) { $profItems = @($profCourses.data.subjects) }
        elseif ($profCourses.data.courses) { $profItems = @($profCourses.data.courses) }
        elseif ($profCourses.data.items) { $profItems = @($profCourses.data.items) }
    }
    if ($profItems.Count -gt 0) {
        $candidate = [string]($profItems[0].id)
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            $profReportSubjectId = $candidate
        }
    }
}
catch {
    # keep fallback id
}

$studentReportSubjectId = "subj00000000002"
try {
    $studentCourses = Invoke-RestMethod -Method Get -Uri "$base/api/custom/student/courses" -Headers $hStudent
    $studentItems = @()
    if ($studentCourses.data) {
        if ($studentCourses.data.courses) { $studentItems = @($studentCourses.data.courses) }
        elseif ($studentCourses.data.subjects) { $studentItems = @($studentCourses.data.subjects) }
        elseif ($studentCourses.data.items) { $studentItems = @($studentCourses.data.items) }
    }
    if ($studentItems.Count -gt 0) {
        $first = $studentItems[0]
        $candidate = ""
        if ($first.PSObject.Properties.Name -contains "id") { $candidate = [string]$first.id }
        elseif ($first.PSObject.Properties.Name -contains "subject_id") { $candidate = [string]$first.subject_id }

        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            $studentReportSubjectId = $candidate
        }
    }
}
catch {
    # keep fallback id
}

# Professor
$results += Call-Api -Name "prof_dashboard" -Method "GET" -Uri "$base/api/custom/professor/dashboard-stats" -Headers $hProf -Body $null
$results += Call-Api -Name "prof_schedule" -Method "GET" -Uri "$base/api/custom/professor/schedule" -Headers $hProf -Body $null
$results += Call-Api -Name "prof_courses" -Method "GET" -Uri "$base/api/custom/professor/courses" -Headers $hProf -Body $null
$results += Call-Api -Name "prof_sessions" -Method "GET" -Uri "$base/api/custom/professor/sessions" -Headers $hProf -Body $null
$results += Call-Api -Name "prof_recent_attendance" -Method "GET" -Uri "$base/api/custom/professor/recent-attendance" -Headers $hProf -Body $null
$results += Call-Api -Name "prof_report_subject" -Method "GET" -Uri "$base/api/custom/attendance-report?subject_id=$profReportSubjectId" -Headers $hProf -Body $null

# Student
$results += Call-Api -Name "student_dashboard" -Method "GET" -Uri "$base/api/custom/student/dashboard-stats" -Headers $hStudent -Body $null
$results += Call-Api -Name "student_courses" -Method "GET" -Uri "$base/api/custom/student/courses" -Headers $hStudent -Body $null
$results += Call-Api -Name "student_history" -Method "GET" -Uri "$base/api/custom/student/history" -Headers $hStudent -Body $null
$results += Call-Api -Name "student_warnings" -Method "GET" -Uri "$base/api/custom/student-warnings?student_id=stud00000000002" -Headers $hStudent -Body $null
$results += Call-Api -Name "student_report_subject" -Method "GET" -Uri "$base/api/custom/attendance-report?subject_id=$studentReportSubjectId" -Headers $hStudent -Body $null

# TA
$results += Call-Api -Name "ta_dashboard" -Method "GET" -Uri "$base/api/custom/ta/dashboard-stats" -Headers $hTa -Body $null
$results += Call-Api -Name "ta_subjects" -Method "GET" -Uri "$base/api/custom/ta/subjects" -Headers $hTa -Body $null
$results += Call-Api -Name "ta_sessions" -Method "GET" -Uri "$base/api/custom/ta/sessions" -Headers $hTa -Body $null
$results += Call-Api -Name "ta_recent_attendance" -Method "GET" -Uri "$base/api/custom/ta/recent-attendance" -Headers $hTa -Body $null
$results += Call-Api -Name "ta_report_subject" -Method "GET" -Uri "$base/api/custom/attendance-report?subject_id=subj00000000002" -Headers $hTa -Body $null

# Admin
$results += Call-Api -Name "admin_overview" -Method "GET" -Uri "$base/api/custom/admin/overview" -Headers $hAdmin -Body $null
$results += Call-Api -Name "admin_schedule" -Method "GET" -Uri "$base/api/custom/admin/schedule?level=1&semester=second&academic_year=2025-2026" -Headers $hAdmin -Body $null
$results += Call-Api -Name "admin_students" -Method "GET" -Uri "$base/api/custom/admin/students?page=1&per_page=10" -Headers $hAdmin -Body $null
$results += Call-Api -Name "admin_tas" -Method "GET" -Uri "$base/api/custom/admin/teaching-assistants" -Headers $hAdmin -Body $null

$results | ConvertTo-Json -Depth 6
