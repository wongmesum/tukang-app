import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import 'address_picker_screen.dart';

/// Model for a saved address
class SavedAddress {
  final String id;
  final String label;
  final String fullAddress;
  final double lat;
  final double lng;
  final String district;
  final String city;
  final bool isDefault;

  const SavedAddress({
    required this.id,
    required this.label,
    required this.fullAddress,
    required this.lat,
    required this.lng,
    required this.district,
    required this.city,
    required this.isDefault,
  });

  factory SavedAddress.fromJson(Map<String, dynamic> json) {
    return SavedAddress(
      id: json['id'] as String,
      label: json['label'] as String,
      fullAddress: json['full_address'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      district: json['district'] as String? ?? '',
      city: json['city'] as String? ?? '',
      isDefault: json['is_default'] as bool? ?? false,
    );
  }
}

/// Shows a bottom sheet to pick from saved addresses or add a new one.
/// Returns a [SavedAddress] or null if cancelled.
Future<SavedAddress?> showAddressSelectionSheet(BuildContext context) {
  return showModalBottomSheet<SavedAddress>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => const _AddressSelectionContent(),
  );
}

class _AddressSelectionContent extends StatefulWidget {
  const _AddressSelectionContent();

  @override
  State<_AddressSelectionContent> createState() => _AddressSelectionContentState();
}

class _AddressSelectionContentState extends State<_AddressSelectionContent> {
  List<SavedAddress> _addresses = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final data = await ApiClient.instance.get('/me/addresses');
      if (data is List) {
        setState(() {
          _addresses = data.map((e) => SavedAddress.fromJson(e as Map<String, dynamic>)).toList();
        });
      }
    } catch (_) {
      // ignore
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _addNewAddress() async {
    final result = await Navigator.of(context).push<PickedAddress>(
      MaterialPageRoute(builder: (_) => const AddressPickerScreen()),
    );
    if (result == null || !mounted) return;

    // Show label dialog
    final label = await _showLabelDialog();
    if (label == null || !mounted) return;

    // Save to API
    try {
      final data = await ApiClient.instance.post('/me/addresses', body: {
        'label': label,
        'full_address': result.fullAddress,
        'lat': result.lat,
        'lng': result.lng,
        'district': result.district,
        'city': result.city,
        'is_default': _addresses.isEmpty,
      });

      if (data != null && mounted) {
        final saved = SavedAddress.fromJson(data as Map<String, dynamic>);
        Navigator.of(context).pop(saved);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal menyimpan: $e')),
        );
      }
    }
  }

  Future<String?> _showLabelDialog() {
    final controller = TextEditingController(text: 'Rumah');
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Label Alamat'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Rumah, Kantor, Kos...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      maxChildSize: 0.85,
      minChildSize: 0.3,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
            ),
            // Title
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  const Text('Pilih Alamat', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  TextButton.icon(
                    onPressed: _addNewAddress,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Tambah Baru'),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Content
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _addresses.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.location_off, size: 48, color: Colors.grey[300]),
                              const SizedBox(height: 12),
                              Text('Belum ada alamat tersimpan', style: TextStyle(color: Colors.grey[500])),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                onPressed: _addNewAddress,
                                icon: const Icon(Icons.add_location_alt),
                                label: const Text('Tambah Alamat'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFFF6B35),
                                  foregroundColor: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          controller: scrollController,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: _addresses.length,
                          separatorBuilder: (_, __) => const Divider(height: 1, indent: 60),
                          itemBuilder: (context, index) {
                            final addr = _addresses[index];
                            return ListTile(
                              leading: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: addr.isDefault
                                      ? const Color(0xFFFF6B35).withOpacity(0.1)
                                      : Colors.grey.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  addr.label.toLowerCase().contains('kantor') ? Icons.business : Icons.home,
                                  color: addr.isDefault ? const Color(0xFFFF6B35) : Colors.grey,
                                  size: 20,
                                ),
                              ),
                              title: Row(
                                children: [
                                  Text(addr.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                                  if (addr.isDefault) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFF6B35),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('Utama', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ],
                              ),
                              subtitle: Text(
                                addr.fullAddress,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                              trailing: const Icon(Icons.chevron_right, size: 20),
                              onTap: () => Navigator.pop(context, addr),
                            );
                          },
                        ),
            ),
          ],
        );
      },
    );
  }
}
