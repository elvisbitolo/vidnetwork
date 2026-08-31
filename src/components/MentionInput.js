"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "./MentionInput.module.css";

export default function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
  maxLength,
  disabled,
}) {
  const [query, setQuery] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const fetchRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (fetchRef.current) clearTimeout(fetchRef.current);
    fetchRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/members/mention?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.members || []);
          setShowDropdown((data.members || []).length > 0);
          setActiveIndex(-1);
        }
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setBusy(false);
      }
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (fetchRef.current) clearTimeout(fetchRef.current);
    };
  }, []);

  function detectMention(text, cursorPos) {
    const before = text.slice(0, cursorPos);
    const match = before.match(/@([a-zA-Z0-9_]{0,30})$/);
    if (match) {
      return { start: match.index + 1, query: match[1] };
    }
    return null;
  }

  function handleChange(e) {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    const mention = detectMention(newValue, cursorPos);
    if (mention && mention.query.length >= 1) {
      setQuery(mention);
      fetchSuggestions(mention.query);
    } else {
      setShowDropdown(false);
      setQuery(null);
    }
  }

  function insertMention(member) {
    if (!query || !inputRef.current) return;
    const text = value;
    const before = text.slice(0, query.start - 1);
    const after = text.slice(query.start + query.query.length);
    const insert = member.username || member.name;
    const newText = `${before}@${insert} ${after}`;
    onChange(newText);
    setShowDropdown(false);
    setQuery(null);
    setTimeout(() => {
      const pos = before.length + insert.length + 2;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        insertMention(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.wrapper}>
      <textarea
        ref={inputRef}
        className={`${styles.input} ${className || ""}`}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        disabled={disabled}
      />
      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className={styles.dropdown}>
          {suggestions.map((member, index) => (
            <button
              key={member.uid}
              type="button"
              className={`${styles.suggestion} ${index === activeIndex ? styles.suggestionActive : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className={styles.suggestionAvatar}>
                {member.photoURL ? (
                  <Image
                    src={member.photoURL}
                    alt=""
                    width={28}
                    height={28}
                    className={styles.suggestionImg}
                    unoptimized
                  />
                ) : (
                  (member.name || "?").slice(0, 1).toUpperCase()
                )}
              </span>
              <span className={styles.suggestionInfo}>
                <span className={styles.suggestionName}>{member.name || member.username}</span>
                {member.username && (
                  <span className={styles.suggestionUsername}>@{member.username}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
