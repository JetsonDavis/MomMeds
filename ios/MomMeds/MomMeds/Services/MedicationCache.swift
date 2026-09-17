import Foundation

enum MedicationCache {
    private static let patientNameKey = "mommeds.patientName"
    private static let medicationsKey = "mommeds.medications"

    static func save(patientName: String, medications: [Medication]) {
        UserDefaults.standard.set(patientName, forKey: patientNameKey)
        if let data = try? JSONEncoder().encode(medications) {
            UserDefaults.standard.set(data, forKey: medicationsKey)
        }
    }

    static func patientName() -> String? {
        UserDefaults.standard.string(forKey: patientNameKey)
    }

    static func medications() -> [Medication] {
        guard
            let data = UserDefaults.standard.data(forKey: medicationsKey),
            let meds = try? JSONDecoder().decode([Medication].self, from: data)
        else {
            return []
        }
        return meds
    }

    static func clear() {
        UserDefaults.standard.removeObject(forKey: patientNameKey)
        UserDefaults.standard.removeObject(forKey: medicationsKey)
    }
}
