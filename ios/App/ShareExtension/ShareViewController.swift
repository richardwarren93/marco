import UIKit
import UniformTypeIdentifiers

/// Marco's iOS Share Extension.
///
/// Deliberately dumb: it does no network work and holds no credentials. It
/// pulls the shared URL out of the extension context and hands it to the main
/// app two ways — a durable write to the App Group queue, then a
/// `marco://import?url=…` deep link — and gets out of the way.
///
/// Why not POST straight to the API from here? Marco's iOS app is a Capacitor
/// shell pointing at the production web app (see capacitor.config.ts), so the
/// Supabase session lives in WKWebView cookies for the Vercel origin. A share
/// extension is a separate process and can't read those. Doing the import here
/// would mean bridging a token into App Group storage and keeping it fresh —
/// a whole auth surface for no user-visible gain. Handing off to the app lets
/// the already-authenticated WebView do the work with zero new secrets.
///
/// Why both handoffs? The deep link is instant but rests on
/// `extensionContext.open`, which silently fails for share extensions on some
/// iOS versions. The queue always survives; the app drains it on activation.
/// See SharedImportStore.
final class ShareViewController: UIViewController {

    /// Custom scheme registered in the main app's Info.plist (CFBundleURLTypes).
    private static let hostAppScheme = "marco"

    /// Guards against finishing twice — `extensionContext.open`'s completion
    /// handler is unreliable across iOS versions, so a watchdog also fires.
    private var didFinish = false

    private let card = UIView()
    private let titleLabel = UILabel()
    private let subtitleLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()

        resolveSharedURL { [weak self] url in
            guard let self = self else { return }
            guard let url = url else {
                self.showFailure()
                return
            }
            self.handoff(url)
        }
    }

    // MARK: - Extracting the shared URL

    /// Shared items arrive as either a `public.url` attachment (Safari, most
    /// recipe sites) or `public.plain-text` (TikTok and Instagram often share
    /// a caption string with the link embedded in it). Handle both, and scan
    /// text for the first http(s) URL it contains.
    private func resolveSharedURL(_ completion: @escaping (URL?) -> Void) {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let providers = items.flatMap { $0.attachments ?? [] }

        let urlType = UTType.url.identifier
        let textType = UTType.plainText.identifier

        // Prefer a real URL attachment over text — it's unambiguous.
        if let provider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(urlType) }) {
            provider.loadItem(forTypeIdentifier: urlType, options: nil) { item, _ in
                let url = (item as? URL) ?? (item as? String).flatMap(URL.init(string:))
                DispatchQueue.main.async { completion(url.flatMap(Self.normalized)) }
            }
            return
        }

        if let provider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(textType) }) {
            provider.loadItem(forTypeIdentifier: textType, options: nil) { item, _ in
                // NSString bridges to String across `as?`, so this one cast
                // covers both the Swift and Foundation string cases.
                let text = (item as? String) ?? ""
                DispatchQueue.main.async { completion(Self.firstURL(in: text)) }
            }
            return
        }

        DispatchQueue.main.async { completion(nil) }
    }

    /// Only http(s) links are worth sending — the importer scrapes over HTTP,
    /// so a `file://` or custom-scheme share would just fail server-side.
    private static func normalized(_ url: URL) -> URL? {
        guard let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else {
            return nil
        }
        return url
    }

    private static func firstURL(in text: String) -> URL? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return nil
        }
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let match = detector.firstMatch(in: text, options: [], range: range)
        return match?.url.flatMap(normalized)
    }

    // MARK: - Handoff

    private func handoff(_ shared: URL) {
        // Correlates the two handoff paths so the app can tell that a queued
        // entry and an incoming deep link are the same share, and import once.
        let id = UUID().uuidString

        // Durable first — if the process is killed before the deep link
        // resolves, the share still survives in the queue.
        SharedImportStore.enqueue(url: shared.absoluteString, id: id)

        var components = URLComponents()
        components.scheme = Self.hostAppScheme
        components.host = "import"
        components.queryItems = [
            URLQueryItem(name: "url", value: shared.absoluteString),
            URLQueryItem(name: "id", value: id),
        ]

        guard let deepLink = components.url else {
            // The queue write already happened, so the app will still pick
            // this up on next launch — no need to show a failure.
            finish()
            return
        }

        // Let the confirmation card land before the app takes over, otherwise
        // the sheet flashes and the user isn't sure anything happened.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { [weak self] in
            self?.openHostApp(deepLink)
        }
    }

    private func openHostApp(_ url: URL) {
        // Watchdog: if `open` never calls back (it doesn't, on some iOS
        // versions, for custom schemes), dismiss anyway rather than leaving
        // the user staring at a stuck sheet.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.finish()
        }

        extensionContext?.open(url) { [weak self] opened in
            guard let self = self else { return }
            if !opened {
                // `extensionContext.open` is documented for Today extensions
                // and returns false for share extensions on several iOS
                // versions. The responder-chain walk is the long-standing
                // workaround: UIApplication.shared is unavailable to
                // extensions at compile time, but the live UIApplication is
                // still in this view controller's responder chain.
                self.openViaResponderChain(url)
            }
            self.finish()
        }
    }

    private func openViaResponderChain(_ url: URL) {
        let selector = NSSelectorFromString("openURL:")
        var responder: UIResponder? = self
        while let current = responder {
            if current !== self, current.responds(to: selector) {
                _ = current.perform(selector, with: url)
                return
            }
            responder = current.next
        }
    }

    private func finish() {
        guard !didFinish else { return }
        didFinish = true
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    private func showFailure() {
        titleLabel.text = "No link found"
        subtitleLabel.text = "Marco imports recipes from a link. Try sharing the post or page URL."
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { [weak self] in
            self?.finish()
        }
    }

    // MARK: - UI

    private func buildUI() {
        view.backgroundColor = UIColor.black.withAlphaComponent(0.25)

        card.backgroundColor = UIColor(red: 0.961, green: 0.933, blue: 0.886, alpha: 1) // #F5EEE2
        card.layer.cornerRadius = 22
        card.translatesAutoresizingMaskIntoConstraints = false

        titleLabel.text = "Recipe sent to Marco"
        titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
        titleLabel.textColor = UIColor(red: 0.110, green: 0.102, blue: 0.090, alpha: 1) // #1C1A17
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 0
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        subtitleLabel.text = "We'll have it ready in a moment."
        subtitleLabel.font = .systemFont(ofSize: 14, weight: .regular)
        subtitleLabel.textColor = UIColor(red: 0.110, green: 0.102, blue: 0.090, alpha: 0.6)
        subtitleLabel.textAlignment = .center
        subtitleLabel.numberOfLines = 0
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        stack.axis = .vertical
        stack.spacing = 6
        stack.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(card)
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 32),
            card.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -32),
            card.widthAnchor.constraint(lessThanOrEqualToConstant: 320),

            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 26),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -26),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -24),
        ])
    }
}
