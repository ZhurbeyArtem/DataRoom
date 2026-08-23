-- The old index lumped every root folder into a single group: their parentId
-- is NULL and COALESCE substituted THE SAME zero uuid for all of them.
-- The consequence: two rooms with the same name clashed with each other even
-- when they belonged to different users.
DROP INDEX IF EXISTS "item_unique_name_per_parent";

-- The rule for folder contents stays the same, but now applies only to rows
-- that actually have a parent.
CREATE UNIQUE INDEX "item_unique_child_name"
  ON "Item" ("parentId", lower("name"))
  WHERE "deletedAt" IS NULL AND "parentId" IS NOT NULL;

-- Roots obey a different invariant: a room has exactly one root folder.
-- That is more precise than name uniqueness — room names may repeat as often
-- as they like, whereas a second root would mean a broken tree.
CREATE UNIQUE INDEX "item_single_root_per_room"
  ON "Item" ("dataRoomId")
  WHERE "parentId" IS NULL AND "deletedAt" IS NULL;
