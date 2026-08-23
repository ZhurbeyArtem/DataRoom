-- Names are unique within a folder, case-insensitively, among live rows only.
-- The partial condition is what keeps a file in the trash from blocking a new
-- name. COALESCE is there because Postgres treats NULLs as distinct, and
-- without it two roots with the same name would not clash.
CREATE UNIQUE INDEX "item_unique_name_per_parent"
  ON "Item" (COALESCE("parentId", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"))
  WHERE "deletedAt" IS NULL;

-- A public link has a token and no addressee; a named grant is the other way
-- round. The constraint makes a chimera row impossible — one on which the
-- access logic would behave unpredictably.
ALTER TABLE "Share" ADD CONSTRAINT "share_mode_shape" CHECK (
  ("type" = 'PUBLIC_LINK' AND "token" IS NOT NULL AND "granteeEmail" IS NULL)
  OR
  ("type" = 'USER_GRANT' AND "token" IS NULL AND "granteeEmail" IS NOT NULL)
);
