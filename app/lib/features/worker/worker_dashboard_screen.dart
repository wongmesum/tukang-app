import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/theme.dart';

class WorkerDashboardScreen extends ConsumerStatefulWidget {
  const WorkerDashboardScreen({super.key});

  @override
  ConsumerState<WorkerDashboardScreen> createState() => _WorkerDashboardScreenState();
}

class _WorkerDashboardScreenState extends ConsumerState<WorkerDashboardScreen> {
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _wallet;
  List<dynamic> _incoming = [];
  bool _loading = true;
  bool _toggling = false;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    final dio = ref.read(apiClientProvider);
    try {
      final profileRes = await dio.get<Map<String, dynamic>>('/v1/worker/profile');
      final walletRes = await dio.get<Map<String, dynamic>>('/v1/worker/wallet');
      final incomingRes = await dio.get<Map<String, dynamic>>('/v1/worker/orders/incoming');

      setState(() {
        _profile = (profileRes.data?['data']) as Map<String, dynamic>?;
        _wallet = (walletRes.data?['data']) as Map<String, dynamic>?;
        _incoming = (incomingRes.data?['data']) as List<dynamic>? ?? [];
      });
    } on Exception catch (_) {
      // Worker profile may not exist yet — handled in build()
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleAvailability(bool value) async {
    setState(() => _toggling = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post<Map<String, dynamic>>(
        '/v1/worker/availability',
        data: {'is_available': value},
      );
      await _loadAll();
    } on Exception catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengubah status. Pastikan profil sudah diverifikasi.')),
        );
      }
    } finally {
      if (mounted) setState(() => _toggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_profile == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dashboard Tukang')),
        body: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.build_circle_outlined, size: 64, color: AppColors.textSecondary),
              const SizedBox(height: AppSpacing.l),
              const Text('Anda belum terdaftar sebagai tukang', textAlign: TextAlign.center),
              const SizedBox(height: AppSpacing.l),
              ElevatedButton(
                onPressed: () => context.push('/worker/register'),
                child: const Text('Daftar Sekarang'),
              ),
            ],
          ),
        ),
      );
    }

    final isAvailable = _profile!['is_available'] as bool? ?? false;
    final status = _profile!['status'] as String? ?? 'pending';
    final balance = (_wallet?['balance'] as num?)?.toInt() ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Tukang'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authTokenProvider.notifier).clear(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.l),
          children: [
            if (status == 'pending')
              Card(
                color: AppColors.warning.withOpacity(0.1),
                child: const Padding(
                  padding: EdgeInsets.all(AppSpacing.l),
                  child: Text('Profil Anda sedang menunggu verifikasi admin.'),
                ),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(isAvailable ? 'Online' : 'Offline', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                    Switch(
                      value: isAvailable,
                      onChanged: status == 'active' && !_toggling ? _toggleAvailability : null,
                      activeColor: AppColors.success,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.l),
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    label: 'Saldo',
                    value: 'Rp ${balance.toString()}',
                    onTap: () => context.push('/worker/wallet'),
                  ),
                ),
                const SizedBox(width: AppSpacing.m),
                Expanded(
                  child: _StatCard(
                    label: 'Rating',
                    value: (_profile!['rating_avg'] as num?)?.toStringAsFixed(1) ?? '0.0',
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),
            Text('Order Masuk (${_incoming.length})', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.m),
            if (_incoming.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                child: Center(child: Text('Belum ada order masuk', style: TextStyle(color: AppColors.textSecondary))),
              )
            else
              ..._incoming.map((order) {
                final o = order as Map<String, dynamic>;
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.m),
                  child: ListTile(
                    title: Text(o['order_number'] as String? ?? ''),
                    subtitle: Text(o['service_id'] as String? ?? ''),
                    trailing: ElevatedButton(
                      onPressed: () => context.push('/worker/incoming/${o['id']}'),
                      child: const Text('Ambil'),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, this.onTap});
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.medium),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.l),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              const SizedBox(height: AppSpacing.xs),
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
      ),
    );
  }
}
