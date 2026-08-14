import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/order_status_badge.dart';
import 'package:tukangndeso/core/widgets/worker_card.dart';
import 'package:tukangndeso/features/orders/presentation/providers/orders_provider.dart';
import 'package:tukangndeso/services/realtime/realtime_provider.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderTrackingScreen> createState() =>
      _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  StreamSubscription? _statusSub;
  StreamSubscription? _locationSub;

  // Worker real-time location
  double? _workerLat;
  double? _workerLng;

  @override
  void initState() {
    super.initState();
    _setupRealtime();
  }

  void _setupRealtime() {
    final realtime = ref.read(realtimeServiceProvider);

    // Subscribe to this order's room
    realtime.subscribeToOrder(widget.orderId);

    // Listen for status changes — refresh order detail when status updates arrive
    _statusSub = realtime.orderStatusChanges
        .where((e) => e.orderId == widget.orderId)
        .listen((event) {
      // Refresh the order detail from the server to get full updated data
      ref.read(orderDetailProvider(widget.orderId).notifier).refresh();
    });

    // Listen for worker location updates
    _locationSub = realtime.workerLocationUpdates
        .where((e) => e.orderId == widget.orderId)
        .listen((event) {
      setState(() {
        _workerLat = event.lat;
        _workerLng = event.lng;
      });
    });
  }

  bool _isTerminalStatus(String status) {
    const terminals = [
      'REVIEWED',
      'EXPIRED',
      'CANCELLED_BY_CUSTOMER',
      'CANCELLED_BY_WORKER',
      'DISPUTED',
    ];
    return terminals.contains(status);
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _locationSub?.cancel();

    // Unsubscribe from the order room
    // Read is safe in dispose since we're accessing a non-listening provider
    try {
      final realtime = ref.read(realtimeServiceProvider);
      realtime.unsubscribeFromOrder(widget.orderId);
    } catch (_) {}

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderAsync = ref.watch(orderDetailProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(title: const Text('Tracking Order')),
      body: orderAsync.when(
        data: (order) {
          if (order == null) {
            return const Center(child: Text('Order tidak ditemukan'));
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.base),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Order Number & Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('#${order.orderNumber}', style: AppTypography.h4),
                    OrderStatusBadge(status: order.status),
                  ],
                ),

                // Real-time connection indicator
                const SizedBox(height: AppSpacing.sm),
                _RealtimeIndicator(),

                const SizedBox(height: AppSpacing.lg),

                // Worker info (if matched)
                if (order.workerName != null) ...[
                  Text('Tukang Anda', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.sm),
                  WorkerCard(
                    name: order.workerName!,
                    ratingAvg: order.workerRating ?? 0,
                    totalOrders: order.workerTotalOrders ?? 0,
                    distanceKm: order.distanceKm,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  OutlinedButton.icon(
                    onPressed: () => context.push(
                      '/orders/${widget.orderId}/chat',
                      extra: order.workerName,
                    ),
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: const Text('Chat dengan Tukang'),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // Worker live location (when EN_ROUTE or ARRIVED)
                if (_workerLat != null &&
                    _workerLng != null &&
                    ['EN_ROUTE', 'ARRIVED'].contains(order.status)) ...[
                  _WorkerLocationCard(lat: _workerLat!, lng: _workerLng!),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // Status timeline
                _StatusTimeline(status: order.status),

                const SizedBox(height: AppSpacing.lg),

                // Actions based on status
                if (order.status == 'COMPLETED')
                  ElevatedButton(
                    onPressed: () =>
                        context.push('/orders/${widget.orderId}/pay'),
                    child: const Text('Bayar Sekarang'),
                  ),

                if (order.status == 'PAID')
                  ElevatedButton(
                    onPressed: () =>
                        context.push('/orders/${widget.orderId}/review'),
                    child: const Text('Beri Rating'),
                  ),

                if (['PENDING', 'MATCHED', 'ACCEPTED', 'EN_ROUTE']
                    .contains(order.status))
                  OutlinedButton(
                    onPressed: () => _cancelOrder(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                    ),
                    child: const Text('Batalkan Order'),
                  ),

                // Disputes are only meaningful once work has started or money
                // is involved — these are exactly the statuses the backend
                // state machine accepts a dispute from.
                if (['IN_PROGRESS', 'COMPLETED', 'PAID'].contains(order.status)) ...[
                  const SizedBox(height: AppSpacing.sm),
                  TextButton.icon(
                    onPressed: () => context.push(
                      '/orders/${widget.orderId}/dispute',
                      extra: order.orderNumber,
                    ),
                    icon: const Icon(Icons.report_problem_outlined, size: 18),
                    label: const Text('Laporkan Masalah'),
                    style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                  ),
                ],

                if (order.status == 'DISPUTED')
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.gavel, color: AppColors.danger, size: 20),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Text(
                            'Sengketa sedang ditinjau admin. Pembayaran ditahan '
                            'sampai ada keputusan.',
                            style: AppTypography.caption,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Error: $error')),
      ),
    );
  }

  void _cancelOrder(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Batalkan Order?'),
        content: const Text('Apakah Anda yakin ingin membatalkan order ini?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tidak'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref
                  .read(orderDetailProvider(widget.orderId).notifier)
                  .cancel('Berubah pikiran');
            },
            child: const Text('Ya, Batalkan',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
  }
}

/// Small indicator showing real-time connection state
class _RealtimeIndicator extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final realtime = ref.watch(realtimeServiceProvider);

    return StreamBuilder<WsConnectionState>(
      stream: realtime.connectionStateStream,
      initialData: realtime.connectionState,
      builder: (context, snapshot) {
        final state = snapshot.data ?? WsConnectionState.disconnected;
        final (icon, color, label) = switch (state) {
          WsConnectionState.connected => (
              Icons.wifi,
              AppColors.success,
              'Real-time aktif'
            ),
          WsConnectionState.connecting => (
              Icons.wifi_find,
              AppColors.warning,
              'Menghubungkan...'
            ),
          WsConnectionState.reconnecting => (
              Icons.wifi_find,
              AppColors.warning,
              'Menghubungkan ulang...'
            ),
          WsConnectionState.disconnected => (
              Icons.wifi_off,
              AppColors.textHint,
              'Offline'
            ),
        };

        return Row(
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(fontSize: 12, color: color),
            ),
          ],
        );
      },
    );
  }
}

