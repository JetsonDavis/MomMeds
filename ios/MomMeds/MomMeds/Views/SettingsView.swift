import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @StateObject private var eventQueue = EventQueue.shared

    var body: some View {
        NavigationStack {
            List {
                Section("Status") {
                    LabeledContent("Patient", value: appState.patientName)
                    LabeledContent("Sync", value: appState.syncStatus)
                    LabeledContent("Pending events", value: "\(eventQueue.pendingCount)")
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
