import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref);
});

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.orderId,
    required this.senderId,
    required this.content,
    required this.isMine,
    required this.createdAt,
    this.readAt,
  });

  final String id;
  final String orderId;
  final String senderId;
  final String content;
  final bool isMine;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get isRead => readAt != null;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      senderId: json['sender_id'] as String,
      content: json['content'] as String,
      isMine: json['is_mine'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      readAt: json['read_at'] != null
          ? DateTime.parse(json['read_at'] as String)
          : null,
    );
  }
}

class ChatHistory {
  const ChatHistory({
    required this.messages,
    required this.unread,
    required this.chatClosed,
  });

  final List<ChatMessage> messages;
  final int unread;
  final bool chatClosed;
}

class ChatException implements Exception {
  const ChatException(this.message);
  final String message;

  @override
  String toString() => message;
}

class ChatRepository {
  ChatRepository(this._ref);

  final Ref _ref;
  Dio get _dio => _ref.read(dioClientProvider).dio;

  Future<ChatHistory> fetchHistory(String orderId) async {
    try {
      final response = await _dio.get(ApiEndpoints.messages(orderId));
      final body = response.data as Map<String, dynamic>;

      if (body['success'] != true) {
        throw ChatException(
          body['error']?['message'] as String? ?? 'Gagal memuat pesan',
        );
      }

      final items = (body['data'] as List)
          .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = body['meta'] as Map<String, dynamic>? ?? {};

      return ChatHistory(
        messages: items,
        unread: meta['unread'] as int? ?? 0,
        chatClosed: meta['chat_closed'] as bool? ?? false,
      );
    } on DioException catch (e) {
      throw ChatException(_describe(e, 'Gagal memuat pesan'));
    }
  }

  Future<ChatMessage> sendMessage(String orderId, String content) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.messages(orderId),
        data: {'content': content},
      );
      final body = response.data as Map<String, dynamic>;

      if (body['success'] != true) {
        throw ChatException(
          body['error']?['message'] as String? ?? 'Gagal mengirim pesan',
        );
      }

      return ChatMessage.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ChatException(_describe(e, 'Gagal mengirim pesan'));
    }
  }

  /// Marks the other party's messages as read. Failure is not surfaced —
  /// read receipts are cosmetic.
  Future<void> markRead(String orderId) async {
    try {
      await _dio.post(ApiEndpoints.markMessagesRead(orderId));
    } catch (_) {
      // Ignore.
    }
  }

  String _describe(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['error']?['message'];
      if (message is String) return message;
    }
    return switch (e.type) {
      DioExceptionType.connectionError =>
        'Tidak dapat terhubung ke server. Periksa koneksi internet.',
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout =>
        'Koneksi lambat. Coba lagi.',
      _ => fallback,
    };
  }
}
