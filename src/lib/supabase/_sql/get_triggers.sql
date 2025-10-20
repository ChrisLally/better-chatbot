-- Get all triggers from public, auth, and admin schemas
SELECT
    n.nspname as schemaname,
    t.tgname as triggername,
    c.relname as tablename,
    p.proname as functionname,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as definition
FROM
    pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
WHERE
    n.nspname IN (
        'public',
        'auth',
        'supabase_functions',
        'storage',
        'realtime'
    )
    AND NOT t.tgisinternal
ORDER BY n.nspname, c.relname, t.tgname;