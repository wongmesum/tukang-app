import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class ServiceListScreen extends ConsumerStatefulWidget {
  const ServiceListScreen({
    super.key,
    required this.categoryCode,
    required this.categoryName,
  });

  final String categoryCode;
  final String categoryName;

  @override
  ConsumerState<ServiceListScreen> createState() => _ServiceListScreenState();
}

class _ServiceListScreenState extends ConsumerState<ServiceListScreen> {
  List<ServiceItem> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.get<Map<String, dynamic>>(
        '/v1/categories/${widget.categoryCode}/services',
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        final list = body['data'] as List<dynamic>;
        setState(() {
          _services = list
              .map((e) => ServiceItem.fromJson(e as Map<String, dynamic>))
              .toList();
        });
      }
    } on Exception catch (_) {
      // Silent — will show empty state
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.categoryName)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _services.isEmpty
              ? const Center(child: Text('Belum ada layanan tersedia.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.l),
                  itemCount: _services.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.m),
                  itemBuilder: (context, index) {
                    final svc = _services[index];
                    return Card(
                      child: InkWell(
                        borderRadius:
                            BorderRadius.circular(AppRadius.medium),
                        onTap: () {
                          context.push('/booking/form', extra: svc);
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.l),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      svc.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: AppSpacing.xs),
                                    Text(
                                      '${formatRupiah(svc.baseHourlyRate)}/jam · min ${svc.minHours} jam',
                                      style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right,
                                color: AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
