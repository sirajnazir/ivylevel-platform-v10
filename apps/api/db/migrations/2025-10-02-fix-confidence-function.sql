-- Fix confidence_weight function to handle fact_confidence enum

DROP FUNCTION IF EXISTS confidence_weight(text);

CREATE OR REPLACE FUNCTION confidence_weight(c fact_confidence)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE c
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 
  END;
$$;

-- Also create text version for flexibility
CREATE OR REPLACE FUNCTION confidence_weight(c text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(c)
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0 
  END;
$$;