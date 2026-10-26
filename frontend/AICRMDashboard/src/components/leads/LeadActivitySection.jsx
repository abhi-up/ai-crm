import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Check, Clock3, History, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Select, Spinner, Textarea } from "../ui";
import { leadsApi, tasksApi } from "../../lib/services";
import { shortDate, timeOf } from "../../lib/format";

const TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "note", label: "Note" },
];

export function LeadActivitySection({ leadId, leadName, open }) {
  const [activities, setActivities] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [type, setType] = useState("call");
  const [detail, setDetail] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const refresh = async () => {
    const [history, followUps] = await Promise.all([
      leadsApi.activities(leadId),
      tasksApi.list({ relatedLead: leadId }),
    ]);
    setActivities(history.activities);
    setTasks(followUps.tasks);
    setLoadError(false);
  };

  useEffect(() => {
    if (!open || !leadId) return;
    let active = true;
    Promise.all([leadsApi.activities(leadId), tasksApi.list({ relatedLead: leadId })])
      .then(([history, followUps]) => {
        if (!active) return;
        setActivities(history.activities);
        setTasks(followUps.tasks);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => { active = false; };
  }, [leadId, open]);

  const addActivity = async (event) => {
    event.preventDefault();
    if (!detail.trim()) return;
    setSavingActivity(true);
    try {
      await leadsApi.addActivity(leadId, { type, detail: detail.trim() });
      setDetail("");
      await refresh();
      toast.success("Activity logged");
    } catch (error) {
      toast.error(error.message || "Could not log activity");
    } finally {
      setSavingActivity(false);
    }
  };

  const addFollowUp = async (event) => {
    event.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSavingTask(true);
    try {
      await tasksApi.create({ title: title.trim(), dueDate, relatedLead: leadId, status: "Pending" });
      setTitle("");
      setDueDate("");
      await refresh();
      toast.success("Follow-up scheduled");
    } catch (error) {
      toast.error(error.message || "Could not schedule follow-up");
    } finally {
      setSavingTask(false);
    }
  };

  const completeTask = async (task) => {
    try {
      await tasksApi.update(task._id, { status: "Completed" });
      await refresh();
    } catch (error) {
      toast.error(error.message || "Could not complete follow-up");
    }
  };

  const openTasks = tasks.filter((task) => task.status !== "Completed")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-brand-600" /> Follow-ups
        </h3>
        {openTasks.length ? (
          <div className="mt-3 space-y-2">
            {openTasks.map((task) => (
              <div key={task._id} className="flex items-start gap-2 rounded-xl bg-surface-muted p-2.5">
                <button type="button" onClick={() => completeTask(task)} aria-label={`Complete ${task.title}`} className="mt-0.5 text-brand-600 hover:text-brand-800">
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  <p className="text-xs text-ink-soft">{task.dueDate ? shortDate(task.dueDate) : "No due date"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-2 text-xs text-ink-soft">No open follow-ups for this lead.</p>}
        <form onSubmit={addFollowUp} className="mt-3 space-y-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Follow up with ${leadName}`} aria-label="Follow-up title" required />
          <div className="flex gap-2">
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={format(new Date(), "yyyy-MM-dd")} aria-label="Follow-up due date" required />
            <Button type="submit" size="sm" loading={savingTask}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <History className="h-4 w-4 text-brand-600" /> Activity history
        </h3>
        <form onSubmit={addActivity} className="mt-3 space-y-2">
          <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Activity type">
            {TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Textarea value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={2000} rows={2} placeholder="What happened?" aria-label="Activity details" required />
          <Button type="submit" size="sm" loading={savingActivity}>Log activity</Button>
        </form>
        {loadError ? <p className="mt-4 text-sm text-rose-700">Could not load activity. Close and reopen this lead to retry.</p> : activities === null ? <Spinner className="mt-4" /> : (
          <ol className="mt-4 space-y-3 border-l border-line pl-4">
            {activities.map((activity) => (
              <li key={activity._id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-surface" />
                <p className="text-sm font-medium text-ink">{activity.title}</p>
                {activity.detail && <p className="whitespace-pre-wrap break-words text-xs text-ink-soft">{activity.detail}</p>}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft"><Clock3 className="h-3 w-3" /> {shortDate(activity.createdAt)} · {timeOf(activity.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
