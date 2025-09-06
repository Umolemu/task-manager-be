import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { Auth } from "./Auth/auth";
import { Project, Task, User, UserWithPassword } from "./Types/types";

dotenv.config();

interface AuthRequest extends Request {
  user?: User;
}

const SECRET = process.env.JWT_SECRET || "fallback_secret";
const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory database
const db: { users: User[]; projects: Project[]; tasks: Task[] } = {
  users: [],
  projects: [],
  tasks: [],
};

// Get
app.get("/projects", Auth, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const search = String(req.query.search || "").toLowerCase();

  const projects = db.projects.filter(
    (p) => p.userId === userId && p.name.toLowerCase().includes(search)
  );

  res.json({ projects, total: projects.length });
});

app.get("/tasks", Auth, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const search = String(req.query.search || "").toLowerCase();

  const tasks = db.tasks.filter(
    (t) =>
      t.userId === userId && (!search || t.name.toLowerCase().includes(search))
  );

  res.json({ tasks, total: tasks.length });
});

app.get("/healthz", (req: AuthRequest, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Post
app.post("/auth/register", async (req: AuthRequest, res: Response) => {
  try {
    let { name, email, password } = req.body;

    email = email.toLowerCase().replace(/\s+/g, "");

    // Check for duplicate email
    if (db.users.find((user) => user.email === email)) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const newUser: UserWithPassword = {
      id: userId,
      name,
      email,
      password: hashedPassword,
    };

    db.users.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;

    const token = jwt.sign({ id: userId, email }, SECRET, { expiresIn: "1h" });

    res.status(201).json({
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    let { email, password } = req.body;

    email = email.toLowerCase().replace(/\s+/g, "");

    const user = db.users.find((u) => u.email === email) as
      | UserWithPassword
      | undefined;

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: "1h" });

    res.json({
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Create a new project
app.post("/projects", Auth, (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  const userId = req.user?.id;

  if (!name) {
    return res.status(400).json({ error: "Project name is required" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const newProject: Project = {
    id: uuidv4(),
    userId,
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.projects.push(newProject);
  res.status(201).json(newProject);
});

// Create a new task
app.post("/tasks", Auth, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, description, tags, status, priority, due, projectId } =
    req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!name) {
    return res.status(400).json({ error: "Task name is required" });
  }

  // check if the project exists and belongs to the user
  if (projectId) {
    const project = db.projects.find(
      (p) => p.id === projectId && p.userId === userId
    );
    if (!project) return res.status(400).json({ error: "Invalid project ID" });
  }

  const newTask: Task = {
    id: uuidv4(),
    userId,
    projectId: projectId || null,
    name,
    description: description || "",
    tags: tags || [],
    status: status || "pending",
    priority: priority || "medium",
    due: due ?? new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.tasks.push(newTask);
  res.status(201).json(newTask);
});

// Put
app.put("/projects/:id", Auth, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const project = db.projects.find(
    (project) => project.id === req.params.id && project.userId === userId
  );

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { name, description } = req.body;
  if (name) {
    project.name = name;
  }

  if (description) {
    project.description = description;
  }

  project.updatedAt = new Date();

  res.json(project);
});

// Patch
app.patch("/tasks/:id", Auth, (req: AuthRequest, res: Response) => {
  const task = db.tasks.find((t) => t.id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (task.userId !== req.user?.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, description, tags, status, priority, due } = req.body;
  if (name !== undefined) task.name = name;
  if (description !== undefined) task.description = description;
  if (tags !== undefined) task.tags = tags;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (due !== undefined) task.due = new Date(due);

  task.updatedAt = new Date();

  res.json(task);
});

// Delete
app.delete("/projects/:id", Auth, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const projectIndex = db.projects.findIndex(
    (p) => p.id === req.params.id && p.userId === userId
  );

  if (projectIndex === -1) {
    return res.status(404).json({ error: "Project not found" });
  }

  // also delete all tasks belonging to this project
  db.tasks = db.tasks.filter((t) => t.projectId !== req.params.id);

  db.projects.splice(projectIndex, 1);
  res.status(200).json({ message: "Project deleted successfully" });
});

app.delete("/tasks/:id", Auth, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const taskIndex = db.tasks.findIndex(
    (t) => t.id === req.params.id && t.userId === userId
  );

  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  db.tasks.splice(taskIndex, 1);
  res.status(200).json({ message: "Task deleted successfully" });
});

// Only start the server if not running tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;
