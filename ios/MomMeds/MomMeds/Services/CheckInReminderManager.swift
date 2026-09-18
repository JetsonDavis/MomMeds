import Foundation
import UserNotifications

@MainActor
final class CheckInReminderManager: ObservableObject {
    static let shared = CheckInReminderManager()

    @Published private(set) var lastCheckInDate: Date?

    private let lastCheckInKey = "mommeds.lastCheckIn"
    private let overdueNotifiedForKey = "mommeds.overdueNotifiedFor"
    private let reminderIdentifier = "mommeds.checkInReminder"
    private let checkInInterval: TimeInterval = 2 * 60 * 60

    private init() {
        lastCheckInDate = UserDefaults.standard.object(forKey: lastCheckInKey) as? Date
    }

    var lastCheckInDisplayText: String {
        guard let lastCheckInDate else {
            return "None yet"
        }
        return lastCheckInDate.formatted(date: .abbreviated, time: .shortened)
    }

    var isOverdue: Bool {
        guard let lastCheckInDate else { return false }
        return Date().timeIntervalSince(lastCheckInDate) >= checkInInterval
    }

    func requestAuthorizationIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .notDetermined else { return }

        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    func markCheckIn(at date: Date = Date()) {
        lastCheckInDate = date
        UserDefaults.standard.set(date, forKey: lastCheckInKey)
        UserDefaults.standard.removeObject(forKey: overdueNotifiedForKey)
        Task {
            await rescheduleReminder()
        }
    }

    func clearCheckIn() {
        lastCheckInDate = nil
        UserDefaults.standard.removeObject(forKey: lastCheckInKey)
        UserDefaults.standard.removeObject(forKey: overdueNotifiedForKey)
        Task {
            await cancelReminder()
        }
    }

    func refreshReminderSchedule() async {
        await requestAuthorizationIfNeeded()
        await rescheduleReminder()
    }

    private func rescheduleReminder() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [reminderIdentifier])

        guard let lastCheckInDate else { return }

        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized
            || settings.authorizationStatus == .provisional
            || settings.authorizationStatus == .ephemeral else {
            return
        }

        let dueDate = lastCheckInDate.addingTimeInterval(checkInInterval)
        let interval = dueDate.timeIntervalSinceNow

        if interval <= 0 {
            await deliverOverdueReminderIfNeeded()
            return
        }

        let content = reminderContent()
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(
            identifier: reminderIdentifier,
            content: content,
            trigger: trigger
        )
        try? await center.add(request)
    }

    private func deliverOverdueReminderIfNeeded() async {
        guard let lastCheckInDate else { return }

        let notifiedFor = UserDefaults.standard.object(forKey: overdueNotifiedForKey) as? Date
        if notifiedFor == lastCheckInDate { return }

        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized
            || settings.authorizationStatus == .provisional
            || settings.authorizationStatus == .ephemeral else {
            return
        }

        let content = reminderContent()
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: reminderIdentifier,
            content: content,
            trigger: trigger
        )
        try? await center.add(request)
        UserDefaults.standard.set(lastCheckInDate, forKey: overdueNotifiedForKey)
    }

    private func cancelReminder() async {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [reminderIdentifier])
    }

    private func reminderContent() -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        content.title = "Time to check in"
        content.body = "Please tap a button in MomMeds to let us know how you're doing."
        content.sound = .default
        return content
    }
}
