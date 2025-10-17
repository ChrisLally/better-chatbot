-- Get all functions from the database
SELECT 
    n.nspname as schemaname,
    p.proname as functionname,
    pg_get_userbyid(p.proowner) as functionowner,
    pg_get_function_result(p.oid) as returntype,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;