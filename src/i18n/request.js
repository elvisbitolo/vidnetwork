import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  let locale = cookieStore.get("NEXT_LOCALE")?.value;

  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    timeZone: "UTC",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
