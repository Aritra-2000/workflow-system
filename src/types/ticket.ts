export type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type UserUpdate = {
  email: string;
  timestamp: string;
  status: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type Ticket = {
  id: string;
  title: string;
  status: string;
  description: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  projectId: string;
  checklists: ChecklistItem[] | string;
  updatedAt: string;
  updatedBy?: string;
  updateHistory?: UserUpdate[];
  updates?: Array<{
    user?: { email?: string };
    timestamp?: string;
    updatedAt?: string;
    changes?: string | { status?: string };
  }>;
  projectCreatorId?: string;
  assignee?: User | null;
};
