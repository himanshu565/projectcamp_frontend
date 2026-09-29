# Frontend Interview Notes

## Project Context

This project is a Next.js frontend that talks to an Express/MongoDB backend through the `/api/v1` proxy. The frontend uses `fetch` with `credentials: "include"` so authenticated cookies are sent with API requests.

The main fixes were about replacing demo behavior with reliable API-backed CRUD while keeping the existing UI.

## Why We Made These Changes

### 1. Use the backend MongoDB ID

MongoDB returns persisted entities with `_id`. The frontend previously mixed several possible identifiers:

- `id`
- `_id`
- `project._id`
- numeric demo IDs such as `"1"`
- generated IDs such as `local-*`

That caused invalid requests such as:

```text
/projects/undefined
/tasks/1/t/5
/tasks/local-123/t/local-456
```

The frontend now treats `_id` as the source of truth and derives `id` only for UI components that need it.

The helper in `lib/api.ts` centralizes this behavior:

```ts
getPersistedId(value)
normalizeProject(project)
```

This prevents each component from guessing which ID shape to use.

### 2. Do not create fake records after API failure

A failed API request means the server did not persist the record. Adding a local fake project, task, or note makes the UI look successful but causes the next update or delete request to use an invalid ID.

The correct flow is:

```text
Submit form
  -> Send API request
  -> Check response.ok
  -> Read returned entity and real _id
  -> Update the UI
```

If the API fails, show an error and leave the server-backed list unchanged.

### 3. Send only fields supported by the backend

The backend contract is more important than the fields currently visible in the UI.

Project creation sends:

```json
{
  "name": "Project name",
  "description": "Project description"
}
```

Task creation sends supported task fields such as:

```json
{
  "title": "Task title",
  "description": "Task description",
  "status": "todo"
}
```

The frontend must not send UI-only fields such as `assignee`, `priority`, `dueDate`, `startDate`, or `endDate` unless the backend explicitly supports them.

Notes currently send only:

```json
{
  "content": "Note content"
}
```

The frontend still displays title/category controls, but those fields cannot be reliably persisted until the backend supports them.

### 4. Check every mutation response

Every create, update, and delete request must check the HTTP response:

```ts
const response = await fetch(url, options)
const data = await response.json()

if (!response.ok) {
  throw new Error(data?.message || "Request failed")
}
```

Without this check, a `400` or `500` response can be mistaken for success and the UI can update incorrectly.

### 5. Use real IDs for nested routes

Task routes require both IDs:

```text
PUT    /api/v1/tasks/:projectId/t/:taskId
DELETE /api/v1/tasks/:projectId/t/:taskId
```

Before making the request, both `projectId` and `taskId` must exist and come from persisted API data. Never construct a URL with `undefined`, a numeric demo ID, or a generated local ID.

### 6. Project deletion needs confirmation

Deletion is destructive, so the project detail page now uses an alert dialog before calling:

```text
DELETE /api/v1/projects/:projectId
```

On success, the user is redirected to the project list. On failure, the dialog remains usable and displays the error.

The backend must authorize this route and decide whether related tasks and notes are also deleted.

### 7. Load the current user's role from the backend

The dashboard already checks:

```text
GET /api/v1/auth/current-user
```

The header uses the same authenticated endpoint to display the logged-in user's role. This is better than hardcoding a role because permissions belong to the server and can change independently of the UI.

The account menu now shows:

```text
My Account
Signed in
Role: member
```

Profile and Settings were removed because they had no implemented behavior.

## Function Explanations

### `getPersistedId`

Returns a valid string ID from `_id` or `id`, or `null` when no persisted ID exists.

Why it exists:

- Prevents requests with missing IDs.
- Avoids repeating `_id ?? id` logic across components.
- Makes it explicit that an entity without an ID cannot be updated or deleted.

### `normalizeProject`

Converts API project data into the UI shape and derives `id` from the persisted MongoDB ID.

Why it exists:

