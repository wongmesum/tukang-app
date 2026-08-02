import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  int _rating = 5;
  final _commentController = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/orders/${widget.orderId}/review',
        data: {
          'rating': _rating,
          'comment': _commentController.text.isEmpty ? null : _commentController.text,
          'photos': <String>[],
        },
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Terima kasih! Review berhasil dikirim.')));
          context.go('/home');
        }
      } else {
        setState(() => _error = (body?['error']?['message'] as String?) ?? 'Gagal kirim review');
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Beri Rating')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.l),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bagaimana pengalaman Anda?', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.xl),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                return IconButton(
                  iconSize: 40,
                  icon: Icon(i < _rating ? Icons.star : Icons.star_border, color: AppColors.warning),
                  onPressed: () => setState(() => _rating = i + 1),
                );
              }),
            ),
            const SizedBox(height: AppSpacing.xl),
            TextField(
              controller: _commentController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Komentar (opsional)',
                hintText: 'Ceritakan pengalaman Anda...',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.m),
              Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ],
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Kirim Review'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
