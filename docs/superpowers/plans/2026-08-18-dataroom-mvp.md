# Data Room MVP — план реалізації

> **Для агентів-виконавців:** ОБОВ'ЯЗКОВА СУБ-НАВИЧКА: використовуй
> superpowers:subagent-driven-development (рекомендовано) або
> superpowers:executing-plans, щоб виконувати цей план задача за задачею.
> Кроки мають checkbox-синтаксис (`- [ ]`) для відстеження.

**Мета:** Побудувати й задеплоїти MVP Data Room — захищений репозиторій документів
із деревом папок, аплоадом PDF, шарингом за посиланням і поіменно, кошиком і пошуком.

**Архітектура:** Монорепо з двох застосунків. `apps/api` — NestJS із Prisma поверх
PostgreSQL, де папка й файл є одним типом `Item` із матеріалізованим шляхом предків;
доступ розв'язується одним гвардом по ланцюжку `[id, ...path]`. `apps/web` — Vite SPA
на TanStack Router і Query, що ходить у той самий API і як власник, і як публічний
глядач. Файли браузер вантажить напряму в Supabase Storage за підписаними URL — API
байтів не бачить.

**Стек:** NestJS 10, Prisma 5, PostgreSQL (Supabase), Supabase Storage, Passport JWT,
bcrypt, class-validator, Swagger; React 18, TypeScript 5, Vite 5, TanStack Router,
TanStack Query 5, Zustand, Tailwind 3, shadcn/ui, Storybook 8.

**Специфікація:** `docs/superpowers/specs/2026-08-18-dataroom-design.md` — читай її
перед початком. Цей план її реалізує, не змінює.

## Глобальні обмеження

- **Тестів немає.** Свідоме рішення власника проєкту: це MVP, задача — показати
  працюючий результат. Замість тестового циклу кожна задача завершується перевіркою
  збірки, типів і реальної поведінки через Swagger UI або браузер. Не додавай
  тестові фреймворки й не пиши тести, навіть якщо звичка підказує інакше.
- **Хешування паролів — `bcrypt`**, не argon2.
- **Контролери тонкі.** У контролері лише отримання даних із запиту і виклик сервісу.
  Уся логіка — в сервісах.
- **Кожен модуль має власні `dto/` та `interfaces/`.**
- **Задовгий метод ріжеться на приватні методи** заради читабельності.
- **Логіка, що повторюється в кількох сервісах одного модуля, виноситься в `helpers/`**;
  ім'я файлу описує, що функція робить (`resolve-name-conflict.helper.ts`).
- **Сервіси наслідують `BaseCrudService`** напряму, вказуючи лише свою модель.
- **Відмова в доступі — завжди `404`, ніколи `403`**, щоб не можна було перебором
  з'ясувати, які документи існують у чужій кімнаті.
- **`dataRoomId` фільтрується в кожному запиті до `Item`** — це межа орендаря.
- **Мова коду й коментарів — англійська.** Мова комітів і UI — українська.
- **Коміт після кожної задачі**, повідомлення в стилі Conventional Commits.
- **Prisma 7, не 5.** Генератор `prisma-client` видає TypeScript у `src/generated/prisma`,
  рядок підключення живе в `prisma.config.ts`, рантайм працює через драйвер-адаптер
  `@prisma/adapter-pg`. Наслідок для всього коду нижче: моделі та енуми імпортуються
  **не** з `@prisma/client`, а з барелю `src/common/prisma/client.ts` — відносним шляхом
  за глибиною файлу (`../../common/prisma/client` з `modules/<модуль>/`,
  `../../../common/prisma/client` з `modules/<модуль>/<підпапка>/`). Скрізь, де в коді
  плану стоїть `from '@prisma/client'`, підставляй цей шлях.
- **Значення enum у схемі Prisma — кожне з нового рядка.** Однорядковий
  `enum ItemType { FOLDER FILE }` не валідний.

---

## Структура файлів

### `apps/api`

```
src/
  main.ts                       bootstrap, Swagger, CORS, global pipes
  app.module.ts

  common/
    prisma/
      prisma.module.ts
      prisma.service.ts         підключення, $connect/$disconnect
    crud/
      base-crud.service.ts      create/update/delete/findOne/findMany/
                                findOneWithError/queryBuilder
      cursor.util.ts            encodeCursor/decodeCursor/keysetWhere
      dto/list-query.dto.ts     cursor, limit, sort, order
      interfaces/paginated.interface.ts
    http/
      all-exceptions.filter.ts  єдиний формат помилки + запис у Log
      transform.interceptor.ts  єдина форма успішної відповіді
      request-context.ts        AsyncLocalStorage: requestId, userId
      request-context.middleware.ts
    logger/
      log.module.ts
      log.service.ts            register(name, data, ttl?)
    jobs/
      cleanup.service.ts        @Cron: PENDING-сироти + протерміновані логи

  modules/
    auth/
      auth.module.ts  auth.controller.ts  auth.service.ts
      strategies/{jwt.strategy.ts,google.strategy.ts}
      guards/{jwt-auth.guard.ts,optional-jwt.guard.ts}
      decorators/current-user.decorator.ts
      helpers/token.helper.ts
      dto/  interfaces/
    users/
      users.module.ts  users.service.ts  dto/  interfaces/
    data-rooms/
      data-rooms.module.ts  .controller.ts  .service.ts  dto/  interfaces/
    items/
      items.module.ts  items.controller.ts  items.service.ts
      uploads.controller.ts  uploads.service.ts
      helpers/
        resolve-name-conflict.helper.ts
        build-item-path.helper.ts
        assert-not-descendant.helper.ts
      dto/  interfaces/
    shares/
      shares.module.ts  shares.controller.ts  shares.service.ts
      access.service.ts         розв'язання доступу по [id, ...path]
      guards/access.guard.ts
      decorators/require-role.decorator.ts
      dto/  interfaces/
    storage/
      storage.module.ts  storage.service.ts   адаптер Supabase Storage

prisma/
  schema.prisma
  migrations/
```

### `apps/web`

```
src/
  main.tsx  app/
    providers.tsx      QueryClient, Router, Toaster
    router.tsx
  routes/              файлові маршрути TanStack Router
  features/
    auth/              LoginForm, RegisterForm, useSession, route-guard
    data-rooms/        RoomsGrid, CreateRoomDialog
    items/
      components/      ItemsTable, ItemRow, Breadcrumbs, ItemActionsMenu,
                       CreateFolderDialog, RenameDialog, MoveDialog,
                       DeleteDialog, FolderDropZone
      hooks/           useItemsList, useItemMutations, useSubtreeStats
    upload/            upload.store.ts, UploadPanel, UploadRow, useDropUpload
    sharing/           ShareDialog, ShareList, PublicShell, useShareToken
    viewer/            PdfViewerDialog
    trash/  search/
  shared/
    api/               client.ts, auth.ts, data-rooms.ts, items.ts,
                       shares.ts, types.gen.ts
    ui/                shadcn-компоненти + *.stories.tsx
    lib/               format-bytes.ts, cn.ts, format-date.ts
```

---

## Задача 1: Монорепо, схема БД, порожній API, що піднімається

**Файли:**
- Створити: `package.json`, `.gitignore`, `.env.example`
- Створити: `apps/api/` (скелет NestJS)
- Створити: `apps/api/prisma/schema.prisma`
- Створити: `apps/api/src/common/prisma/prisma.service.ts`, `prisma.module.ts`
- Змінити: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`

**Інтерфейси:**
- Виробляє: `PrismaService extends PrismaClient` — інжектиться в усі сервіси далі.
  Prisma-типи `Item`, `DataRoom`, `Share`, `User`, `Log` та енуми `ItemType`,
  `ItemStatus`, `ShareType`, `ShareRole`, `LogLevel` доступні з `@prisma/client`.

- [ ] **Крок 1: Ініціалізувати монорепо**

```bash
npm init -y
npm pkg set name="dataroom" private=true
npm pkg set workspaces[0]="apps/*"
```

Створити `.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
apps/web/.vite/
storybook-static/
```

- [ ] **Крок 2: Створити скелет NestJS**

```bash
npx @nestjs/cli new api --directory apps/api --package-manager npm --skip-git
```

```bash
npm install --workspace apps/api @nestjs/config @nestjs/swagger @nestjs/schedule class-validator class-transformer @prisma/client @prisma/adapter-pg
```

```bash
npm install --workspace apps/api --save-dev prisma dotenv
```

`dotenv` потрібен `prisma.config.ts`, `@prisma/adapter-pg` — рантайму клієнта.

- [ ] **Крок 3: Створити проєкт Supabase і записати змінні оточення**

У консолі Supabase створити проєкт, узяти connection string (режим Session, порт 5432)
та service_role key. Створити приватний бакет `dataroom-files`.

Створити `.env.example` у корені репозиторію:

```
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

SUPABASE_URL="https://PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_BUCKET="dataroom-files"

JWT_ACCESS_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-too"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="30d"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

PORT=3000
WEB_ORIGIN="http://localhost:5173"
```

Скопіювати в `apps/api/.env` і заповнити реальними значеннями.

- [ ] **Крок 4: Написати схему Prisma**

Створити `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
  runtime      = "nodejs"
}

datasource db {
  provider = "postgresql"
}

enum ItemType {
  FOLDER
  FILE
}

enum ItemStatus {
  PENDING
  READY
}

enum ShareType {
  PUBLIC_LINK
  USER_GRANT
}

enum ShareRole {
  VIEWER
}

enum LogLevel {
  ERROR
  WARN
  INFO
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique
  passwordHash String?
  googleId     String?  @unique
  name         String
  avatarUrl    String?
  createdAt    DateTime @default(now()) @db.Timestamptz

