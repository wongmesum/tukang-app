import 'package:flutter/material.dart';
import '../../core/api_client.dart';

/// Screen for workers to manage their portfolio gallery.
/// Shows uploaded work photos that customers can see.
class WorkerPortfolioScreen extends StatefulWidget {
  const WorkerPortfolioScreen({super.key});

  @override
  State<WorkerPortfolioScreen> createState() => _WorkerPortfolioScreenState();
}

class _WorkerPortfolioScreenState extends State<WorkerPortfolioScreen> {
  List<String> _photos = [];
  bool _loading = true;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _loadPortfolio();
  }

  Future<void> _loadPortfolio() async {
    try {
      final data = await ApiClient.instance.get('/worker/profile');
      if (data != null && data['portfolio'] is List) {
        setState(() => _photos = List<String>.from(data['portfolio'] as List));
      }
    } catch (_) {
      // ignore
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _uploadPhoto() async {
    // In production: use image_picker, then upload to /v1/upload/image
    setState(() => _uploading = true);
    try {
      await Future.delayed(const Duration(seconds: 1));
      // Simulate getting URL back
      const url = 'https://cdn.tukangndeso.id/portfolio/sample.jpg';
      setState(() => _photos.add(url));

      // Save updated portfolio to profile
      await ApiClient.instance.patch('/worker/profile', body: {
        'portfolio': _photos,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto berhasil ditambahkan'), backgroundColor: Color(0xFF27AE60)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal upload: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _uploading = false);
    }
  }

  Future<void> _deletePhoto(int index) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Foto?'),
        content: const Text('Foto ini akan dihapus dari portofolio Anda.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hapus', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _photos.removeAt(index));
    try {
      await ApiClient.instance.patch('/worker/profile', body: {'portfolio': _photos});
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Portofolio'),
        actions: [
          if (!_uploading)
            IconButton(
              onPressed: _uploadPhoto,
              icon: const Icon(Icons.add_photo_alternate),
              tooltip: 'Tambah Foto',
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _photos.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.photo_library_outlined, size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 16),
                      Text('Belum ada foto portofolio', style: TextStyle(color: Colors.grey[500])),
                      const SizedBox(height: 8),
                      Text('Tambahkan foto pekerjaan Anda untuk menarik pelanggan', style: TextStyle(color: Colors.grey[400], fontSize: 13), textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _uploadPhoto,
                        icon: const Icon(Icons.add_photo_alternate),
                        label: const Text('Upload Foto'),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF6B35), foregroundColor: Colors.white),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(12),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                  ),
                  itemCount: _photos.length + 1, // +1 for add button
                  itemBuilder: (context, index) {
                    if (index == _photos.length) {
                      // Add button
                      return InkWell(
                        onTap: _uploading ? null : _uploadPhoto,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: _uploading
                              ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
                              : Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.add, color: Colors.grey[400]),
                                    Text('Tambah', style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                                  ],
                                ),
                        ),
                      );
                    }

                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            _photos[index],
                            width: double.infinity,
                            height: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: Colors.grey[200],
                              child: const Icon(Icons.broken_image, color: Colors.grey),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => _deletePhoto(index),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                              child: const Icon(Icons.close, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
    );
  }
}
