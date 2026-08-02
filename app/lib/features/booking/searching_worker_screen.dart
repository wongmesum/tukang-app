import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';

/// Shown after order is created — polls order status until MATCHED/ACCEPTED
/// or times out after 60 seconds.
class SearchingWorkerScreen extends ConsumerStatefulWidget {
  const SearchingWorkerScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<SearchingWorkerScreen> createState() => _SearchingWorkerScreenState();
}

class _SearchingWorkerScreenState extends ConsumerState<SearchingWorkerScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  Timer? _pollTimer;
  int _elapsedSeconds = 0;
  static const _timeoutSeconds = 60;
  bool _matched = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _startPolling();
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      _elapsedSeconds += 3;

      if (_elapsedSeconds >= _timeoutSeconds) {
        _pollTimer?.cancel();
        if (mounted) {
          _showTimeout();
        }
        return;
      }

      await _checkOrderStatus();
    });
  }

  Future<void> _checkOrderStatus() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get<Map<String, dynamic>>(
        '/v1/orders/${widget.orderId}',
      );
      final data = res.data?['data'] as Map<String, dynamic>?;
      final status = data?['status'] as String? ?? '';

      if (['MATCHED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].contains(status)) {
        _pollTimer?.cancel();
        setState(() => _matched = true);
        await Future<void>.delayed(const Duration(milliseconds: 800));
        if (mounted) {
          context.go('/orders/${widget.orderId}/tracking');
        }
      }
    } on Exception catch (_) {
      // Keep polling silently on network error
    }
  }

  void _showTimeout() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Tukang belum ditemukan'),
        content: const Text(
          'Belum ada tukang yang tersedia saat ini. Coba beberapa saat lagi atau hubungi CS.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.go('/home');
            },
            child: const Text('Kembali ke Home'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() => _elapsedSeconds = 0);
              _startPolling();
            },
            child: const Text('Coba Lagi'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  return Transform.scale(
                    scale: 1.0 + (_pulseController.value * 0.15),
                    child: child,
                  );
                },
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary.withOpacity(0.12),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.4),
                      width: 3,
                    ),
                  ),
                  child: Icon(
                    _matched ? Icons.check_circle : Icons.search,
                    size: 56,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Text(
                _matched ? 'Tukang ditemukan!' : 'Mencari tukang terdekat…',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.m),
              Text(
                _matched
                    ? 'Mengalihkan ke tracking order'
                    : 'Memindai tukang di area Mojokerto yang sesuai keahlian',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xxl),
              if (!_matched) ...[
                LinearProgressIndicator(
                  value: _elapsedSeconds / _timeoutSeconds,
                  backgroundColor: AppColors.line,
                  color: AppColors.primary,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
                const SizedBox(height: AppSpacing.m),
                Text(
                  '${_timeoutSeconds - _elapsedSeconds} detik tersisa',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
                TextButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('Batalkan'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
