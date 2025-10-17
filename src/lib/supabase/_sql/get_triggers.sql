-- Get all triggers from the database
SELECT 
    n.nspname as schemaname,
    t.tgname as triggername,
    c.relname as tablename,
    p.proname as functionname,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public' 
    AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;