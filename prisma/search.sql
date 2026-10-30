CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS dishes_search_vector_idx
  ON public."Dish"
  USING GIN (
    to_tsvector(
      'simple'::regconfig,
      coalesce("name", '') || ' ' || coalesce("description", '')
    )
  );

CREATE INDEX IF NOT EXISTS dishes_search_vector_folded_idx
  ON public."Dish"
  USING GIN (
    to_tsvector(
      'simple'::regconfig,
      translate(
        lower(coalesce("name", '')),
        'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
      )
      || ' ' ||
      translate(
        lower(coalesce("description", '')),
        'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
      )
    )
  );

CREATE INDEX IF NOT EXISTS dishes_name_sort_idx
  ON public."Dish" (lower("name"), "id");
CREATE INDEX IF NOT EXISTS dishes_category_price_available_idx
  ON public."Dish" ("category", "price", "available");

DO $$
DECLARE
  extension_schema text;
BEGIN
  SELECT namespace.nspname
  INTO extension_schema
  FROM pg_extension AS installed
  JOIN pg_namespace AS namespace ON namespace.oid = installed.extnamespace
  WHERE installed.extname = 'pg_trgm';

  IF extension_schema IS NULL THEN
    RAISE EXCEPTION 'pg_trgm extension is not installed';
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS dishes_name_trgm_idx ON public."Dish" USING GIN (lower("name") %I.gin_trgm_ops)',
    extension_schema
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS dishes_name_trgm_folded_idx ON public."Dish" USING GIN (translate(lower(coalesce("name", %L)), %L, %L) %I.gin_trgm_ops)',
    '',
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd',
    extension_schema
  );
END
$$;