  dataRooms     DataRoom[]
  refreshTokens RefreshToken[]
  items         Item[]
  shares        Share[]
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  tokenHash String    @unique
  expiresAt DateTime  @db.Timestamptz
  revokedAt DateTime? @db.Timestamptz
  createdAt DateTime  @default(now()) @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model DataRoom {
  id         String   @id @default(uuid()) @db.Uuid
  name       String
  ownerId    String   @db.Uuid
  rootItemId String?  @unique @db.Uuid
  createdAt  DateTime @default(now()) @db.Timestamptz

  owner    User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  rootItem Item?  @relation("RoomRoot", fields: [rootItemId], references: [id])
  items    Item[] @relation("RoomItems")

  @@index([ownerId])
}

model Item {
  id          String     @id @default(uuid()) @db.Uuid
  dataRoomId  String     @db.Uuid
  parentId    String?    @db.Uuid
  path        String[]   @db.Uuid
  depth       Int        @default(0)
  type        ItemType
  name        String
  storageKey  String?
  mimeType    String?
  size        BigInt?
  status      ItemStatus @default(READY)
  deletedAt   DateTime?  @db.Timestamptz
  createdById String     @db.Uuid
  createdAt   DateTime   @default(now()) @db.Timestamptz
  updatedAt   DateTime   @updatedAt @db.Timestamptz

  dataRoom  DataRoom  @relation("RoomItems", fields: [dataRoomId], references: [id], onDelete: Cascade)
  parent    Item?     @relation("ItemChildren", fields: [parentId], references: [id], onDelete: Cascade)
  children  Item[]    @relation("ItemChildren")
  createdBy User      @relation(fields: [createdById], references: [id])
  shares    Share[]
  rootOf    DataRoom? @relation("RoomRoot")

  @@index([dataRoomId, parentId, deletedAt])
  @@index([dataRoomId, name])
  @@index([path], type: Gin)
}

model Share {
  id           String    @id @default(uuid()) @db.Uuid
  itemId       String    @db.Uuid
  type         ShareType
  token        String?   @unique
  granteeEmail String?
  role         ShareRole @default(VIEWER)
  expiresAt    DateTime? @db.Timestamptz
  revokedAt    DateTime? @db.Timestamptz
  createdById  String    @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz

  item      Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  createdBy User @relation(fields: [createdById], references: [id])

  @@index([itemId])
  @@index([granteeEmail])
}

model Log {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  level     LogLevel @default(ERROR)
  message   String
  context   Json?
  requestId String?
  expiresAt DateTime @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz

  @@index([expiresAt])
  @@index([name, createdAt])
}
```

Два місця виглядають дивно і зроблені навмисно.

`DataRoom.rootItemId` нульований, хоча логічно обов'язковий. Причина — циклічна
залежність: `Item` не можна створити без `dataRoomId`, а кімнату хочеться створити
одразу з коренем. Обидва рядки створюються в одній транзакції, і поле заповнюється
другим кроком. Нульованість — технічна ціна транзакції, а не дозвіл на кімнату без кореня.

`email` — звичайний `String @unique`, а не `citext`. Замість розширення Postgres email
нормалізується в нижній регістр на запису (у `UsersService`). Той самий ефект без
залежності від розширення, яке довелося б окремо вмикати на Supabase.

- [ ] **Крок 5: Застосувати першу міграцію**

```bash
cd apps/api && npx prisma migrate dev --name init
```

Очікується: створено `prisma/migrations/<timestamp>_init/migration.sql`, таблиці в БД,
згенеровано клієнт.

- [ ] **Крок 6: Додати міграцію з частковим індексом і CHECK-констрейнтом**

Prisma не вміє ні часткових індексів, ні `lower()` в індексі, ні CHECK — тому створюємо
порожню міграцію і заповнюємо вручну:

```bash
cd apps/api && npx prisma migrate dev --create-only --name constraints
```

Записати у створений `migration.sql`:

```sql
CREATE UNIQUE INDEX "item_unique_name_per_parent"
  ON "Item" (COALESCE("parentId", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"))
  WHERE "deletedAt" IS NULL;

ALTER TABLE "Share" ADD CONSTRAINT "share_mode_shape" CHECK (
  ("type" = 'PUBLIC_LINK' AND "token" IS NOT NULL AND "granteeEmail" IS NULL)
  OR
  ("type" = 'USER_GRANT' AND "token" IS NULL AND "granteeEmail" IS NOT NULL)
);
```

Частковий індекс тримає три правила одразу: ім'я унікальне в межах папки,
регістронезалежно, і лише серед живих рядків — файл у кошику не блокує нове ім'я.
`COALESCE` потрібен тому, що Postgres вважає `NULL` значення різними, і без нього
два корені з однаковим іменем не конфліктували б.

CHECK робить неможливим рядок-химеру на кшталт «публічне посилання, видане конкретному
email» — стан, на якому логіка доступу поводилася б непередбачувано.

Застосувати:

```bash
npx prisma migrate dev
```

- [ ] **Крок 7: Написати PrismaService**

Створити `apps/api/src/common/prisma/prisma.service.ts`:

Спершу барель, який знає шлях генерації — `apps/api/src/common/prisma/client.ts`:

```ts
/**
 * Єдине місце, яке знає, куди Prisma 7 генерує клієнт.
 * Решта коду імпортує моделі та енуми звідси, тому зміна шляху генерації
 * зачіпає один файл, а не весь застосунок.
 */
export * from '../../generated/prisma/client';
```

Далі сам сервіс:

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 підключається через драйвер-адаптер, а не через url у схемі.
    // Рядок підключення в prisma.config.ts потрібен лише CLI для міграцій.
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

**`moduleFormat = "cjs"` у генераторі — не косметика.** Без нього Node вантажить
згенерований клієнт як ES-модуль і падає з `ReferenceError: exports is not defined
in ES module scope`, бо решта застосунку — CommonJS.

Ще одна пастка: `prisma.config.ts` лежить поза `src/`, і якщо його не виключити,
tsc розширює корінь компіляції й кладе результат у `dist/src/` замість `dist/`,
через що `node dist/main` перестає існувати. У `tsconfig.json` виставити
`"rootDir": "./src"`, `"include": ["src/**/*"]`, `"exclude": ["node_modules", "dist"]`.

Створити `apps/api/src/common/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

`@Global()` тут виправданий: `PrismaService` не має власної логіки й потрібен буквально
кожному модулю. Імпортувати його по одному в кожен модуль — шум без користі.

- [ ] **Крок 8: Підняти застосунок зі Swagger**

Замінити вміст `apps/api/src/main.ts`:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.WEB_ORIGIN, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Data Room API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Share-Token', in: 'header' }, 'share-token')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

`whitelist: true` відсікає поля, яких немає в DTO, замість того щоб тихо їх пропускати —
інакше клієнт зміг би дописати в тіло запиту `ownerId` і протягти його в Prisma.

Замінити вміст `apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
})
export class AppModule {}
```

Видалити згенеровані CLI файли `app.controller.ts`, `app.service.ts` і всі `.spec.ts` —
вони не потрібні.

- [ ] **Крок 9: Перевірити**

```bash
cd apps/api && npm run start:dev
```

Очікується: у логах `Nest application successfully started`; `http://localhost:3000/docs`
відкриває Swagger UI з порожнім списком ендпоінтів; у Supabase → Table Editor видно шість
таблиць. Помилка підключення тут майже завжди означає не той пароль або не той порт
у `DATABASE_URL`.

- [ ] **Крок 10: Коміт**

```bash
git add -A && git commit -m "feat(api): монорепо, схема БД і скелет NestJS зі Swagger"
```

---

## Задача 2: Спільний шар — базовий CRUD, курсор, контекст запиту, логування, помилки

**Файли:**
- Створити: `apps/api/src/common/crud/base-crud.service.ts`
- Створити: `apps/api/src/common/crud/cursor.util.ts`
- Створити: `apps/api/src/common/crud/dto/list-query.dto.ts`
- Створити: `apps/api/src/common/crud/interfaces/paginated.interface.ts`
- Створити: `apps/api/src/common/http/request-context.ts`, `request-context.middleware.ts`
- Створити: `apps/api/src/common/http/all-exceptions.filter.ts`, `transform.interceptor.ts`
- Створити: `apps/api/src/common/logger/log.service.ts`, `log.module.ts`
- Створити: `apps/api/src/common/jobs/cleanup.service.ts`
- Змінити: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`

**Інтерфейси:**
- Споживає: `PrismaService` із Задачі 1.
- Виробляє:
  - `BaseCrudService<TDelegate>` з методами `create`, `update`, `delete`, `findOne`,
    `findMany`, `findOneWithError(args, message?)`, `queryBuilder(query, config)`
  - `ListQueryDto { cursor?: string; limit?: number; sort?: string; order?: 'asc' | 'desc' }`
  - `Paginated<T> { data: T[]; nextCursor: string | null }`
  - `encodeCursor(fields)`, `decodeCursor(raw)`, `keysetWhere(fields)`
  - `RequestContext.get(): { requestId: string; userId?: string }`, `RequestContext.setUserId(id)`
  - `LogService.register(name: string, data: string, ttl?: number): Promise<void>` — `ttl` у мілісекундах

- [ ] **Крок 1: Курсор і keyset-предикат**

Створити `apps/api/src/common/crud/cursor.util.ts`:

```ts
export interface CursorField {
  field: string;
  value: string | number;
}

export function encodeCursor(fields: CursorField[]): string {
  return Buffer.from(JSON.stringify(fields)).toString('base64url');
}

export function decodeCursor(raw: string): CursorField[] {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed as CursorField[];
  } catch {
    throw new Error('Malformed cursor');
  }
}

/**
 * Keyset-предикат для впорядкованого набору полів.
 * Для [type, name, id] дає:
 *   type > c.type
 *   OR (type = c.type AND name > c.name)
 *   OR (type = c.type AND name = c.name AND id > c.id)
 * Тобто "усе, що йде строго після цього рядка" у тому ж порядку сортування.
 */
export function keysetWhere(fields: CursorField[]): Record<string, unknown> {
  return {
    OR: fields.map((_, index) => {
      const clause: Record<string, unknown> = {};
      for (const equal of fields.slice(0, index)) {
        clause[equal.field] = equal.value;
      }
      clause[fields[index].field] = { gt: fields[index].value };
      return clause;
    }),
  };
}
```

- [ ] **Крок 2: DTO і форма сторінки**

Створити `apps/api/src/common/crud/dto/list-query.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListQueryDto {
  @ApiPropertyOptional({ description: 'Курсор із попередньої сторінки' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
```

Створити `apps/api/src/common/crud/interfaces/paginated.interface.ts`:

```ts
export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}
```

- [ ] **Крок 3: Базовий CRUD**

Створити `apps/api/src/common/crud/base-crud.service.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { ListQueryDto } from './dto/list-query.dto';
import { CursorField, decodeCursor, keysetWhere } from './cursor.util';

/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` тут навмисний і локалізований: це форма, якій мають відповідати всі
// делегати Prisma. Реальні типи повертаються нащадкам через Parameters<...>,
// тому назовні жодного `any` не витікає.
export interface PrismaDelegate {
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  findFirst(args: any): Promise<any>;
  findMany(args: any): Promise<any[]>;
}

export interface KeysetConfig {
  /** Поля сортування в порядку пріоритету. Останнім завжди має бути `id`. */
  fields: string[];
  defaultLimit?: number;
}

export interface BuiltQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'>[];
  take: number;
}

export abstract class BaseCrudService<TDelegate extends PrismaDelegate> {
  protected constructor(protected readonly model: TDelegate) {}

  create(args: Parameters<TDelegate['create']>[0]) {
    return this.model.create(args);
  }

  update(args: Parameters<TDelegate['update']>[0]) {
    return this.model.update(args);
  }

  delete(args: Parameters<TDelegate['delete']>[0]) {
    return this.model.delete(args);
  }

  findOne(args: Parameters<TDelegate['findFirst']>[0]) {
    return this.model.findFirst(args);
  }

  findMany(args?: Parameters<TDelegate['findMany']>[0]) {
    return this.model.findMany(args as Parameters<TDelegate['findMany']>[0]);
  }

  async findOneWithError(
    args: Parameters<TDelegate['findFirst']>[0],
    message = 'Not found',
  ): Promise<NonNullable<Awaited<ReturnType<TDelegate['findFirst']>>>> {
    const found = await this.findOne(args);
    if (found === null || found === undefined) {
      throw new NotFoundException(message);
    }
    return found as NonNullable<Awaited<ReturnType<TDelegate['findFirst']>>>;
  }

  /**
   * Перетворює query-параметри на аргументи Prisma з курсорною пагінацією.
   * Бере на один рядок більше, ніж просили, — зайвий рядок і є ознакою,
   * що наступна сторінка існує, без окремого count-запиту.
   */
  queryBuilder(query: ListQueryDto, config: KeysetConfig): BuiltQuery {
    const order = query.order ?? 'asc';
    const limit = query.limit ?? config.defaultLimit ?? 50;

    const where = query.cursor ? keysetWhere(decodeCursor(query.cursor)) : {};
    const orderBy = config.fields.map((field) => ({ [field]: order }));

    return { where, orderBy, take: limit + 1 };
  }
}
```

- [ ] **Крок 4: Хелпер, що ріже сторінку**

Дописати в кінець `cursor.util.ts`:

```ts
/**
 * Відрізає службовий "зайвий" рядок і збирає курсор із останнього реального.
 * Викликається сервісами після Prisma-запиту, побудованого через queryBuilder.
 */
export function toPage<T extends Record<string, unknown>>(
  rows: T[],
  limit: number,
  fields: string[],
): { data: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  if (!hasMore || data.length === 0) {
    return { data, nextCursor: null };
  }

  const last = data[data.length - 1];
  const cursorFields: CursorField[] = fields.map((field) => ({
    field,
    value: last[field] as string | number,
  }));

  return { data, nextCursor: encodeCursor(cursorFields) };
}
```

- [ ] **Крок 5: Контекст запиту**

Створити `apps/api/src/common/http/request-context.ts`:

```ts
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
  run<T>(store: RequestStore, callback: () => T): T {
    return storage.run(store, callback);
  },

  get(): RequestStore | undefined {
    return storage.getStore();
  },

  setUserId(userId: string): void {
    const store = storage.getStore();
    if (store) store.userId = userId;
  },
};
```

Створити `apps/api/src/common/http/request-context.middleware.ts`:

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    RequestContext.run({ requestId }, () => next());
  }
}
```

`userId` дописується вже після автентифікації — це робить `JwtStrategy` у Задачі 3.

- [ ] **Крок 6: Логування**

Створити `apps/api/src/common/logger/log.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { LogLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../http/request-context';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class LogService {
  private readonly fallback = new Logger(LogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Записує один рядок у таблицю Log.
   * `name` — ім'я логу, `data` — його вміст, `ttl` — час життя в мілісекундах.
   * requestId дістається з контексту запиту, передавати його не треба.
   *
   * Помилка самого запису ніколи не валить запит: логер — діагностика,
   * а не частина бізнес-операції.
   */
  async register(name: string, data: string, ttl: number = TWO_WEEKS_MS): Promise<void> {
    try {
      await this.prisma.log.create({
        data: {
          name,
          message: data,
          level: LogLevel.ERROR,
          requestId: RequestContext.get()?.requestId,
          context: this.buildContext(),
          expiresAt: new Date(Date.now() + ttl),
        },
      });
    } catch (error) {
      this.fallback.error(`Не вдалося записати лог "${name}"`, error as Error);
    }
  }

  private buildContext(): Record<string, unknown> | undefined {
    const store = RequestContext.get();
    if (!store?.userId) return undefined;
    return { userId: store.userId };
  }
}
```

Створити `apps/api/src/common/logger/log.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { LogService } from './log.service';

@Global()
@Module({ providers: [LogService], exports: [LogService] })
export class LogModule {}
```

- [ ] **Крок 7: Єдиний формат помилки**

Створити `apps/api/src/common/http/all-exceptions.filter.ts`:

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { LogService } from '../logger/log.service';
import { RequestContext } from './request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logService: LogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = RequestContext.get()?.requestId ?? 'unknown';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Внутрішня помилка сервера';

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      void this.logService.register(
        'http.exception',
        this.describe(exception, host),
      );
    }

    response.status(status).json({
      code: this.codeFor(status),
      message,
      requestId,
    });
  }

  private describe(exception: unknown, host: ArgumentsHost): string {
    const request = host.switchToHttp().getRequest<{ method: string; url: string }>();
    const stack = exception instanceof Error ? exception.stack : String(exception);
    return `${request.method} ${request.url}\n${stack ?? 'no stack'}`;
  }

  private codeFor(status: number): string {
    return HttpStatus[status] ?? 'ERROR';
  }
}
```

Створити `apps/api/src/common/http/transform.interceptor.ts`:

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<{ data: T }> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
```

Списки вже мають форму `{ data, nextCursor }`, тому інтерсептор загорне їх у
`{ data: { data, nextCursor } }`. Щоб цього не сталося, зробити виняток: якщо
значення — об'єкт із ключем `nextCursor`, повертати його як є.

```ts
      map((payload) => {
        if (payload !== null && typeof payload === 'object' && 'nextCursor' in payload) {
          return payload as unknown as { data: T };
        }
        return { data: payload };
      }),
```

- [ ] **Крок 8: Фонова чистка**

Створити `apps/api/src/common/jobs/cleanup.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ItemStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ORPHAN_UPLOAD_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run(): Promise<void> {
    const logs = await this.prisma.log.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const uploads = await this.prisma.item.deleteMany({
      where: {
        status: ItemStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - ORPHAN_UPLOAD_TTL_MS) },
      },
    });

    this.logger.log(`Прибрано ${logs.count} логів і ${uploads.count} незавершених аплоадів`);
  }
}
```

Видалення блобів-сиріт дописується в Задачі 7, коли з'явиться `StorageService`.

- [ ] **Крок 9: Підключити все в застосунок**

У `app.module.ts` додати `LogModule`, зареєструвати глобальні провайдери та middleware:

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { LogModule } from './common/logger/log.module';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter';
import { TransformInterceptor } from './common/http/transform.interceptor';
import { RequestContextMiddleware } from './common/http/request-context.middleware';
import { CleanupService } from './common/jobs/cleanup.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LogModule,
  ],
  providers: [
    CleanupService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
```

- [ ] **Крок 10: Перевірити**

```bash
cd apps/api && npx tsc --noEmit && npm run start:dev
```

Очікується: компіляція без помилок, застосунок стартує. Перевірити формат помилки:

```bash
curl -i http://localhost:3000/nope
```

Очікується `404` з тілом виду `{"code":"NOT_FOUND","message":"...","requestId":"..."}`
і заголовком `X-Request-Id`, що збігається з полем `requestId`.

- [ ] **Крок 11: Коміт**

```bash
git add -A && git commit -m "feat(api): базовий CRUD, курсорна пагінація, контекст запиту, логування"
```

---

## Задача 3: Користувачі та автентифікація email/пароль

**Файли:**
- Створити: `apps/api/src/modules/users/{users.module.ts,users.service.ts}`
- Створити: `apps/api/src/modules/auth/{auth.module.ts,auth.controller.ts,auth.service.ts}`
- Створити: `apps/api/src/modules/auth/helpers/token.helper.ts`
- Створити: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Створити: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Створити: `apps/api/src/modules/auth/decorators/current-user.decorator.ts`
- Створити: `apps/api/src/modules/auth/dto/{register.dto.ts,login.dto.ts}`
- Створити: `apps/api/src/modules/auth/interfaces/{jwt-payload.interface.ts,auth-result.interface.ts}`
- Змінити: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`

**Інтерфейси:**
- Споживає: `BaseCrudService`, `PrismaService`, `RequestContext` із Задач 1–2.
- Виробляє:
  - `UsersService extends BaseCrudService<Prisma.UserDelegate>` з `findByEmail(email)`,
    `createLocal({ email, password, name })`, `findOrCreateGoogle(profile)`
  - `AuthService.register(dto)`, `.login(dto)`, `.refresh(rawToken)`, `.logout(rawToken)`
    — усі повертають `AuthResult { accessToken: string; refreshToken: string; user: PublicUser }`
  - `JwtAuthGuard`, декоратор `@CurrentUser(): AuthUser { id, email, name }`
  - `PublicUser { id, email, name, avatarUrl }` — форма користувача, яку віддаємо назовні

- [ ] **Крок 1: Встановити залежності**

```bash
cd apps/api && npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt cookie-parser && npm i -D @types/passport-jwt @types/bcrypt @types/cookie-parser
```

- [ ] **Крок 2: UsersService**

Створити `apps/api/src/modules/users/users.service.ts`:

```ts
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService extends BaseCrudService<Prisma.UserDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma.user);
  }

  /** Email завжди зберігається в нижньому регістрі — це замінює citext. */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email: UsersService.normalizeEmail(email) } });
  }

  async createLocal(input: { email: string; password: string; name: string }): Promise<User> {
    const email = UsersService.normalizeEmail(input.email);

    if (await this.findByEmail(email)) {
      throw new ConflictException('Користувач із таким email уже існує');
    }

    return this.create({
      data: {
        email,
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      },
    });
  }

  verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return Promise.resolve(false);
    return bcrypt.compare(password, user.passwordHash);
  }
}
```

Перевірка «чи існує» тут не робить код гоночно-безпечним сама по собі — від дубля
захищає унікальний індекс на `email`. Явна перевірка потрібна лише для того, щоб
у типовому випадку користувач бачив зрозуміле повідомлення, а не помилку БД.

Створити `apps/api/src/modules/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({ providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
```

- [ ] **Крок 3: DTO та інтерфейси**

`apps/api/src/modules/auth/dto/register.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'artem@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Артем' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
```

`MaxLength(72)` не косметичний: bcrypt мовчки обрізає все після 72 байтів,
і без обмеження довший пароль перевірявся б лише за першими 72 символами.

`apps/api/src/modules/auth/dto/login.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
```

`apps/api/src/modules/auth/interfaces/jwt-payload.interface.ts`:

```ts
export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
```

`apps/api/src/modules/auth/interfaces/auth-result.interface.ts`:

```ts
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}
```

- [ ] **Крок 4: Хелпер токенів**

`apps/api/src/modules/auth/helpers/token.helper.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';

/** Сам refresh-токен ніколи не лягає в БД — лише його хеш. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate(ttlDays = 30): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}
```

- [ ] **Крок 5: AuthService**

`apps/api/src/modules/auth/auth.service.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResult, PublicUser } from './interfaces/auth-result.interface';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from './helpers/token.helper';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.users.createLocal(dto);
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);

    if (!user || !(await this.users.verifyPassword(user, dto.password))) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    return this.issue(user);
  }

  /** Ротація: старий refresh відкликається тим самим запитом, що видає новий. */
  async refresh(rawToken: string): Promise<AuthResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Сесія недійсна');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issue(stored.user);
  }

  async logout(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async issue(user: User): Promise<AuthResult> {
    const refreshToken = generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshExpiryDate(),
      },
    });

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      refreshToken,
      user: AuthService.toPublicUser(user),
    };
  }

  static toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}
```

- [ ] **Крок 6: Стратегія і гвард**

`apps/api/src/modules/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestContext } from '../../../common/http/request-context';
import { UsersService } from '../../users/users.service';
import { AuthUser, JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly users: UsersService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    // Звідси userId стає доступним логеру й сервісам без протягування параметром.
    RequestContext.setUserId(user.id);

    return { id: user.id, email: user.email, name: user.name };
  }
}
```

`apps/api/src/modules/auth/guards/jwt-auth.guard.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`apps/api/src/modules/auth/decorators/current-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
```

- [ ] **Крок 7: Контролер**

`apps/api/src/modules/auth/auth.controller.ts`:

```ts
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResult, PublicUser } from './interfaces/auth-result.interface';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthUser } from './interfaces/jwt-payload.interface';

const REFRESH_COOKIE = 'dr_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(await this.auth.register(dto), res);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(await this.auth.login(dto), res);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(await this.auth.refresh(this.readCookie(req)), res);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.readCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private readCookie(req: Request): string {
    const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Сесія відсутня');
    return token;
  }

  private respond(
    result: AuthResult,
    res: Response,
  ): { accessToken: string; user: PublicUser } {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: result.accessToken, user: result.user };
  }
}
```

Refresh-токен не повертається в тілі відповіді — лише в `httpOnly` cookie, недосяжній
для JavaScript. Тому XSS на фронті не дає можливості вкрасти довгоживучу сесію.
`path: '/auth'` звужує, куди браузер узагалі його відправляє.

- [ ] **Крок 8: Модуль і підключення**

