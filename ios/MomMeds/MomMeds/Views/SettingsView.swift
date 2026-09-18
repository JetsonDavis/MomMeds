import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var eventQueue = EventQueue.shared
    @StateObject private var checkInReminder = CheckInReminderManager.shared

    var body: some View {
        NavigationStack {
            List {
                Section("Status") {
                    LabeledContent("Patient", value: appState.patientName)
                    LabeledContent("Sync", value: appState.syncStatus)
                    LabeledContent("Pending events", value: "\(eventQueue.pendingCount)")
                }

                Section("Reminders") {
                    LabeledContent(
                        "Check-in reminders",
                        value: checkInReminder.notificationsEnabled ? "On" : "Off"
                    )
                    LabeledContent(
                        "Frequency",
                        value: checkInReminder.reminderIntervalDisplayText
                    )
                }

                Section {
                    Button("Sync now") {
                        Task {
                            await appState.refreshFromServer()
                            await eventQueue.flush()
                        }
                    }

                    Button("Unpair this iPhone", role: .destructive) {
                        appState.unpair()
                        dismiss()
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
