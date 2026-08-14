import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/features/chat/data/chat_repository.dart';
import 'package:tukangndeso/services/realtime/realtime_provider.dart';

class ChatState {
  const ChatState({
    this.messages = const [],
    this.isLoading = true,
    this.isSending = false,
    this.chatClosed = false,
    this.errorMessage,
  });

  final List<ChatMessage> messages;
  final bool isLoading;
  final bool isSending;
  final bool chatClosed;
  final String? errorMessage;

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    bool? isSending,
    bool? chatClosed,
    String? errorMessage,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isSending: isSending ?? this.isSending,
      chatClosed: chatClosed ?? this.chatClosed,
      errorMessage: errorMessage,
    );
  }
}

/// Chat for one order.
///
/// History comes over REST; new messages arrive over WebSocket. Both feed the
/// same list so the screen has a single source of truth.
class ChatNotifier extends StateNotifier<ChatState> {
  ChatNotifier(this._repository, this._realtime, this._orderId)
      : super(const ChatState()) {
    _load();
    _listenForIncoming();
  }

  final ChatRepository _repository;
  final RealtimeService _realtime;
  final String _orderId;

  StreamSubscription? _incomingSub;

  Future<void> _load() async {
    try {
      final history = await _repository.fetchHistory(_orderId);
      state = state.copyWith(
        messages: history.messages,
        chatClosed: history.chatClosed,
        isLoading: false,
      );

      // Opening the screen counts as reading whatever was waiting.
      if (history.unread > 0) {
        await _repository.markRead(_orderId);
      }
    } on ChatException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    }
  }

  void _listenForIncoming() {
    _realtime.subscribeToOrder(_orderId);

    _incomingSub = _realtime.chatMessages
        .where((e) => e.orderId == _orderId)
        .listen((event) {
      // The server broadcasts to the order room, so the sender receives their
      // own message back. Skip it — it's already in the list from the POST
      // response, and appending would show it twice.
      if (state.messages.any((m) => m.id == event.messageId)) return;

      final incoming = ChatMessage(
        id: event.messageId,
        orderId: event.orderId,
        senderId: event.senderId,
        content: event.content,
        isMine: false,
        createdAt: DateTime.tryParse(event.createdAt) ?? DateTime.now(),
      );

      state = state.copyWith(messages: [...state.messages, incoming]);

      // We're looking at the thread, so mark it read immediately.
      _repository.markRead(_orderId);
    });
  }

  Future<bool> send(String content) async {
    final trimmed = content.trim();
    if (trimmed.isEmpty || state.isSending) return false;

    state = state.copyWith(isSending: true);

    try {
      final sent = await _repository.sendMessage(_orderId, trimmed);
      state = state.copyWith(
        messages: [...state.messages, sent],
        isSending: false,
      );
      return true;
    } on ChatException catch (e) {
      state = state.copyWith(isSending: false, errorMessage: e.message);
      return false;
    }
  }

  Future<void> refresh() => _load();

  @override
  void dispose() {
    _incomingSub?.cancel();
    _realtime.unsubscribeFromOrder(_orderId);
    super.dispose();
  }
}

final chatProvider =
    StateNotifierProvider.family<ChatNotifier, ChatState, String>((ref, orderId) {
  return ChatNotifier(
    ref.read(chatRepositoryProvider),
    ref.read(realtimeServiceProvider),
    orderId,
  );
});
