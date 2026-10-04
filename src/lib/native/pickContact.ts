import { Capacitor } from "@capacitor/core";

// Native contacts picker (iOS/Android). Uses the system contact picker
// (CNContactPickerViewController on iOS) via @capacitor-community/contacts —
// the system picker needs NO contacts permission, the user just taps someone.
// On web this is unavailable and callers fall back to manual number entry.

export function contactsPickerAvailable(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function pickContactNumber(): Promise<{ name: string | null; number: string | null } | null> {
  if (!contactsPickerAvailable()) return null;
  try {
    const { Contacts } = await import("@capacitor-community/contacts");
    const res = await Contacts.pickContact({ projection: { name: true, phones: true } });
    const c = res?.contact;
    const number = c?.phones?.find((p) => p.number)?.number ?? null;
    return { name: c?.name?.display ?? null, number };
  } catch {
    // User cancelled the picker, or the plugin isn't linked in this build.
    return null;
  }
}
