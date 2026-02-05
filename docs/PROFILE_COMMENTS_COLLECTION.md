# `profile_comments` collection

Reference for the **profile_comments** collection used by the Comments section on politician profiles.

## Fields

| Name         | Type     | Required | Options |
|--------------|----------|----------|---------|
| politician   | Relation | Yes      | Collection: **politicians**, Max select: 1, Cascade delete: Yes |
| author_name  | Text     | No       | Max length: 100 |
| content      | Text     | Yes      | Min: 1, Max: 10000 |
| media        | File     | No       | Max 5 files, Max size 10485760 (10MB), Mime types: image/*, video/*, image/gif |

## Indexes (recommended)

- `politician`
- `created`

## API rules (paste into Admin UI → profile_comments → API rules)

**Public read, anyone can create, no update, anyone can delete (v1):**

| Rule    | Formula |
|---------|---------|
| **List**  | `politician != ''` |
| **View**  | `politician != ''` |
| **Create**| *(leave empty)* |
| **Update**| `false` |
| **Delete**| *(leave empty)* |

- **List / View:** Only require that the comment is tied to a politician (every record has one), so in practice everyone can read.
- **Create:** Empty = unauthenticated users can post (optional author name in the form).
- **Update:** `false` = no one can edit comments.
- **Delete:** Empty = anyone can delete (you can change to `false` to disable deletes, or later use `@request.auth.id != ""` when you add auth).

**Optional – require non-empty content on create (server-side):**

- **Create:** `@request.data.content != ""`

**Later – when using PocketBase auth (e.g. relation to users):**

- **Create:** `@request.auth.id != ""`
- **Delete:** `@request.auth.id != "" && author = @request.auth.id` (or allow admin: `@request.auth.id != "" && (author = @request.auth.id \|\| @request.auth.admin = true)`)

## Frontend

- **Component:** `web/src/components/ProfileComments.tsx`
- **Sort:** Newest first (`-created`)
- **Used on:** Politician profile page, bottom of main content.
