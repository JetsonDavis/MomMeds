import Foundation
#if canImport(UIKit)
import UIKit
#endif

@MainActor
final class AppState: ObservableObject {
    @Published var isPaired = false
    @Published var patientName = MedicationCache.patientName() ?? ""
    @Published var medications: [Medication] = MedicationCache.medications()
    @Published var showConfirmation = false
    @Published var confirmationMessage = "Recorded"
    @Published var syncStatus = "Ready"

    private var settingsTapCount = 0

    func bootstrap() async {
        isPaired = KeychainStore.loadDeviceToken() != nil
        if isPaired {
            await refreshFromServer()
            await EventQueue.shared.flush()
        }
    }

    func pair(with code: String) async throws {
        let response = try await APIClient.shared.pair(code: code)
        try KeychainStore.saveDeviceToken(response.deviceToken)
        patientName = response.patient.displayName
        medications = response.medications.sorted { $0.sortOrder < $1.sortOrder }
        MedicationCache.save(patientName: patientName, medications: medications)
        isPaired = true
        syncStatus = "Paired"
        Task {
            await CheckInReminderManager.shared.refreshReminderSchedule()
        }
    }

    func unpair() {
        KeychainStore.deleteDeviceToken()
        MedicationCache.clear()
        isPaired = false
        patientName = ""
        medications = []
        syncStatus = "Unpaired"
        CheckInReminderManager.shared.clearCheckIn()
    }

    func refreshFromServer() async {
        guard let token = KeychainStore.loadDeviceToken() else { return }

        do {
            let response = try await APIClient.shared.sync(deviceToken: token)
            patientName = response.patient.displayName
            medications = response.medications.sorted { $0.sortOrder < $1.sortOrder }
            MedicationCache.save(patientName: patientName, medications: medications)
            syncStatus = "Synced"
        } catch APIClientError.unauthorized {
            unpair()
        } catch {
            syncStatus = "Offline — using cached data"
        }
    }

    func record(type: EventType, painLevel: Int? = nil, medication: Medication? = nil) {
        let event = PendingEvent(
            id: UUID(),
            type: type,
            painLevel: painLevel,
            medicationId: medication?.id,
            recordedAt: Date()
        )
        EventQueue.shared.enqueue(event)
        CheckInReminderManager.shared.markCheckIn(at: event.recordedAt)
        confirmationMessage = type == .medTaken
            ? "Recorded: took \(medication?.name ?? "medication")"
            : "Recorded"
        showConfirmation = true
        #if canImport(UIKit)
        UIAccessibility.post(notification: .announcement, argument: confirmationMessage)
        #endif
    }

    func registerSettingsTap() -> Bool {
        settingsTapCount += 1
        if settingsTapCount >= 5 {
            settingsTapCount = 0
            return true
        }
        return false
    }
}
