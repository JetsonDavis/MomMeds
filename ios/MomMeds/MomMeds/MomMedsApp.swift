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
                await appState.refreshFromServer()
                await EventQueue.shared.flush()
            }
        }
        .task(id: appState.isPaired) {
            guard appState.isPaired else { return }

            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(90))
                if Task.isCancelled { return }
                await appState.refreshFromServer()
            }
        }
    }
}
