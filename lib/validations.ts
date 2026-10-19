import { z } from "zod";

/**
 * Common validation schemas for usability and security boundaries.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required.")
  .email("Please enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long.");

export const registrationSchema = z
  .object({
    email: emailSchema,
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters long.")
      .max(30, "Username cannot exceed 30 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and dashes."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const projectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters.")
      .max(100, "Project name cannot exceed 100 characters."),
    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters.")
      .optional()
      .default(""),
    status: z.enum(["Planning", "In Progress", "Completed", "On Hold"]).default("Planning"),
    startDate: z.string().optional().default(""),
    endDate: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date cannot be earlier than start date.",
      path: ["endDate"],
    }
  );

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(200, "Task title cannot exceed 200 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Task description cannot exceed 2000 characters.")
    .optional()
    .default(""),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  assignedTo: z.string().trim().optional(),
});

export const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Note title is required.")
    .max(150, "Note title cannot exceed 150 characters."),
  content: z
    .string()
    .trim()
    .min(1, "Note content is required.")
    .max(10000, "Note content cannot exceed 10000 characters."),
  category: z.string().trim().min(1, "Category is required.").default("Design"),
});

export const subtaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Subtask title is required.")
    .max(200, "Subtask title cannot exceed 200 characters."),
});

export const memberInviteSchema = z.object({
  email: emailSchema,
});

