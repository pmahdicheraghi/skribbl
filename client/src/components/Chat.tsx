import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../../shared/types.js';
import { WiredButton, WiredInput } from 'wired-elements-react';
import { RoughSpeechBubble } from './rough/RoughSpeechBubble.js';
import { RoughBanner } from './rough/RoughBanner.js';
import { RoughBox } from './rough/RoughBox.js';
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

  // Mobile keyboard handling — deliberately simple.
  //
  // The game screen is locked to the full (pre-keyboard) viewport height via
  // --locked-vh, so the keyboard overlays it and the canvas never moves.
  // When the on-screen keyboard opens, the visual viewport shrinks; we take
  // that diff and move the chat input up by exactly that amount, so its
  // bottom edge sits directly on the keyboard's top edge. When the keyboard
  // closes, the diff returns to zero and the input goes back to its normal
  // place in the chat.
  useEffect(() => {
    const vv = window.visualViewport;
    const MOBILE_MAX = 768;

    let lockedHeight = window.innerHeight;
    let lastWidth = window.innerWidth;

    const lock = (height: number) => {
      lockedHeight = height;
      document.documentElement.style.setProperty('--locked-vh', `${height}px`);
    };

    lock(window.innerHeight);

    const rowHeight = () =>
      Math.round(inputRowRef.current?.getBoundingClientRect().height || 52);

    const unfloat = () => {
      setPlaceholderHeight(0);
      setFloatingStyle(null);
    };

    const reposition = () => {
      if (window.innerWidth > MOBILE_MAX) {
        unfloat();
        if (window.innerHeight > lockedHeight) {
          lock(window.innerHeight);
        }
        return;
      }

      if (window.innerWidth !== lastWidth) {
        // Orientation change: re-lock to the new full height.
        lastWidth = window.innerWidth;
        lock(window.innerHeight);
      } else if (window.innerHeight > lockedHeight) {
        // Browser chrome (e.g. iOS toolbars) expanded the viewport.
        lock(window.innerHeight);
      }

      const vh = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      // The diff: how much of the screen the keyboard is covering.
      const keyboardHeight = lockedHeight - vh;

      if (keyboardHeight > 120) {
        // Keyboard open: move the input up by exactly the keyboard height.
        const wrapper = chatWrapperRef.current;
        if (!wrapper) return;
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
        const rect = wrapper.getBoundingClientRect();
        setPlaceholderHeight(rowHeight());
        setFloatingStyle({
          position: 'fixed',
          top: `${Math.max(0, Math.round(offsetTop + vh - rowHeight()))}px`,
          // Pin the strip to the bottom of the layout viewport: the paper
          // background runs from the input row down into the keyboard area,
          // so the bar looks anchored instead of floating in mid-air.
          bottom: 0,
          left: `${Math.round(rect.left)}px`,
          width: `${Math.round(rect.width)}px`,
          zIndex: 900
        });
      } else {
        // Keyboard closed (or not open): back to the normal layout.
        unfloat();
      }
    };

    vv?.addEventListener('resize', reposition);
    vv?.addEventListener('scroll', reposition);
    window.addEventListener('resize', reposition);

    return () => {
      vv?.removeEventListener('resize', reposition);
      vv?.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
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

  const inputControls = (
    <>
      <WiredInput
        value={inputText}
        onChange={(e: any) => {
          const val = e.target?.value ?? e.detail?.sourceEvent?.target?.value ?? '';
          setInputText(val);
        }}
        placeholder={getPlaceholder()}
        disabled={isDrawer}
        enterKeyHint="send"
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
    </>
  );

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
        {/*
          The RoughBox wrapper must ALWAYS be rendered. If we only wrap the
          input while floating, React swaps element types on the first focus
          render and remounts the wired-input — destroying the focused DOM
          node, dropping focus, and cancelling the keyboard (the "keyboard
          doesn't open until the second tap" bug). Keeping the tree shape
          identical in both states preserves the focused element.
        */}
        <RoughBox
          stroke={isFloating ? '#2b2b2b' : 'transparent'}
          strokeWidth={isFloating ? 1.4 : 0}
          fill={isFloating ? '#ffffff' : undefined}
          style={{ width: '100%', margin: isFloating ? '2px 0 4px' : 0 }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px' }}>
            {inputControls}
          </div>
        </RoughBox>
      </form>
    </div>
  );
};
