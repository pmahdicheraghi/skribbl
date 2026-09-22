import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types.js';
import { WiredButton, WiredInput } from 'wired-elements-react';
import { RoughSpeechBubble } from './rough/RoughSpeechBubble.js';
import { RoughBanner } from './rough/RoughBanner.js';

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
    const timer = setTimeout(scrollToBottom, 50);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
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
    <div className="chat-wrapper">
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <RoughBanner
                key={msg.id}
                stroke="#94a3b8"
                strokeWidth={1.2}
                fill="#f1f5f9"
                notchSize={8}
                style={{ width: '100%', maxWidth: '100%', margin: '3px 0', boxSizing: 'border-box' }}
              >
                <div style={{ fontSize: '0.88rem', color: '#475569', textAlign: 'center', fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  📢 {msg.text}
                </div>
              </RoughBanner>
            );
          }
          if (msg.type === 'correct') {
            return (
              <RoughSpeechBubble
                key={msg.id}
                tailPosition="none"
                stroke="#10b981"
                strokeWidth={1.8}
                fill="#ecfdf5"
                style={{ width: '100%', maxWidth: '100%', margin: '3px 0', boxSizing: 'border-box' }}
              >
                <div style={{ fontSize: '0.95rem', color: '#065f46', fontWeight: 700, textAlign: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  🎉 {msg.text}
                </div>
              </RoughSpeechBubble>
            );
          }
          if (msg.type === 'close') {
            return (
              <RoughSpeechBubble
                key={msg.id}
                tailPosition="none"
                stroke="#f59e0b"
                strokeWidth={1.8}
                fill="#fefce8"
                style={{ width: '100%', maxWidth: '100%', margin: '3px 0', boxSizing: 'border-box' }}
              >
                <div style={{ fontSize: '0.95rem', color: '#854d0e', fontWeight: 700, textAlign: 'center', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  💡 {msg.text}
                </div>
              </RoughSpeechBubble>
            );
          }
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                margin: '3px 0',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            >
              <RoughSpeechBubble
                tailPosition="bottom-right"
                stroke="#374151"
                strokeWidth={1.3}
                fill="#ffffff"
                style={{ maxWidth: '92%', minWidth: 0, boxSizing: 'border-box' }}
              >
                <div style={{ fontSize: '0.95rem', lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <strong style={{ color: '#d97706', marginLeft: '4px', fontWeight: 700 }}>{msg.senderName}:</strong>
                  <span style={{ color: '#1e293b' }}>{msg.text}</span>
                </div>
              </RoughSpeechBubble>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-row" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
          style={{ whiteSpace: 'nowrap', minWidth: '58px', flexShrink: 0 }}
        >
          ارسال
        </WiredButton>
      </form>
    </div>
  );
};