`apps/api/src/modules/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Саме registerAsync, а не register: синхронний варіант читає process.env
    // у момент імпорту модуля, тобто ДО того, як ConfigModule завантажить .env.
    // Секрет виявиться undefined, і кожна видача токена впаде в 500.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // @nestjs/jwt приймає не будь-який рядок, а формат ms: '15m', '7d',
          // тому потрібен cast до StringValue з пакета ms.
          expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

У `main.ts` додати перед `app.listen`:

```ts
import * as cookieParser from 'cookie-parser';
// ...
app.use(cookieParser());
```

У `app.module.ts` додати `AuthModule` і `UsersModule` в `imports`.

- [ ] **Крок 9: Перевірити**

```bash
cd apps/api && npm run start:dev
```

У Swagger UI (`/docs`):
1. `POST /auth/register` з `{"email":"a@a.com","password":"password123","name":"Артем"}`
   → `200`, у тілі `accessToken` і `user`.
2. Той самий запит удруге → `409` з повідомленням про існуючого користувача.
3. `POST /auth/login` з невірним паролем → `401`.
4. Скопіювати `accessToken` у кнопку **Authorize**, викликати `GET /auth/me` → `200`
   з `{ id, email, name }`.
5. У Supabase → таблиця `RefreshToken` містить рядок; поле `tokenHash` не збігається
   з жодним значенням, яке віддавалось клієнту.

- [ ] **Крок 10: Коміт**

```bash
git add -A && git commit -m "feat(api): реєстрація, вхід, refresh-ротація і JWT-гвард"
```

---

## Задача 4: Вхід через Google

**Файли:**
- Створити: `apps/api/src/modules/auth/strategies/google.strategy.ts`
- Змінити: `apps/api/src/modules/users/users.service.ts` (додати `findOrCreateGoogle`)
- Змінити: `apps/api/src/modules/auth/{auth.controller.ts,auth.module.ts}`

**Інтерфейси:**
- Споживає: `AuthService.issue(user)`, `UsersService` із Задачі 3.
- Виробляє: `GET /auth/google`, `GET /auth/google/callback` — колбек ставить refresh-cookie
  і редіректить на `${WEB_ORIGIN}/auth/callback#accessToken=...`.

- [ ] **Крок 1: Залежності та реєстрація застосунку в Google**

```bash
cd apps/api && npm i passport-google-oauth20 && npm i -D @types/passport-google-oauth20
```

У Google Cloud Console → APIs & Services → Credentials створити OAuth client ID типу
Web application. У Authorized redirect URIs додати
`http://localhost:3000/auth/google/callback` і згодом продакшн-URL Render.
Записати client id і secret у `.env`.

- [ ] **Крок 2: Пошук або створення користувача за Google-профілем**

Дописати в `UsersService`:

```ts
  /**
   * Три випадки: користувач уже заходив через Google; користувач є, але
   * реєструвався паролем (тоді просто прив'язуємо googleId); користувача немає.
   */
  async findOrCreateGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    const byGoogleId = await this.findOne({ where: { googleId: profile.googleId } });
    if (byGoogleId) return byGoogleId;

    const email = UsersService.normalizeEmail(profile.email);
    const byEmail = await this.findByEmail(email);

    if (byEmail) {
      return this.update({
        where: { id: byEmail.id },
        data: { googleId: profile.googleId, avatarUrl: byEmail.avatarUrl ?? profile.avatarUrl },
      });
    }

    return this.create({
      data: {
        email,
        googleId: profile.googleId,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });
  }
```

Прив'язка за email тут свідома: людина, що зареєструвалася паролем, а потім натиснула
«увійти через Google», має потрапити у свій акаунт, а не створити другий із тим самим
email — інакше унікальний індекс віддав би незрозумілу помилку.

- [ ] **Крок 3: Стратегія**

`apps/api/src/modules/auth/strategies/google.strategy.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { User } from '@prisma/client';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly users: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: Profile): Promise<User> {
    return this.users.findOrCreateGoogle({
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      name: profile.displayName || 'Користувач',
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
```

- [ ] **Крок 4: Маршрути**

Дописати в `AuthController`:

```ts
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleStart(): void {
    // Passport перехоплює запит і робить редірект на Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.auth.issue(req.user as User);

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.redirect(
      `${process.env.WEB_ORIGIN}/auth/callback#accessToken=${result.accessToken}`,
    );
  }
```

Access-токен передається у фрагменті URL (після `#`), а не в query — фрагмент не
потрапляє ні в логи сервера, ні в заголовок `Referer`.

Додати імпорти `AuthGuard` з `@nestjs/passport` і `User` з `@prisma/client`.
У `AuthModule` додати `GoogleStrategy` у `providers`.

- [ ] **Крок 5: Перевірити**

Відкрити в браузері `http://localhost:3000/auth/google`. Очікується: екран вибору
Google-акаунта, потім редірект на `http://localhost:5173/auth/callback#accessToken=...`
(сторінка ще не існує — важливо, що в URL є токен). У таблиці `User` з'явився рядок
із заповненим `googleId`.

- [ ] **Крок 6: Коміт**

```bash
git add -A && git commit -m "feat(api): вхід через Google OAuth"
```

---

## Задача 5: Кімнати Data Room

**Файли:**
- Створити: `apps/api/src/modules/data-rooms/{data-rooms.module.ts,data-rooms.controller.ts,data-rooms.service.ts}`
- Створити: `apps/api/src/modules/data-rooms/dto/{create-data-room.dto.ts,update-data-room.dto.ts}`
- Змінити: `apps/api/src/app.module.ts`

**Інтерфейси:**
- Споживає: `BaseCrudService`, `JwtAuthGuard`, `@CurrentUser`.
- Виробляє:
  - `DataRoomsService.createWithRoot(userId, name)` — транзакція «кімната + корінь»
  - `DataRoomsService.assertOwned(roomId, userId)` — кидає `404`, якщо кімната не твоя;
    використовується всіма іншими модулями як перевірка власності
  - `GET /data-rooms`, `POST /data-rooms`, `GET|PATCH|DELETE /data-rooms/:id`

- [ ] **Крок 1: DTO**

`apps/api/src/modules/data-rooms/dto/create-data-room.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDataRoomDto {
  @ApiProperty({ example: 'Acme Acquisition' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}
```

`apps/api/src/modules/data-rooms/dto/update-data-room.dto.ts`:

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateDataRoomDto } from './create-data-room.dto';

export class UpdateDataRoomDto extends PartialType(CreateDataRoomDto) {}
```

- [ ] **Крок 2: Сервіс**

`apps/api/src/modules/data-rooms/data-rooms.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { DataRoom, ItemType, Prisma } from '@prisma/client';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DataRoomsService extends BaseCrudService<Prisma.DataRoomDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.dataRoom);
  }

  listForOwner(ownerId: string): Promise<DataRoom[]> {
    return this.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Кімната і її коренева папка створюються однією транзакцією.
   * rootItemId нульований у схемі саме через цю циклічність: спершу кімната,
   * потім корінь, який на неї посилається, потім зворотне посилання.
   */
  async createWithRoot(ownerId: string, name: string): Promise<DataRoom> {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.dataRoom.create({ data: { name, ownerId } });

      const root = await tx.item.create({
        data: {
          dataRoomId: room.id,
          parentId: null,
          path: [],
          depth: 0,
          type: ItemType.FOLDER,
          name,
          createdById: ownerId,
        },
      });

      return tx.dataRoom.update({
        where: { id: room.id },
        data: { rootItemId: root.id },
      });
    });
  }

  /** Єдина точка перевірки власності. 404, а не 403 — див. глобальні обмеження. */
  assertOwned(roomId: string, ownerId: string): Promise<DataRoom> {
    return this.findOneWithError(
      { where: { id: roomId, ownerId } },
      'Кімнату не знайдено',
    );
  }

  rename(roomId: string, ownerId: string, name: string): Promise<DataRoom> {
    return this.assertOwned(roomId, ownerId).then(() =>
      this.update({ where: { id: roomId }, data: { name } }),
    );
  }

  async remove(roomId: string, ownerId: string): Promise<void> {
    await this.assertOwned(roomId, ownerId);
    await this.delete({ where: { id: roomId } });
  }
}
```

Видалення кімнати спирається на `onDelete: Cascade` у схемі — Postgres сам прибирає
всі `Item` і `Share` цієї кімнати. Ручний обхід дерева тут був би і повільнішим,
і менш надійним. Блоби зі Storage прибирає та сама фонова задача, що й сиріт.

- [ ] **Крок 3: Контролер**

`apps/api/src/modules/data-rooms/data-rooms.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DataRoom } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';

