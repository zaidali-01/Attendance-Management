import { CLASS_CHOICES } from "@/lib/constants";

export default function StudentForm({
  action,
  student,
  error,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  student?: { name: string; className: string; rollNo: string | null } | null;
  error?: string;
  cancelHref: string;
}) {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-5" style={{ color: "var(--brand-green-darker)" }}>
        {student ? "Edit Student" : "Add Student"}
      </h1>

      {error && <div className="flash-error">{error}</div>}

      <form action={action} className="space-y-4">
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" defaultValue={student?.name ?? ""} required />
        </div>

        <div className="form-field">
          <label htmlFor="className">Class</label>
          <select id="className" name="className" defaultValue={student?.className ?? ""} required>
            <option value="">Select class</option>
            {CLASS_CHOICES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="rollNo">Roll No. (optional)</label>
          <input id="rollNo" name="rollNo" type="text" defaultValue={student?.rollNo ?? ""} />
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
