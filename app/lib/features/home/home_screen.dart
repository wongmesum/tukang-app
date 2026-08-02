import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/premium_icons.dart';
import '../../core/theme.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  List<Map<String, dynamic>> _categories = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.get<Map<String, dynamic>>('/v1/categories');
      final body = response.data;
      if (body != null && body['success'] == true) {
        setState(() {
          _categories = List<Map<String, dynamic>>.from(
            body['data'] as List<dynamic>,
          );
        });
      }
    } on Exception catch (_) {
      // Silently fail — categories will show empty
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TukangNDeso'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authTokenProvider.notifier).clear();
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadCategories,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFf17b48), Color(0xFFc9552b)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(AppRadius.medium),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mojokerto Kabupaten',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(color: Colors.white),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Cari tukang terpercaya di area Anda',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    Text(
                      'Kategori layanan',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: AppSpacing.l),
                    // Category grid
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: AppSpacing.m,
                        mainAxisSpacing: AppSpacing.m,
                        childAspectRatio: 1,
                      ),
                      itemCount: _categories.length,
                      itemBuilder: (context, index) {
                        final cat = _categories[index];
                        final code = cat['code'] as String? ?? '';
                        final name = cat['name'] as String? ?? '';
                        return InkWell(
                          borderRadius:
                              BorderRadius.circular(AppRadius.medium),
                          onTap: () {
                            context.push('/services/$code?name=${Uri.encodeComponent(name)}');
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: AppColors.line),
                              borderRadius:
                                  BorderRadius.circular(AppRadius.medium),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                PremiumCategoryIcon.fromCode(
                                  code: code,
                                  size: 42,
                                ),
                                const SizedBox(height: AppSpacing.s),
                                Text(
                                  name,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
