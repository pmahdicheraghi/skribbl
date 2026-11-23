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
  // Focus/blur handlers live inside the effect below (they need the locked
  // height closure); the component exposes them through these refs.
  const handleInputFocus = useRef<() => void>(() => {});
  const handleInputBlur = useRef<() => void>(() => {});

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

  // Mobile keyboard handling.
  //
  // The game screen is locked to the full (pre-keyboard) viewport height via
  // --locked-vh, so the keyboard overlays it and the canvas never moves.
  // While the keyboard is open, the chat input row is floated to the top edge
  // of the visual viewport (i.e. just above the keyboard).
  //
  // The critical part is handleFocus: the row is floated synchronously on
  // focus, BEFORE the keyboard finishes opening. Safari's "scroll focused
  // element into view" runs after the keyboard animation, and by then the
  // input is already high on screen — so iOS never pans the visual viewport
  // (which would push the canvas off screen). Floating only on viewport
  // events (the previous approach) was always too late to stop that pan.
  useEffect(() => {
    const vv = window.visualViewport;
    const MOBILE_MAX = 768;

    let lockedHeight = window.innerHeight;
    let lastWidth = window.innerWidth;
    let keyboardOpen = false;
    let blurTimer: number | undefined;

    const lock = (height: number) => {
      lockedHeight = height;
      document.documentElement.style.setProperty('--locked-vh', `${height}px`);
    };

    lock(window.innerHeight);

    const rowHeight = () =>
      Math.round(inputRowRef.current?.getBoundingClientRect().height || 52);

    const isInputFocused = () => {
      const active = document.activeElement;
      const row = inputRowRef.current;
      return !!active && !!row && (active === row || row.contains(active));
    };

    const floatAt = (top: number) => {
      const wrapper = chatWrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      setPlaceholderHeight(rowHeight());
      setFloatingStyle({
        position: 'fixed',
        top: `${Math.max(0, Math.round(top))}px`,
        left: `${Math.round(rect.left)}px`,
        width: `${Math.round(rect.width)}px`,
        zIndex: 900
      });
    };

    const unfloat = () => {
      setPlaceholderHeight(0);
      setFloatingStyle(null);
    };

    const handleFocus = () => {
      if (window.innerWidth > MOBILE_MAX) return;
      const vh = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;

      if (lockedHeight - vh > 120) {
        // Keyboard already open (e.g. quick refocus): pin above it exactly.
        keyboardOpen = true;
        floatAt(offsetTop + vh - rowHeight() - 4);
        return;
      }

      // Pre-empt the keyboard: estimate how much of the viewport it will
      // cover and park the input above that line right now. If the guess is
      // slightly off, reposition() snaps the row to the real keyboard top
      // as soon as the visual viewport resizes. Landscape keyboards are much
      // taller relative to the (short) viewport, hence the higher ratio.
      const portrait = window.innerWidth <= window.innerHeight;
      const expectedKeyboard = vh * (portrait ? 0.42 : 0.72);
      floatAt(vh - expectedKeyboard - rowHeight() - 4);
    };

    const handleBlur = () => {
      if (window.innerWidth > MOBILE_MAX) return;
      // Don't drop the row back into its flow position while the keyboard is
      // still closing (it would flash behind the keyboard). Give it a short
      // grace period; reposition() restores it as soon as the viewport grows.
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        if (!isInputFocused()) {
          keyboardOpen = false;
          unfloat();
          lock(window.innerHeight);
        }
      }, 400);
    };

    const reposition = () => {
      if (window.innerWidth > MOBILE_MAX) {
        if (keyboardOpen) {
          keyboardOpen = false;
          unfloat();
        }
        if (window.innerHeight > lockedHeight) {
          lock(window.innerHeight);
        }
        return;
      }

      if (window.innerWidth !== lastWidth) {
        // Orientation change: re-lock to the new full height.
        lastWidth = window.innerWidth;
        lock(window.innerHeight);
      } else if (!keyboardOpen && window.innerHeight > lockedHeight) {
        // Browser chrome (e.g. iOS toolbars) expanded the viewport.
        lock(window.innerHeight);
      }

      const vh = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      const keyboardHeight = lockedHeight - vh;

      if (keyboardHeight > 120) {
        // Keyboard visible: pin the row right above it.
        keyboardOpen = true;
        window.clearTimeout(blurTimer);
        floatAt(offsetTop + vh - rowHeight() - 4);
      } else if (keyboardOpen) {
        // Keyboard fully closed: restore the normal layout.
        keyboardOpen = false;
        window.clearTimeout(blurTimer);
        unfloat();
        if (!isInputFocused()) {
          lock(window.innerHeight);
        }
      }
    };

    vv?.addEventListener('resize', reposition);
    vv?.addEventListener('scroll', reposition);
    window.addEventListener('resize', reposition);

    handleInputFocus.current = handleFocus;
    handleInputBlur.current = handleBlur;

    return () => {
      window.clearTimeout(blurTimer);
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
          enterKeyHint="send"
          onFocus={() => handleInputFocus.current()}
          onBlur={() => handleInputBlur.current()}
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
