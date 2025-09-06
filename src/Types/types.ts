import { Priority, TaskStatus } from "./enums";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  tags: string[];
  status: TaskStatus;
  priority: Priority;
  due?: Date;
  createdAt: Date;
  updatedAt: Date;
}
