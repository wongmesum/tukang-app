import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

// ---------------------------------------------------------------------------
// Pure helpers — testable without widget tree or network
// ---------------------------------------------------------------------------

/// Returns the next API action and button label for the given order status,
/// or null when there's no action available (terminal states).
({String endpoint, String label})? nextActionFor(String status) {
  switch (status) {
    case 'ACCEPTED':
      return (endpoint: 'enroute', label: 'Berangkat');
    case 'EN_ROUTE':
      return (endpoint: 'arrive', label: 'Saya Sudah Tiba');
    case 'ARRIVED':
      return (endpoint: 'start', label: 'Mulai Kerja');
    case 'IN_PROGRESS':
      return (endpoint: 'complete', label: 'Selesai');
    default:
      return null;
  }
}

/// Formats a [Duration] as MM:SS or HH:MM:SS when >= 1 hour.
/// Negative durations clamp to 00:00.
String formatDuration(Duration d) {
  if (d.isNegative) return '00:00';
  final total = d.inSeconds;
  final h = total ~/ 3600;
  final m = (total % 3600) ~/ 60;
  final s = total % 60;

  if (h > 0) {
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
  return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
}

/// Builds a Google Maps directions URL for the given coordinates.
String mapsUrlFor(double lat, double lng) {
  return 'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng';
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class WorkerActiveOrderScreen extends ConsumerStatefulWidget {
  const WorkerActiveOrderScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<WorkerActiveOrderScreen> createState() => _WorkerActiveOrderScreenState();
}

class _WorkerActiveOrderScreenState extends ConsumerState<WorkerActiveOrderScreen> {
  OrderSummary? _order;
  bool _loading = true;
  bool _acting = false;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.get<Map<String, dynamic>>('/v1/orders/${widget.orderId}');
      final body = response.data;
      if (body != null && body['success'] == true) {
        final order = OrderSummary.fromJson(body['data'] as Map<String, dynamic>);
        setState(() => _order = order);
        _syncTimer(order);
      }
    } on Exception catch (_) {}
    if (mounted && _loading) setState(() => _loading = false);
  }

  /// Start or stop the per-second ticker depending on status.
  void _syncTimer(OrderSummary order) {
    if (order.status == 'IN_PROGRESS' && order.startedAt != null) {
      _ticker ??= Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    } else {
      _ticker?.cancel();
      _ticker = null;
    }
  }

  Future<void> _doAction(String endpoint) async {
    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post<Map<String, dynamic>>('/v1/worker/orders/${widget.orderId}/$endpoint');
      await _load();
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
      }
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _openMaps() async {
    if (_order?.customerLat == null || _order?.customerLng == null) return;
    final url = Uri.parse(mapsUrlFor(_order!.customerLat!, _order!.customerLng!));
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  // --------------- UI ---------------

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Aktif')),
        body: const Center(child: Text('Order tidak ditemukan')),
      );
    }

    final action = nextActionFor(_order!.status);

    return Scaffold(
      appBar: AppBar(title: Text(_order!.orderNumber)),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.l),
        child: Column(
          children: [
            _buildStatusCard(),
            const SizedBox(height: AppSpacing.l),
            if (_order!.description != null && _order!.description!.isNotEmpty)
              _buildDescriptionCard(),
            if (_order!.status == 'IN_PROGRESS') ...[
              const SizedBox(height: AppSpacing.l),
              _buildTimerCard(),
            ],
            const Spacer(),
            // Google Maps button (EN_ROUTE & ARRIVED — worker navigating)
            if ((_order!.status == 'ACCEPTED' || _order!.status == 'EN_ROUTE') &&
                _order!.customerLat != null &&
                _order!.customerLng != null) ...[
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _openMaps,
                  icon: const Icon(Icons.map_outlined),
                  label: const Text('Buka Google Maps'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.l),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.m),
            ],
            // Primary action button
            if (action != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _acting ? null : () => _doAction(action.endpoint),
                  child: _acting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(action.label),
                ),
              ),
            // Completed state — back to dashboard
            if (_order!.status == 'COMPLETED' || _order!.status == 'PAID' || _order!.status == 'REVIEWED')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go('/worker/dashboard'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                  child: const Text('Kembali ke Dashboard'),
                ),
              ),
            const SizedBox(height: AppSpacing.m),
            TextButton(
              onPressed: () => context.go('/worker/dashboard'),
              child: const Text('Dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          children: [
            _StatusBadge(status: _order!.status),
            const SizedBox(height: AppSpacing.l),
            Text(
              formatRupiah(_order!.totalEstimate),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppSpacing.s),
            Text(_order!.serviceId, style: const TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _buildDescriptionCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.l),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.description_outlined, color: AppColors.textSecondary, size: 20),
            const SizedBox(width: AppSpacing.m),
            Expanded(
              child: Text(_order!.description!, style: const TextStyle(fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimerCard() {
    final elapsed = _order!.startedAt != null
        ? DateTime.now().difference(_order!.startedAt!)
        : Duration.zero;

    return Card(
      color: AppColors.primary.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          children: [
            const Text('Durasi Kerja', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: AppSpacing.s),
            Text(
              formatDuration(elapsed),
              style: const TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.w800,
                fontFeatures: [FontFeature.tabularFigures()],
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sub-widget: status badge
// ---------------------------------------------------------------------------

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  static const _statusLabels = {
    'ACCEPTED': 'Diterima',
    'EN_ROUTE': 'Dalam Perjalanan',
    'ARRIVED': 'Tiba di Lokasi',
    'IN_PROGRESS': 'Sedang Dikerjakan',
    'COMPLETED': 'Selesai',
    'PAID': 'Dibayar',
    'REVIEWED': 'Diulas',
  };

  Color get _color {
    switch (status) {
      case 'ACCEPTED':
        return Colors.blue;
      case 'EN_ROUTE':
        return Colors.indigo;
      case 'ARRIVED':
        return Colors.teal;
      case 'IN_PROGRESS':
        return AppColors.primary;
      case 'COMPLETED':
      case 'PAID':
      case 'REVIEWED':
        return AppColors.success;
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        _statusLabels[status] ?? status,
        style: TextStyle(fontWeight: FontWeight.w800, color: _color),
      ),
    );
  }
}