@ApiTags('data-rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly rooms: DataRoomsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<DataRoom[]> {
    return this.rooms.listForOwner(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDataRoomDto): Promise<DataRoom> {
    return this.rooms.createWithRoot(user.id, dto.name);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DataRoom> {
    return this.rooms.assertOwned(id, user.id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDataRoomDto,
  ): Promise<DataRoom> {
    return this.rooms.rename(id, user.id, dto.name as string);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.rooms.remove(id, user.id);
  }
}
```

- [ ] **Крок 4: Модуль і підключення**

`apps/api/src/modules/data-rooms/data-rooms.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { DataRoomsController } from './data-rooms.controller';
import { DataRoomsService } from './data-rooms.service';

@Module({
  controllers: [DataRoomsController],
  providers: [DataRoomsService],
  exports: [DataRoomsService],
})
export class DataRoomsModule {}
```

Додати `DataRoomsModule` в `imports` кореневого `AppModule`.

- [ ] **Крок 5: Перевірити**

У Swagger із авторизованим токеном:
1. `POST /data-rooms` з `{"name":"Acme Acquisition"}` → `200`, у відповіді
   заповнений `rootItemId`.
2. У Supabase таблиця `Item` містить один рядок: `type = FOLDER`, `parentId = null`,
   `path = {}`, `depth = 0`.
3. `GET /data-rooms` → масив із однією кімнатою.
4. Зареєструвати другого користувача, взяти його токен, викликати `GET /data-rooms/:id`
   з id чужої кімнати → `404`, а не `403`.

- [ ] **Крок 6: Коміт**

```bash
git add -A && git commit -m "feat(api): кімнати Data Room із кореневою папкою"
```

---

## Задача 6: Читання дерева — лістинг, breadcrumbs, статистика піддерева

**Файли:**
- Створити: `apps/api/src/modules/items/{items.module.ts,items.controller.ts,items.service.ts}`
- Створити: `apps/api/src/modules/items/dto/{list-items.dto.ts}`
- Створити: `apps/api/src/modules/items/interfaces/item.interface.ts`
- Створити: `apps/api/src/modules/items/helpers/to-item-dto.helper.ts`
- Змінити: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`

**Інтерфейси:**
- Споживає: `BaseCrudService`, `toPage`, `DataRoomsService.assertOwned`.
- Виробляє:
  - `ItemDto { id, dataRoomId, parentId, type, name, size, mimeType, status, createdAt, updatedAt }`
  - `ItemsService.listChildren(query: ListItemsDto): Promise<Paginated<ItemDto>>`
  - `ItemsService.getWithBreadcrumbs(itemId): Promise<{ item: ItemDto; breadcrumbs: Breadcrumb[] }>`
  - `ItemsService.getSubtreeStats(roomId, itemId): Promise<SubtreeStats { folders, files, bytes }>`
  - `ItemsService.loadItemOrFail(itemId): Promise<Item>` — використовується гвардом у Задачі 9

**Примітка про порядок робіт:** до Задачі 9 доступ перевіряється лише за власником
(`dataRoomId` кімнати належить тому, хто питає). Гвард шарингу підмінить цю перевірку,
не змінюючи сигнатур сервісу.

- [ ] **Крок 1: Навчити застосунок віддавати BigInt**

`Item.size` має тип `BigInt`, а `JSON.stringify` на ньому кидає
`TypeError: Do not know how to serialize a BigInt`. Замість глобального патчу прототипу
конвертуємо розмір у число в мапері — файл більший за 9 петабайт нам не загрожує,
а фронт отримує звичайний `number`.

Створити `apps/api/src/modules/items/interfaces/item.interface.ts`:

```ts
import { ItemStatus, ItemType } from '@prisma/client';

export interface ItemDto {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: ItemType;
  name: string;
  size: number | null;
  mimeType: string | null;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface SubtreeStats {
  folders: number;
  files: number;
  bytes: number;
}
```

Створити `apps/api/src/modules/items/helpers/to-item-dto.helper.ts`:

```ts
import { Item } from '@prisma/client';
import { ItemDto } from '../interfaces/item.interface';

export function toItemDto(item: Item): ItemDto {
  return {
    id: item.id,
    dataRoomId: item.dataRoomId,
    parentId: item.parentId,
    type: item.type,
    name: item.name,
    size: item.size === null ? null : Number(item.size),
    mimeType: item.mimeType,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
```

- [ ] **Крок 2: DTO лістингу**

`apps/api/src/modules/items/dto/list-items.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/crud/dto/list-query.dto';

export class ListItemsDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Папка, вміст якої показуємо' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Кімната; обов’язкова, якщо parentId не задано' })
  @IsOptional()
  @IsUUID()
  dataRoomId?: string;
}
```

- [ ] **Крок 3: Сервіс — лістинг**

`apps/api/src/modules/items/items.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Item, Prisma } from '@prisma/client';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { toPage } from '../../common/crud/cursor.util';
import { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListItemsDto } from './dto/list-items.dto';
import { toItemDto } from './helpers/to-item-dto.helper';
import { Breadcrumb, ItemDto, SubtreeStats } from './interfaces/item.interface';

/** Порядок сортування: спершу папки, потім файли, всередині — за іменем. */
const KEYSET_FIELDS = ['type', 'name', 'id'];

@Injectable()
export class ItemsService extends BaseCrudService<Prisma.ItemDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.item);
  }

  async listChildren(query: ListItemsDto): Promise<Paginated<ItemDto>> {
    const parentId = await this.resolveParentId(query);
    const built = this.queryBuilder(query, { fields: KEYSET_FIELDS });

    const rows = (await this.findMany({
      where: {
        ...built.where,
        parentId,
        deletedAt: null,
        status: 'READY',
      },
      orderBy: built.orderBy,
      take: built.take,
    })) as Item[];

    const page = toPage(
      rows as unknown as Record<string, unknown>[],
      query.limit ?? 50,
      KEYSET_FIELDS,
    );

    return {
      data: (page.data as unknown as Item[]).map(toItemDto),
      nextCursor: page.nextCursor,
    };
  }

  /**
   * Лістинг просять або по конкретній папці, або по кімнаті — тоді показуємо
   * її корінь. Обидва варіанти зводяться до одного parentId.
   */
  private async resolveParentId(query: ListItemsDto): Promise<string> {
    if (query.parentId) return query.parentId;

    if (!query.dataRoomId) {
      throw new BadRequestException('Потрібен parentId або dataRoomId');
    }

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: query.dataRoomId },
      select: { rootItemId: true },
    });

    if (!room?.rootItemId) {
      throw new BadRequestException('У кімнати немає кореневої папки');
    }

    return room.rootItemId;
  }

  loadItemOrFail(itemId: string): Promise<Item> {
    return this.findOneWithError(
      { where: { id: itemId, deletedAt: null } },
      'Елемент не знайдено',
    ) as Promise<Item>;
  }
}
```

`status: 'READY'` у фільтрі — те, що ховає незавершені аплоади. Файл з'являється
в списку рівно тоді, коли він реально є у сховищі, а не коли його почали вантажити.

- [ ] **Крок 4: Сервіс — breadcrumbs**

Дописати в `ItemsService`:

```ts
  /**
   * Ланцюжок предків береться одним запитом по масиву path — саме заради цього
   * шлях і зберігається матеріалізованим. Прохід угору по parentId коштував би
   * стільки ж запитів, скільки рівнів вкладеності.
   */
  async getWithBreadcrumbs(itemId: string): Promise<{
    item: ItemDto;
    breadcrumbs: Breadcrumb[];
  }> {
    const item = await this.loadItemOrFail(itemId);

    const ancestors = (await this.findMany({
      where: { id: { in: item.path } },
      select: { id: true, name: true },
    })) as Breadcrumb[];

    const byId = new Map(ancestors.map((a) => [a.id, a]));
    const breadcrumbs = item.path
      .map((id) => byId.get(id))
      .filter((crumb): crumb is Breadcrumb => crumb !== undefined);

    return { item: toItemDto(item), breadcrumbs };
  }
```

`findMany` з `in` не гарантує порядку, тому ланцюжок перебудовується за `path` —
інакше breadcrumbs показували б предків у довільному порядку.

- [ ] **Крок 5: Сервіс — статистика піддерева**

Дописати в `ItemsService`:

```ts
  /**
   * Один індексований запит замість рекурсії. `$2 = ANY(path)` лягає на GIN-індекс.
   * Сам вузол теж рахується, якщо це файл, — тому умова OR по id.
   */
  async getSubtreeStats(roomId: string, itemId: string): Promise<SubtreeStats> {
    const [row] = await this.prisma.$queryRaw<
      { folders: bigint; files: bigint; bytes: bigint }[]
    >`
      SELECT
        count(*) FILTER (WHERE "type" = 'FOLDER') AS folders,
        count(*) FILTER (WHERE "type" = 'FILE')   AS files,
        coalesce(sum("size"), 0)                  AS bytes
      FROM "Item"
      WHERE "dataRoomId" = ${roomId}::uuid
        AND ("id" = ${itemId}::uuid OR ${itemId}::uuid = ANY("path"))
        AND "id" <> ${itemId}::uuid
        AND "deletedAt" IS NULL
    `;

    return {
      folders: Number(row?.folders ?? 0),
      files: Number(row?.files ?? 0),
      bytes: Number(row?.bytes ?? 0),
    };
  }
```

Умова `"id" <> itemId` виключає саму папку з підрахунку: у діалозі видалення нас
цікавить, що всередині, а не «і ще одна папка — та, яку ти видаляєш».

- [ ] **Крок 6: Контролер**

`apps/api/src/modules/items/items.controller.ts`:

```ts
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Paginated } from '../../common/crud/interfaces/paginated.interface';
import { ListItemsDto } from './dto/list-items.dto';
import { ItemsService } from './items.service';
import { Breadcrumb, ItemDto, SubtreeStats } from './interfaces/item.interface';

@ApiTags('items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  list(@Query() query: ListItemsDto): Promise<Paginated<ItemDto>> {
    return this.items.listChildren(query);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ item: ItemDto; breadcrumbs: Breadcrumb[] }> {
    return this.items.getWithBreadcrumbs(id);
  }

  @Get(':id/stats')
  async stats(@Param('id', ParseUUIDPipe) id: string): Promise<SubtreeStats> {
    const item = await this.items.loadItemOrFail(id);
    return this.items.getSubtreeStats(item.dataRoomId, id);
  }
}
```

`apps/api/src/modules/items/items.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
```

Додати `ItemsModule` в `AppModule`.

- [ ] **Крок 7: Перевірити**

У Swagger із токеном:
1. `GET /items?dataRoomId=<id кімнати>` → `{"data":[],"nextCursor":null}`.
2. Через Supabase SQL Editor вставити вручну дві папки і файл у корінь, потім знову
   `GET /items?dataRoomId=...` → папки йдуть перед файлом, усередині — за іменем.
3. `GET /items/<id вкладеної папки>` → `breadcrumbs` містить предків у порядку від кореня.
4. `GET /items/<id кореня>/stats` → кількості й сумарний розмір збігаються з тим,
   що вставлено.

- [ ] **Крок 8: Коміт**

```bash
git add -A && git commit -m "feat(api): лістинг дерева, breadcrumbs і статистика піддерева"
```

---

## Задача 7: Мутації дерева — створення, перейменування, переміщення, кошик

**Файли:**
- Створити: `apps/api/src/modules/items/helpers/resolve-name-conflict.helper.ts`
- Створити: `apps/api/src/modules/items/helpers/build-item-path.helper.ts`
- Створити: `apps/api/src/modules/items/helpers/assert-not-descendant.helper.ts`
- Створити: `apps/api/src/modules/items/dto/{create-folder.dto.ts,rename-item.dto.ts,move-item.dto.ts}`
- Змінити: `apps/api/src/modules/items/{items.service.ts,items.controller.ts}`

**Інтерфейси:**
- Виробляє:
  - `resolveNameConflict(prisma, parentId, name): Promise<string>`
  - `buildChildPath(parent): { path: string[]; depth: number }`
  - `assertNotDescendant(item, targetParent): void`
  - `ItemsService.createFolder`, `.rename`, `.move`, `.moveToTrash`, `.restore`

- [ ] **Крок 1: Хелпер розв'язання конфлікту імен**

`apps/api/src/modules/items/helpers/resolve-name-conflict.helper.ts`:

```ts
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Повертає ім'я, вільне в межах папки: report.pdf → "report (1).pdf".
 * Порівняння регістронезалежне, щоб збігатися з частковим унікальним індексом,
 * який побудований по lower(name).
 */
export async function resolveNameConflict(
  prisma: PrismaService,
  parentId: string,
  desiredName: string,
  excludeItemId?: string,
): Promise<string> {
  const taken = await prisma.item.findMany({
    where: {
      parentId,
      deletedAt: null,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    select: { name: true },
  });

  const lowerTaken = new Set(taken.map((row) => row.name.toLowerCase()));
  if (!lowerTaken.has(desiredName.toLowerCase())) return desiredName;

  const { base, extension } = splitName(desiredName);

  for (let counter = 1; counter < 1000; counter += 1) {
    const candidate = `${base} (${counter})${extension}`;
    if (!lowerTaken.has(candidate.toLowerCase())) return candidate;
  }

  throw new Error(`Не вдалося підібрати вільне ім'я для "${desiredName}"`);
}

function splitName(name: string): { base: string; extension: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return { base: name, extension: '' };
  return { base: name.slice(0, dot), extension: name.slice(dot) };
}
```

`dot <= 0`, а не `dot === -1`: файл із іменем `.env` має крапку на позиції 0,
і різати його на порожню базу з розширенням `.env` було б неправильно.

- [ ] **Крок 2: Хелпери шляху й циклу**

`apps/api/src/modules/items/helpers/build-item-path.helper.ts`:

```ts
import { Item } from '@prisma/client';

/** Дитина успадковує шлях батька плюс самого батька. */
export function buildChildPath(parent: Item): { path: string[]; depth: number } {
  const path = [...parent.path, parent.id];
  return { path, depth: path.length };
}
```

`apps/api/src/modules/items/helpers/assert-not-descendant.helper.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { Item } from '@prisma/client';

/**
 * Переміщення папки в саму себе або у власне піддерево відірвало б гілку від
 * кореня — вона стала б недосяжною й водночас незнищенною каскадом.
 */
export function assertNotDescendant(moved: Item, target: Item): void {
  if (moved.id === target.id) {
    throw new BadRequestException('Не можна перемістити папку в саму себе');
  }

  if (target.path.includes(moved.id)) {
    throw new BadRequestException('Не можна перемістити папку у власну підпапку');
  }
}
```

- [ ] **Крок 3: DTO**

`create-folder.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty()
  @IsUUID()
  parentId!: string;

  @ApiProperty({ example: 'Contracts' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}
```

`rename-item.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}
```

`move-item.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MoveItemDto {
  @ApiProperty({ description: 'Папка призначення' })
  @IsUUID()
  targetParentId!: string;
}
```

- [ ] **Крок 4: Створення папки та перейменування**

Дописати в `ItemsService`:

```ts
  async createFolder(userId: string, dto: CreateFolderDto): Promise<ItemDto> {
    const parent = await this.loadFolderOrFail(dto.parentId);
    const name = await resolveNameConflict(this.prisma, parent.id, dto.name);
    const { path, depth } = buildChildPath(parent);

    const created = (await this.create({
      data: {
        dataRoomId: parent.dataRoomId,
        parentId: parent.id,
        path,
        depth,
        type: ItemType.FOLDER,
        name,
        createdById: userId,
      },
    })) as Item;

    return toItemDto(created);
  }

  async rename(itemId: string, name: string): Promise<ItemDto> {
    const item = await this.loadItemOrFail(itemId);

    if (item.parentId === null) {
      throw new BadRequestException('Кореневу папку перейменовують через кімнату');
    }

    const free = await resolveNameConflict(this.prisma, item.parentId, name, item.id);
    const updated = (await this.update({
      where: { id: item.id },
      data: { name: free },
    })) as Item;

    return toItemDto(updated);
  }

  private async loadFolderOrFail(itemId: string): Promise<Item> {
    const item = await this.loadItemOrFail(itemId);
    if (item.type !== ItemType.FOLDER) {
      throw new BadRequestException('Батьком може бути лише папка');
    }
    return item;
  }
```

Додати імпорти `ItemType`, `resolveNameConflict`, `buildChildPath`, `CreateFolderDto`.

- [ ] **Крок 5: Переміщення з переписуванням шляху піддерева**

Дописати в `ItemsService`:

```ts
  /**
   * Переміщення = новий parentId і новий path у самого вузла плюс переписаний
   * префікс path у всіх нащадків. Обидві дії в одній транзакції: наполовину
   * переміщене дерево було б гіршим станом, ніж непереміщене.
   */
  async move(itemId: string, targetParentId: string): Promise<ItemDto> {
    const item = await this.loadItemOrFail(itemId);
    const target = await this.loadFolderOrFail(targetParentId);

    if (item.dataRoomId !== target.dataRoomId) {
      throw new BadRequestException('Переміщення між кімнатами не підтримується');
    }

    assertNotDescendant(item, target);

    if (item.parentId === target.id) return toItemDto(item);

    const name = await resolveNameConflict(this.prisma, target.id, item.name, item.id);
    const { path: newPath, depth: newDepth } = buildChildPath(target);
    const oldPrefixLength = item.path.length;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Нащадки: перші oldPrefixLength елементів шляху міняємо на новий префікс.
      // Postgres нарізає масиви з одиниці, тому зріз починається з +1.
      await tx.$executeRaw`
        UPDATE "Item"
        SET "path"  = ${newPath}::uuid[] || "path"[${oldPrefixLength + 1}:],
            "depth" = coalesce(
              array_length(${newPath}::uuid[] || "path"[${oldPrefixLength + 1}:], 1), 0)
        WHERE "dataRoomId" = ${item.dataRoomId}::uuid
          AND ${item.id}::uuid = ANY("path")
      `;

      return tx.item.update({
        where: { id: item.id },
        data: { parentId: target.id, path: newPath, depth: newDepth, name },
      });
    });

    return toItemDto(updated);
  }
