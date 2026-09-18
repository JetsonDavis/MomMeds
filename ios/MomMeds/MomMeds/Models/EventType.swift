import Foundation

enum EventType: String, Codable {
    case feelGreat = "feel_great"
    case dizzy
    case pain
    case medTaken = "med_taken"

    var label: String {
        switch self {
        case .feelGreat:
            return "I feel great"
        case .dizzy:
            return "I feel dizzy and unstable"
        case .pain:
            return "I am having pain"
        case .medTaken:
            return "Medication taken"
        }
    }
}

struct Medication: Codable, Identifiable, Equatable {
    let id: UUID
    let name: String
    let dose: String?
    let sortOrder: Int

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case dose
        case sortOrder
    }
}

struct PatientInfo: Codable, Equatable {
    let id: UUID
    let displayName: String
    let timezone: String

    enum CodingKeys: String, CodingKey {
        case id
        case displayName
        case timezone
    }
}

struct NotificationSettings: Codable, Equatable {
    let enabled: Bool
    let reminderIntervalMinutes: Int

    static let `default` = NotificationSettings(enabled: true, reminderIntervalMinutes: 120)

    enum CodingKeys: String, CodingKey {
        case enabled
        case reminderIntervalMinutes
    }
}

struct CaregiverMessage: Codable, Equatable, Identifiable {
    let id: UUID
    let message: String
    let sentAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case message
        case sentAt
    }
}

struct PendingEvent: Codable, Identifiable, Equatable {
    let id: UUID
    let type: EventType
    let painLevel: Int?
    let medicationId: UUID?
    let recordedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case painLevel
        case medicationId
        case recordedAt
    }
}
