import SwiftUI

struct PairingView: View {
    @EnvironmentObject private var appState: AppState
    @State private var code = ""
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 24) {
            Text("MomMeds")
                .font(.largeTitle.bold())
                .accessibilityAddTraits(.isHeader)

            Text("Enter the 6-digit pairing code from your caregiver.")
                .font(.title3)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)

            TextField("000000", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .multilineTextAlignment(.center)
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .padding(.horizontal)
                .onChange(of: code) { _, newValue in
                    let digits = newValue.filter(\.isNumber)
                    code = String(digits.prefix(6))
                }
                .accessibilityLabel("Pairing code")

            if let errorMessage {
                Text(errorMessage)
                    .font(.body)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Button(action: pair) {
                Text(isLoading ? "Pairing..." : "Pair iPhone")
                    .font(.title2.bold())
                    .frame(maxWidth: .infinity, minHeight: 72)
            }
            .buttonStyle(LargeButtonStyle(color: .blue))
            .disabled(code.count != 6 || isLoading)
            .padding(.horizontal)
        }
        .padding(.vertical, 32)
    }

    private func pair() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await appState.pair(with: code)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
