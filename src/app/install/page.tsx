import { InstallPageClient } from "@/components/install/install-page-client";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default function InstallPage() {
  return (
    <InstallPageClient
      dictionaries={{
        en: getDictionary("en"),
        pt: getDictionary("pt"),
        es: getDictionary("es")
      }}
    />
  );
}