```

- [ ] **Крок 6: Кошик і відновлення**

Дописати в `ItemsService`:

```ts
  /** М'яке видалення накриває вузол і все його піддерево одним запитом. */
  async moveToTrash(itemId: string): Promise<void> {
    const item = await this.loadItemOrFail(itemId);

    if (item.parentId === null) {
      throw new BadRequestException('Кореневу папку не можна видалити окремо від кімнати');
    }

    await this.prisma.$executeRaw`
      UPDATE "Item"
      SET "deletedAt" = now()
      WHERE "dataRoomId" = ${item.dataRoomId}::uuid
        AND ("id" = ${item.id}::uuid OR ${item.id}::uuid = ANY("path"))
        AND "deletedAt" IS NULL
    `;
  }

  /**
   * Відновлення дзеркальне, з однією поправкою: якщо батька встигли видалити,
   * повертати нікуди — тоді елемент піднімається в корінь кімнати.
   */
  async restore(itemId: string): Promise<ItemDto> {
    const item = (await this.findOneWithError(
      { where: { id: itemId, deletedAt: { not: null } } },
      'Елемент не знайдено в кошику',
    )) as Item;

    const parent = item.parentId
      ? await this.findOne({ where: { id: item.parentId, deletedAt: null } })
      : null;

    const restored = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "Item"
        SET "deletedAt" = NULL
        WHERE "dataRoomId" = ${item.dataRoomId}::uuid
          AND ("id" = ${item.id}::uuid OR ${item.id}::uuid = ANY("path"))
      `;

      if (parent) {
        const name = await resolveNameConflict(
          this.prisma, item.parentId as string, item.name, item.id,
        );
        return tx.item.update({ where: { id: item.id }, data: { name } });
      }

      const room = await tx.dataRoom.findUniqueOrThrow({
        where: { id: item.dataRoomId },
        select: { rootItemId: true },
      });
      const root = await tx.item.findUniqueOrThrow({
        where: { id: room.rootItemId as string },
      });
      const name = await resolveNameConflict(this.prisma, root.id, item.name, item.id);
      const { path, depth } = buildChildPath(root);

      return tx.item.update({
        where: { id: item.id },
        data: { parentId: root.id, path, depth, name },
      });
    });

    return toItemDto(restored);
  }

  listTrash(roomId: string): Promise<ItemDto[]> {
    return this.findMany({
      where: { dataRoomId: roomId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      take: 200,
    }).then((rows) => (rows as Item[]).map(toItemDto));
  }
```

- [ ] **Крок 7: Маршрути**

Дописати в `ItemsController`:

```ts
  @Post('folders')
  createFolder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFolderDto,
  ): Promise<ItemDto> {
    return this.items.createFolder(user.id, dto);
  }

  @Patch(':id')
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameItemDto,
  ): Promise<ItemDto> {
    return this.items.rename(id, dto.name);
  }

  @Post(':id/move')
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveItemDto,
  ): Promise<ItemDto> {
    return this.items.move(id, dto.targetParentId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.items.moveToTrash(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<ItemDto> {
    return this.items.restore(id);
  }

  @Get('trash/:dataRoomId')
  trash(@Param('dataRoomId', ParseUUIDPipe) dataRoomId: string): Promise<ItemDto[]> {
    return this.items.listTrash(dataRoomId);
  }
```

Кошик отримав шлях `/items/trash/:dataRoomId`, а не `/items/trash?dataRoomId=`,
щоб не конфліктувати з `GET /items/:id` — інакше Nest спробував би розібрати
рядок `trash` як UUID.

- [ ] **Крок 8: Перевірити**

У Swagger:
1. `POST /items/folders` двічі з однаковим `name` → другий раз ім'я стало `Legal (1)`.
2. Створити вкладеність `A/B/C`, потім `POST /items/A/move` з `targetParentId = C`
   → `400` «не можна перемістити папку у власну підпапку».
3. Перемістити `B` у корінь → у Supabase перевірити, що в `C` поле `path` більше
   не містить `A`, а `depth` зменшився.
4. `DELETE /items/B` → у `B` і `C` заповнився `deletedAt`; `GET /items?parentId=root`
   більше їх не показує.
5. `POST /items/B/restore` → обидва повернулись.

- [ ] **Крок 9: Коміт**

```bash
git add -A && git commit -m "feat(api): створення, перейменування, переміщення і кошик"
```

---

## Задача 8: Сховище і трикроковий аплоад

**Файли:**
- Створити: `apps/api/src/modules/storage/{storage.module.ts,storage.service.ts}`
- Створити: `apps/api/src/modules/items/{uploads.controller.ts,uploads.service.ts}`
- Створити: `apps/api/src/modules/items/dto/{create-upload-url.dto.ts}`
- Створити: `apps/api/src/modules/items/interfaces/upload.interface.ts`
- Змінити: `apps/api/src/modules/items/items.module.ts`
- Змінити: `apps/api/src/common/jobs/cleanup.service.ts`

**Інтерфейси:**
- Виробляє:
  - `StorageService.createSignedUploadUrl(key)`, `.createSignedDownloadUrl(key, ttlSeconds)`,
    `.getMetadata(key)`, `.remove(keys)`
  - `UploadsService.createUploadUrl(userId, dto): Promise<UploadTicket { itemId, uploadUrl, storageKey }>`
  - `UploadsService.confirmUpload(itemId): Promise<ItemDto>`
  - `UploadsService.createDownloadUrl(itemId): Promise<{ url: string }>`

- [ ] **Крок 1: Залежність і адаптер сховища**

```bash
cd apps/api && npm i @supabase/supabase-js
```

`apps/api/src/modules/storage/storage.service.ts`:

```ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ObjectMetadata {
  size: number;
  mimeType: string | null;
}

@Injectable()
export class StorageService {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    );
    this.bucket = process.env.SUPABASE_BUCKET as string;
  }

  /** URL, за яким браузер робить PUT напряму в сховище, минаючи наш сервер. */
  async createSignedUploadUrl(key: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(key);

    if (error || !data) {
      throw new InternalServerErrorException('Не вдалося підготувати завантаження');
    }
    return data.signedUrl;
  }

  async createSignedDownloadUrl(key: string, ttlSeconds = 60): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, ttlSeconds);

    if (error || !data) {
      throw new InternalServerErrorException('Не вдалося підготувати перегляд');
    }
    return data.signedUrl;
  }

  /**
   * Розмір і тип беремо зі сховища, а не з того, що сказав клієнт: при прямому
   * аплоаді сервер байтів не бачить, тому єдине джерело правди — сам об'єкт.
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    const slash = key.lastIndexOf('/');
    const folder = slash === -1 ? '' : key.slice(0, slash);
    const filename = slash === -1 ? key : key.slice(slash + 1);

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(folder, { search: filename, limit: 1 });

    const found = data?.find((entry) => entry.name === filename);
    if (error || !found) return null;

    return {
      size: (found.metadata?.size as number | undefined) ?? 0,
      mimeType: (found.metadata?.mimetype as string | undefined) ?? null,
    };
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.storage.from(this.bucket).remove(keys);
  }
}
```

`apps/api/src/modules/storage/storage.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
```

- [ ] **Крок 2: DTO та інтерфейси аплоаду**

`apps/api/src/modules/items/dto/create-upload-url.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const MAX_FILE_BYTES = 50 * 1024 * 1024;

export class CreateUploadUrlDto {
  @ApiProperty()
  @IsUUID()
  parentId!: string;

  @ApiProperty({ example: 'nda.pdf' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @ApiProperty({ maximum: MAX_FILE_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_FILE_BYTES)
  size!: number;
}
```

`apps/api/src/modules/items/interfaces/upload.interface.ts`:

```ts
export interface UploadTicket {
  itemId: string;
  storageKey: string;
  uploadUrl: string;
}
```

- [ ] **Крок 3: Сервіс аплоаду**

`apps/api/src/modules/items/uploads.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Item, ItemStatus, ItemType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { buildChildPath } from './helpers/build-item-path.helper';
import { resolveNameConflict } from './helpers/resolve-name-conflict.helper';
import { toItemDto } from './helpers/to-item-dto.helper';
import { ItemsService } from './items.service';
import { ItemDto } from './interfaces/item.interface';
import { UploadTicket } from './interfaces/upload.interface';

const ALLOWED_MIME = new Set(['application/pdf']);

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly items: ItemsService,
  ) {}

  /**
   * Крок 1 із трьох. Рядок створюється одразу, але зі статусом PENDING —
   * він займає ім'я в папці (унікальний індекс), проте не показується в лістингу.
   */
  async createUploadUrl(userId: string, dto: CreateUploadUrlDto): Promise<UploadTicket> {
    if (!ALLOWED_MIME.has(dto.mimeType)) {
      throw new BadRequestException('Підтримуються лише PDF-файли');
    }

    const parent = await this.items.loadItemOrFail(dto.parentId);
    if (parent.type !== ItemType.FOLDER) {
      throw new BadRequestException('Завантажувати можна лише в папку');
    }

    const name = await resolveNameConflict(this.prisma, parent.id, dto.fileName);
    const { path, depth } = buildChildPath(parent);
    const storageKey = `${parent.dataRoomId}/${randomUUID()}`;

    const item = await this.prisma.item.create({
      data: {
        dataRoomId: parent.dataRoomId,
        parentId: parent.id,
        path,
        depth,
        type: ItemType.FILE,
        name,
        storageKey,
        mimeType: dto.mimeType,
        size: BigInt(dto.size),
        status: ItemStatus.PENDING,
        createdById: userId,
      },
    });

    return {
      itemId: item.id,
      storageKey,
      uploadUrl: await this.storage.createSignedUploadUrl(storageKey),
    };
  }

  /**
   * Крок 3 із трьох. Звіряємо заявлений розмір із реальним об'єктом у сховищі
   * і лише тоді робимо файл видимим.
   */
  async confirmUpload(itemId: string): Promise<ItemDto> {
    const item = (await this.prisma.item.findUniqueOrThrow({
      where: { id: itemId },
    })) as Item;

    if (item.status === ItemStatus.READY) return toItemDto(item);

    const metadata = await this.storage.getMetadata(item.storageKey as string);
    if (!metadata) {
      throw new BadRequestException('Файл не знайдено у сховищі');
    }

    const confirmed = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        status: ItemStatus.READY,
        size: BigInt(metadata.size),
        mimeType: metadata.mimeType ?? item.mimeType,
      },
    });

    return toItemDto(confirmed);
  }

  async createDownloadUrl(itemId: string): Promise<{ url: string }> {
    const item = await this.items.loadItemOrFail(itemId);

    if (item.type !== ItemType.FILE || !item.storageKey) {
      throw new BadRequestException('Це не файл');
    }

    return { url: await this.storage.createSignedDownloadUrl(item.storageKey, 60) };
  }
}
```

- [ ] **Крок 4: Контролер аплоаду**

`apps/api/src/modules/items/uploads.controller.ts`:

```ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ItemDto } from './interfaces/item.interface';
import { UploadTicket } from './interfaces/upload.interface';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('items')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('upload-url')
  createUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUploadUrlDto,
  ): Promise<UploadTicket> {
    return this.uploads.createUploadUrl(user.id, dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string): Promise<ItemDto> {
    return this.uploads.confirmUpload(id);
  }

  @Get(':id/download-url')
  downloadUrl(@Param('id', ParseUUIDPipe) id: string): Promise<{ url: string }> {
    return this.uploads.createDownloadUrl(id);
  }
}
```

Зареєструвати `UploadsController` і `UploadsService` в `ItemsModule`, а `StorageModule`
додати в `AppModule`.

- [ ] **Крок 5: Прибирання блобів-сиріт**

Замінити тіло `CleanupService.run` так, щоб перед видаленням PENDING-рядків їхні
ключі йшли у сховище на видалення:

```ts
    const orphans = await this.prisma.item.findMany({
      where: {
        status: ItemStatus.PENDING,
        createdAt: { lt: new Date(Date.now() - ORPHAN_UPLOAD_TTL_MS) },
      },
      select: { id: true, storageKey: true },
    });

    await this.storage.remove(
      orphans.map((row) => row.storageKey).filter((key): key is string => key !== null),
    );

    const uploads = await this.prisma.item.deleteMany({
      where: { id: { in: orphans.map((row) => row.id) } },
    });
```

Інжектувати `StorageService` у конструктор `CleanupService`.

- [ ] **Крок 6: Перевірити**

1. `POST /items/upload-url` з `{"parentId":"<root>","fileName":"nda.pdf",
   "mimeType":"application/pdf","size":12345}` → отримано `uploadUrl`.
2. Завантажити реальний PDF за цим URL:

```bash
curl -X PUT --upload-file ./nda.pdf "<uploadUrl>"
```

3. `POST /items/<itemId>/confirm` → `200`, `status: READY`, `size` дорівнює реальному
   розміру файлу, а не тому, що передав клієнт.
4. `GET /items?parentId=<root>` → файл з'явився у списку.
5. `GET /items/<itemId>/download-url` → відкрити URL у браузері, PDF відкривається.
   Через хвилину той самий URL віддає помилку — підпис протермінувався.
6. Викликати `upload-url` і **не** робити PUT. Рядок є в БД зі статусом `PENDING`,
   але в лістингу його немає.

- [ ] **Крок 7: Коміт**

```bash
git add -A && git commit -m "feat(api): прямий аплоад у Supabase Storage і підписані URL"
```

---

## Задача 9: Шаринг і єдиний гвард доступу

**Файли:**
- Створити: `apps/api/src/modules/shares/{shares.module.ts,shares.controller.ts,shares.service.ts,access.service.ts}`
- Створити: `apps/api/src/modules/shares/guards/access.guard.ts`
- Створити: `apps/api/src/modules/shares/decorators/require-role.decorator.ts`
- Створити: `apps/api/src/modules/shares/dto/create-share.dto.ts`
- Створити: `apps/api/src/modules/shares/interfaces/access.interface.ts`
- Створити: `apps/api/src/modules/auth/guards/optional-jwt.guard.ts`
- Змінити: `apps/api/src/modules/items/{items.controller.ts,uploads.controller.ts}`

**Інтерфейси:**
- Виробляє:
  - `AccessService.resolve(itemId, principal): Promise<AccessResult>` де
    `Principal { userId?: string; email?: string; shareToken?: string }` і
    `AccessResult { item: Item; role: 'OWNER' | 'VIEWER' }`
  - `AccessGuard` + `@RequireRole('OWNER' | 'VIEWER')` — читає `:id` з параметрів
  - `SharesService.create_(itemId, userId, dto)` — назва з підкресленням, бо `create`
    вже зайнятий базовим CRUD і має несумісну сигнатуру; `.listForItem(itemId)`,
    `.revoke(shareId, ownerId)`, `.listSharedWithMe(email)`

- [ ] **Крок 1: Опційна автентифікація**

Публічний глядач приходить без JWT, але власник — з ним. Один гвард має пропускати
обох, тому потрібен варіант JWT-гварда, що не падає на відсутньому токені.

`apps/api/src/modules/auth/guards/optional-jwt.guard.ts`:

```ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /** Немає токена — не помилка, просто анонім. */
  handleRequest<T>(_err: unknown, user: T): T {
    return (user || undefined) as T;
  }
}
```

- [ ] **Крок 2: Інтерфейси доступу**

`apps/api/src/modules/shares/interfaces/access.interface.ts`:

```ts
import { Item } from '@prisma/client';

export type AccessRole = 'OWNER' | 'VIEWER';

export interface Principal {
  userId?: string;
  email?: string;
  shareToken?: string;
}

export interface AccessResult {
  item: Item;
  role: AccessRole;
}
```

- [ ] **Крок 3: Розв'язання доступу**

`apps/api/src/modules/shares/access.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Item, ShareType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccessResult, Principal } from './interfaces/access.interface';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Єдина точка, що вирішує «можна чи ні». Дві гілки:
   * власник кімнати проходить одразу; решта — якщо на самому вузлі
   * або на будь-якому з його предків є живий Share.
   *
   * Відмова — завжди 404: різниця між 403 і 404 дозволила б перебором
   * з'ясувати, які документи існують у чужій кімнаті.
   */
  async resolve(itemId: string, principal: Principal): Promise<AccessResult> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, deletedAt: null },
      include: { dataRoom: { select: { ownerId: true } } },
    });

    if (!item) throw new NotFoundException('Елемент не знайдено');

    if (principal.userId && item.dataRoom.ownerId === principal.userId) {
      return { item, role: 'OWNER' };
    }

    const share = await this.findLiveShare(item, principal);
    if (!share) throw new NotFoundException('Елемент не знайдено');

    return { item, role: 'VIEWER' };
  }

  private findLiveShare(item: Item, principal: Principal) {
    const chain = [item.id, ...item.path];
    const now = new Date();

    const modes = [];
    if (principal.shareToken) {
      modes.push({ type: ShareType.PUBLIC_LINK, token: principal.shareToken });
    }
    if (principal.email) {
      modes.push({ type: ShareType.USER_GRANT, granteeEmail: principal.email });
    }
    if (modes.length === 0) return Promise.resolve(null);

    return this.prisma.share.findFirst({
      where: {
        itemId: { in: chain },
        revokedAt: null,
        OR: modes,
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
    });
  }
}
```

`chain = [item.id, ...item.path]` — це і є успадкування доступу вниз по дереву.
Поділилися папкою — усе, що всередині, відкривається тією ж перевіркою, без рекурсії.

- [ ] **Крок 4: Гвард і декоратор ролі**

`apps/api/src/modules/shares/decorators/require-role.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import { AccessRole } from '../interfaces/access.interface';

export const ACCESS_ROLE_KEY = 'access-role';

/**
 * Зараз значень два: OWNER для мутацій, VIEWER для читання.
 * Коли з'явиться EDITOR, він додається сюди й у перевірку нижче —
 * решта коду не змінюється.
 */
export const RequireRole = (role: AccessRole) => SetMetadata(ACCESS_ROLE_KEY, role);
```

`apps/api/src/modules/shares/guards/access.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthUser } from '../../auth/interfaces/jwt-payload.interface';
import { AccessService } from '../access.service';
import { ACCESS_ROLE_KEY } from '../decorators/require-role.decorator';
import { AccessRole } from '../interfaces/access.interface';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly access: AccessService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthUser; access?: unknown }
    >();

    const itemId = this.readItemId(request);
    const user = request.user;

    const result = await this.access.resolve(itemId, {
      userId: user?.id,
      email: user?.email,
      shareToken: request.header('X-Share-Token') ?? undefined,
    });

    const required =
      this.reflector.getAllAndOverride<AccessRole>(ACCESS_ROLE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'VIEWER';

    if (required === 'OWNER' && result.role !== 'OWNER') {
      throw new NotFoundException('Елемент не знайдено');
    }

    request.access = result;
    return true;
  }

  private readItemId(request: Request): string {
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, string> | undefined;
    const query = request.query as Record<string, string>;

    const id = params.id ?? body?.parentId ?? query.parentId;
    if (!id) throw new NotFoundException('Елемент не знайдено');
    return id;
  }
}
```

Гвард шукає id у трьох місцях, бо ціль перевірки різна: для `GET /items/:id` це
параметр шляху, для `POST /items/folders` — папка-батько в тілі, для
`GET /items?parentId=` — параметр запиту. Логіка перевірки при цьому одна.

- [ ] **Крок 5: Сервіс шарингу**

`apps/api/src/modules/shares/dto/create-share.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShareType } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsOptional, ValidateIf } from 'class-validator';

export class CreateShareDto {
  @ApiProperty({ enum: ShareType })
  @IsEnum(ShareType)
  type!: ShareType;

  @ApiPropertyOptional({ description: 'Обов’язковий для USER_GRANT' })
  @ValidateIf((dto: CreateShareDto) => dto.type === ShareType.USER_GRANT)
  @IsEmail()
  granteeEmail?: string;

  @ApiPropertyOptional({ description: 'ISO-дата; порожньо = безстроково' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
```

`apps/api/src/modules/shares/shares.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma, Share, ShareType } from '@prisma/client';
import { BaseCrudService } from '../../common/crud/base-crud.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateShareDto } from './dto/create-share.dto';

@Injectable()
export class SharesService extends BaseCrudService<Prisma.ShareDelegate> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.share);
  }

  create_(itemId: string, userId: string, dto: CreateShareDto): Promise<Share> {
    const isPublic = dto.type === ShareType.PUBLIC_LINK;

    return this.create({
      data: {
        itemId,
        createdById: userId,
        type: dto.type,
        token: isPublic ? randomBytes(32).toString('base64url') : null,
        granteeEmail: isPublic
          ? null
          : UsersService.normalizeEmail(dto.granteeEmail as string),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    }) as Promise<Share>;
  }

  listForItem(itemId: string): Promise<Share[]> {
    return this.findMany({
      where: { itemId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Share[]>;
  }

  /** Відкликання не видаляє рядок — має лишатися слід, що доступ був. */
  async revoke(shareId: string, ownerId: string): Promise<void> {
    await this.prisma.share.updateMany({
      where: { id: shareId, revokedAt: null, item: { dataRoom: { ownerId } } },
      data: { revokedAt: new Date() },
    });
  }

  /** Те, чим поділилися зі мною поіменно. Публічні лінки сюди не потрапляють. */
  listSharedWithMe(email: string): Promise<Share[]> {
    const now = new Date();
    return this.findMany({
      where: {
        type: ShareType.USER_GRANT,
        granteeEmail: email,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Share[]>;
  }
}
```

Метод названо `create_`, бо `create` уже зайнятий базовим CRUD і має іншу сигнатуру.
Перевизначати його з несумісним типом не можна — TypeScript не дасть.

- [ ] **Крок 6: Контролер шарингу**

`apps/api/src/modules/shares/shares.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Share } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateShareDto } from './dto/create-share.dto';
import { AccessGuard } from './guards/access.guard';
import { RequireRole } from './decorators/require-role.decorator';
import { SharesService } from './shares.service';

@ApiTags('shares')
@ApiBearerAuth()
@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  @Post('items/:id/shares')
  @UseGuards(JwtAuthGuard, AccessGuard)
  @RequireRole('OWNER')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateShareDto,
  ): Promise<Share> {
    return this.shares.create_(id, user.id, dto);
  }

  @Get('items/:id/shares')
  @UseGuards(JwtAuthGuard, AccessGuard)
  @RequireRole('OWNER')
  list(@Param('id', ParseUUIDPipe) id: string): Promise<Share[]> {
    return this.shares.listForItem(id);
  }

  @Delete('shares/:id')
  @UseGuards(JwtAuthGuard)
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.shares.revoke(id, user.id);
  }

  @Get('data-rooms/shared-with-me')
  @UseGuards(JwtAuthGuard)
  sharedWithMe(@CurrentUser() user: AuthUser): Promise<Share[]> {
    return this.shares.listSharedWithMe(user.email);
  }
}
```

- [ ] **Крок 7: Перевести items і uploads на гвард**

У `ItemsController` і `UploadsController` замінити `@UseGuards(JwtAuthGuard)` на
`@UseGuards(OptionalJwtGuard, AccessGuard)` і розставити ролі:

- `@RequireRole('VIEWER')` — `GET /items`, `GET /items/:id`, `GET /items/:id/stats`,
  `GET /items/:id/download-url`
- `@RequireRole('OWNER')` — `POST /items/folders`, `PATCH /items/:id`,
  `POST /items/:id/move`, `DELETE /items/:id`, `POST /items/:id/restore`,
  `POST /items/upload-url`, `POST /items/:id/confirm`

`GET /items/trash/:dataRoomId` лишається на `JwtAuthGuard` і перевіряє власність
через `DataRoomsService.assertOwned` — кошик бачить лише власник.

У Swagger-декораторах додати `@ApiSecurity('share-token')` до читальних маршрутів,
щоб публічний доступ можна було перевірити прямо з UI.

- [ ] **Крок 8: Перевірити**

1. Власником: `POST /items/<root>/shares` з `{"type":"PUBLIC_LINK"}` → отримано `token`.
2. Вийти з авторизації в Swagger. `GET /items/<root>` без токенів → `404`.
3. Той самий запит із заголовком `X-Share-Token: <token>` → `200`.
4. `GET /items/<вкладений файл>` із тим самим токеном → `200` (успадкування вниз).
5. `POST /items/folders` із тим самим токеном → `404` (глядач не мутує).
6. `DELETE /shares/<id>` власником, потім крок 3 повторно → знову `404`.
7. Створити `USER_GRANT` на email другого користувача, залогінитись ним →
   `GET /items/<root>` з його Bearer-токеном → `200`; `GET /data-rooms/shared-with-me`
   показує цей елемент.
8. Створити `PUBLIC_LINK` з `expiresAt` у минулому → доступ одразу `404`.

- [ ] **Крок 9: Коміт**

```bash
git add -A && git commit -m "feat(api): шаринг посиланням і поіменно, єдиний гвард доступу"
```

---

## Задача 10: Пошук по кімнаті

**Файли:**
- Створити: `apps/api/src/modules/items/dto/search-items.dto.ts`
- Змінити: `apps/api/src/modules/items/{items.service.ts,items.controller.ts}`

**Інтерфейси:**
- Виробляє: `ItemsService.search(roomId, query): Promise<Paginated<ItemDto>>`,
  `GET /items/search`

- [ ] **Крок 1: DTO**

`apps/api/src/modules/items/dto/search-items.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ListQueryDto } from '../../../common/crud/dto/list-query.dto';

export class SearchItemsDto extends ListQueryDto {
  @ApiProperty()
  @IsUUID()
  dataRoomId!: string;

  @ApiProperty({ example: 'nda' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string;
}
```

- [ ] **Крок 2: Пошук у сервісі**

Дописати в `ItemsService`:

```ts
  /**
   * Пошук по всій кімнаті, а не по одній папці — тому фільтр по dataRoomId,
   * без parentId. Сортування за іменем, курсор той самий, що й у лістингу.
   */
  async search(query: SearchItemsDto): Promise<Paginated<ItemDto>> {
    const built = this.queryBuilder(query, { fields: ['name', 'id'], defaultLimit: 30 });

    const rows = (await this.findMany({
      where: {
        ...built.where,
        dataRoomId: query.dataRoomId,
        deletedAt: null,
        status: 'READY',
        name: { contains: query.q, mode: 'insensitive' },
      },
      orderBy: built.orderBy,
      take: built.take,
    })) as Item[];

    const page = toPage(
      rows as unknown as Record<string, unknown>[],
      query.limit ?? 30,
      ['name', 'id'],
    );

    return {
      data: (page.data as unknown as Item[]).map(toItemDto),
      nextCursor: page.nextCursor,
    };
  }
```

`contains` компілюється в `ILIKE '%q%'`, який індекс `(dataRoomId, name)` не
прискорює — але він обмежує сканування однією кімнатою, і на очікуваних обсягах цього
досить. Якщо колись стане вузьким місцем, наступний крок — триграмний GIN-індекс,
без зміни схеми й коду сервісу.

- [ ] **Крок 3: Маршрут**

Дописати в `ItemsController` **вище** за `@Get(':id')`, інакше Nest розбере слово
`search` як UUID:

```ts
  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchItemsDto,
  ): Promise<Paginated<ItemDto>> {
    return this.rooms
      .assertOwned(query.dataRoomId, user.id)
      .then(() => this.items.search(query));
  }
```

Інжектувати `DataRoomsService` в `ItemsController` і додати `DataRoomsModule`
в `imports` `ItemsModule`.

- [ ] **Крок 4: Перевірити**

1. `GET /items/search?dataRoomId=<id>&q=nda` → знаходить файл у вкладеній папці.
2. `q=NDA` знаходить те саме — пошук регістронезалежний.
3. Файл у кошику в результатах не з'являється.
4. Чужа кімната → `404`.

- [ ] **Крок 5: Коміт**

```bash
git add -A && git commit -m "feat(api): пошук за іменем у межах кімнати"
```

---

## Задача 11: Скелет фронтенду і шар доступу до API

**Файли:**
- Створити: `apps/web/` (Vite + React + TypeScript)
- Створити: `apps/web/src/shared/api/{client.ts,auth.ts,data-rooms.ts,items.ts,shares.ts}`
- Створити: `apps/web/src/shared/lib/{cn.ts,format-bytes.ts,format-date.ts}`
- Створити: `apps/web/src/app/{providers.tsx,router.tsx}`, `apps/web/src/main.tsx`
- Створити: `apps/web/.env.local`

**Інтерфейси:**
- Виробляє:
  - `api.get/post/patch/delete<T>(path, options): Promise<T>` — єдиний http-клієнт
    із автоматичним refresh при `401`
  - `setAccessToken(token | null)`, `getAccessToken()`
  - типізовані функції запитів у `shared/api/*.ts`, які використовують усі хуки далі

- [ ] **Крок 1: Створити застосунок**

```bash
npm create vite@latest apps/web -- --template react-ts
```

```bash
cd apps/web && npm i @tanstack/react-router @tanstack/react-query zustand clsx tailwind-merge lucide-react && npm i -D tailwindcss postcss autoprefixer @tanstack/router-plugin openapi-typescript
```

```bash
cd apps/web && npx tailwindcss init -p
```

У `tailwind.config.js` виставити `content: ['./index.html', './src/**/*.{ts,tsx}']`.
У `src/index.css` додати три директиви `@tailwind base; @tailwind components; @tailwind utilities;`.

Створити `apps/web/.env.local`:

```
VITE_API_URL=http://localhost:3000
```

- [ ] **Крок 2: Поставити shadcn/ui**

```bash
cd apps/web && npx shadcn@latest init -d
```

```bash
cd apps/web && npx shadcn@latest add button input dialog dropdown-menu table breadcrumb toast skeleton alert-dialog badge tooltip select
```

- [ ] **Крок 3: Генерація типів зі Swagger**

Додати в `apps/web/package.json`:

```json
"scripts": {
  "api:types": "openapi-typescript http://localhost:3000/docs-json -o src/shared/api/types.gen.ts"
}
```

Запустити при піднятому бекенді:

```bash
cd apps/web && npm run api:types
```

Це і є користь від Swagger: перейменування поля в DTO ламає збірку фронту,
поки його не поправлено. Типи не пишуться руками.

- [ ] **Крок 4: HTTP-клієнт із автоматичним refresh**

`apps/web/src/shared/api/client.ts`:

```ts
const BASE_URL = import.meta.env.VITE_API_URL as string;

let accessToken: string | null = null;
let shareToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Публічний глядач ходить у ті самі ендпоінти, лише з іншим заголовком. */
export function setShareToken(token: string | null): void {
  shareToken = token;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  // 401 означає, що протух короткий access-токен. Пробуємо оновити його
  // мовчки: refresh лежить у httpOnly cookie, тож користувач нічого не бачить.
  if (response.status === 401 && (await tryRefresh())) {
    return unwrap<T>(await send(path, options));
  }

  return unwrap<T>(response);
}

function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (shareToken) headers['X-Share-Token'] = shareToken;

  return fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

/** Паралельні 401 не мають запускати кілька refresh — усі чекають на один. */
function tryRefresh(): Promise<boolean> {
  refreshing ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const payload = (await res.json()) as { data: { accessToken: string } };
      setAccessToken(payload.data.accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function unwrap<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { data?: T; code?: string; message?: string; requestId?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code ?? 'UNKNOWN',
      payload?.message ?? 'Щось пішло не так',
      payload?.requestId,
    );
  }

  return (payload?.data ?? payload) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

- [ ] **Крок 5: Функції запитів**

`apps/web/src/shared/api/items.ts`:

```ts
import { api } from './client';

export type ItemType = 'FOLDER' | 'FILE';

export interface Item {
  id: string;
  dataRoomId: string;
  parentId: string | null;
  type: ItemType;
  name: string;
  size: number | null;
  mimeType: string | null;
  status: 'PENDING' | 'READY';
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export interface SubtreeStats {
  folders: number;
  files: number;
  bytes: number;
}

export const itemsApi = {
  list: (params: { parentId?: string; dataRoomId?: string; cursor?: string }) =>
    api.get<Page<Item>>(`/items?${new URLSearchParams(clean(params)).toString()}`),

  get: (id: string) => api.get<{ item: Item; breadcrumbs: Breadcrumb[] }>(`/items/${id}`),

  stats: (id: string) => api.get<SubtreeStats>(`/items/${id}/stats`),

  search: (params: { dataRoomId: string; q: string; cursor?: string }) =>
    api.get<Page<Item>>(`/items/search?${new URLSearchParams(clean(params)).toString()}`),

  createFolder: (body: { parentId: string; name: string }) =>
    api.post<Item>('/items/folders', body),

  rename: (id: string, name: string) => api.patch<Item>(`/items/${id}`, { name }),

  move: (id: string, targetParentId: string) =>
    api.post<Item>(`/items/${id}/move`, { targetParentId }),

  remove: (id: string) => api.delete<void>(`/items/${id}`),

  restore: (id: string) => api.post<Item>(`/items/${id}/restore`),

  trash: (dataRoomId: string) => api.get<Item[]>(`/items/trash/${dataRoomId}`),

  createUploadUrl: (body: {
    parentId: string;
    fileName: string;
    mimeType: string;
    size: number;
  }) => api.post<{ itemId: string; storageKey: string; uploadUrl: string }>(
    '/items/upload-url',
    body,
  ),

  confirmUpload: (id: string) => api.post<Item>(`/items/${id}/confirm`),

  downloadUrl: (id: string) => api.get<{ url: string }>(`/items/${id}/download-url`),
};

function clean(params: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;
}
```

За тим самим зразком написати ще три файли. Точні сигнатури, бо на них
спираються хуки в наступних задачах:

```ts
// auth.ts
export interface AuthResult { accessToken: string; user: SessionUser }

export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    api.post<AuthResult>('/auth/register', body),
  login: (body: { email: string; password: string }) =>
    api.post<AuthResult>('/auth/login', body),
  refresh: () => api.post<AuthResult>('/auth/refresh'),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<SessionUser>('/auth/me'),
};

// data-rooms.ts
export const dataRoomsApi = {
  list: () => api.get<DataRoom[]>('/data-rooms'),
  create: (name: string) => api.post<DataRoom>('/data-rooms', { name }),
  get: (id: string) => api.get<DataRoom>(`/data-rooms/${id}`),
  rename: (id: string, name: string) => api.patch<DataRoom>(`/data-rooms/${id}`, { name }),
  remove: (id: string) => api.delete<void>(`/data-rooms/${id}`),
  sharedWithMe: () => api.get<SharedWithMeEntry[]>('/data-rooms/shared-with-me'),
};

// shares.ts
export interface CreateShareInput {
  type: 'PUBLIC_LINK' | 'USER_GRANT';
  granteeEmail?: string;
  expiresAt?: string;
}

export const sharesApi = {
  listForItem: (itemId: string) => api.get<Share[]>(`/items/${itemId}/shares`),
  create: (itemId: string, body: CreateShareInput) =>
    api.post<Share>(`/items/${itemId}/shares`, body),
  revoke: (shareId: string) => api.delete<void>(`/shares/${shareId}`),
};
```

`authApi.refresh()` повертає ту саму форму, що `login` — саме тому відновлення
сесії при старті (Задача 12) не потребує окремого ендпоінта.

- [ ] **Крок 6: Провайдери й порожній роутер**

`apps/web/src/app/providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Дані оновлюються, коли користувач повертається на вкладку.
            // Саме це змушує екран того, кому відкликали доступ, оновитись сам.
            refetchOnWindowFocus: true,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

Налаштувати TanStack Router за офіційним файловим роутингом: додати
`TanStackRouterVite()` у `vite.config.ts`, створити `src/routes/__root.tsx`
із `<Outlet />` і `src/routes/index.tsx` із заглушкою «Data Room».

- [ ] **Крок 7: Перевірити**

```bash
cd apps/web && npm run dev
```

Очікується: `http://localhost:5173` відкривається, Tailwind-класи діють,
у консолі немає помилок. Перевірити клієнт із DevTools:

```js
await fetch('http://localhost:3000/auth/me', { credentials: 'include' })
```

- [ ] **Крок 8: Коміт**

```bash
git add -A && git commit -m "feat(web): скелет Vite, Tailwind, shadcn і http-клієнт із refresh"
```

---

## Задача 12: Екрани входу та сесія

**Файли:**
- Створити: `apps/web/src/features/auth/{session.store.ts,useSession.ts}`
- Створити: `apps/web/src/features/auth/components/{LoginForm.tsx,RegisterForm.tsx,GoogleButton.tsx}`
- Створити: `apps/web/src/routes/{login.tsx,register.tsx,auth.callback.tsx,_authed.tsx}`

**Інтерфейси:**
- Виробляє: `useSession(): { user, isLoading, login, register, logout }`,
  маршрут-обгортка `_authed`, що редіректить неавторизованих на `/login`

- [ ] **Крок 1: Стор сесії**

`apps/web/src/features/auth/session.store.ts`:

```ts
import { create } from 'zustand';
import { setAccessToken } from '@/shared/api/client';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

interface SessionState {
  user: SessionUser | null;
  status: 'unknown' | 'authenticated' | 'anonymous';
  setSession: (user: SessionUser, accessToken: string) => void;
  clear: () => void;
  markAnonymous: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'unknown',
  setSession: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, status: 'authenticated' });
  },
  clear: () => {
    setAccessToken(null);
    set({ user: null, status: 'anonymous' });
  },
  markAnonymous: () => set({ status: 'anonymous' }),
}));
```

Access-токен живе в пам'яті, а не в `localStorage`. Це свідомо: токен у сховищі
доступний будь-якому скрипту на сторінці. Після перезавантаження сесія відновлюється
з refresh-cookie — див. наступний крок.

- [ ] **Крок 2: Відновлення сесії при старті**

`apps/web/src/features/auth/useSession.ts`:

```ts
import { useEffect } from 'react';
import { authApi } from '@/shared/api/auth';
import { useSessionStore } from './session.store';

/** Викликається один раз у корені: піднімає сесію з httpOnly-cookie. */
export function useRestoreSession(): void {
  const { setSession, markAnonymous, status } = useSessionStore();

  useEffect(() => {
    if (status !== 'unknown') return;

    authApi
      .refresh()
      .then((result) => setSession(result.user, result.accessToken))
      .catch(() => markAnonymous());
  }, [status, setSession, markAnonymous]);
}

export function useSession() {
  return useSessionStore();
}
```

- [ ] **Крок 3: Форми**

`LoginForm.tsx` і `RegisterForm.tsx` — контрольовані форми на shadcn `Input` і `Button`.
Обидві:

- показують помилку з `ApiError.message` під формою (`401` → «Невірний email або пароль»,
  `409` → «Користувач із таким email уже існує»);
- блокують кнопку на час запиту й показують у ній спінер;
- при успіху кладуть сесію в стор і роблять `navigate({ to: '/' })`.

`GoogleButton.tsx` — кнопка, що робить
`window.location.href = \`${import.meta.env.VITE_API_URL}/auth/google\``.

- [ ] **Крок 4: Маршрут колбека Google**

`apps/web/src/routes/auth.callback.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { authApi } from '@/shared/api/auth';
import { useSessionStore } from '@/features/auth/session.store';

export const Route = createFileRoute('/auth/callback')({ component: AuthCallback });

function AuthCallback() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    // Бекенд кладе токен у фрагмент URL: він не потрапляє ні в логи, ні в Referer.
    const token = new URLSearchParams(window.location.hash.slice(1)).get('accessToken');

    if (!token) {
      void navigate({ to: '/login' });
      return;
    }

    setSession({ id: '', email: '', name: '' }, token);
    authApi.me().then((user) => {
      setSession(user, token);
      void navigate({ to: '/' });
    });
  }, [navigate, setSession]);

  return <p className="p-8 text-muted-foreground">Завершуємо вхід…</p>;
}
```

- [ ] **Крок 5: Захищена гілка маршрутів**

`apps/web/src/routes/_authed.tsx` — layout-маршрут, який поки сесія `unknown`
показує скелетон, при `anonymous` редіректить на `/login`, при `authenticated`
рендерить `<Outlet />` разом із шапкою застосунку.

- [ ] **Крок 6: Перевірити**

1. `/register` створює акаунт і кидає на список кімнат.
2. Перезавантаження сторінки не викидає з сесії.
3. `/login` з невірним паролем показує помилку під формою, а не білий екран.
4. Кнопка Google проводить повний цикл і повертає в застосунок залогіненим.
5. Відкриття `/` в анонімному вікні редіректить на `/login`.

- [ ] **Крок 7: Коміт**

```bash
git add -A && git commit -m "feat(web): вхід, реєстрація, Google-колбек і відновлення сесії"
```

---

## Задача 13: Список кімнат

**Файли:**
- Створити: `apps/web/src/features/data-rooms/components/{RoomsGrid.tsx,RoomCard.tsx,CreateRoomDialog.tsx}`
- Створити: `apps/web/src/features/data-rooms/hooks/useDataRooms.ts`
- Створити: `apps/web/src/routes/_authed.index.tsx`

**Інтерфейси:**
- Виробляє: `useDataRooms()`, `useCreateRoom()`, `useRenameRoom()`, `useDeleteRoom()`
  — усі на TanStack Query з ключем `['data-rooms']`

- [ ] **Крок 1: Хуки**

`apps/web/src/features/data-rooms/hooks/useDataRooms.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataRoomsApi } from '@/shared/api/data-rooms';

const KEY = ['data-rooms'] as const;

export function useDataRooms() {
  return useQuery({ queryKey: KEY, queryFn: dataRoomsApi.list });
}

export function useCreateRoom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => dataRoomsApi.create(name),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRoom() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataRoomsApi.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
```

- [ ] **Крок 2: Компоненти**

`RoomCard.tsx` — картка з іменем кімнати, датою створення й меню з двох дій
(перейменувати, видалити). Клік по картці веде на `/rooms/$roomId`.

`CreateRoomDialog.tsx` — shadcn `Dialog` із одним полем і кнопкою; кнопка заблокована
на порожньому імені й на час запиту.

`RoomsGrid.tsx` — сітка карток; три стани:

- `isLoading` → сітка з чотирьох `Skeleton`;
- порожньо → заголовок «Ще немає жодної кімнати», підпис «Створіть першу, щоб почати
  збирати документи» і кнопка створення;
- є дані → сітка карток.

Порожній стан із дією, а не просто текст: користувач одразу бачить, що робити далі.

- [ ] **Крок 3: Маршрут**

`apps/web/src/routes/_authed.index.tsx` рендерить `RoomsGrid` і кнопку створення
в шапці.

- [ ] **Крок 4: Перевірити**

Створити кімнату — вона з'явилась у сітці без перезавантаження. Видалити —
зникла. У порожньому акаунті видно порожній стан із кнопкою.

- [ ] **Крок 5: Коміт**

```bash
git add -A && git commit -m "feat(web): список кімнат Data Room"
```

---

## Задача 14: Оглядач папки

**Файли:**
- Створити: `apps/web/src/features/items/hooks/{useItemsList.ts,useItem.ts}`
- Створити: `apps/web/src/features/items/components/{ItemsTable.tsx,ItemRow.tsx,Breadcrumbs.tsx,ItemIcon.tsx,ItemsEmptyState.tsx}`
- Створити: `apps/web/src/routes/_authed.rooms.$roomId.tsx`, `_authed.rooms.$roomId.$itemId.tsx`
- Створити: `apps/web/src/shared/lib/format-bytes.ts`

**Інтерфейси:**
- Виробляє:
  - `useItemsList({ dataRoomId?, parentId? })` — `useInfiniteQuery` з ключем
    `['items', dataRoomId ?? parentId]`
  - `useItem(itemId)` — метадані + breadcrumbs
  - `<ItemsTable items rowActions onOpen />` — таблиця, що не знає, чий вона режим

- [ ] **Крок 1: Форматування розміру**

`apps/web/src/shared/lib/format-bytes.ts`:

```ts
const UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 Б';

  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** power;

  return `${value.toFixed(power === 0 ? 0 : 1)} ${UNITS[power]}`;
}
```

- [ ] **Крок 2: Нескінченний лістинг**

`apps/web/src/features/items/hooks/useItemsList.ts`:

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { itemsApi } from '@/shared/api/items';

export function itemsQueryKey(scopeId: string) {
  return ['items', scopeId] as const;
}

/**
 * Курсорна пагінація лягає на useInfiniteQuery один в один: сервер віддає
 * nextCursor, ми повертаємо його з getNextPageParam. Номерів сторінок немає
 * і не треба — у файловому менеджері гортають скролом.
 */
export function useItemsList(scope: { dataRoomId?: string; parentId?: string }) {
  const scopeId = scope.parentId ?? scope.dataRoomId ?? '';

  return useInfiniteQuery({
    queryKey: itemsQueryKey(scopeId),
    enabled: scopeId !== '',
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => itemsApi.list({ ...scope, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
```

- [ ] **Крок 3: Таблиця**

`ItemsTable.tsx` приймає:

```ts
interface ItemsTableProps {
  items: Item[];
  isLoading: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onOpen: (item: Item) => void;
  renderRowActions?: (item: Item) => ReactNode;
}
```

`renderRowActions` необов'язковий — саме це дозволяє одній таблиці обслуговувати
і власника, і публічного глядача: у режимі читання проп просто не передається,
і колонка дій не рендериться. Двох схожих компонентів не з'являється.

Колонки: іконка + ім'я, розмір, дата зміни, дії. Довантаження наступної сторінки —
`IntersectionObserver` на службовому рядку в кінці таблиці, що викликає `onLoadMore`.

`ItemRow.tsx` — один рядок; подвійний клік по папці відкриває її, по файлу —
переглядач (Задача 17).

`Breadcrumbs.tsx` — shadcn `Breadcrumb` із `[Кімната, ...breadcrumbs, поточна]`,
кожен елемент — посилання на відповідну папку.

`ItemsEmptyState.tsx` — три різні варіанти за пропом `variant`:
`'empty-folder'` («Ця папка порожня» + кнопка завантаження),
`'empty-room'` («Кімната порожня» + підказка перетягнути файли),
`'no-results'` («Нічого не знайдено» + кнопка скинути пошук).

- [ ] **Крок 4: Маршрути**

`_authed.rooms.$roomId.tsx` — лістинг кореня кімнати.
`_authed.rooms.$roomId.$itemId.tsx` — лістинг конкретної папки з breadcrumbs.
Обидва рендерять один і той самий компонент-контейнер із різними параметрами.

- [ ] **Крок 5: Перевірити**

1. Кімната з кількома папками й файлами: папки йдуть першими.
2. Клік по папці заходить усередину, breadcrumbs показують шлях, клік по крихті
   повертає на потрібний рівень.
3. Створити через Swagger 60 файлів у одній папці → при скролі підвантажується
   друга сторінка, дублів немає.
4. Порожня папка показує порожній стан, а не порожню таблицю з шапкою.

- [ ] **Крок 6: Коміт**

```bash
git add -A && git commit -m "feat(web): оглядач папки з breadcrumbs і нескінченним скролом"
```

---

## Задача 15: Дії над папками й файлами

**Файли:**
- Створити: `apps/web/src/features/items/hooks/useItemMutations.ts`
- Створити: `apps/web/src/features/items/components/{CreateFolderDialog.tsx,RenameDialog.tsx,MoveDialog.tsx,DeleteDialog.tsx,ItemActionsMenu.tsx,FolderTreePicker.tsx}`

**Інтерфейси:**
- Виробляє: `useCreateFolder()`, `useRenameItem()`, `useMoveItem()`, `useDeleteItem()`,
  `useSubtreeStats(itemId, enabled)`

- [ ] **Крок 1: Мутації**

`apps/web/src/features/items/hooks/useItemMutations.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '@/shared/api/items';
import { itemsQueryKey } from './useItemsList';

/** Інвалідуємо лише ті папки, вміст яких реально змінився. */
function useInvalidateFolders() {
  const client = useQueryClient();
  return (...folderIds: (string | null | undefined)[]) => {
    for (const id of folderIds) {
      if (id) void client.invalidateQueries({ queryKey: itemsQueryKey(id) });
    }
  };
}

export function useCreateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: { parentId: string; name: string }) =>
      itemsApi.createFolder(input),
    onSuccess: (_item, input) => invalidate(input.parentId),
  });
}

export function useRenameItem() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: { id: string; name: string; parentId: string | null }) =>
      itemsApi.rename(input.id, input.name),
    onSuccess: (_item, input) => invalidate(input.parentId),
  });
}

