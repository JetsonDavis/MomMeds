import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var eventQueue = EventQueue.shared
    @StateObject private var checkInReminder = CheckInReminderManager.shared
    @State private var showPainSlider = false
    @State private var showSettings = false

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 20) {
                    header

                    Button {
                        appState.record(type: .feelGreat)
                    } label: {
                        Text("I feel great")
                    }
                    .buttonStyle(LargeButtonStyle(color: .green))
                    .accessibilityHint("Records that you feel great")

                    Button {
                        appState.record(type: .dizzy)
                    } label: {
                        Text("I feel dizzy and unstable")
                    }
                    .buttonStyle(LargeButtonStyle(color: .orange))
                    .accessibilityHint("Records dizziness or instability")

                    Button {
                        withAnimation {
                            showPainSlider.toggle()
                        }
                    } label: {
                        Text("I am having pain")
                    }
                    .buttonStyle(LargeButtonStyle(color: .red))
                    .accessibilityHint("Opens pain level slider")

                    if showPainSlider {
                        PainSliderView { level in
                            appState.record(type: .pain, painLevel: level)
                            showPainSlider = false
                        }
                    }

                    if !appState.medications.isEmpty {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Medications")
                                .font(.title2.bold())
                                .padding(.top, 8)

                            ForEach(appState.medications) { medication in
                                Button {
                                    appState.record(type: .medTaken, medication: medication)
                                } label: {
                                    Text("I took \(medication.name)")
                                }
                                .buttonStyle(LargeButtonStyle(color: .blue))
                                .accessibilityHint("Records that you took \(medication.name)")
                            }
                        }
                    }
                }
                .padding()
            }

            ConfirmationOverlay(
                isVisible: appState.showConfirmation,
                message: appState.confirmationMessage
            ) {
                appState.showConfirmation = false
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .onAppear {
            Task {
                await appState.refreshFromServer()
                await eventQueue.flush()
                await checkInReminder.refreshReminderSchedule()
            }
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text(appState.patientName.isEmpty ? "MomMeds" : appState.patientName)
                .font(.largeTitle.bold())
                .frame(maxWidth: .infinity, alignment: .leading)
                .onTapGesture {
                    if appState.registerSettingsTap() {
                        showSettings = true
                    }
                }
                .accessibilityAddTraits(.isHeader)

            Text(appState.syncStatus)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("Last Check In Time: \(checkInReminder.lastCheckInDisplayText)")
                .font(.subheadline)
                .foregroundStyle(checkInReminder.isOverdue ? .orange : .secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityLabel("Last check in time \(checkInReminder.lastCheckInDisplayText)")

            if eventQueue.pendingCount > 0 {
                Text("\(eventQueue.pendingCount) events waiting to sync")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

struct LargeButtonStyle: ButtonStyle {
    let color: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title2.bold())
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 110)
            .background(color.opacity(configuration.isPressed ? 0.75 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}
