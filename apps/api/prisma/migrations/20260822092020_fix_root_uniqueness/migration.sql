-- Старий індекс складав усі кореневі папки в одну групу: для них parentId
-- дорівнює NULL, а COALESCE підставляв ОДИН І ТОЙ САМИЙ нульовий uuid.
-- Наслідок: дві кімнати з однаковою назвою конфліктували між собою навіть
-- у різних користувачів.
DROP INDEX IF EXISTS "item_unique_name_per_parent";

-- Правило для вмісту папок лишається тим самим, але тепер стосується
-- лише тих рядків, у яких батько справді є.
CREATE UNIQUE INDEX "item_unique_child_name"
  ON "Item" ("parentId", lower("name"))
  WHERE "deletedAt" IS NULL AND "parentId" IS NOT NULL;

-- Для коренів діє інший інваріант: у кімнати рівно одна коренева папка.
-- Це точніше за унікальність назви — назви кімнат можуть повторюватися
-- скільки завгодно, а от другий корінь означав би зламане дерево.
CREATE UNIQUE INDEX "item_single_root_per_room"
  ON "Item" ("dataRoomId")
  WHERE "parentId" IS NULL AND "deletedAt" IS NULL;
