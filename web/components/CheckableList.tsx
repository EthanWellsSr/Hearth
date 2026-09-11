// Shared list view for to-dos and groceries (and future lists like Chores).
// Each caller normalizes its rows to { id, label, checked } and supplies its own
// toggle/delete server actions — the view is shared, the domain logic stays per-feature.
type Item = { id: string; label: string; checked: boolean };

export function CheckableList({
  items,
  toggleAction,
  deleteAction,
  checkedField,
}: {
  items: Item[];
  toggleAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  checkedField: string; // the DB column the toggle flips: "done" | "bought"
}) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <form action={toggleAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name={checkedField} value={String(item.checked)} />
            <button type="submit">{item.checked ? "☑" : "☐"}</button>
          </form>
          {item.label}
          <form action={deleteAction}>
            <input type="hidden" name="id" value={item.id} />
            <button type="submit">✕</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
