import Foundation

/// Cross-process handoff between the Share Extension and the main app.
///
/// Compiled into BOTH targets (see the two PBXBuildFile entries in
/// project.pbxproj) so the writer and reader can't drift apart.
///
/// Why this exists alongside the `marco://import` deep link: opening the host
/// app from a share extension relies on `extensionContext.open`, which is
/// documented for Today extensions and returns false for share extensions on
/// several iOS versions. When that happens the share silently evaporates. The
/// App Group queue is the durable record — the extension always writes here,
/// and the app drains it on activation whether or not the deep link landed.
enum SharedImportStore {

    /// Must match the App Groups entitlement on both targets.
    static let appGroupID = "group.com.ACGC.crave"

    private static let queueKey = "pendingImports"

    /// A runaway producer (extension fires, app never opens) shouldn't grow
    /// this without bound. Oldest entries are dropped first.
    private static let maxQueued = 10

    /// How long a queued share stays interesting. Past this the user has
    /// almost certainly moved on and surfacing an import screen would be
    /// confusing rather than helpful. Mirrors PENDING_TTL_MS in
    /// DeepLinkHandler.tsx.
    private static let ttl: TimeInterval = 60 * 60

    struct PendingImport {
        let id: String
        let url: String
    }

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }

    // MARK: - Writer (extension side)

    static func enqueue(url: String, id: String) {
        guard let defaults else { return }
        var queue = rawQueue(from: defaults)
        queue.append(["id": id, "url": url, "at": String(Date().timeIntervalSince1970)])
        if queue.count > maxQueued {
            queue.removeFirst(queue.count - maxQueued)
        }
        defaults.set(queue, forKey: queueKey)
    }

    // MARK: - Reader (app side)

    /// Pops the oldest live entry. Returns nil when the queue is empty or
    /// everything in it has aged out.
    static func dequeue() -> PendingImport? {
        guard let defaults else { return nil }
        var queue = rawQueue(from: defaults)
        let now = Date().timeIntervalSince1970

        while !queue.isEmpty {
            let entry = queue.removeFirst()
            defaults.set(queue, forKey: queueKey)

            guard let id = entry["id"], let url = entry["url"] else { continue }
            let at = Double(entry["at"] ?? "") ?? 0
            if now - at > ttl { continue }

            return PendingImport(id: id, url: url)
        }

        return nil
    }

    /// Drops a specific entry without surfacing it. Used when the deep link
    /// beat us to it — the app already has the URL in hand, so leaving the
    /// queued copy behind would import the same link twice.
    static func remove(id: String) {
        guard let defaults else { return }
        let queue = rawQueue(from: defaults).filter { $0["id"] != id }
        defaults.set(queue, forKey: queueKey)
    }

    private static func rawQueue(from defaults: UserDefaults) -> [[String: String]] {
        (defaults.array(forKey: queueKey) as? [[String: String]]) ?? []
    }
}