/// Card showing the worker's live GPS coordinates
class _WorkerLocationCard extends StatelessWidget {
  const _WorkerLocationCard({required this.lat, required this.lng});

  final double lat;
  final double lng;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.info.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            const Icon(Icons.location_on, color: AppColors.info, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Posisi Tukang (real-time)',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Text(
                    '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            // In production: open Google Maps
            IconButton(
              icon: const Icon(Icons.map, color: AppColors.primary),
              onPressed: () {
                // url_launcher: open Google Maps directions
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.status});

  final String status;

  static const _steps = [
    ('PENDING', 'Order Dibuat', Icons.receipt_long),
    ('MATCHED', 'Tukang Ditemukan', Icons.person_search),
    ('ACCEPTED', 'Tukang Menerima', Icons.check_circle),
    ('EN_ROUTE', 'Dalam Perjalanan', Icons.directions_walk),
    ('ARRIVED', 'Tukang Tiba', Icons.location_on),
    ('IN_PROGRESS', 'Sedang Dikerjakan', Icons.build),
    ('COMPLETED', 'Selesai', Icons.done_all),
    ('PAID', 'Dibayar', Icons.payment),
  ];

  int get _currentIndex => _steps.indexWhere((s) => s.$1 == status);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(_steps.length, (index) {
        final step = _steps[index];
        final isCompleted = index <= _currentIndex;
        final isCurrent = index == _currentIndex;

        return _TimelineStep(
          label: step.$2,
          icon: step.$3,
          isCompleted: isCompleted,
          isCurrent: isCurrent,
          isLast: index == _steps.length - 1,
        );
      }),
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.label,
    required this.icon,
    required this.isCompleted,
    required this.isCurrent,
    required this.isLast,
  });

  final String label;
  final IconData icon;
  final bool isCompleted;
  final bool isCurrent;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = isCompleted ? AppColors.success : AppColors.border;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isCurrent ? AppColors.primary : color,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 16, color: Colors.white),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 32,
                color: color,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
              color: isCompleted ? AppColors.textPrimary : AppColors.textHint,
            ),
          ),
        ),
      ],
    );
  }
}
