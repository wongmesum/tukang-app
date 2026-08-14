import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/constants/app_constants.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

final uploadServiceProvider = Provider<UploadService>((ref) {
  return UploadService(ref);
});

/// Where an image belongs. Must match the backend's accepted categories.
enum UploadCategory {
  problem,
  ktp,
  portfolio,
  review,
  avatar;

  String get value => name;
}

class UploadResult {
  const UploadResult({
    required this.url,
    required this.filename,
    required this.size,
    required this.mimeType,
  });

  final String url;
  final String filename;
  final int size;
  final String mimeType;

  factory UploadResult.fromJson(Map<String, dynamic> json) {
    return UploadResult(
      url: json['url'] as String,
      filename: json['filename'] as String? ?? '',
      size: json['size'] as int? ?? 0,
      mimeType: json['mime_type'] as String? ?? '',
    );
  }
}

/// Thrown when a file fails client-side checks or the upload itself fails.
class UploadException implements Exception {
  const UploadException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Uploads images to the backend.
///
/// Validates locally before sending so an oversized file doesn't waste the
/// user's mobile data only to be rejected by the server.
class UploadService {
  UploadService(this._ref);

  final Ref _ref;

  Dio get _dio => _ref.read(dioClientProvider).dio;

  static const _maxBytes = AppConstants.maxImageSizeMB * 1024 * 1024;

  /// Extensions the backend accepts, mapped to their MIME types.
  static const _mimeByExtension = <String, String>{
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  /// Upload a single image.
  ///
  /// [onProgress] receives a value between 0.0 and 1.0.
  Future<UploadResult> uploadImage({
    required File file,
    required UploadCategory category,
    void Function(double progress)? onProgress,
  }) async {
    final mimeType = _validate(file);

    final formData = FormData.fromMap({
      'category': category.value,
      'file': await MultipartFile.fromFile(
        file.path,
        filename: p.basename(file.path),
        // The backend reads file.type to validate — without an explicit
        // content type it arrives as application/octet-stream and is rejected.
        contentType: DioMediaType.parse(mimeType),
      ),
    });

    try {
      final response = await _dio.post(
        ApiEndpoints.uploadImage,
        data: formData,
        onSendProgress: (sent, total) {
          if (total > 0) onProgress?.call(sent / total);
        },
      );

      final body = response.data as Map<String, dynamic>;
      if (body['success'] == true && body['data'] != null) {
        return UploadResult.fromJson(body['data'] as Map<String, dynamic>);
      }

      throw UploadException(
        body['error']?['message'] as String? ?? 'Gagal mengunggah foto',
      );
    } on DioException catch (e) {
      throw UploadException(_describeDioError(e));
    }
  }

  /// Upload several images, returning the URLs in the same order.
  ///
  /// Uploads run sequentially: parallel uploads on a slow mobile connection
  /// tend to time out, and sequential progress is easier to report honestly.
  Future<List<String>> uploadImages({
    required List<File> files,
    required UploadCategory category,
    void Function(int completed, int total)? onProgress,
  }) async {
    final urls = <String>[];

    for (var i = 0; i < files.length; i++) {
      final result = await uploadImage(file: files[i], category: category);
      urls.add(result.url);
      onProgress?.call(i + 1, files.length);
    }

    return urls;
  }

  /// Returns the MIME type when valid, throws [UploadException] otherwise.
  String _validate(File file) {
    if (!file.existsSync()) {
      throw const UploadException('File tidak ditemukan');
    }

    final extension = p.extension(file.path).toLowerCase();
    final mimeType = _mimeByExtension[extension];

    if (mimeType == null) {
      final allowed = AppConstants.allowedImageTypes.join(', ');
      throw UploadException('Format tidak didukung. Gunakan: $allowed');
    }

    final bytes = file.lengthSync();
    if (bytes > _maxBytes) {
      final sizeMb = (bytes / (1024 * 1024)).toStringAsFixed(1);
      throw UploadException(
        'Ukuran foto $sizeMb MB melebihi batas ${AppConstants.maxImageSizeMB} MB',
      );
    }

    return mimeType;
  }

  String _describeDioError(DioException e) {
    // Prefer the server's message — it's already in Indonesian.
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['error']?['message'];
      if (message is String) return message;
    }

    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'Koneksi lambat, unggahan gagal. Coba lagi.',
      DioExceptionType.connectionError =>
        'Tidak dapat terhubung ke server. Periksa koneksi internet.',
      _ => 'Gagal mengunggah foto. Coba lagi.',
    };
  }
}
