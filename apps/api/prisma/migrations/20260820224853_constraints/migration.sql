-- Ім'я унікальне в межах папки, регістронезалежно, і лише серед живих рядків.
-- Часткова умова потрібна, щоб файл у кошику не блокував нове ім'я.
-- COALESCE тому, що Postgres вважає NULL значення різними, і без нього
-- два корені з однаковим іменем не конфліктували б.
CREATE UNIQUE INDEX "item_unique_name_per_parent"
  ON "Item" (COALESCE("parentId", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"))
  WHERE "deletedAt" IS NULL;

-- Публічне посилання має токен і не має адресата; поіменний доступ — навпаки.
-- Констрейнт робить неможливим рядок-химеру, на якому логіка доступу
-- поводилася б непередбачувано.
ALTER TABLE "Share" ADD CONSTRAINT "share_mode_shape" CHECK (
  ("type" = 'PUBLIC_LINK' AND "token" IS NOT NULL AND "granteeEmail" IS NULL)
  OR
  ("type" = 'USER_GRANT' AND "token" IS NULL AND "granteeEmail" IS NOT NULL)
);
