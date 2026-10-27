import { formatCredit, type CreditEntry } from "@/engine";

/** Pack asset credits — links open the source page in a new tab. */
export function CreditsList({ credits }: { credits: CreditEntry[] }) {
  return (
    <ul className="space-y-0.5">
      {credits.map((c, i) => (
        <li key={`${i}-${c.work}`}>
          {c.url ? (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {formatCredit(c)}
            </a>
          ) : (
            formatCredit(c)
          )}
        </li>
      ))}
    </ul>
  );
}