- Handles API responses that may wrap a project in `project`.
- Gives the UI one stable ID property.
- Filters out invalid records before rendering links or buttons.

### `getApiCollection` and `getApiEntity`

These helpers unwrap common API response shapes such as:

```json
{ "data": { "projects": [] } }
```

or:

```json
{ "project": { "_id": "..." } }
```

Why they exist:

- Keeps response-shape handling out of every page.
- Makes list and single-entity loading consistent.

### `deleteProject`

Checks that a route ID exists, sends the authenticated DELETE request, checks the response, and redirects only after success.

Why it exists:

- Prevents accidental deletion without confirmation.
- Avoids removing a project from the UI before the backend confirms deletion.
- Keeps the UI consistent with the database.

### `loadCurrentUser`

Fetches the current authenticated user when the header mounts.

Why it exists:

- Displays server-provided identity and role information.
- Avoids trusting client-side role values for authorization.
- Keeps the account menu independent from hardcoded demo content.

## Mistakes To Avoid

### Do not use mock records in real CRUD state

Bad:

```ts
setProjects([...projects, { id: crypto.randomUUID(), name }])
```

Good:

```ts
const response = await createProject(payload)
const savedProject = getApiEntity(response, "project")
setProjects((items) => [...items, normalizeProject(savedProject)])
```

### Do not guess the ID property

Bad:

```ts
const id = project.id || project.project?._id || "1"
```

Good:

```ts
const id = getPersistedId(project)
if (!id) return
```

### Do not send UI fields just because inputs exist

A form can contain display-only fields. The request payload must match the backend schema, not the visual form automatically.

### Do not update state before a mutation succeeds

Optimistic updates are risky when IDs, permissions, or validation can fail. For these CRUD flows, update local state after the backend responds successfully.

### Do not swallow errors

Bad:

```ts
try {
  await fetch(url)
} catch {
  // pretend it worked
}
```

Good:

```ts
try {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || "Request failed")
} catch (error) {
  setError(error instanceof Error ? error.message : "Request failed")
}
```

### Do not trust the frontend for authorization

The frontend can display the user's role, but the backend must enforce permissions for project deletion, member management, and other protected operations.

### Do not mix incompatible tool versions

The project uses Next.js `16.0.10`. ESLint and `eslint-config-next` must be compatible with that version. ESLint 10 caused plugin failures because the installed React lint plugins supported the older rule context API.

The working setup uses:

- ESLint 9
- `eslint-config-next` 16.0.10
- The existing flat config in `eslint.config.mjs`

## Testing Commands

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected results:

- TypeScript completes without errors.
- ESLint completes with no errors. Existing warnings may remain.
- Next.js production build completes successfully.

## Manual Interview Demo Checklist

1. Log in and open the account menu.
2. Confirm the role comes from `/auth/current-user`.
3. Create a project and confirm the response contains a real `_id`.
4. Open the project and refresh the page.
5. Delete the project and confirm the API request uses its real `_id`.
6. Create a task and verify the request uses the real project ID.
7. Update and delete a task using real project and task IDs.
8. Create, edit, and delete a note without generating a fake ID.
9. Force an API failure and confirm no fake record appears in the UI.

## Interview Questions And Short Answers

### Why normalize API data?

Because the API and UI can use different shapes. Normalization creates one predictable UI contract and prevents ID-related bugs from spreading across components.

### Why wait for the backend before updating state?

Because the backend is the source of truth. Updating only after success prevents the UI from showing records that were rejected or never persisted.

### Why use `credentials: "include"`?

Because the backend authentication uses cookies. Without it, browser requests may not include the session cookie.

### Is displaying a role the same as enforcing a role?

No. The frontend may display the role and conditionally render controls, but the backend must enforce authorization on every protected endpoint.

### What should happen when an ID is missing?

Do not make the request. Show a loading, validation, or error state and wait until a real persisted ID is available.

### Why did ESLint fail before source linting?

The installed ESLint major version was incompatible with the Next.js lint plugins. Dependency versions must be aligned before lint output can be trusted.
