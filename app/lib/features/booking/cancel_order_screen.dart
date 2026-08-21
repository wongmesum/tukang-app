import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';

class CancelOrderScreen extends StatefulWidget {
  final String orderId;

  const CancelOrderScreen({super.key, required this.orderId});

  @override
  State<CancelOrderScreen> createState() => _CancelOrderScreenState();
}

class _CancelOrderScreenState extends State<CancelOrderScreen> {
  String? _selectedReason;
  final _detailController = TextEditingController();
  bool _loading = false;

  static const _reasons = [
    _CancelReason('changed_mind', 'Berubah pikiran', Icons.sentiment_dissatisfied),
    _CancelReason('wrong_service', 'Salah pilih layanan', Icons.build_circle),
    _CancelReason('wrong_schedule', 'Jadwal berubah', Icons.schedule),
    _CancelReason('found_other', 'Sudah menemukan tukang lain', Icons.person_search),
    _CancelReason('price_too_high', 'Harga terlalu mahal', Icons.money_off),
    _CancelReason('emergency', 'Ada keperluan mendadak', Icons.warning_amber),
    _CancelReason('worker_too_far', 'Tukang terlalu jauh', Icons.location_off),
    _CancelReason('other', 'Alasan lain', Icons.more_horiz),
  ];

  Future<void> _submitCancel() async {
    if (_selectedReason == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih alasan pembatalan')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await ApiClient.instance.post('/orders/${widget.orderId}/cancel', body: {
        'reason_code': _selectedReason,
        'reason_detail': _detailController.text.trim().isEmpty ? null : _detailController.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order berhasil dibatalkan'),
            backgroundColor: Color(0xFF27AE60),
          ),
        );
        context.pop(true); // return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal membatalkan: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _detailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Batalkan Order')),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kenapa Anda ingin membatalkan?',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Pilih alasan utama pembatalan agar kami bisa meningkatkan layanan.',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                  const SizedBox(height: 20),

                  // Reason options
                  ...(_reasons.map((reason) => _buildReasonOption(reason))),

                  // Detail input (shown when a reason is selected)
                  if (_selectedReason != null) ...[
                    const SizedBox(height: 20),
                    TextField(
                      controller: _detailController,
                      maxLines: 3,
                      maxLength: 500,
                      decoration: InputDecoration(
                        labelText: 'Detail tambahan (opsional)',
                        hintText: 'Ceritakan lebih lanjut...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        alignLabelWithHint: true,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Bottom button
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading || _selectedReason == null ? null : _submitCancel,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE74C3C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    disabledBackgroundColor: Colors.grey[300],
                  ),
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Konfirmasi Pembatalan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReasonOption(_CancelReason reason) {
    final isSelected = _selectedReason == reason.code;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => setState(() => _selectedReason = reason.code),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            border: Border.all(
              color: isSelected ? const Color(0xFFFF6B35) : Colors.grey.shade200,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(12),
            color: isSelected ? const Color(0xFFFF6B35).withOpacity(0.05) : null,
          ),
          child: Row(
            children: [
              Icon(
                reason.icon,
                color: isSelected ? const Color(0xFFFF6B35) : Colors.grey[500],
                size: 22,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  reason.label,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected ? const Color(0xFF2C3E50) : Colors.grey[700],
                  ),
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle, color: Color(0xFFFF6B35), size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _CancelReason {
  final String code;
  final String label;
  final IconData icon;

  const _CancelReason(this.code, this.label, this.icon);
}
