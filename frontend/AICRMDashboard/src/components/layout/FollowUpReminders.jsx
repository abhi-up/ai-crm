import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dropdown } from "../ui";
import { tasksApi } from "../../lib/services";

export function FollowUpReminders() {
  const [reminders, setReminders] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { tasks } = await tasksApi.list();
        if (!active) return;
        setLoadError(false);
        const today = format(new Date(), "yyyy-MM-dd");
        setReminders(tasks
          .filter((task) => task.status !== "Completed" && task.dueDate && task.dueDate.slice(0, 10) <= today)
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      } catch {
        if (active) setLoadError(true);
      }
    };
    load();
    const interval = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    window.addEventListener("nexora:tasks-changed", load);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
      window.removeEventListener("nexora:tasks-changed", load);
    };
  }, []);

  const complete = async (task) => {
    try {
      await tasksApi.update(task._id, { status: "Completed" });
      setReminders((current) => current.filter((item) => item._id !== task._id));
      toast.success("Follow-up completed");
    } catch (error) {
      toast.error(error.message || "Could not complete follow-up");
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Dropdown
      className="w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto"
      trigger={
        <button type="button" className="relative rounded-full border border-line bg-surface p-2.5 text-ink-soft transition hover:text-ink" aria-label={`${reminders.length} follow-up reminders`}>
          <Bell className="h-[18px] w-[18px]" />
          {reminders.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{reminders.length > 9 ? "9+" : reminders.length}</span>}
        </button>
      }
    >
      <div className="px-3 py-2 text-sm font-semibold text-ink">Follow-up reminders</div>
      {loadError ? (
        <p className="px-3 py-3 text-sm text-rose-700">Could not load reminders. Open Follow-ups to retry.</p>
      ) : reminders.length === 0 ? (
        <p className="px-3 py-3 text-sm text-ink-soft">No follow-ups due today.</p>
      ) : reminders.map((task) => (
        <div key={task._id} className="flex items-start gap-2 border-t border-line px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{task.title}</p>
            <p className="text-xs text-ink-soft">
              {task.dueDate.slice(0, 10) < today ? "Overdue" : "Due today"}
              {task.relatedLead?.name ? ` · ${task.relatedLead.name}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => complete(task)} aria-label={`Complete ${task.title}`} className="rounded-lg p-1 text-brand-700 hover:bg-brand-50"><Check className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => navigate("/tasks")} className="flex w-full items-center justify-center gap-1 border-t border-line px-3 py-2 text-xs font-medium text-brand-700 hover:bg-surface-muted">
        View all follow-ups <ExternalLink className="h-3 w-3" />
      </button>
    </Dropdown>
  );
}