export function useMoveItem() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: { id: string; from: string | null; to: string }) =>
      itemsApi.move(input.id, input.to),
    // Змінився вміст обох папок — і звідки взяли, і куди поклали.
    onSuccess: (_item, input) => invalidate(input.from, input.to),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (input: { id: string; parentId: string | null }) =>
      itemsApi.remove(input.id),
    onSuccess: (_void, input) => invalidate(input.parentId),
  });
}

export function useSubtreeStats(itemId: string | null) {
  return useQuery({
    queryKey: ['item-stats', itemId],
    queryFn: () => itemsApi.stats(itemId as string),
    enabled: itemId !== null,
  });
}
```

- [ ] **Крок 2: Діалог видалення з реальними числами**

`DeleteDialog.tsx` тягне `useSubtreeStats` і формує попередження з конкретики,
а не із загального «ви впевнені»:

```tsx
const { data: stats, isLoading } = useSubtreeStats(open ? item.id : null);

const warning =
  item.type === 'FILE'
    ? `Файл «${item.name}» буде переміщено в кошик.`
    : stats
      ? `Буде видалено ${plural(stats.folders, 'папку', 'папки', 'папок')} і ` +
        `${plural(stats.files, 'файл', 'файли', 'файлів')} — ${formatBytes(stats.bytes)}.`
      : 'Рахуємо, що всередині…';
