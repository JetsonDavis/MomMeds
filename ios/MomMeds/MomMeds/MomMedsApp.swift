import SwiftUI

@main
struct MomMedsApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if appState.isPaired {
                HomeView()
            } else {
                PairingView()
            }
        }
        .task {
            await appState.bootstrap()
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active, appState.isPaired else { return }
            Task {
                await CheckInReminderManager.shared.refreshReminderSchedule()
            }
        }
    }
}
