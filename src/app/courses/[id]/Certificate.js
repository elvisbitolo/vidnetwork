"use client";

import { useRef } from "react";
import styles from "./Certificate.module.css";

export default function Certificate({ certificate }) {
  const certRef = useRef(null);

  function handleDownload() {
    const el = certRef.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    const scale = 2;
    const width = 800;
    const height = 560;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#e0d4f7";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 3;
    const cornerSize = 40;

    ctx.beginPath();
    ctx.moveTo(20, 20 + cornerSize);
    ctx.lineTo(20, 20);
    ctx.lineTo(20 + cornerSize, 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, 20);
    ctx.lineTo(width - 20, 20);
    ctx.lineTo(width - 20, 20 + cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(20, height - 20 - cornerSize);
    ctx.lineTo(20, height - 20);
    ctx.lineTo(20 + cornerSize, height - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 20 - cornerSize, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.lineTo(width - 20, height - 20 - cornerSize);
    ctx.stroke();

    ctx.fillStyle = "#7c3aed";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "3px";
    ctx.fillText("CERTIFICATE OF COMPLETION", width / 2, 80);

    ctx.fillStyle = "#17171c";
    ctx.font = "800 28px system-ui, sans-serif";
    ctx.fillText(certificate.courseTitle || "Course", width / 2, 130);

    ctx.fillStyle = "#6b6b7b";
    ctx.font = "400 14px system-ui, sans-serif";
    ctx.fillText("awarded to", width / 2, 175);

    ctx.fillStyle = "#34344a";
    ctx.font = "600 20px system-ui, sans-serif";
    ctx.fillText(certificate.userName || "Member", width / 2, 210);

    ctx.fillStyle = "#9b9bab";
    ctx.font = "400 13px system-ui, sans-serif";
    const completedDate = certificate.completedAt
      ? new Date(certificate.completedAt).toLocaleDateString([], {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    ctx.fillText(`Completed on ${completedDate}`, width / 2, 250);

    ctx.fillStyle = "#7c3aed";
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.fillText(certificate.certificateNumber || "", width / 2, 490);

    const link = document.createElement("a");
    link.download = `certificate-${certificate.certificateNumber || "yc"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!certificate) return null;

  const completedDate = certificate.completedAt
    ? new Date(certificate.completedAt).toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={styles.certificate} ref={certRef}>
      <div className={styles.certificateDecorative} />
      <div className={`${styles.certificateCorner} ${styles.certificateCornerTl}`} />
      <div className={`${styles.certificateCorner} ${styles.certificateCornerTr}`} />
      <div className={`${styles.certificateCorner} ${styles.certificateCornerBl}`} />
      <div className={`${styles.certificateCorner} ${styles.certificateCornerBr}`} />

      <p className={styles.certificateLabel}>Certificate of Completion</p>
      <h2 className={styles.certificateTitle}>{certificate.courseTitle}</h2>
      <p className={styles.certificateSubtitle}>Yarnefy Lounge Course</p>
      <p className={styles.certificateMember}>Awarded to {certificate.userName}</p>
      <p className={styles.certificateDate}>Completed on {completedDate}</p>
      <p className={styles.certificateNumber}>{certificate.certificateNumber}</p>
      <button className={styles.downloadBtn} onClick={handleDownload}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        Download
      </button>
    </div>
  );
}
