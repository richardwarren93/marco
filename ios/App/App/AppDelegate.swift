import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// True once the Capacitor WebView has appeared at least once. Until then
    /// there is no JS listener to receive a synthetic open-URL notification,
    /// so the pending-import drain has to wait.
    private var bridgeHasAppeared = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // The drain below posts .capacitorOpenURL, which only reaches the web
        // layer once DeepLinkHandler has registered its appUrlOpen listener.
        // On a cold launch that happens well after didBecomeActive — the
        // WebView loads a remote origin over the network — so hang the first
        // attempt off the WebView appearing instead.
        // Token intentionally discarded: the observer lives as long as the
        // app delegate, so there's nothing to unregister.
        _ = NotificationCenter.default.addObserver(
            forName: .capacitorViewDidAppear,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            let firstAppearance = !self.bridgeHasAppeared
            self.bridgeHasAppeared = true
            if firstAppearance {
                self.drainPendingImports()
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.

        // Warm activation: the web layer is already running, so a share that
        // was queued while we were backgrounded can be surfaced immediately.
        // Cold launches are handled by the capacitorViewDidAppear observer.
        if bridgeHasAppeared {
            drainPendingImports()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // A marco://import deep link carries the same id as the App Group
        // entry the extension queued. Drop that entry now: iOS delivers the
        // URL before applicationDidBecomeActive, so clearing it here stops the
        // drain from importing the same share a second time.
        if let id = Self.importID(from: url) {
            SharedImportStore.remove(id: id)
        }

        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // MARK: - Share Extension handoff

    /// Surfaces one queued share by replaying it as an open-URL notification,
    /// which Capacitor forwards to the web layer as `appUrlOpen` — the same
    /// event DeepLinkHandler already handles, so this needs no JS of its own.
    ///
    /// Known limitation: one import per activation. If someone shares several
    /// links while the deep link is failing, the rest stay queued until the
    /// next foreground. Draining them all at once would just race the web
    /// layer, since each import navigates to the same route.
    private func drainPendingImports() {
        guard let pending = SharedImportStore.dequeue() else { return }
        guard var components = URLComponents(string: "marco://import") else { return }
        components.queryItems = [
            URLQueryItem(name: "url", value: pending.url),
            URLQueryItem(name: "id", value: pending.id),
        ]
        guard let url = components.url else { return }

        postOpenURL(url)

        // The WebView having appeared doesn't prove the JS listener is live —
        // it loads a remote origin, so React may still be booting. Re-post
        // once; DeepLinkHandler dedupes on the id, so a duplicate is a no-op
        // and whichever post lands after the listener exists wins.
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            self?.postOpenURL(url)
        }
    }

    /// Routes through ApplicationDelegateProxy rather than posting
    /// .capacitorOpenURL by hand: the proxy owns the notification's payload
    /// shape (and also pings the Cordova bridge), so replaying a URL through
    /// it is indistinguishable from a real system open.
    private func postOpenURL(_ url: URL) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            open: url,
            options: [:]
        )
    }

    private static func importID(from url: URL) -> String? {
        guard url.scheme?.lowercased() == "marco" else { return nil }
        return URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "id" })?
            .value
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
