import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

class WorkerWalletScreen extends ConsumerStatefulWidget {
  const WorkerWalletScreen({super.key});

  @override
  ConsumerState<WorkerWalletScreen> createState() => _WorkerWalletScreenState();
}

class _WorkerWalletScreenState extends ConsumerState<WorkerWalletScreen> {
  int _balance = 0;
  int _totalEarned = 0;
  List<Map<String, dynamic>> _transactions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get(ApiEndpoints.workerWallet);
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        setState(() {
          _balance = data['balance'] as int? ?? 0;
          _totalEarned = data['total_earned'] as int? ?? 0;
          _transactions = (data['transactions'] as List?)?.cast<Map<String, dynamic>>() ?? [];
          _isLoading = false;
        });
      }
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dompet')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.base),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Balance card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryDark],
                      ),
                      borderRadius: BorderRadius.circular(AppSpacing.md),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Saldo Anda',
                          style: AppTypography.body2.copyWith(color: Colors.white70),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          Formatters.rupiah(_balance),
                          style: AppTypography.priceLarge.copyWith(color: Colors.white),
                        ),
                        const SizedBox(height: AppSpacing.base),
                        Text(
                          'Total Pendapatan: ${Formatters.rupiah(_totalEarned)}',
                          style: AppTypography.caption.copyWith(color: Colors.white70),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.base),
                  ElevatedButton.icon(
                    onPressed: () {
                      // TODO: navigate to withdraw screen
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Fitur tarik saldo segera hadir')),
                      );
                    },
                    icon: const Icon(Icons.account_balance),
                    label: const Text('Tarik Saldo'),
                  ),

                  const SizedBox(height: AppSpacing.lg),
                  Text('Riwayat Transaksi', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.md),

                  if (_transactions.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text('Belum ada transaksi'),
                      ),
                    )
                  else
                    ..._transactions.map((tx) => _TransactionTile(transaction: tx)),
                ],
              ),
            ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.transaction});

  final Map<String, dynamic> transaction;

  @override
  Widget build(BuildContext context) {
    final type = transaction['type'] as String? ?? 'credit';
    final amount = transaction['amount'] as int? ?? 0;
    final description = transaction['description'] as String? ?? '';
    final isCredit = type == 'credit';

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isCredit
              ? AppColors.success.withOpacity(0.1)
              : AppColors.danger.withOpacity(0.1),
          child: Icon(
            isCredit ? Icons.arrow_downward : Icons.arrow_upward,
            color: isCredit ? AppColors.success : AppColors.danger,
            size: 20,
          ),
        ),
        title: Text(description, maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Text(
          '${isCredit ? '+' : '-'}${Formatters.rupiah(amount)}',
          style: TextStyle(
            color: isCredit ? AppColors.success : AppColors.danger,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
