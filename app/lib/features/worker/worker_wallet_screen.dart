import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class WorkerWalletScreen extends ConsumerStatefulWidget {
  const WorkerWalletScreen({super.key});

  @override
  ConsumerState<WorkerWalletScreen> createState() => _WorkerWalletScreenState();
}

class _WorkerWalletScreenState extends ConsumerState<WorkerWalletScreen> {
  Map<String, dynamic>? _wallet;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.get<Map<String, dynamic>>('/v1/worker/wallet');
      final body = response.data;
      if (body != null && body['success'] == true) {
        setState(() => _wallet = body['data'] as Map<String, dynamic>);
      }
    } on Exception catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final balance = (_wallet?['balance'] as num?)?.toInt() ?? 0;
    final totalEarned = (_wallet?['total_earned'] as num?)?.toInt() ?? 0;
    final transactions = _wallet?['transactions'] as List<dynamic>? ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet Saya')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.l),
          children: [
            Card(
              color: AppColors.primary,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Saldo saat ini', style: TextStyle(color: Colors.white70)),
                    const SizedBox(height: AppSpacing.xs),
                    Text(formatRupiah(balance), style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                    const SizedBox(height: AppSpacing.m),
                    Text('Total pendapatan: ${formatRupiah(totalEarned)}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text('Riwayat Transaksi', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.m),
            if (transactions.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: AppSpacing.xl),
                child: Center(child: Text('Belum ada transaksi', style: TextStyle(color: AppColors.textSecondary))),
              )
            else
              ...transactions.map((tx) {
                final t = tx as Map<String, dynamic>;
                final isCredit = t['type'] == 'credit';
                return Card(
                  margin: const EdgeInsets.only(bottom: AppSpacing.s),
                  child: ListTile(
                    leading: Icon(
                      isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                      color: isCredit ? AppColors.success : AppColors.danger,
                    ),
                    title: Text(t['description'] as String? ?? ''),
                    trailing: Text(
                      '${isCredit ? '+' : '-'}${formatRupiah((t['amount'] as num).toInt())}',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: isCredit ? AppColors.success : AppColors.danger,
                      ),
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
