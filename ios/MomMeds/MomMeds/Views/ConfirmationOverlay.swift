import SwiftUI

struct ConfirmationOverlay: View {
    let isVisible: Bool
    let message: String
    let onDismiss: () -> Void

    var body: some View {
        Group {
            if isVisible {
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(.green)
                    Text(message)
                        .font(.title.bold())
                        .multilineTextAlignment(.center)
                }
                .padding(32)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .transition(.scale.combined(with: .opacity))
                .onAppear {
                    #if canImport(UIKit)
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    #endif
                    Task {
                        try? await Task.sleep(nanoseconds: 2_000_000_000)
                        onDismiss()
                    }
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isVisible)
    }
}
