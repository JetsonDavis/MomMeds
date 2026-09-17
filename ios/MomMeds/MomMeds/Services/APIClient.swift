import Foundation

enum APIClientError: LocalizedError {
    case invalidURL
    case invalidResponse
    case server(String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL."
        case .invalidResponse:
            return "Unexpected server response."
        case .server(let message):
            return message
        case .unauthorized:
            return "This device is no longer authorized. Please pair again."
        }
    }
}

struct PairResponse: Decodable {
    let deviceToken: String
    let patient: PatientInfo
    let medications: [Medication]
}

struct SyncResponse: Decodable {
    let patient: PatientInfo
    let medications: [Medication]
}

struct EventsPayload: Encodable {
    struct EventBody: Encodable {
        let clientEventId: UUID
        let type: EventType
        let painLevel: Int?
        let medicationId: UUID?
        let recordedAt: String
    }

    let events: [EventBody]
}

struct EventsResponse: Decodable {
    let acceptedClientEventIds: [UUID]
}

final class APIClient {
    static let shared = APIClient()

    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private var baseURL: URL? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String else {
            return nil
        }
        return URL(string: raw)
    }

    private var anonKey: String? {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String
    }

    private func functionURL(_ name: String) -> URL? {
        baseURL?.appendingPathComponent("functions/v1/\(name)")
    }

    private func makeRequest(
        url: URL,
        method: String,
        deviceToken: String? = nil,
        body: Data? = nil
    ) throws -> URLRequest {
        guard let anonKey else {
            throw APIClientError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        if let deviceToken {
            request.setValue(deviceToken, forHTTPHeaderField: "X-Device-Token")
        }
        request.httpBody = body
        return request
    }

    private func decodeError(from data: Data) -> String {
        struct ErrorBody: Decodable { let error: String? }
        if let body = try? decoder.decode(ErrorBody.self, from: data), let error = body.error {
            return error
        }
        return "Request failed."
    }

    func pair(code: String) async throws -> PairResponse {
        guard let url = functionURL("device-pair") else {
            throw APIClientError.invalidURL
        }

        let body = try encoder.encode(["code": code])
        let request = try makeRequest(url: url, method: "POST", body: body)
        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIClientError.server(decodeError(from: data))
        }

        return try decoder.decode(PairResponse.self, from: data)
    }

    func sync(deviceToken: String) async throws -> SyncResponse {
        guard let url = functionURL("device-sync") else {
            throw APIClientError.invalidURL
        }

        let request = try makeRequest(url: url, method: "GET", deviceToken: deviceToken)
        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        if http.statusCode == 401 {
            throw APIClientError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIClientError.server(decodeError(from: data))
        }

        return try decoder.decode(SyncResponse.self, from: data)
    }

    func submitEvents(deviceToken: String, events: [PendingEvent]) async throws -> [UUID] {
        guard let url = functionURL("device-events") else {
            throw APIClientError.invalidURL
        }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let payload = EventsPayload(events: events.map { event in
            EventsPayload.EventBody(
                clientEventId: event.id,
                type: event.type,
                painLevel: event.painLevel,
                medicationId: event.medicationId,
                recordedAt: isoFormatter.string(from: event.recordedAt)
            )
        })

        let body = try encoder.encode(payload)
        let request = try makeRequest(url: url, method: "POST", deviceToken: deviceToken, body: body)
        let (data, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        if http.statusCode == 401 {
            throw APIClientError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            throw APIClientError.server(decodeError(from: data))
        }

        let decoded = try decoder.decode(EventsResponse.self, from: data)
        return decoded.acceptedClientEventIds
    }
}
