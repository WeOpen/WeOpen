type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassValue = string | false | null | undefined | ClassDictionary;

/** cn joins CSS class values without introducing external runtime dependencies. */
export function cn(...values: ClassValue[]): string {
  return values
    .flatMap((value) => {
      if (!value) {
        return [];
      }
      if (typeof value === "string") {
        return value;
      }
      return Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([className]) => className);
    })
    .join(" ");
}
