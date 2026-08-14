import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/features/home/data/services_repository.dart';

/// Provider for categories
final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  final repository = ref.read(servicesRepositoryProvider);
  return repository.getCategories();
});

/// Provider for services by category
final servicesByCategoryProvider =
    FutureProvider.family<List<ServiceModel>, String>((ref, code) async {
  final repository = ref.read(servicesRepositoryProvider);
  return repository.getServicesByCategory(code);
});

/// Provider for single service detail
final serviceDetailProvider =
    FutureProvider.family<ServiceModel?, String>((ref, id) async {
  final repository = ref.read(servicesRepositoryProvider);
  return repository.getService(id);
});
