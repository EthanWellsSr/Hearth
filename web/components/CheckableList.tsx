// Shared list view for to-dos and groceries (and future lists like Chores).
// Each caller normalizes its rows to { id, label, checked } and supplies its own
// toggle/delete server actions — the view is shared, the domain logic stays per-feature.
type Item = { id: string; label: string; checked: boolean };

export function CheckableList({
  items,
  toggleAction,
  deleteAction,
  checkedField,
  emptyText = "Nothing here yet.",
}: {
  items: Item[];
  toggleAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  checkedField: string; // the DB column the toggle flips: "done" | "bought"
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-600">
          <TinyLeaf className="h-6 w-6" />
        </span>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="card group flex min-h-16 items-center gap-3 px-3.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-md sm:px-4"
        >
          <form action={toggleAction} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name={checkedField} value={String(item.checked)} />
            <button
              type="submit"
              aria-label={item.checked ? "Mark not done" : "Mark done"}
              className={
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition " +
                (item.checked
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : "border-emerald-200 bg-emerald-50/60 text-transparent hover:border-emerald-500")
              }
            >
              ✓
            </button>
          </form>

          <span
            className={
              "flex-1 " +
              (item.checked
                ? "text-stone-400 line-through"
                : "text-stone-700")
            }
          >
            {item.label}
          </span>

          <form action={deleteAction} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              aria-label="Delete"
              className="icon-btn opacity-70 transition-opacity group-hover:opacity-100"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="m8 8 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
import { TinyLeaf } from "./MeadowSprig";
