"use client";

import { NextIntlClientProvider } from "next-intl";
import { useState, useEffect } from "react";

function readLocale() {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
  return match ? match[1] : "en";
}

export default function Providers({ messages, locale: serverLocale, children }) {
  const [locale, setLocale] = useState(serverLocale || "en");

  useEffect(() => {
    const clientLocale = readLocale();
    if (clientLocale !== locale) {
      setLocale(clientLocale);
    }
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale] || messages.en}>
      {children}
    </NextIntlClientProvider>
  );
}
