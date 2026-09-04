"use client";

import { useState } from "react";
import {
  Armchair,
  BookOpen,
  CakeSlice,
  Camera,
  Check,
  CircleDashed,
  Clover,
  CookingPot,
  Dices,
  Droplets,
  FishingHook,
  Flower2,
  Hammer,
  Hourglass,
  LoaderPinwheel,
  NotebookPen,
  Palette,
  PersonStanding,
  Plus,
  Save,
  Scissors,
  ShoppingBag,
  Sparkles,
  Sprout,
  SquareScissors,
  Tag,
  X,
} from "lucide-react";
import { HOBBIES } from "@/lib/server/profile";
import styles from "./account.module.css";

const HOBBY_ICONS = {
  cooking: CookingPot,
  baking: CakeSlice,
  gardening: Sprout,
  shopping: ShoppingBag,
  thrifting: Tag,
  decoupage: SquareScissors,
  yoga: PersonStanding,
  pottery: Flower2,
  painting: Palette,
  "card games": Clover,
  photography: Camera,
  "board games": Dices,
  antiquing: Hourglass,
  reading: BookOpen,
  scrapbooking: NotebookPen,
  upholstery: Armchair,
  woodworking: Hammer,
  sewing: Scissors,
  dyeing: Droplets,
  spinning: LoaderPinwheel,
  knitting: CircleDashed,
  crochet: FishingHook,
};

function title(value) {
  return value
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function HobbiesForm({ initial, username }) {
  const [selected, setSelected] = useState(() =>
    Array.isArray(initial)
      ? [...new Set(initial.map((h) => String(h || "").trim().toLowerCase()).filter(Boolean))]
      : []
  );
  const [custom, setCustom] = useState([]);
  const [otherValue, setOtherValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const allHobbies = [...new Set([...selected, ...custom])];

  function togglePreset(value) {
    setSaved(false);
    setNotice("");
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function addCustom() {
    const value = otherValue.trim().toLowerCase();
    setError("");
    if (!value) return;
    if (HOBBIES.includes(value)) {
      setOtherValue("");
      if (!selected.includes(value)) setSelected((prev) => [...prev, value]);
      return;
    }
    if (allHobbies.includes(value)) return;
    setCustom((prev) => [...prev, value]);
    setOtherValue("");
  }

  function removeCustom(value) {
    setCustom((prev) => prev.filter((v) => v !== value));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hobbies: allHobbies }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save hobbies");
      }
      setSaved(true);
      setNotice(allHobbies.length ? "Your hobbies are saved." : "You haven't picked any hobbies yet.");
    } catch (err) {
      setError(err.message || "Failed to save hobbies");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={handleSave}>
      <h2 className={styles.cardTitle}>Share your hobbies</h2>
      {username ? (
        <p className={styles.hobbiesIntro}>
          Tell the community a little about what you love to do beyond the yarn. Pick as many as you like
          — members with similar hobbies can find you more easily.
        </p>
      ) : (
        <p className={styles.hobbiesIntro}>
          Tell the community a little about what you love to do beyond the yarn. Pick as many as you like.
        </p>
      )}

      {error && <p className={styles.formError}>{error}</p>}
      {saved && <p className={styles.formSaved}>Saved!</p>}
      {notice && <p className={styles.formNotice}>{notice}</p>}

      <div className={styles.hobbiesGrid}>
        {HOBBIES.map((value) => {
          const Icon = HOBBY_ICONS[value];
          const on = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              className={on ? `${styles.hobbyChip} ${styles.hobbyChipOn}` : styles.hobbyChip}
              onClick={() => togglePreset(value)}
              aria-pressed={on}
            >
              <span className={styles.hobbyIcon}>
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className={styles.hobbyLabel}>{title(value)}</span>
              <span className={styles.hobbyCheck} aria-hidden="true">
                {on && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.otherField}>
        <label className={styles.fieldLabel} htmlFor="hobbies-other">
          Something else?
        </label>
        <div className={styles.otherRow}>
          <input
            id="hobbies-other"
            className={styles.input}
            type="text"
            maxLength={60}
            placeholder="e.g. calligraphy, hiking, journaling…"
            value={otherValue}
            onChange={(e) => setOtherValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button type="button" className={styles.otherAdd} onClick={addCustom}>
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Add
          </button>
        </div>
        <p className={styles.fieldHint}>Type a hobby and press Add — enter as many as you like.</p>
      </div>

      {custom.length > 0 && (
        <div className={styles.customList}>
          {custom.map((value) => (
            <span key={value} className={styles.customChip}>
              <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
              {title(value)}
              <button
                type="button"
                className={styles.customRemove}
                onClick={() => removeCustom(value)}
                aria-label={`Remove ${value}`}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={styles.hobbiesFooter}>
        <span className={styles.hobbiesCount}>
          {allHobbies.length} {allHobbies.length === 1 ? "hobby" : "hobbies"} selected
        </span>
        <button className={styles.manage} type="submit" disabled={busy}>
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {busy ? "Saving…" : "Save hobbies"}
        </button>
      </div>
    </form>
  );
}
