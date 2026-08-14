import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';
import 'package:tukangndeso/core/widgets/chat_bubble.dart';
import 'package:tukangndeso/features/chat/presentation/providers/chat_provider.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.orderId, this.counterpartName});

  final String orderId;

  /// Shown in the app bar. Falls back to a generic label when unknown.
  final String? counterpartName;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  int _lastMessageCount = 0;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    // Jump after the frame so the new item is laid out and its extent counted.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;

    // Clear immediately so the field feels responsive; restore on failure.
    _inputController.clear();

    final ok = await ref.read(chatProvider(widget.orderId).notifier).send(text);

    if (!ok && mounted) {
      _inputController.text = text;
      final error = ref.read(chatProvider(widget.orderId)).errorMessage;
      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatProvider(widget.orderId));

    // Auto-scroll whenever the thread grows.
    if (state.messages.length != _lastMessageCount) {
      _lastMessageCount = state.messages.length;
      _scrollToBottom();
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.counterpartName ?? 'Chat', style: AppTypography.h4),
            Text(
              state.chatClosed ? 'Chat ditutup' : 'Terhubung',
              style: AppTypography.caption,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(child: _buildBody(state)),
          if (!state.chatClosed) _buildComposer(state) else _buildClosedNotice(),
        ],
      ),
    );
  }

  Widget _buildBody(ChatState state) {
    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.chat_bubble_outline, size: 56, color: AppColors.textHint),
              const SizedBox(height: AppSpacing.base),
              Text('Belum ada pesan', style: AppTypography.body1),
              const SizedBox(height: 4),
              Text(
                'Kirim pesan untuk berkoordinasi soal lokasi atau detail pekerjaan',
                style: AppTypography.body2,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
      itemCount: state.messages.length,
      itemBuilder: (context, index) {
        final message = state.messages[index];
        return ChatBubble(
          content: message.content,
          isMine: message.isMine,
          time: Formatters.time(message.createdAt),
          isRead: message.isRead,
        );
      },
    );
  }

  Widget _buildComposer(ChatState state) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _inputController,
                textCapitalization: TextCapitalization.sentences,
                maxLines: 4,
                minLines: 1,
                decoration: const InputDecoration(
                  hintText: 'Tulis pesan...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(AppRadius.pill)),
                  ),
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: AppSpacing.base,
                    vertical: AppSpacing.md,
                  ),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            CircleAvatar(
              radius: 24,
              backgroundColor: AppColors.primary,
              child: state.isSending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: _send,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClosedNotice() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.base),
      color: AppColors.border.withOpacity(0.3),
      child: SafeArea(
        top: false,
        child: Text(
          'Chat ditutup karena order sudah selesai atau dibatalkan',
          style: AppTypography.caption,
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
