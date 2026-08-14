import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/order_status_badge.dart';
import 'package:tukangndeso/services/api/dio_client.dart';
import 'package:tukangndeso/services/realtime/realtime_provider.dart';
import 'package:tukangndeso/services/realtime/ws_client.dart';
import 'package:geolocator/geolocator.dart';

class ActiveOrderScreen extends ConsumerStatefulWidget {
  const ActiveOrderScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<ActiveOrderScreen> createState() => _ActiveOrderScreenState();
}

class _ActiveOrderScreenState extends ConsumerState<ActiveOrderScreen> {
  String _status = 'ACCEPTED';
  bool _isLoading = false;
  Timer? _workTimer;
  Timer? _locationTimer;
  int _workSeconds = 0;
  DateTime? _startedAt;
  StreamSubscription? _statusSub;

  @override
  void initState() {
    super.initState();
    _loadOrder();
    _setupRealtime();
  }

  void _setupRealtime() {
    final realtime = ref.read(realtimeServiceProvider);

    // Subscribe to this order's room for status updates (e.g. customer cancel)
    realtime.subscribeToOrder(widget.orderId);

    _statusSub = realtime.orderStatusChanges
        .where((e) => e.orderId == widget.orderId)
        .listen((event) {
      setState(() => _status = event.status);
      // If customer cancelled, stop location broadcasting
      if (_isTerminalStatus(event.status)) {
        _stopLocationBroadcast();
      }
    });
  }

  bool _isTerminalStatus(String status) {
    const terminals = [
      'REVIEWED', 'EXPIRED', 'CANCELLED_BY_CUSTOMER',
      'CANCELLED_BY_WORKER', 'DISPUTED',
    ];
    return terminals.contains(status);
  }

  Future<void> _loadOrder() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get(ApiEndpoints.orderById(widget.orderId));
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        setState(() {
          _status = data['status'] as String;
          if (data['started_at'] != null) {
            _startedAt = DateTime.parse(data['started_at'] as String);
            _startWorkTimer();
          }
        });
        // Start broadcasting location if EN_ROUTE
        if (_status == 'EN_ROUTE' || _status == 'ARRIVED') {
          _startLocationBroadcast();
        }
      }
    } catch (_) {}
  }

  void _startWorkTimer() {
    _workTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_startedAt != null) {
        setState(() {
          _workSeconds = DateTime.now().difference(_startedAt!).inSeconds;
        });
      }
    });
  }

  /// Start broadcasting GPS location to customer via WebSocket
  void _startLocationBroadcast() {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      await _sendCurrentLocation();
    });
    // Also send immediately
    _sendCurrentLocation();
  }

  void _stopLocationBroadcast() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  Future<void> _sendCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final realtime = ref.read(realtimeServiceProvider);
      realtime.sendLocation(
        orderId: widget.orderId,
        lat: position.latitude,
        lng: position.longitude,
      );
    } catch (_) {
      // GPS unavailable — skip this update silently
    }
  }

  Future<void> _transitionTo(String endpoint) async {
    setState(() => _isLoading = true);
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.post(endpoint);
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        setState(() {
          _status = data['status'] as String;
          if (_status == 'IN_PROGRESS' && _startedAt == null) {
            _startedAt = DateTime.now();
            _startWorkTimer();
          }
        });
        // Start location broadcast when EN_ROUTE
        if (_status == 'EN_ROUTE') {
          _startLocationBroadcast();
        }
        // Stop location broadcast when work starts or completes
        if (_status == 'IN_PROGRESS' || _status == 'COMPLETED') {
          _stopLocationBroadcast();
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengubah status')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _workTimer?.cancel();
    _locationTimer?.cancel();
    _statusSub?.cancel();
    try {
      final realtime = ref.read(realtimeServiceProvider);
      realtime.unsubscribeFromOrder(widget.orderId);
    } catch (_) {}
    super.dispose();
  }

  String get _formattedTime {
    final hours = _workSeconds ~/ 3600;
    final minutes = (_workSeconds % 3600) ~/ 60;
    final seconds = _workSeconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Aktif')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          children: [
            // Status
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.base),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Status:'),
                    OrderStatusBadge(status: _status),
                  ],
                ),
              ),
            ),

            const SizedBox(height: AppSpacing.sm),

            // Real-time indicator
            _RealtimeIndicator(),

            const SizedBox(height: AppSpacing.lg),

            // Location broadcast indicator when EN_ROUTE
            if (_locationTimer != null) ...[
              Card(
                color: AppColors.info.withOpacity(0.05),
                child: const Padding(
                  padding: EdgeInsets.all(AppSpacing.md),
                  child: Row(
                    children: [
                      Icon(Icons.gps_fixed, color: AppColors.info, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Lokasi Anda dikirim ke pelanggan',
                        style: TextStyle(fontSize: 13, color: AppColors.info),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],

            // Timer (shown when IN_PROGRESS)
            if (_status == 'IN_PROGRESS') ...[
              Card(
                color: AppColors.primary.withOpacity(0.05),
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    children: [
                      const Text('Waktu Kerja'),
                      const SizedBox(height: 8),
                      Text(_formattedTime, style: AppTypography.timer),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],

            const Spacer(),

            // Action buttons based on status
            if (_status == 'ACCEPTED')
              ElevatedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () => _transitionTo(
                        ApiEndpoints.workerEnroute(widget.orderId)),
                icon: const Icon(Icons.directions_walk),
                label: const Text('Berangkat ke Lokasi'),
              ),

            if (_status == 'EN_ROUTE')
              ElevatedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () => _transitionTo(
                        ApiEndpoints.workerArrive(widget.orderId)),
                icon: const Icon(Icons.location_on),
                label: const Text('Saya Sudah Tiba'),
              ),

            if (_status == 'ARRIVED')
              ElevatedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () => _transitionTo(
                        ApiEndpoints.workerStart(widget.orderId)),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Mulai Kerja'),
              ),

            if (_status == 'IN_PROGRESS')
              ElevatedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Pekerjaan Selesai?'),
                            content: const Text(
                              'Pastikan semua pekerjaan sudah selesai dan pelanggan puas.',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Belum'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Ya, Selesai'),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          await _transitionTo(
                              ApiEndpoints.workerComplete(widget.orderId));
                          if (mounted && _status == 'COMPLETED') {
                            context.go(Routes.workerHome);
                          }
                        }
                      },
                icon: const Icon(Icons.check_circle),
                label: const Text('Selesai'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                ),
              ),

            if (_status == 'COMPLETED') ...[
              const Icon(Icons.check_circle, size: 64, color: AppColors.success),
              const SizedBox(height: 16),
              Text('Pekerjaan Selesai!', style: AppTypography.h3),
              const SizedBox(height: 8),
              const Text('Menunggu pelanggan membayar...'),
              const SizedBox(height: AppSpacing.lg),
              OutlinedButton(
                onPressed: () => context.go(Routes.workerHome),
                child: const Text('Kembali ke Dashboard'),
              ),
            ],
          ],
        ),
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
            Text(label, style: TextStyle(fontSize: 12, color: color)),
          ],
        );
      },
    );
  }
}
