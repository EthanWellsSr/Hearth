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
      <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-400 dark:border-stone-700">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="card group flex items-center gap-3 px-4 py-2.5"
        >
          <form action={toggleAction} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name={checkedField} value={String(item.checked)} />
            <button
              type="submit"
              aria-label={item.checked ? "Mark not done" : "Mark done"}
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs transition " +
                (item.checked
                  ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                  : "border-stone-300 text-transparent hover:border-emerald-500 dark:border-stone-600")
              }
            >
              ✓
            </button>
          </form>

          <span
            className={
              "flex-1 " +
              (item.checked
                ? "text-stone-400 line-through dark:text-stone-500"
                : "text-stone-700 dark:text-stone-200")
            }
          >
            {item.label}
          </span>

          <form action={deleteAction} className="flex">
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              aria-label="Delete"
              className="icon-btn opacity-60 transition-opacity group-hover:opacity-100"
            >
              ✕
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
