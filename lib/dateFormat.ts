export function formatArticleTimestamp(
  value: string,
  options: {
    locale?: string;
    timeZone?: string;
    includeDate?: boolean;
  } = {}
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const locale = options.locale || "en-US";
  const timeZone =
    options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat(locale, {
    month: options.includeDate === false ? undefined : "short",
    day: options.includeDate === false ? undefined : "numeric",
    year: options.includeDate === false ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}
