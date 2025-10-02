import { useEffect, useState, useCallback } from "react";
import type { FormEvent, ChangeEvent } from "react";
import supabase from "../supabase-client";
import type { Session } from "@supabase/supabase-js";

interface Task {
  id: number;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
}

interface TaskManagerProps {
  session: Session;
}

export default function TaskManager({ session }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [editingDescriptions, setEditingDescriptions] = useState<
    Record<number, string>
  >({});

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error.message);
      return;
    }

    setTasks(data as Task[]);
  }, [session.user.id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { error } = await supabase
      .from("tasks")
      .insert({ ...newTask, user_id: session.user.id });

    if (error) {
      console.error("Error adding task:", error.message);
      return;
    }

    setNewTask({ title: "", description: "" });
  };

  const updateTask = async (id: number, description: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({ description })
      .eq("id", id);

    if (error) console.error("Error updating task:", error.message);
    setEditingDescriptions((prev) => ({ ...prev, [id]: "" }));
  };

  const deleteTask = async (id: number) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("Error deleting task:", error.message);
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel("tasks-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: any) => {
          switch (payload.eventType) {
            case "INSERT":
              if (payload.new) setTasks((prev) => [...prev, payload.new]);
              break;
            case "UPDATE":
              if (payload.new)
                setTasks((prev) =>
                  prev.map((t) => (t.id === payload.new!.id ? payload.new! : t))
                );
              break;
            case "DELETE":
              if (payload.old)
                setTasks((prev) =>
                  prev.filter((t) => t.id !== payload.old!.id)
                );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 16,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 16 }}>Task Manager</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Task title"
          value={newTask.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewTask((prev) => ({ ...prev, title: e.target.value }))
          }
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <textarea
          placeholder="Task description"
          value={newTask.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setNewTask((prev) => ({ ...prev, description: e.target.value }))
          }
          style={{
            width: "100%",
            padding: 8,
            marginBottom: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{ padding: "8px 16px", cursor: "pointer" }}
        >
          Add Task
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 4,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <strong>{task.title}</strong>
            <p>{task.description}</p>
            <textarea
              placeholder="Edit description..."
              value={editingDescriptions[task.id] || ""}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setEditingDescriptions((prev) => ({
                  ...prev,
                  [task.id]: e.target.value,
                }))
              }
              style={{
                width: "100%",
                padding: 6,
                marginBottom: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  updateTask(task.id, editingDescriptions[task.id] || "")
                }
                style={{ flex: 1, padding: 6, cursor: "pointer" }}
              >
                Update
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                style={{ flex: 1, padding: 6, cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
