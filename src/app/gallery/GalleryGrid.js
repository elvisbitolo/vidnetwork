"use client";

import { useState } from "react";
import Link from "next/link";
import StickerPicker from "@/components/StickerPicker";
import styles from "./gallery.module.css";

export default function GalleryGrid({ photos }) {
  const [modal, setModal] = useState(null);

  if (photos.length === 0) {
    return (
      <p style={{ color: "#9b9bab", fontSize: 14 }}>
        No photos posted yet. Share something in the feed to see it here.
      </p>
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            className={styles.cell}
            style={{ animationDelay: `${(i % 12) * 0.35}s` }}
            onClick={() => setModal(photo)}
            aria-label={`Photo by ${photo.authorName}`}
          >
            <span className={styles.circle}>
              <img
                className={styles.img}
                src={photo.imageUrl}
                alt={photo.text || "Photo"}
                loading="lazy"
              />
            </span>
          </button>
        ))}
      </div>

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setModal(null)} aria-label="Close">
              ✕
            </button>
            <div className={styles.modalImage}>
              <img src={modal.imageUrl} alt={modal.text || "Photo"} />
            </div>
            {modal.text && <p className={styles.modalText}>{modal.text}</p>}
            <div className={styles.modalMeta}>
              <Link
                className={styles.modalAuthor}
                href={`/members/${modal.authorId}`}
                onClick={() => setModal(null)}
              >
                {modal.authorName}
              </Link>
              <span className={styles.modalDate}>
                {new Date(modal.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className={styles.modalActions}>
              <Link
                className={styles.actionBtn}
                href={`/members/${modal.authorId}`}
                onClick={() => setModal(null)}
              >
                View profile
              </Link>
              <Link
                className={styles.actionBtn}
                href={`/chat?with=${modal.authorId}`}
                onClick={() => setModal(null)}
              >
                Message
              </Link>
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <StickerPicker toUid={modal.authorId} toName={modal.authorName} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
