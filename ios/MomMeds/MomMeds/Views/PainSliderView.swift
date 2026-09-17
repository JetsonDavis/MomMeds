import SwiftUI

struct PainSliderView: View {
    @State private var painLevel = 5.0
    let onConfirm: (Int) -> Void

    var body: some View {
        VStack(spacing: 20) {
            Text("Pain level")
                .font(.title2.bold())
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("\(Int(painLevel))")
                .font(.system(size: 72, weight: .bold, design: .rounded))
                .foregroundStyle(.red)
                .accessibilityLabel("Pain level \(Int(painLevel)) out of 10")

            Slider(value: $painLevel, in: 1...10, step: 1)
                .accessibilityValue("\(Int(painLevel)) out of 10")

            HStack {
                Text("1")
                Spacer()
                Text("10")
            }
            .font(.title3)
            .foregroundStyle(.secondary)

            Button {
                onConfirm(Int(painLevel))
            } label: {
                Text("Record pain")
            }
            .buttonStyle(LargeButtonStyle(color: .red))
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }
}
