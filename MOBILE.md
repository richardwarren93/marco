# Marco — Mobile (iOS + Android)

The mobile shell wraps the production web app at
`https://marco-eta-lyart.vercel.app` in a native Capacitor container,
plus native plugins (push, share, haptics, status bar, splash) so the
build qualifies under Apple guideline 4.2.

## Branch / status

- `main` — web app + PWA manifest (already shippable on iOS via
  Add-to-Home-Screen).
- `claude/mobile-capacitor` — full native shell with iOS + Android
  projects. **Merge to ship as a "real" app.**

## Local dev

```bash
npm install                # picks up Capacitor + plugins
npm run cap:assets         # regenerate icon + splash from public/marco-icon.svg
npm run cap:sync           # copy plugin/config changes into ios/ + android/
npm run cap:open:android   # opens the Android project in Android Studio
npm run cap:open:ios       # opens the iOS project in Xcode (Mac only)
```

The first time, Android Studio will download the SDK + emulator (~3 GB).
After that:

```bash
npm run cap:run:android    # build + deploy to a running Android emulator
```

## Cloud builds (Codemagic)

`codemagic.yaml` defines two manual workflows:

- `android-build` — produces signed `.aab` (Play Store) and `.apk`
  (sideload / BlueStacks). Runs today.
- `ios-build` — produces signed `.ipa` and ships to TestFlight.
  Requires Apple Developer Program approval.

### One-time Codemagic setup

1. Sign in to https://codemagic.io with the marco GitHub account.
2. Add the `richardwarren93/marco` repo. Codemagic will pick up
   `codemagic.yaml` automatically.
3. Apps → Marco → **Teams** → create a team (or use Personal).
4. Apps → Marco → **Variables and secrets** → create a group called
   `marco_android_signing`. Inside, define:
   - `CM_KEYSTORE_PASSWORD`
   - `CM_KEY_ALIAS`
   - `CM_KEY_ALIAS_PASSWORD`
5. Apps → Marco → **Code signing identities** → upload the Android
   keystore (see "Generate Android keystore" below).

### Generate Android keystore (one-time, **store this safely**)

```bash
keytool -genkey -v \
  -keystore marco-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias marco
```

You'll be prompted for a password, key alias, and a CN (common name —
your name is fine). **Save the keystore file and the passwords** — if
you lose them, you can never publish updates to the same Play Store
listing. Recovery is impossible. Back the keystore up to a password
manager or encrypted vault.

Upload the `.jks` to Codemagic and use the same password / alias /
alias-password values as the secrets above.

### Run an Android build

In Codemagic → Apps → Marco → **Workflows** → `android-build` → **Start
new build**. ~5–8 min. Artifacts (`.aab` and `.apk`) will be on the
build page and emailed to you.

To install the `.apk` on a friend's BlueStacks: download the APK from
the Codemagic build page, drag it into BlueStacks. Marco installs.

To submit to Google Play **internal testing**:
1. Google Play Console → **Setup → App integrity** → upload the
   keystore's SHA-256 fingerprint (Codemagic shows it after first build).
2. Play Console → **Testing → Internal testing → Create new release** →
   upload the `.aab` from Codemagic → Save → Review release → Roll out.
3. Add tester emails to the testing track. They get a link, install
   from the Play Store on their Android phone within ~1–2 hours.

For automatic upload, uncomment the `google_play` block in
`codemagic.yaml` and add a Google Play Developer service-account JSON
key under `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`.

## iOS — once Apple Developer Program is approved

1. https://appstoreconnect.apple.com → **Users and Access → Keys** →
   create an App Store Connect API Key with **App Manager** access.
   Download the `.p8` file (you only get one chance).
2. Codemagic → Apps → Marco → **Integrations → App Store Connect →
   Connect**. Enter the Issuer ID, Key ID, and upload the `.p8`. Name
   the integration `marco_app_store_connect` (matches the
   `codemagic.yaml` reference).
3. App Store Connect → **My Apps → New App** → Bundle ID
   `app.marco.mobile`, name "Marco", SKU "marco-001". This creates the
   listing.
4. Run the `ios-build` workflow in Codemagic. ~10–15 min on a Mac mini
   M2 instance. The build auto-submits to TestFlight.
5. App Store Connect → TestFlight → add your Apple ID (and friends'
   Apple IDs) to the **Internal Testing** group. Internal testers get
   email invites. They install the **TestFlight** app from the App
   Store, then accept the invite in TestFlight, then install Marco.
   Internal testing has no Apple review wait — minutes from build to
   testable.
6. App Store production submission is a separate step in App Store
   Connect (screenshots, privacy details, listing copy). Apple's first
   review is typically 24–48 h.

## Apple guideline 4.2 — what we did to pass review

The mobile shell loads the live web app, which Apple normally rejects
under 4.2 ("repurposed website") unless the app does meaningfully more
than the website. We added:

- **Push notifications** — `@capacitor/push-notifications`, with a
  client-side permission prompt and token registration to Supabase.
- **Share intents** — Android `ACTION_SEND` filter (so Marco appears
  under "Share via" from any app); iOS share extension is deferred to
  a follow-up but not required for 4.2 if push is working.
- **Native status bar + splash** — branded launch experience.
- **Haptics** — feedback on the cook-mode timer interactions.
- **Universal/deep links** — `https://marco-eta-lyart.vercel.app/*`
  opens directly in the app on Android.

That's the floor; if Apple still pushes back, the next thing to add is
Sign in with Apple (required when offering third-party logins).
