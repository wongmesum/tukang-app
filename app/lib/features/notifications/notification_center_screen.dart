import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// In-app notification model
class AppNotification {
  final String id;
  final String title;
  final String body;
  final String? action; // route to navigate to
  final String? orderId;
  final DateTime createdAt;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    this.action,
    this.orderId,
    required this.createdAt,
    this.isRead = false,
  });
}

/// In-memory notification store (in production, persist to local DB / fetch from API)
class NotificationStore extends ChangeNotifier {
  final List<AppNotification> _notifications = [];

  List<AppNotification> get all => List.unmodifiable(_notifications);
  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  void add(AppNotification notification) {
    _notifications.insert(0, notification);
    notifyListeners();
  }

  void markRead(String id) {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1) {
      _notifications[idx].isRead = true;
      notifyListeners();
    }
  }

  void markAllRead() {
    for (final n in _notifications) {
      n.isRead = true;
    }
    notifyListeners();
  }

  void clear() {
    _notifications.clear();
    notifyListeners();
  }
}

/// Global notification store provider
final notificationStoreProvider = ChangeNotifierProvider<NotificationStore>((ref) {
  final store = NotificationStore();
  // Add some sample notifications for demo
  store.add(AppNotification(
    id: '1',
    title: 'Selamat Datang di TukangNDeso!',
    body: 'Terima kasih telah bergabung. Mulai pesan tukang untuk kebutuhan rumah Anda.',
    createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
  ));
  store.add(AppNotification(
    id: '2',
    title: 'Promo Launching!',
    body: 'Gratis ongkos perjalanan untuk 3 order pertama Anda. Berlaku hingga 31 Agustus 2026.',
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
  ));
  return store;
});

class NotificationCenterScreen extends ConsumerWidget {
  const NotificationCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final store = ref.watch(notificationStoreProvider);
    final notifications = store.all;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifikasi'),
        actions: [
          if (store.unreadCount > 0)
            TextButton(
              onPressed: () => store.markAllRead(),
              child: const Text('Tandai Semua Dibaca', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
      body: notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_none, size: 64, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  Text('Belum ada notifikasi', style: TextStyle(color: Colors.grey[500])),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final notif = notifications[index];
                return _NotificationTile(
                  notification: notif,
                  onTap: () {
                    store.markRead(notif.id);
                    if (notif.orderId != null) {
                      context.push('/orders/${notif.orderId}/tracking');
                    }
                  },
                );
              },
            ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _NotificationTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final timeAgo = _formatTimeAgo(notification.createdAt);

    return InkWell(
      onTap: onTap,
      child: Container(
        color: notification.isRead ? null : const Color(0xFFFF6B35).withOpacity(0.04),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Unread dot
            Container(
              width: 8,
              height: 8,
              margin: const EdgeInsets.only(top: 6, right: 12),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: notification.isRead ? Colors.transparent : const Color(0xFFFF6B35),
              ),
            ),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: TextStyle(
                      fontWeight: notification.isRead ? FontWeight.normal : FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.body,
                    style: TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.4),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    timeAgo,
                    style: TextStyle(color: Colors.grey[400], fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _formatTimeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 1) return 'Baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
  }
}
