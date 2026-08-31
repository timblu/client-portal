export function decisionLabel(state: string) {
  switch (state) {
    case "APPROVED":
      return "Approved";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "REJECTED":
      return "Rejected";
    default:
      return "Pending review";
  }
}

export function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function attributedName(person: { name: string; removedAt?: Date | string | null } | null | undefined) {
  if (!person) return null;
  return person.removedAt ? `${person.name} (removed)` : person.name;
}
