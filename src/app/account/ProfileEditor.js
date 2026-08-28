"use client";

import { useRef, useState } from "react";
import styles from "./account.module.css";

function normalize(value) {
  return (value || "").trim();
}

const LIMITS = { name: 60, headline: 120, location: 80, country: 60, state: 60, bio: 600, yarn: 80, hook: 40, project: 140 };

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function resizeImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height, 1);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export default function ProfileEditor({ initial }) {
  const [name, setName] = useState(initial.name || "");
  const [headline, setHeadline] = useState(initial.headline || "");
  const [location, setLocation] = useState(initial.location || "");
  const [country, setCountry] = useState(initial.country || "");
  const [state, setState] = useState(initial.state || "");
  const [bio, setBio] = useState(initial.bio || "");
  const [favoriteColors, setFavoriteColors] = useState(
    Array.isArray(initial.favoriteColors) && initial.favoriteColors.length
      ? initial.favoriteColors
      : ["#8b5cf6", "#ec4899", "#10b981"]
  );
  const [goToYarn, setGoToYarn] = useState(initial.goToYarn || "");
  const [favoriteHookSize, setFavoriteHookSize] = useState(initial.favoriteHookSize || "");
  const [crafts, setCrafts] = useState(Array.isArray(initial.crafts) ? initial.crafts : []);
  const [proudestProject, setProudestProject] = useState(initial.proudestProject || "");
  const [bestGiftProject, setBestGiftProject] = useState(initial.bestGiftProject || "");
  const [socialLinks, setSocialLinks] = useState(
    Array.isArray(initial.socialLinks) && initial.socialLinks.length
      ? initial.socialLinks
      : [{ platform: "website", url: "" }]
  );
  const [photoURL, setPhotoURL] = useState(initial.photoURL || "");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, etc.).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be 8 MB or smaller.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoURL: dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save photo");
      }
      setPhotoURL(dataUrl);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoURL: "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove photo");
      }
      setPhotoURL("");
      setNotice("Profile photo removed.");
    } catch (err) {
      setError(err.message || "Failed to remove photo");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setNotice("");

    const cleanName = normalize(name);
    if (!cleanName) {
      setError("Name is required.");
      return;
    }
    if (cleanName.length > LIMITS.name) {
      setError(`Name must be ${LIMITS.name} characters or fewer.`);
      return;
    }
    if (normalize(headline).length > LIMITS.headline) {
      setError(`Headline must be ${LIMITS.headline} characters or fewer.`);
      return;
    }
    if (normalize(location).length > LIMITS.location) {
      setError(`Location must be ${LIMITS.location} characters or fewer.`);
      return;
    }
    if (normalize(country).length > LIMITS.country) {
      setError(`Country must be ${LIMITS.country} characters or fewer.`);
      return;
    }
    if (normalize(state).length > LIMITS.state) {
      setError(`State must be ${LIMITS.state} characters or fewer.`);
      return;
    }
    if (normalize(bio).length > LIMITS.bio) {
      setError(`About you must be ${LIMITS.bio} characters or fewer.`);
      return;
    }
    if (normalize(goToYarn).length > LIMITS.yarn) {
      setError(`Go-to yarn must be ${LIMITS.yarn} characters or fewer.`);
      return;
    }
    if (normalize(favoriteHookSize).length > LIMITS.hook) {
      setError(`Favorite hook size must be ${LIMITS.hook} characters or fewer.`);
      return;
    }
    if (normalize(proudestProject).length > LIMITS.project) {
      setError(`Proudest project must be ${LIMITS.project} characters or fewer.`);
      return;
    }
    if (normalize(bestGiftProject).length > LIMITS.project) {
      setError(`Best gifting project must be ${LIMITS.project} characters or fewer.`);
      return;
    }

    const patch = {};
    if (cleanName !== normalize(initial.name)) patch.name = cleanName;
    const cleanHeadline = normalize(headline);
    if (cleanHeadline !== normalize(initial.headline)) patch.headline = cleanHeadline;
    const cleanLocation = normalize(location);
    if (cleanLocation !== normalize(initial.location)) patch.location = cleanLocation;
    const cleanCountry = normalize(country);
    if (cleanCountry !== normalize(initial.country)) patch.country = cleanCountry;
    const cleanState = normalize(state);
    if (cleanState !== normalize(initial.state)) patch.state = cleanState;
    const cleanBio = normalize(bio);
    if (cleanBio !== normalize(initial.bio)) patch.bio = cleanBio;

    const cleanColors = favoriteColors.slice(0, 3);
    if (JSON.stringify(cleanColors) !== JSON.stringify(initial.favoriteColors || [])) {
      patch.favoriteColors = cleanColors;
    }
    const cleanYarn = normalize(goToYarn);
    if (cleanYarn !== normalize(initial.goToYarn)) patch.goToYarn = cleanYarn;
    const cleanHook = normalize(favoriteHookSize);
    if (cleanHook !== normalize(initial.favoriteHookSize)) patch.favoriteHookSize = cleanHook;
    if (JSON.stringify(crafts) !== JSON.stringify(initial.crafts || [])) patch.crafts = crafts;
    const cleanProud = normalize(proudestProject);
    if (cleanProud !== normalize(initial.proudestProject)) patch.proudestProject = cleanProud;
    const cleanGift = normalize(bestGiftProject);
    if (cleanGift !== normalize(initial.bestGiftProject)) patch.bestGiftProject = cleanGift;

    const cleanSocial = socialLinks
      .filter((l) => normalize(l.url))
      .map((l) => ({ platform: normalize(l.platform) || "other", url: normalize(l.url) }));
    if (JSON.stringify(cleanSocial) !== JSON.stringify(initial.socialLinks || [])) {
      patch.socialLinks = cleanSocial;
    }

    if (Object.keys(patch).length === 0) {
      setNotice("No changes to save.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  function setColor(index, value) {
    setFavoriteColors((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  return (
    <form className={styles.card} id="profile" onSubmit={handleSave}>
      <h2 className={styles.cardTitle}>Edit profile</h2>
      {error && <p className={styles.formError}>{error}</p>}
      {saved && <p className={styles.formSaved}>Profile saved.</p>}
      {notice && <p className={styles.formNotice}>{notice}</p>}
      <div className={styles.avatarRow}>
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatarImg} src={photoURL} alt="Profile" />
        ) : (
          <span className={styles.avatarImg}>{initials(name || initial.name)}</span>
        )}
        <div className={styles.avatarControls}>
          <div className={styles.avatarButtons}>
            <button
              type="button"
              className={styles.avatarButton}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            {photoURL && (
              <button
                type="button"
                className={`${styles.avatarButton} ${styles.avatarRemove}`}
                disabled={busy}
                onClick={handleRemovePhoto}
              >
                Remove photo
              </button>
            )}
          </div>
          <p className={styles.avatarHint}>
            {initial.photoURL
              ? "This photo came from your Google/Gmail account. Upload a new one to replace it."
              : "Your Google/Gmail profile photo is used automatically. You can upload your own image."}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhoto}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-name">Name</label>
        <input
          id="profile-name"
          className={styles.input}
          type="text"
          required
          maxLength={LIMITS.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-headline">Headline</label>
        <input
          id="profile-headline"
          className={styles.input}
          type="text"
          maxLength={LIMITS.headline}
          placeholder="e.g. Yoga teacher · mom of two"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-location">City / area</label>
        <input
          id="profile-location"
          className={styles.input}
          type="text"
          maxLength={LIMITS.location}
          placeholder="e.g. Austin"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="profile-state">State / region</label>
          <input
            id="profile-state"
            className={styles.input}
            type="text"
            maxLength={LIMITS.state}
            placeholder="e.g. Texas"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="profile-country">Country</label>
          <input
            id="profile-country"
            className={styles.input}
            type="text"
            maxLength={LIMITS.country}
            placeholder="e.g. United States"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-bio">About you</label>
        <textarea
          id="profile-bio"
          className={styles.textarea}
          rows={3}
          maxLength={LIMITS.bio}
          placeholder="Tell the community a little about yourself…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <h3 className={styles.sectionTitle}>Social links</h3>
      <p className={styles.fieldHint} style={{ marginTop: -8, marginBottom: 12 }}>
        Add your other social profiles so members can connect with you.
      </p>
      {socialLinks.map((link, i) => (
        <div key={i} className={styles.socialRow}>
          <select
            className={styles.socialSelect}
            value={link.platform}
            onChange={(e) => {
              setSocialLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, platform: e.target.value } : l)));
            }}
          >
            <option value="website">Website</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
            <option value="twitter">X / Twitter</option>
            <option value="etsy">Etsy</option>
            <option value="pinterest">Pinterest</option>
            <option value="ravelry">Ravelry</option>
            <option value="other">Other</option>
          </select>
          <input
            className={styles.socialInput}
            type="url"
            placeholder="https://…"
            maxLength={300}
            value={link.url}
            onChange={(e) => {
              setSocialLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, url: e.target.value } : l)));
            }}
          />
          {socialLinks.length > 1 && (
            <button
              type="button"
              className={styles.socialRemove}
              onClick={() => setSocialLinks((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove link"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {socialLinks.length < 8 && (
        <button
          type="button"
          className={styles.socialAdd}
          onClick={() => setSocialLinks((prev) => [...prev, { platform: "website", url: "" }])}
        >
          + Add another link
        </button>
      )}

      <h3 className={styles.sectionTitle}>Your yarn story</h3>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Crafts you practice</label>
        <div className={styles.craftChips}>
          {[
            { value: "crochet", label: "Crochet" },
            { value: "knitting", label: "Knitting" },
            { value: "weaving", label: "Weaving" },
            { value: "spinning", label: "Spinning" },
            { value: "dyeing", label: "Dyeing" },
            { value: "embroidery", label: "Embroidery" },
            { value: "macrame", label: "Macrame" },
          ].map((c) => {
            const selected = crafts.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                className={selected ? `${styles.craftChip} ${styles.craftChipActive}` : styles.craftChip}
                onClick={() =>
                  setCrafts((prev) =>
                    selected ? prev.filter((v) => v !== c.value) : [...prev, c.value]
                  )
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <p className={styles.fieldHint}>Pick the crafts you love so members can find you.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Favorite 3 colors</label>
        <div className={styles.colorRow}>
          {favoriteColors.map((color, i) => (
            <div key={i} className={styles.colorWheel}>
              <div className={styles.wheelRing}>
                <span className={styles.wheelFace} style={{ background: color }} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(i, e.target.value)}
                  aria-label={`Favorite color ${i + 1}`}
                  disabled={busy}
                />
              </div>
              <span className={styles.wheelLabel}>{i + 1}</span>
            </div>
          ))}
        </div>
        <p className={styles.fieldHint}>Tap a wheel to pick your favorite yarn colors.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-yarn">Go-to yarn choice</label>
        <input
          id="profile-yarn"
          className={styles.input}
          type="text"
          maxLength={LIMITS.yarn}
          placeholder="e.g. Cascade 220, merino worsted…"
          value={goToYarn}
          onChange={(e) => setGoToYarn(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-hook">Favorite hook size</label>
        <input
          id="profile-hook"
          className={styles.input}
          type="text"
          maxLength={LIMITS.hook}
          placeholder="e.g. 5.0mm (H)"
          value={favoriteHookSize}
          onChange={(e) => setFavoriteHookSize(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-proud">Project you&apos;re most proud of</label>
        <input
          id="profile-proud"
          className={styles.input}
          type="text"
          maxLength={LIMITS.project}
          placeholder="e.g. A fair-isle sweater I made for my mum"
          value={proudestProject}
          onChange={(e) => setProudestProject(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-gift">Best project for gifting</label>
        <input
          id="profile-gift"
          className={styles.input}
          type="text"
          maxLength={LIMITS.project}
          placeholder="e.g. Baby blankets — always a hit"
          value={bestGiftProject}
          onChange={(e) => setBestGiftProject(e.target.value)}
        />
      </div>

      <button className={styles.manage} type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
