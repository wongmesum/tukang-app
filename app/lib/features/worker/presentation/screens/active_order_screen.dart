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
  int _workSeconds = 0;
  DateTime? _startedAt;

  @override
  void initState() {
    super.initState();
    _loadOrder();
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

            const SizedBox(height: AppSpacing.lg),

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
                    : () => _transitionTo(ApiEndpoints.workerEnroute(widget.orderId)),
                icon: const Icon(Icons.directions_walk),
                label: const Text('Berangkat ke Lokasi'),
              ),

            if (_status == 'EN_ROUTE')
              ElevatedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () => _transitionTo(ApiEndpoints.workerArrive(widget.orderId)),
                icon: const Icon(Icons.location_on),
                label: const Text('Saya Sudah Tiba'),
              ),

            if (_status == 'ARRIVED')
              ElevatedButton.icon(
                onPressed: _isLoading
                    ? null
                    : () => _transitionTo(ApiEndpoints.workerStart(widget.orderId)),
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
                          await _transitionTo(ApiEndpoints.workerComplete(widget.orderId));
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
