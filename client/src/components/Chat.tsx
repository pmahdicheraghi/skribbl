import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types.js';
import { WiredButton, WiredInput } from 'wired-elements-react';
import { RoughSpeechBubble } from './rough/RoughSpeechBubble.js';
import { RoughBanner } from './rough/RoughBanner.js';
import { RoughDivider } from './rough/RoughDivider.js';

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
  const [floatingStyle, setFloatingStyle] = useState<React.CSSProperties | null>(null);
  const [placeholderHeight, setPlaceholderHeight] = useState<number>(0);
  const chatWrapperRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRowRef = useRef<HTMLFormElement | null>(null);

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

  useEffect(() => {
    const vv = window.visualViewport;
    let lockedHeight = window.innerHeight;
    let lastWidth = window.innerWidth;

    const updateLockedHeight = (height: number) => {
      lockedHeight = height;
      document.documentElement.style.setProperty('--locked-vh', `${height}px`);
    };

    updateLockedHeight(window.innerHeight);

    const updateFloatingPosition = () => {
      if (window.innerWidth > 768) {
        setFloatingStyle(null);
        setPlaceholderHeight(0);
        return;
      }

      const currentHeight = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;

      // Update locked baseline height on orientation change or when viewport grows
      if (window.innerWidth !== lastWidth || window.innerHeight > lockedHeight) {
        lastWidth = window.innerWidth;
        updateLockedHeight(window.innerHeight);
      } else {
        const active = document.activeElement;
        const isInputActive =
          active &&
          (active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.closest('wired-input'));
        if (!isInputActive && Math.abs(window.innerHeight - currentHeight) < 40) {
          updateLockedHeight(window.innerHeight);
        }
      }

      const keyboardHeight = lockedHeight - currentHeight;
      if (keyboardHeight > 100 && chatWrapperRef.current && inputRowRef.current) {
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }

        const wrapperRect = chatWrapperRef.current.getBoundingClientRect();
        const inputRect = inputRowRef.current.getBoundingClientRect();
        const rowHeight = Math.round(inputRect.height) || 52;
        const topPos = Math.max(0, Math.round(offsetTop + currentHeight - rowHeight - 4));

        setPlaceholderHeight(rowHeight);
        setFloatingStyle({
          position: 'fixed',
          top: `${topPos}px`,
          left: `${Math.round(wrapperRect.left)}px`,
          width: `${Math.round(wrapperRect.width)}px`,
          zIndex: 900
        });
      } else {
        setFloatingStyle(null);
        setPlaceholderHeight(0);
      }
    };

    vv?.addEventListener('resize', updateFloatingPosition);
    vv?.addEventListener('scroll', updateFloatingPosition);
    window.addEventListener('resize', updateFloatingPosition);

    return () => {
      vv?.removeEventListener('resize', updateFloatingPosition);
      vv?.removeEventListener('scroll', updateFloatingPosition);
      window.removeEventListener('resize', updateFloatingPosition);
    };
  }, []);

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

  const isFloating = floatingStyle !== null;

  return (
    <div
      className="chat-wrapper"
      ref={chatWrapperRef}
      style={placeholderHeight > 0 ? { paddingBottom: `${placeholderHeight}px` } : undefined}
    >
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
                style={{ width: '100%', margin: '3px 0' }}
              >
                <div className="chat-msg-system">📢 {msg.text}</div>
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
                style={{ width: '100%', margin: '3px 0' }}
              >
                <div className="chat-msg-correct">🎉 {msg.text}</div>
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
                style={{ width: '100%', margin: '3px 0' }}
              >
                <div className="chat-msg-close">💡 {msg.text}</div>
              </RoughSpeechBubble>
            );
          }
          return (
            <div key={msg.id} className="chat-bubble-row">
              <RoughSpeechBubble
                tailPosition="bottom-right"
                stroke="#374151"
                strokeWidth={1.3}
                fill="#ffffff"
                style={{ maxWidth: '92%' }}
              >
                <div className="chat-msg-user">
                  <strong className="chat-sender">{msg.senderName}:</strong>
                  <span>{msg.text}</span>
                </div>
              </RoughSpeechBubble>
            </div>
          );
        })}
      </div>

      <form
        ref={inputRowRef}
        onSubmit={handleSubmit}
        className={`chat-input-row ${isFloating ? 'floating' : ''}`}
        style={floatingStyle ?? undefined}
      >
        {isFloating && (
          <RoughDivider
            stroke="#2b2b2b"
            strokeWidth={1.6}
            style={{ position: 'absolute', top: -3, left: 0, right: 0, margin: 0 }}
          />
        )}
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
          style={{ flex: 1, minWidth: 0, direction: 'rtl' }}
        />
        <span
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          style={{ display: 'inline-flex', flexShrink: 0 }}
        >
          <WiredButton
            elevation={2}
            onClick={() => handleSubmit()}
            disabled={isDrawer || !inputText.trim()}
            style={{ whiteSpace: 'nowrap', minWidth: '58px', flexShrink: 0 }}
          >
            ارسال
          </WiredButton>
        </span>
      </form>
    </div>
  );
};
