export type Testimonial = {
  /** The customer's words. One idea per card; 1-4 sentences. */
  quote: string;
  /** Display name as the person uses it publicly. */
  name: string;
  /** Optional handle shown under the name (e.g. "@somebuilder"). */
  handle?: string;
  /** Optional link to the original post — renders a ↗ marker. */
  url?: string;
  /** Optional avatar image URL; falls back to initials. */
  avatar?: string;
};

/**
 * TestimonialWall — a drop-in social-proof grid shipped in every generated
 * project. One card per customer voice, laid out as CSS-columns masonry so
 * uneven quote lengths stay tidy without any JS.
 *
 * The data lives in your page (or wherever you fetch it) as a plain array of
 * `Testimonial`. Sample entries in the generated landing page are placeholders
 * — replace them with real customer feedback before you launch, and delete
 * the section entirely if you have none yet.
 *
 * Theme-neutral by design: it uses only the shared `card / eyebrow / ink /
 * line` utilities that every generated style provides.
 */
export function TestimonialWall({
  items,
  className = "",
}: {
  items: Testimonial[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className={`columns-1 gap-4 sm:columns-2 lg:columns-3 ${className}`}
    >
      {items.map((t) => (
        <figure
          key={t.name + t.quote.slice(0, 12)}
          className="card mb-4 break-inside-avoid px-5 py-4"
        >
          <blockquote className="text-sm leading-relaxed text-ink">
            {t.quote}
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-3">
            <Avatar name={t.name} src={t.avatar} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">
                {t.name}
              </div>
              {t.handle && (
                <div className="truncate text-xs text-ink-soft">{t.handle}</div>
              )}
            </div>
            {t.url && (
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Source: ${t.name}`}
                className="text-ink-soft hover:text-ink"
              >
                ↗
              </a>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <img
        src={src}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-[rgb(var(--line))] object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--line))] text-xs font-semibold text-ink-soft"
    >
      {initials}
    </div>
  );
}
