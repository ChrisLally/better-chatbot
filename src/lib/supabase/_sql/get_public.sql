-- Get all data from all public tables as JSON arrays
CREATE OR REPLACE FUNCTION get_all_table_data()
RETURNS TABLE(table_name TEXT, rows JSON) AS $$
DECLARE
    table_record RECORD;
    query_text TEXT;
    result_json JSON;
BEGIN
    -- Loop through all tables in the public schema
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        -- Build query to get all rows as JSON array
        query_text := 'SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM ' || quote_ident(table_record.tablename) || ') t';
        
        -- Execute the query and get result
        EXECUTE query_text INTO result_json;
        
        -- Return the row
        table_name := table_record.tablename;
        rows := result_json;
        RETURN NEXT;
        
    END LOOP;
    
    RETURN;
END $$ LANGUAGE plpgsql;

-- Call the function
SELECT * FROM get_all_table_data();