```

Саме цього вимагає завдання: користувач має бачити, що саме зникне. Поки статистика
вантажиться, кнопка підтвердження заблокована — інакше можна погодитись, не побачивши
обсягу.

`plural(count, one, few, many)` покласти в `shared/lib/plural.ts`.

- [ ] **Крок 3: Переміщення**

`FolderTreePicker.tsx` — дерево папок кімнати з розгортанням. Ключова деталь:
поточна папка й **усе її піддерево** відмальовуються неактивними, бо перемістити
папку в саму себе не можна. Той самий інваріант перевіряє сервер, але користувач
не має впиратися в помилку там, де UI може просто не дати помилитись.

`MoveDialog.tsx` показує пікер і кнопку «Перемістити сюди», заблоковану, якщо
вибрано поточного батька.

- [ ] **Крок 4: Решта діалогів і меню**

`CreateFolderDialog.tsx` — одне поле, `Enter` підтверджує.
`RenameDialog.tsx` — поле, попередньо заповнене поточним іменем, з виділеною
базовою частиною (без розширення).
`ItemActionsMenu.tsx` — shadcn `DropdownMenu` з діями: відкрити, перейменувати,
перемістити, поділитися (Задача 18), видалити.

Після перейменування показувати тост із фактичним іменем, яке повернув сервер —
якщо спрацював авто-суфікс, користувач має побачити `report (1).pdf`, а не думати,
що зберігся `report.pdf`.

- [ ] **Крок 5: Перевірити**

1. Створити папку з наявним іменем — у таблиці з'явилась `Legal (1)`, тост це назвав.
2. Перейменувати файл у зайняте ім'я — те саме, без помилки.
3. Спробувати перемістити папку в її ж підпапку — пункт неактивний у пікері.
4. Видалити папку з вкладеннями — діалог назвав кількість і обсяг; після
   підтвердження рядок зник із таблиці без перезавантаження.

- [ ] **Крок 6: Коміт**

```bash
git add -A && git commit -m "feat(web): створення, перейменування, переміщення і видалення"
```

---

## Задача 16: Завантаження файлів

**Файли:**
- Створити: `apps/web/src/features/upload/{upload.store.ts,upload-file.ts}`
- Створити: `apps/web/src/features/upload/components/{UploadPanel.tsx,UploadRow.tsx,FolderDropZone.tsx}`
- Створити: `apps/web/src/features/upload/hooks/useUploadQueue.ts`

**Інтерфейси:**
- Виробляє: `useUploadStore` із `enqueue(files, parentId)`, `cancel(id)`, `retry(id)`,
  `clearFinished()`; тип `UploadTask { id, fileName, size, progress, status, error }`

- [ ] **Крок 1: Аплоад одного файлу з реальним прогресом**

`apps/web/src/features/upload/upload-file.ts`:

```ts
/**
 * fetch не вміє повідомляти прогрес відправки, тому тут XMLHttpRequest —
 * єдиний спосіб показати чесні відсотки, а не фейкову анімацію.
 */
export function putWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Сховище відповіло ${xhr.status}`));

    xhr.onerror = () => reject(new Error('Немає зв’язку зі сховищем'));
    xhr.onabort = () => reject(new DOMException('Скасовано', 'AbortError'));

    signal.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}
```

- [ ] **Крок 2: Черга**

`apps/web/src/features/upload/upload.store.ts`:

```ts
import { create } from 'zustand';
import { itemsApi } from '@/shared/api/items';
import { putWithProgress } from './upload-file';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadTask {
  id: string;
  file: File;
  parentId: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  controller: AbortController;
}

const MAX_PARALLEL = 3;

interface UploadState {
  tasks: UploadTask[];
  onFinished?: (parentId: string) => void;
  enqueue: (files: File[], parentId: string) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  clearFinished: () => void;
  setCallback: (callback: (parentId: string) => void) => void;
}

export const useUploadStore = create<UploadState>((set, get) => {
  function patch(id: string, changes: Partial<UploadTask>): void {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...changes } : task)),
    }));
  }

  async function run(task: UploadTask): Promise<void> {
    patch(task.id, { status: 'uploading' });

    try {
      const ticket = await itemsApi.createUploadUrl({
        parentId: task.parentId,
        fileName: task.file.name,
        mimeType: task.file.type || 'application/pdf',
        size: task.file.size,
      });

      await putWithProgress(
        ticket.uploadUrl,
        task.file,
        (fraction) => patch(task.id, { progress: fraction }),
        task.controller.signal,
      );

      await itemsApi.confirmUpload(ticket.itemId);

      patch(task.id, { status: 'done', progress: 1 });
      get().onFinished?.(task.parentId);
    } catch (error) {
      patch(task.id, {
        status: task.controller.signal.aborted ? 'canceled' : 'error',
        error: error instanceof Error ? error.message : 'Помилка завантаження',
      });
    } finally {
      pump();
    }
  }

  /** Тримає рівно MAX_PARALLEL активних аплоадів, підбираючи наступні з черги. */
  function pump(): void {
    const active = get().tasks.filter((task) => task.status === 'uploading').length;
    const free = MAX_PARALLEL - active;
    if (free <= 0) return;

    for (const task of get().tasks.filter((t) => t.status === 'queued').slice(0, free)) {
      void run(task);
    }
  }

  return {
    tasks: [],

    setCallback: (onFinished) => set({ onFinished }),

    enqueue: (files, parentId) => {
      const tasks: UploadTask[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        parentId,
        progress: 0,
        status: 'queued',
        controller: new AbortController(),
      }));

      set((state) => ({ tasks: [...state.tasks, ...tasks] }));
      pump();
    },

    cancel: (id) => {
      get().tasks.find((task) => task.id === id)?.controller.abort();
      patch(id, { status: 'canceled' });
    },

    retry: (id) => {
      patch(id, {
        status: 'queued',
        progress: 0,
        error: undefined,
        controller: new AbortController(),
      });
      pump();
    },

    clearFinished: () =>
      set((state) => ({
        tasks: state.tasks.filter(
          (task) => task.status !== 'done' && task.status !== 'canceled',
        ),
      })),
  };
});
```

`onFinished` викликається після кожного підтвердженого файлу — контейнер папки
підписується на нього й інвалідує лістинг, тому файли з'являються в таблиці
по одному, а не всі наприкінці.

- [ ] **Крок 3: UI черги**

`UploadPanel.tsx` — фіксована панель унизу праворуч, згортається кліком по шапці.
Шапка показує «Завантажено 2 з 5». Кожен `UploadRow.tsx` — ім'я, розмір,
смуга прогресу, кнопка скасування під час аплоаду й кнопка «Повторити» на помилці.
Панель зникає, коли черга порожня.

`FolderDropZone.tsx` — обгортка над областю таблиці. На `dragover` показує рамку
й підпис «Відпустіть, щоб завантажити сюди». На `drop` фільтрує не-PDF і показує
тост про відкинуті файли, решту віддає в `enqueue`.

- [ ] **Крок 4: Перевірити**

1. Перетягнути п'ять PDF у папку: панель показує п'ять рядків, три активні одночасно,
   решта в черзі; відсотки ростуть неоднаково — це справжній прогрес.
2. Скасувати один посередині → рядок став «Скасовано», у таблиці файл не з'явився,
   у БД лишився `PENDING`-рядок, який приберe фонова задача.
3. Вимкнути мережу посеред аплоаду → рядок став «Помилка» з кнопкою «Повторити»;
   повторити після відновлення мережі — файл доїжджає.
4. Перетягнути `.png` → тост повідомив, що підтримуються лише PDF.
5. Завантажити файл з іменем, що вже є → у таблиці `report (1).pdf`.

- [ ] **Крок 5: Коміт**

```bash
git add -A && git commit -m "feat(web): черга аплоаду з drag-and-drop і прогресом на файл"
```

---

## Задача 17: Перегляд PDF

**Файли:**
- Створити: `apps/web/src/features/viewer/{PdfViewerDialog.tsx,useDownloadUrl.ts}`
- Змінити: `apps/web/src/features/items/components/ItemRow.tsx`

**Інтерфейси:**
- Виробляє: `useDownloadUrl(itemId, enabled)`, `<PdfViewerDialog item onOpenChange />`

- [ ] **Крок 1: Хук підписаного URL**

`apps/web/src/features/viewer/useDownloadUrl.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { itemsApi } from '@/shared/api/items';

/**
 * Підпис живе 60 секунд, тому кешувати URL надовго не можна:
 * staleTime свідомо коротший за термін дії підпису.
 */
export function useDownloadUrl(itemId: string | null) {
  return useQuery({
    queryKey: ['download-url', itemId],
    queryFn: () => itemsApi.downloadUrl(itemId as string),
    enabled: itemId !== null,
    staleTime: 45_000,
    gcTime: 45_000,
  });
}
```

- [ ] **Крок 2: Діалог перегляду**

`PdfViewerDialog.tsx` — повноекранний shadcn `Dialog`:

