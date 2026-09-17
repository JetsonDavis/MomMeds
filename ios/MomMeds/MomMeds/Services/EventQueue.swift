import Foundation

@MainActor
final class EventQueue: ObservableObject {
    static let shared = EventQueue()

    @Published private(set) var pendingCount = 0
    @Published private(set) var lastSyncMessage: String?

    private let storageKey = "mommeds.pendingEvents"
    private var pending: [PendingEvent] = []
    private var isFlushing = false

    private init() {
        load()
    }

    func enqueue(_ event: PendingEvent) {
        pending.append(event)
        pendingCount = pending.count
        save()
        Task {
            await flush()
        }
    }

    func flush() async {
        guard !isFlushing else { return }
        guard let token = KeychainStore.loadDeviceToken(), !pending.isEmpty else { return }

        isFlushing = true
        defer { isFlushing = false }

        var remaining = pending
        var attempt = 0

        while !remaining.isEmpty && attempt < 5 {
            do {
                let accepted = try await APIClient.shared.submitEvents(deviceToken: token, events: remaining)
                remaining.removeAll { event in accepted.contains(event.id) }
                pending = remaining
                pendingCount = pending.count
                save()
                lastSyncMessage = pending.isEmpty ? "All events synced" : "\(pending.count) pending"
                return
            } catch APIClientError.unauthorized {
                lastSyncMessage = "Device unauthorized"
                return
            } catch {
                attempt += 1
                lastSyncMessage = "Sync retry \(attempt)"
                try? await Task.sleep(nanoseconds: UInt64(min(attempt, 5)) * 1_000_000_000)
            }
        }
    }

    private var jsonDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    private var jsonEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decoded = try? jsonDecoder.decode([PendingEvent].self, from: data)
        else {
            pending = []
            pendingCount = 0
            return
        }
        pending = decoded
        pendingCount = decoded.count
    }

    private func save() {
        if let data = try? jsonEncoder.encode(pending) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
}
