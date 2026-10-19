import test from "node:test";
import assert from "node:assert/strict";
import { getPersistedId, normalizeProject, ApiError, unwrapApiData } from "../lib/api.ts";
import {
  emailSchema,
  passwordSchema,
  registrationSchema,
  projectSchema,
  taskSchema,
  noteSchema,
} from "../lib/validations.ts";

test("Security Boundary: Persisted ID rejects invalid or unpersisted identifiers", () => {
  // Reject null, undefined, empty strings, and non-string objects
  assert.equal(getPersistedId(null), null);
  assert.equal(getPersistedId(undefined), null);
  assert.equal(getPersistedId({}), null);
  assert.equal(getPersistedId({ _id: "" }), null);
  assert.equal(getPersistedId({ _id: "   " }), null);
  assert.equal(getPersistedId({ id: "" }), null);
  assert.equal(getPersistedId({ _id: 12345 }), null);

  // Accept valid string IDs
  assert.equal(getPersistedId({ _id: "64f1a2b3c4d5e6f7a8b9c0d1" }), "64f1a2b3c4d5e6f7a8b9c0d1");
  assert.equal(getPersistedId({ id: "64f1a2b3c4d5e6f7a8b9c0d1" }), "64f1a2b3c4d5e6f7a8b9c0d1");

  // Prefer _id over id
  assert.equal(
    getPersistedId({ _id: "mongo-id-123", id: "legacy-id-456" }),
    "mongo-id-123"
  );
});

test("Security Boundary: normalizeProject never creates records without a valid persisted ID", () => {
  // Missing ID should return null, preventing client from using fake objects
  assert.equal(normalizeProject({ name: "Unsaved Project" }), null);
  assert.equal(normalizeProject(null as unknown as object), null);

  // Valid project
  const valid = normalizeProject({
    _id: "proj_987",
    name: "Alpha Project",
    status: "Planning",
    members: [{ user: "user1" }, { user: "user2" }],
  });
  assert.ok(valid);
  assert.equal(valid.id, "proj_987");
  assert.equal(valid.name, "Alpha Project");
  assert.equal(valid.memberCount, 2);

  // Nested response envelope { project: { _id: "..." } }
  const enveloped = normalizeProject({
    project: {
      _id: "proj_enveloped_123",
      name: "Enveloped Project",
    },
  });
  assert.ok(enveloped);
  assert.equal(enveloped.id, "proj_enveloped_123");
});

test("Security Boundary: ApiError correctly represents HTTP failures and server outages", () => {
  const outageError = new ApiError(
    0,
    "Unable to connect to the server. Please check your network connection."
  );
  assert.equal(outageError.statusCode, 0);
  assert.equal(outageError.name, "ApiError");
  assert.match(outageError.message, /Unable to connect/);

  const authError = new ApiError(401, "Session expired or unauthorized. Please sign in.");
  assert.equal(authError.statusCode, 401);

  const forbiddenError = new ApiError(403, "You do not have permission to perform this action");
  assert.equal(forbiddenError.statusCode, 403);
});

test("Security Boundary: unwrapApiData unwraps API envelopes without masking data", () => {
  assert.deepEqual(unwrapApiData({ data: [1, 2, 3] }), [1, 2, 3]);
  assert.deepEqual(unwrapApiData({ data: { message: "ok" } }), { message: "ok" });
  assert.deepEqual(unwrapApiData([1, 2]), [1, 2]);
  assert.equal(unwrapApiData(null), null);
});

test("Validation Boundary: Email and registration validation", () => {
  // Email schema
  assert.equal(emailSchema.safeParse("user@example.com").success, true);
  assert.equal(emailSchema.safeParse("user+tag@sub.domain.co").success, true);
  assert.equal(emailSchema.safeParse("invalid-email").success, false);
  assert.equal(emailSchema.safeParse("").success, false);
  assert.equal(emailSchema.safeParse("   ").success, false);

  // Password schema
  assert.equal(passwordSchema.safeParse("12345").success, false);
  assert.equal(passwordSchema.safeParse("123456").success, true);

  // Registration schema - password mismatch
  const mismatch = registrationSchema.safeParse({
    email: "test@example.com",
    username: "valid_user",
    password: "password123",
    confirmPassword: "password456",
  });
  assert.equal(mismatch.success, false);

  // Registration schema - invalid username characters
  const invalidUser = registrationSchema.safeParse({
    email: "test@example.com",
    username: "user with spaces!",
    password: "password123",
    confirmPassword: "password123",
  });
  assert.equal(invalidUser.success, false);

  // Registration schema - valid
  const validReg = registrationSchema.safeParse({
    email: "test@example.com",
    username: "valid_user-99",
    password: "password123",
    confirmPassword: "password123",
  });
  assert.equal(validReg.success, true);
});

test("Validation Boundary: Project date and length constraints", () => {
  // End date earlier than start date must fail
  const invalidDates = projectSchema.safeParse({
    name: "Valid Project Name",
    startDate: "2026-05-10",
    endDate: "2026-05-01",
  });
  assert.equal(invalidDates.success, false);

  // Valid dates
  const validDates = projectSchema.safeParse({
    name: "Valid Project Name",
    startDate: "2026-05-01",
    endDate: "2026-05-10",
  });
  assert.equal(validDates.success, true);

  // Short project name must fail
  const shortName = projectSchema.safeParse({
    name: "A",
  });
  assert.equal(shortName.success, false);
});

test("Validation Boundary: Task and note schemas enforce non-empty content", () => {
  // Empty task title
  assert.equal(taskSchema.safeParse({ title: "" }).success, false);
  assert.equal(taskSchema.safeParse({ title: "   " }).success, false);
  assert.equal(taskSchema.safeParse({ title: "Real task" }).success, true);

  // Empty note title/content
  assert.equal(noteSchema.safeParse({ title: "", content: "Body" }).success, false);
  assert.equal(noteSchema.safeParse({ title: "Title", content: "" }).success, false);
  assert.equal(noteSchema.safeParse({ title: "Title", content: "Body" }).success, true);
});

test("Failure State Boundary: Error states must not masquerade as empty lists", () => {
  // A helper function representing state classification
  function classifyListState<T>(state: {
    isLoading: boolean;
    error: string | null;
    items: T[];
  }): "loading" | "failure" | "empty" | "populated" {
    if (state.isLoading) return "loading";
    if (state.error !== null) return "failure";
    if (state.items.length === 0) return "empty";
    return "populated";
  }

  // 1. Service outage (error is present, items is empty) => MUST be failure, NEVER empty
  assert.equal(
    classifyListState({ isLoading: false, error: "Network error (500)", items: [] }),
    "failure"
  );

  // 2. Genuinely empty (no error, 0 items) => MUST be empty
  assert.equal(
    classifyListState({ isLoading: false, error: null, items: [] }),
    "empty"
  );

  // 3. Populated (no error, >0 items) => MUST be populated
  assert.equal(
    classifyListState({ isLoading: false, error: null, items: [{ id: "1" }] }),
    "populated"
  );

  // 4. Loading => MUST be loading
  assert.equal(
    classifyListState({ isLoading: true, error: null, items: [] }),
    "loading"
  );
});
