import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types.js';
import { WiredButton, WiredInput } from 'wired-elements-react';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  isDrawer,
  hasGuessedCorrectly
}) => {
  const [inputText, setInputText] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    const frameId = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(frameId);
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInputText('');
  };

  const getPlaceholder = () => {
    if (isDrawer) return 'شما نقاش هستید (نمی‌توانید حدس بزنید)';
    if (hasGuessedCorrectly) return 'شما کلمه را حدس زدید! با سایر برندگان صحبت کنید...';
    return 'حدس خود را اینجا بنویسید...';
  };

  return (
    <div className="chat-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="chat-msg system">
                📢 {msg.text}
              </div>
            );
          }
          if (msg.type === 'correct') {
            return (
              <div key={msg.id} className="chat-msg correct">
                🎉 {msg.text}
              </div>
            );
          }
          if (msg.type === 'close') {
            return (
              <div key={msg.id} className="chat-msg close">
                💡 {msg.text}
              </div>
            );
          }
          return (
            <div key={msg.id} className="chat-msg user">
              <strong className="chat-msg-sender">{msg.senderName}:</strong>
              <span className="chat-msg-text">{msg.text}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-row" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <WiredInput
            value={inputText}
            onChange={(e: any) => {
              const val = e.target?.value ?? e.detail?.sourceEvent?.target?.value ?? '';
              setInputText(val);
            }}
            placeholder={getPlaceholder()}
            disabled={isDrawer}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            style={{ width: '100%', direction: 'rtl', display: 'block' }}
          />
        </div>
        <WiredButton
          elevation={2}
          onClick={() => handleSubmit()}
          disabled={isDrawer || !inputText.trim()}
          style={{ whiteSpace: 'nowrap', minWidth: '58px' }}
        >
          ارسال
        </WiredButton>
      </form>
    </div>
  );
};
