function toDateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default function AttendanceForm({
  action,
  studentName,
  record,
  error,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  studentName: string;
  record?: { startDate: Date; endDate: Date; totalDays: number; presentDays: number } | null;
  error?: string;
  cancelHref: string;
}) {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-5" style={{ color: "var(--brand-green-darker)" }}>
        {record ? "Edit" : "Add"} Weekly Attendance — {studentName}
      </h1>

      {error && <div className="flash-error">{error}</div>}

      <form action={action} className="space-y-4">
        <div className="form-field">
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(record?.startDate)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(record?.endDate)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="totalDays">Total Days</label>
          <input
            id="totalDays"
            name="totalDays"
            type="number"
            min={1}
            defaultValue={record?.totalDays ?? ""}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="presentDays">Present Days</label>
          <input
            id="presentDays"
            name="presentDays"
            type="number"
            min={0}
            defaultValue={record?.presentDays ?? ""}
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn" type="submit">
            Save
          </button>
          <a className="btn btn-secondary" href={cancelHref}>
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
