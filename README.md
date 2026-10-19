# ProjectCamp Frontend

ProjectCamp is a modern, responsive web application for collaborative project management, task tracking, team role management, and documentation notes. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

---

## 1. Overview & Architecture

ProjectCamp connects to the ProjectCamp Express REST API backend using an HTTP-only cookie-based authentication contract.

```text
Browser Client (Next.js App Router)
  ├── Route Middleware & Auth Context (credentials: "include")
  ├── /api/v1/* Proxy (next.config.ts rewrite -> http://localhost:8000/api/v1)
  └── Backend Express API (port 8000)
```

### Key Architectural Decisions:
- **Cookie Authentication Contract:** Sessions are maintained via `accessToken` and `refreshToken` stored in secure, HTTP-only cookies. No sensitive auth tokens are persisted in `localStorage`.
- **API Base URL & Proxy:** In development and production, Next.js rewrites `/api/v1/:path*` requests directly to the backend API, eliminating cross-origin browser issues and simplifying cookie propagation.
- **Defensive Error Handling:** API responses are parsed through typed envelope normalizers (`ApiResponse`, `ApiError`), ensuring network outages or 500 errors display actionable user messages rather than masquerading as empty lists.

---

## 2. Core Features

### 2.1 Authentication & Account Management
- **Registration & Login:** Full validation for username, email, and secure passwords.
- **Session Continuity:** Authenticated state persists across browser page reloads via cookie validation.
- **Account Recovery:** Full UI workflows for email verification tokens, forgot-password requests, and password reset forms.
- **Safe Logout:** Invalidates tokens on the server and clears browser session cookies.

### 2.2 Dashboard & Project Management
- **Project Catalog:** View projects with real-time search, status filtering, and role indicators.
- **Project Creation:** Form validation requiring unique project names and enforcing start/end date chronology.
- **Project Details:** Comprehensive overview with task metrics, active members, and linked notes.
- **Destructive Deletion:** Modal confirmation clearly explaining cascading deletion of all child tasks and notes before confirming.

### 2.3 Team Membership & Role Enforcement
- **Member Directory:** Real-time list of project collaborators.
- **Add Members:** Add registered users by verified email address with designated roles (`admin`, `project_admin`, `member`).
- **Permission Matrix:** Role-based UI visibility matching backend authorization checks.

### 2.4 Tasks & Subtasks
- **Task Lifecycle:** Filter and manage tasks across standard statuses: `todo`, `in_progress`, and `done`.
- **Task Assignment:** Assign tasks to verified project members.
- **Subtask Checklists:** Create and toggle completion status for nested subtasks.

### 2.5 Project Notes
- **Categorized Documentation:** Organize project notes by category (e.g., Architecture, Design, Milestones).
- **CRUD Operations:** Create, update, view, and delete project notes with full persistence.

---

## 3. Technology Stack

- **Framework:** [Next.js 16](https://nextjs.org) (Turbopack, App Router)
- **Library:** [React 19](https://react.dev)
- **Language:** [TypeScript 5](https://www.typescriptlang.org)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com)
- **UI Components:** [Radix UI primitives](https://www.radix-ui.com), [Lucide React](https://lucide.dev) icons
- **Validation:** [Zod](https://zod.dev) & [React Hook Form](https://react-hook-form.com)
- **Theme:** [next-themes](https://github.com/pacocoursey/next-themes) (Dark/Light mode support)
- **Notifications:** [Sonner](https://sonner.emilkowal.ski)

---

## 4. Getting Started

### Prerequisites
- Node.js 20.x or newer
- Running ProjectCamp Express backend (defaulting to `http://localhost:8000`)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env.local
   ```
   Ensure `NEXT_PUBLIC_API_URL` points to your backend instance:
   ```dotenv
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Available Scripts & Verification

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server on port 3000 |
| `npm run build` | Compiles optimized production bundle |
| `npm start` | Starts Next.js production server |
| `npm run lint` | Runs ESLint analysis across all components and pages |
| `npm run type-check` | Executes TypeScript type-checking without emitting artifacts |
| `npm test` | Runs frontend boundary and validation test suite |

---

## 6. Continuous Integration (CI)

A GitHub Actions workflow is established at `.github/workflows/ci.yml`. On every push and pull request to `master` and `main`, the pipeline runs:
1. `npm run lint` — ESLint validation
2. `npm run type-check` — TypeScript strict type verification
3. `npm test` — Unit and security boundary test suite
4. `npm run build` — Next.js production build verification

---

## 7. Known Constraints & Production Notes

- **Backend Dependency:** The frontend requires an active ProjectCamp backend instance for authentication and data persistence.
- **File Attachments:** Uploaded task attachments are stored on the backend host's local filesystem (`./public/images/`). In containerized cloud deployments, an external S3/Cloudinary object store is recommended.