```tsx
export function PdfViewerDialog({ item, onOpenChange }: PdfViewerDialogProps) {
  const { data, isLoading, isError } = useDownloadUrl(item?.id ?? null);

  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-w-5xl p-0 gap-0">
        <DialogHeader className="flex-row items-center justify-between border-b px-4 py-3">
          <DialogTitle className="truncate text-base">{item?.name}</DialogTitle>
          {data && (
            <a href={data.url} target="_blank" rel="noreferrer"
               className="text-sm text-muted-foreground hover:text-foreground">
              Відкрити в новій вкладці
            </a>
          )}
        </DialogHeader>

        {isLoading && <Skeleton className="m-4 h-full" />}
        {isError && <ViewerError />}
        {data && (
          <iframe src={data.url} title={item?.name}
                  className="h-full w-full border-0" />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

`<iframe>` замість бібліотеки рендеру: вбудований переглядач браузера дає прокрутку,
зум, пошук і друк безкоштовно. Окрема бібліотека тут коштувала б годин і мегабайтів
заради того самого результату.

- [ ] **Крок 3: Підключення**

У контейнері папки тримати `const [preview, setPreview] = useState<Item | null>(null)`;
`ItemRow` викликає `onOpen(item)`, який для `type === 'FILE'` ставить `preview`,
а для `FOLDER` навігує всередину.

- [ ] **Крок 4: Перевірити**

1. Клік по PDF відкриває діалог, документ гортається.
2. Закрити й одразу відкрити знову — працює (URL узявся з кешу).
3. Залишити діалог відкритим на дві хвилини, перезавантажити iframe →
   підпис протух; закрити й відкрити знову — новий URL працює.
4. Клік по папці відкриває папку, а не переглядач.

- [ ] **Крок 5: Коміт**

```bash
git add -A && git commit -m "feat(web): перегляд PDF у діалозі"
```

---

## Задача 18: Шаринг і публічний перегляд

**Файли:**
- Створити: `apps/web/src/features/sharing/components/{ShareDialog.tsx,ShareList.tsx,PublicLinkRow.tsx,GrantRow.tsx}`
- Створити: `apps/web/src/features/sharing/hooks/useShares.ts`
- Створити: `apps/web/src/routes/{shared.$token.tsx,shared.$token.$itemId.tsx,_authed.shared-with-me.tsx}`
- Створити: `apps/web/src/features/sharing/AccessDeniedScreen.tsx`

**Інтерфейси:**
- Виробляє: `useShares(itemId)`, `useCreateShare()`, `useRevokeShare()`,
  `<AccessDeniedScreen />` — спільний екран для видаленого, відкликаного
  й протермінованого

- [ ] **Крок 1: Хуки шарингу**

```ts
export function useShares(itemId: string | null) {
  return useQuery({
    queryKey: ['shares', itemId],
    queryFn: () => sharesApi.listForItem(itemId as string),
    enabled: itemId !== null,
  });
}

export function useCreateShare(itemId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShareInput) => sharesApi.create(itemId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shares', itemId] }),
  });
}

export function useRevokeShare(itemId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => sharesApi.revoke(shareId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['shares', itemId] }),
  });
}
```

- [ ] **Крок 2: Діалог шарингу**

`ShareDialog.tsx` — дві секції в одному діалозі, бо це один об'єкт і два способи
доступу до нього, а не дві різні функції:

**Верхня — публічне посилання.** Якщо активного лінка немає: кнопка «Створити
посилання» і селект терміну дії (24 години / 7 днів / безстроково). Якщо є:
поле з готовим URL `${origin}/shared/${token}`, кнопка «Копіювати» з тостом,
підпис «Діє до 25 серпня» або «Безстроково», і кнопка «Вимкнути».

**Нижня — поіменний доступ.** Поле email + кнопка «Надати доступ»; нижче список
виданих грантів із кнопкою відкликання біля кожного. Під полем — підказка:
«Якщо в цієї людини ще немає акаунта, доступ спрацює одразу після реєстрації».
Це не декоративний текст: він пояснює поведінку, яка інакше виглядала б як
несправність.

Заголовок діалогу називає ціль конкретно: «Поділитися папкою "Contracts"» або
«Поділитися файлом "nda.pdf"» — щоб не переплутати рівень, на якому видається доступ.

- [ ] **Крок 3: Публічна оболонка**

`apps/web/src/routes/shared.$token.tsx`:

```tsx
export const Route = createFileRoute('/shared/$token')({
  component: SharedRoot,
});

function SharedRoot() {
  const { token } = Route.useParams();

  // Токен кладеться в http-клієнт, і далі всі ті самі запити працюють
  // від імені публічного глядача. Окремих "публічних" ендпоінтів немає.
  useEffect(() => {
    setShareToken(token);
    return () => setShareToken(null);
  }, [token]);

  return <PublicShell />;
}
```

`PublicShell` рендерить ті самі `Breadcrumbs` і `ItemsTable`, але **без**
`renderRowActions` і без `FolderDropZone`. Кнопки «Створити папку» і «Завантажити»
не приховані стилями — їх просто немає в дереві. Перегляд PDF доступний, бо це читання.

Шапка публічного режиму містить назву кореня, бейдж «Лише перегляд» і, якщо глядач
не залогінений, кнопку «Увійти» — щоб він міг перейти у свій акаунт, якщо він у нього є.

- [ ] **Крок 4: Спільний екран відмови**

`AccessDeniedScreen.tsx` — те, що бачить глядач, коли доступу більше немає:

```tsx
export function AccessDeniedScreen({ onBack }: { onBack?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <FileX className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-medium">Цей матеріал більше недоступний</h2>
      <p className="text-sm text-muted-foreground">
        Його видалили, доступ відкликали або термін дії посилання минув.
      </p>
      {onBack && <Button variant="outline" onClick={onBack}>Повернутися назад</Button>}
    </div>
  );
}
```

Один екран на три причини — свідомо. Глядач не має розрізняти «видалено» і
«доступ відкликано»: різниця між ними — це вже інформація про чужу кімнату.

Показувати його на будь-якій `ApiError` зі `status === 404` у контейнерах папки
та переглядача. Оскільки `refetchOnWindowFocus` увімкнено, глядач, у якого відкликали
доступ під час перегляду, побачить цей екран сам, щойно поверне фокус на вкладку.

- [ ] **Крок 5: «Поділилися зі мною»**

`_authed.shared-with-me.tsx` — список того, що надійшло поіменно: назва елемента,
хто поділився, коли. Клік веде на звичайний маршрут елемента (не на `/shared/...`,
бо доступ тут іменний, а не за токеном).

- [ ] **Крок 6: Перевірити**

1. Створити публічне посилання на папку, відкрити його в анонімному вікні →
   видно вміст, дій немає, PDF відкривається.
2. Зайти у вкладену папку публічним лінком — доступ успадкувався.
3. Не закриваючи анонімне вікно, вимкнути посилання у власника, повернути фокус
   на анонімну вкладку → з'явився екран «більше недоступний».
4. Видати доступ на email другого акаунта → у нього в «Поділилися зі мною»
   з'явився елемент, він його відкриває, але кнопок дій не бачить.
5. Видати доступ на email, якого немає в системі; зареєструвати цей email →
   доступ уже є, нічого додатково робити не довелося.
6. Створити посилання з терміном 24 години → підпис у діалозі називає дату.

- [ ] **Крок 7: Коміт**

```bash
git add -A && git commit -m "feat(web): шаринг посиланням і поіменно, публічний перегляд"
```

---

## Задача 19: Кошик і пошук

**Файли:**
- Створити: `apps/web/src/features/trash/{TrashTable.tsx,useTrash.ts}`
- Створити: `apps/web/src/features/search/{SearchInput.tsx,SearchResults.tsx,useSearch.ts}`
- Створити: `apps/web/src/routes/_authed.rooms.$roomId.trash.tsx`

**Інтерфейси:**
- Виробляє: `useTrash(roomId)`, `useRestoreItem()`, `useSearch(roomId, query)`

- [ ] **Крок 1: Пошук із дебаунсом**

```ts
export function useSearch(dataRoomId: string, rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 300);

  return useInfiniteQuery({
    queryKey: ['search', dataRoomId, query],
    // Порожній рядок не має слати запит: інакше кожне відкриття поля
    // тягне повний лістинг кімнати.
    enabled: query.length > 0,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => itemsApi.search({ dataRoomId, q: query, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
```

`useDebouncedValue` покласти в `shared/lib/use-debounced-value.ts`.

- [ ] **Крок 2: UI пошуку**

`SearchInput.tsx` — поле в шапці кімнати з іконкою лупи й хрестиком очищення.
Поки запит порожній — показується звичайний лістинг папки; щойно з'явився текст,
вміст області замінюється на `SearchResults`.

`SearchResults.tsx` використовує ту саму `ItemsTable`, але додає колонку «Розташування»
з ланцюжком папок — інакше два однойменні файли в результатах не відрізнити.
Клік по рядку веде у папку, де файл лежить.

Три стани: пошук триває (скелетон), нічого не знайдено (`ItemsEmptyState`
з `variant="no-results"`), є результати.

- [ ] **Крок 3: Кошик**

`TrashTable.tsx` — таблиця видаленого з колонкою «Видалено» і кнопкою «Відновити»
в кожному рядку. Порожній стан: «У кошику порожньо».

Після відновлення інвалідувати і кошик, і лістинг папки-призначення, і показати
тост із фактичним іменем — якщо ім'я було зайняте, елемент повернувся як `report (1).pdf`,
і користувач має це побачити. Якщо батьківську папку встигли видалити, тост
пояснює: «Папку-джерело видалено, елемент повернуто в корінь».

- [ ] **Крок 4: Перевірити**

1. Пошук `nda` знаходить файл у вкладеній папці, колонка розташування показує шлях.
2. Очистити поле → повернувся звичайний лістинг.
3. Пошук нісенітниці → порожній стан «нічого не знайдено».
4. Видалити папку, відкрити кошик → вона там; відновити → повернулась на місце.
5. Видалити папку, потім видалити її батька, потім відновити дитину →
   вона в корені, тост це пояснив.

- [ ] **Крок 5: Коміт**

```bash
git add -A && git commit -m "feat(web): пошук по кімнаті та кошик із відновленням"
```

---

## Задача 20: Полірування, стани помилок і Storybook

**Файли:**
- Створити: `apps/web/src/shared/ui/*.stories.tsx`
- Створити: `apps/web/src/app/ErrorBoundary.tsx`
- Змінити: контейнери папки, кімнат, публічного перегляду

- [ ] **Крок 1: Єдина обробка помилок**

`ErrorBoundary.tsx` ловить те, що не спіймали запити, і показує екран із
повідомленням, кнопкою «Оновити сторінку» і — головне — `requestId`, якщо він є
в `ApiError`. Це той самий ідентифікатор, за яким помилка знаходиться в таблиці `Log`
на бекенді, тобто скаргу користувача можна довести до конкретного стеку.

Для помилок запитів завести правило: `404` → `AccessDeniedScreen`;
`401` після невдалого refresh → редірект на `/login`; решта → тост із текстом
помилки й кнопкою «Спробувати ще» на `refetch`.

- [ ] **Крок 2: Стани очікування**

Скрізь, де є `isLoading`, має бути скелетон тієї ж форми, що й майбутній вміст:
таблиця — рядки-скелетони, сітка кімнат — картки-скелетони. Спінер по центру
порожнього екрана лишити лише там, де форма вмісту невідома.

Це не косметика: на безкоштовному Render перший запит після простою повільний,
і без скелетонів застосунок виглядає зависшим.

- [ ] **Крок 3: Дрібниці, які видно на рев'ю**

- `title` вкладки міняється на назву поточної папки
- кнопки, що виконують запит, показують спінер і блокуються (подвійний клік
  не має створювати дві папки)
- довгі імена файлів обрізаються через `truncate` з `title` на ховер
- таблиця має мінімальну ширину і горизонтальний скрол на вузьких екранах,
  а сторінка ніколи не їде горизонтально
- у мобільній ширині колонки «Розмір» і «Змінено» ховаються, лишається ім'я і дії

- [ ] **Крок 4: Storybook**

```bash
cd apps/web && npx storybook@latest init --builder vite
```

Написати story лише для `shared/ui`: `Button` (варіанти й стан завантаження),
`ItemsEmptyState` (три варіанти), `UploadRow` (черга, аплоад, готово, помилка),
`AccessDeniedScreen`, `Breadcrumbs` (короткий і довгий шлях).

Story на кожен екран сюди не входять: вони вимагають підняти роутер, сесію
й моки API — витрата, що нічого не доводить у межах MVP.

- [ ] **Крок 5: Перевірити**

```bash
cd apps/web && npm run build && npm run storybook
```

Очікується: продакшн-збірка без помилок типів; Storybook відкривається,
усі story рендеряться. Пройти застосунок на ширині 375 px — жодного
горизонтального скролу сторінки.

- [ ] **Крок 6: Коміт**

```bash
git add -A && git commit -m "feat(web): стани помилок, скелетони, адаптив і Storybook"
```

---

## Задача 21: Деплой

**Файли:**
- Створити: `render.yaml`, `apps/web/vercel.json`
- Змінити: `apps/api/package.json` (скрипти збірки й міграцій)

- [ ] **Крок 1: Підготувати API до продакшну**

У `apps/api/package.json`:

```json
"scripts": {
  "build": "prisma generate && nest build",
  "start:prod": "prisma migrate deploy && node dist/main"
}
```

`prisma migrate deploy` у старті, а не в збірці: міграції мають виконуватись
у середовищі, де є доступ до продакшн-БД, і рівно один раз при розгортанні.

- [ ] **Крок 2: Render**

Створити Web Service: root directory `apps/api`, build command `npm ci && npm run build`,
start command `npm run start:prod`. Прописати всі змінні з `.env.example`, замінивши
`WEB_ORIGIN` на URL Vercel, а `GOOGLE_CALLBACK_URL` — на
`https://<render-app>.onrender.com/auth/google/callback`. Той самий URL додати
в Authorized redirect URIs у Google Cloud Console.

- [ ] **Крок 3: Vercel**

Імпортувати репозиторій, root directory `apps/web`, framework Vite.
Змінна `VITE_API_URL` = URL Render.

Створити `apps/web/vercel.json`, щоб прямий перехід на вкладену адресу
не давав 404 — SPA має віддавати `index.html` на будь-який шлях:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Крок 4: Перевірити зв'язку**

Після обох деплоїв пройти повний сценарій на бойових URL:
реєстрація → створення кімнати → аплоад PDF → перегляд → публічне посилання
в анонімному вікні → відкликання.

Три місця, де це типово ламається:

- **CORS.** `WEB_ORIGIN` на Render має точно збігатися з доменом Vercel, без
  слеша в кінці.
- **Cookie.** У продакшні потрібні `secure: true` і `sameSite: 'none'` — інакше
  браузер не збереже refresh-cookie на крос-доменному запиті. Це вже закладено
  в коді через перевірку `NODE_ENV`, тому переконатись, що на Render
  `NODE_ENV=production`.
- **Холодний старт.** Перший запит після простою займає до 50 секунд.
  Це очікувано для безкоштовного тарифу; згадати в README.

- [ ] **Крок 5: Коміт**

```bash
git add -A && git commit -m "chore: конфігурація деплою на Render і Vercel"
```

---

## Задача 22: README

**Файли:**
- Створити: `README.md`

- [ ] **Крок 1: Написати README**

Обов'язкові розділи (їх прямо вимагає умова задачі):

1. **Що це і посилання.** Один абзац опису плюс URL фронтенду, URL Swagger
   і тестові облікові дані для рев'ювера, щоб він не реєструвався вручну.
2. **Локальний запуск.** Клон, `npm install`, `.env` із прикладу, `prisma migrate dev`,
   два `npm run dev`. Перевірити інструкцію на чистій копії репозиторію — це
   найчастіше місце, де README розходиться з дійсністю.
3. **Дизайн-рішення.** Чому один `Item` замість двох таблиць; чому materialized path;
   чому прямий аплоад; чому `404` замість `403`; чому власний auth, а не Supabase Auth.
   Коротко, з причиною при кожному рішенні.
4. **ERD.** Діаграма й опис таблиць — узяти з розділу 4 специфікації.
5. **How it scales.** Три відповіді — узяти з розділу 8 специфікації дослівно:
   підрахунок піддерева одним запитом по GIN-індексу; курсорна пагінація й індекси
   на 100 000 файлів; `role` з першого дня для розширення до viewer/editor.
6. **Де використано AI.** Чесно: brainstorming архітектури й моделі даних,
   генерація шаблонного коду (DTO, компоненти shadcn), рев'ю граничних випадків.
   Назвати, що саме перевірялося вручну.
7. **Що не увійшло і чому.** Тести, історія версій, email-сповіщення — з причиною
   «бюджет MVP», а не мовчанням. Плюс холодний старт Render як відома поведінка.

- [ ] **Крок 2: Перевірити**

Пройти власну інструкцію з нуля в чистій папці: клон, установка, запуск.
Усе, що довелося зробити «додатково і не за README», дописати в README.

- [ ] **Крок 3: Коміт**

```bash
git add -A && git commit -m "docs: README із дизайн-рішеннями, ERD і розділом про масштабування"
```

---

## Порядок і залежності

```
1 → 2 → 3 → 4
        3 → 5 → 6 → 7 → 8 → 9 → 10
                            9 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22
```

Задачі 1–10 дають працюючий API, який можна повністю перевірити через Swagger
без жодного рядка фронтенду. Задачі 11–20 нарощують інтерфейс поверх готового API.
Задачі 21–22 — здача.

Дві задачі можна робити паралельно з рештою, якщо є друга пара рук: Задача 4
(Google OAuth) не блокує нічого, крім кнопки на екрані входу, а Задача 20
(полірування) торкається файлів, створених у 13–19.
