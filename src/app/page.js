import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LandingNav from "@/components/LandingNav";
import Reveal from "@/components/Reveal";
import ThemePicker from "@/components/ThemePicker";
import HeroSlideshow from "@/components/HeroSlideshow";
import {
  BookIcon,
  CheckIcon,
  PlayIcon,
  ClockIcon,
  TrophyIcon,
  ZapIcon,
  StarIcon,
} from "@/components/LandingIcons";
import {
  Video,
  MessagesSquare,
  GraduationCap,
  CalendarDays,
  Award,
  FileText,
  Mic,
  MicOff,
  MonitorUp,
  Hand,
  SmilePlus,
  Users,
  MessageCircle,
  Settings,
  MoreHorizontal,
  LogOut,
  Captions,
  SendHorizontal,
  Paperclip,
  Smile,
  Heart,
  MessageSquareReply,
  AtSign,
  ShieldCheck,
  Crown,
  Gem,
  Check,
  UserPlus,
  DoorOpen,
  FolderPlus,
  Radio,
  Sparkles,
} from "lucide-react";
import FeatureIconCard from "@/components/FeatureIconCard";
import styles from "./page.module.css";

export const metadata = {
  title: "Secret Yarnery — Connect, Learn & Grow Together",
  description:
    "Secret Yarnery is a paid membership community with live video rooms, courses, events, gamification and real conversations — connect, learn and grow together in one place.",
  keywords: ["community platform", "membership site", "live video rooms", "online courses", "gamification", "creator community", "learn together"],
  authors: [{ name: "Secret Yarnery" }],
  openGraph: {
    title: "Secret Yarnery — Connect, Learn & Grow Together",
    description:
      "Live communities, courses, events, gamification and real conversations — all in one place.",
    url: "https://yarnerylounge.vercel.app",
    siteName: "Secret Yarnery",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1734,
        height: 907,
        alt: "Secret Yarnery — Connect, Learn & Grow Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Secret Yarnery — Connect, Learn & Grow Together",
    description:
      "Live communities, courses, events, gamification and real conversations — all in one place.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://yarnerylounge.vercel.app",
  },
};

const FEATURES = [
  {
    icon: Video,
    accent: "red",
    name: "feature1Title",
    desc: "feature1Desc",
    tag: "feature1Tag",
  },
  {
    icon: MessagesSquare,
    accent: "blue",
    name: "feature2Title",
    desc: "feature2Desc",
    tag: "feature2Tag",
  },
  {
    icon: GraduationCap,
    accent: "green",
    name: "feature3Title",
    desc: "feature3Desc",
    tag: "feature3Tag",
  },
  {
    icon: CalendarDays,
    accent: "orange",
    name: "feature4Title",
    desc: "feature4Desc",
    tag: "feature4Tag",
  },
  {
    icon: Award,
    accent: "purple",
    name: "feature5Title",
    desc: "feature5Desc",
    tag: "feature5Tag",
  },
  {
    icon: FileText,
    accent: "cyan",
    name: "feature7Title",
    desc: "feature7Desc",
    tag: "feature7Tag",
  },
];

const CROCHET_IMAGES = [
  { src: "/images/crochet/shop_interior_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/product_closeup_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/product_closeup_02.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/product_closeup_03.jpeg", alt: "Crochet work" },
];

const ROOM_PARTICIPANTS = [
  { nameKey: "pHost", role: "host", mic: "on", speaking: true },
  { nameKey: "pMaya", role: "speaker", mic: "on", speaking: false, handRaised: true },
  { nameKey: "pRenee", role: "speaker", mic: "off", speaking: false },
  { nameKey: "pAmara", role: "speaker", mic: "on", speaking: false },
  { nameKey: "pDana", role: "speaker", mic: "off", speaking: false },
  { nameKey: "pMe", role: "you", mic: "on", speaking: false },
];

const ROOM_CHAT = [
  { key: "chatMsg1", from: "pHost", me: false, host: true, ts: "ts0", reactions: { heart: 3 } },
  { key: "chatMsg2", from: "pMe", me: true, ts: "ts0", mention: "pMaya" },
  { key: "chatMsg3", from: "pAmara", me: false, ts: "ts2", replyFrom: "pMe", reactions: { heart: 2, thumbs: 1 } },
  { key: "chatMsg4", from: "pRenee", me: false, ts: "ts5", host: false },
];

const ROOM_MODERATION = [
  { key: "modMute" },
  { key: "modRemove" },
  { key: "modInvite" },
  { key: "modMakeSpeaker" },
  { key: "modRemoveSpeaker" },
  { key: "modEndStream" },
  { key: "modManageChat" },
];

export default function Home() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Secret Yarnery",
      url: "https://yarnerylounge.vercel.app",
      logo: "https://yarnerylounge.vercel.app/icon-192.png",
      description:
        "A paid membership community with live video rooms, courses, events, gamification and real conversations.",
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hello@yarnerylounge.vercel.app",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Secret Yarnery",
      url: "https://yarnerylounge.vercel.app",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://yarnerylounge.vercel.app/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Secret Yarnery Community Membership",
      description: "Access to live video rooms, courses, events, gamification and a community of creators.",
      image: "https://yarnerylounge.vercel.app/images/crochet/product_closeup_01.jpeg",
      brand: {
        "@type": "Brand",
        name: "Secret Yarnery",
      },
      offers: [
        {
          "@type": "Offer",
          name: "Standard Monthly",
          price: "9",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: "https://yarnerylounge.vercel.app/signup",
        },
        {
          "@type": "Offer",
          name: "Premium Monthly",
          price: "19",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: "https://yarnerylounge.vercel.app/signup",
        },
      ],
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "US",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
        refundType: "https://schema.org/FullRefund",
      },
    },
  ];

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <ThemePicker />

      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <HeroSlideshow
          images={[{ src: "/images/crochet/model_in_shop_03.jpeg", alt: "Crochet work" }]}
        >
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              {t("liveCommunities")}
            </span>
            <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
            <p className={styles.heroSub}>{t("heroSub")}</p>
            <div className={styles.heroCtas}>
              <Link className={styles.primary} href="/signup">
                {t("joinYarneryLounge")}
              </Link>
              <Link className={styles.secondary} href="/explore">
                {t("exploreCommunity")}
              </Link>
            </div>
          </div>
        </HeroSlideshow>
      </section>

      {/* ─── Marquee ─── */}
      <section className={styles.marqueeSection} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          <div className={styles.marqueeGroup}>
            <span>{t("rooms")}</span>
            <em>{'✦'}</em>
            <span>{t("courses")}</span>
            <em>{'✦'}</em>
            <span>{t("events")}</span>
            <em>{'✦'}</em>
            <span>{t("community")}</span>
            <em>{'✦'}</em>
            <span>{t("learnAtOwnPace")}</span>
            <em>{'✦'}</em>
            <span>{t("meetFaceToFace")}</span>
            <em>{'✦'}</em>
          </div>
          <div className={styles.marqueeGroup}>
            <span>{t("rooms")}</span>
            <em>{'✦'}</em>
            <span>{t("courses")}</span>
            <em>{'✦'}</em>
            <span>{t("events")}</span>
            <em>{'✦'}</em>
            <span>{t("community")}</span>
            <em>{'✦'}</em>
            <span>{t("learnAtOwnPace")}</span>
            <em>{'✦'}</em>
            <span>{t("meetFaceToFace")}</span>
            <em>{'✦'}</em>
          </div>
        </div>
      </section>

      {/* ─── Work Showcase ─── */}
      <section className={styles.showcaseSection} aria-labelledby="showcase-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="showcase-title" className={styles.sectionTitle}>
                {t("whatYouGetTitle")}
              </h2>
              <p className={styles.sectionSub}>{t("whatYouGetDesc")}</p>
            </div>
          </Reveal>
          <div className={styles.showcaseGrid}>
            {CROCHET_IMAGES.map((img, i) => (
              <Reveal key={i}>
                <div className={styles.showcaseItem}>
                  <Image src={img.src} alt={img.alt} className={styles.showcaseImg} width={250} height={250} sizes="(max-width: 720px) 50vw, (max-width: 1100px) 33vw, 25vw" loading="lazy" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What you get ─── */}
      <section className={styles.featuresSection} aria-labelledby="features-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="features-title" className={styles.sectionTitle}>
                {t("whatYouGetTitle")}
              </h2>
              <p className={styles.sectionSub}>{t("whatYouGetDesc")}</p>
            </div>
          </Reveal>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <Reveal key={feature.name}>
                <FeatureIconCard
                  icon={feature.icon}
                  accent={feature.accent}
                  title={t(feature.name)}
                  desc={t(feature.desc)}
                  tag={t(feature.tag)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Live Rooms showcase ─── */}
      <section className={styles.showcaseSection} aria-labelledby="rooms-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="rooms-title" className={styles.sectionTitle}>
                {t("meetFaceToFace")}
              </h2>
              <p className={styles.sectionSub}>{t("meetFaceToFaceDesc")}</p>
            </div>
          </Reveal>
          <Reveal>
            <div
              className={styles.room}
              role="img"
              aria-label={t("roomAria")}
            >
              {/* Header */}
              <div className={styles.roomHead}>
                <div className={styles.roomHeadCopy}>
                  <h3 className={styles.roomTitle}>{t("communityRoom")}</h3>
                  <p className={styles.roomDesc}>{t("roomDesc")}</p>
                </div>
                <div className={styles.roomMeta}>
                  <span className={styles.recordChip}>
                    <span className={styles.recordDot} aria-hidden="true" />
                    {t("recording")}
                  </span>
                  <span className={styles.liveBadge}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {t("live")}
                  </span>
                  <span className={styles.viewers}>
                    <Users size={15} aria-hidden="true" />
                    {t("viewers")}
                  </span>
                </div>
              </div>

              {/* Speaker stage */}
              <div className={styles.stage}>
                <div className={styles.stageGrid}>
                  {ROOM_PARTICIPANTS.map((p, i) => (
                    <div
                      key={p.nameKey + i}
                      className={[
                        styles.person,
                        p.role === "you" ? styles.personYou : "",
                        p.speaking ? styles.personSpeaking : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className={styles.personAvatar} aria-hidden="true">
                        <span className={styles.personInitial}>{t(p.nameKey).charAt(0)}</span>
                      </span>
                      {p.role === "host" && (
                        <span className={styles.roleHost}>
                          <ShieldCheck size={13} aria-hidden="true" />
                          {t("host")}
                        </span>
                      )}
                      {p.role === "you" && <span className={styles.roleYou}>{t("you")}</span>}
                      <span className={styles.personName}>{t(p.nameKey)}</span>
                      {p.speaking && (
                        <span className={styles.speakingBar} aria-hidden="true">
                          <span className={styles.speakingEqBar} />
                          <span className={styles.speakingEqBar} />
                          <span className={styles.speakingEqBar} />
                        </span>
                      )}
                      <span className={p.mic === "off" ? `${styles.personStatus} ${styles.personStatusMuted}` : styles.personStatus}>
                        {p.handRaised ? (
                          <span className={styles.handChip}>
                            <Hand size={13} aria-hidden="true" /> {t("raisedHand")}
                          </span>
                        ) : p.mic === "off" ? (
                          <MicOff size={14} aria-hidden="true" />
                        ) : (
                          <Mic size={14} aria-hidden="true" />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live chat (full width) */}
              <div className={styles.chat}>
                <div className={styles.chatHead}>
                  <div className={styles.chatHeadLeft}>
                    <MessageCircle size={17} aria-hidden="true" />
                    <span className={styles.chatTitle}>{t("liveChat")}</span>
                    <span className={styles.chatCount}>{t("chatJoiners")}</span>
                  </div>
                  <span className={styles.captionsChip}>
                    <Captions size={15} aria-hidden="true" />
                    {t("captionsOn")}
                  </span>
                </div>
                <div className={styles.chatMsgs}>
                  {ROOM_CHAT.map((m) => (
                    <div
                      key={m.key}
                      className={m.me ? `${styles.row} ${styles.rowMe}` : styles.row}
                    >
                      <span className={styles.rowAvatar} aria-hidden="true">
                        {t(m.from).charAt(0)}
                      </span>
                      <div className={styles.bubbleWrap}>
                        <div className={styles.rowMeta}>
                          <span className={styles.rowName}>{t(m.from)}</span>
                          {m.host && <span className={styles.badgeHost}>{t("host")}</span>}
                          {m.me && <span className={styles.badgeYou}>{t("you")}</span>}
                          <span className={styles.rowTime}>{t(m.ts)}</span>
                        </div>
                        <div className={m.me ? `${styles.bubble} ${styles.bubbleMe}` : styles.bubble}>
                          {m.replyFrom && (
                            <div className={styles.reply}>
                              <MessageSquareReply size={12} aria-hidden="true" />
                              {t("replyingTo", { name: t(m.replyFrom) })}
                            </div>
                          )}
                          <p className={styles.bubbleText}>
                            {m.mention && (
                              <span className={styles.mention}>
                                <AtSign size={12} aria-hidden="true" />@{t(m.mention)}
                              </span>
                            )}
                            {t(m.key)}
                          </p>
                          {m.reactions && (
                            <div className={styles.reactions}>
                              {m.reactions.heart ? (
                                <span className={styles.reactionChip}>
                                  <Heart size={12} aria-hidden="true" /> {m.reactions.heart}
                                </span>
                              ) : null}
                              {m.reactions.thumbs ? (
                                <span className={styles.reactionChip}>👍 {m.reactions.thumbs}</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.composer}>
                  <div className={styles.composerSide}>
                    <span className={styles.composerBtn} title={t("ttEmoji")}>
                      <Smile size={17} aria-hidden="true" />
                    </span>
                    <span className={styles.composerBtn} title={t("ttAttach")}>
                      <Paperclip size={17} aria-hidden="true" />
                    </span>
                  </div>
                  <div className={styles.composerInput}>{t("typeMessage")}</div>
                  <div className={styles.composerSide}>
                    <span className={styles.sendBtn} title={t("ttSend")}>
                      <SendHorizontal size={17} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Control bar */}
              <div className={styles.controls}>
                <div className={styles.controlsLeft}>
                  <span className={styles.controlBtn} title={t("ttMic")}>
                    <Mic size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.controlBtn} title={t("ttCam")}>
                    <Video size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.controlBtn} title={t("ttScreen")}>
                    <MonitorUp size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.controlBtn} title={t("ttHand")}>
                    <Hand size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.controlBtn} title={t("ttReactions")}>
                    <SmilePlus size={18} aria-hidden="true" />
                  </span>
                </div>
                <div className={styles.controlsRight}>
                  <span className={styles.controlBtnEmph} title={t("ttParticipants")}>
                    <Users size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.controlBtnEmph} title={t("ttChat")}>
                    <MessageCircle size={18} aria-hidden="true" />
                  </span>
                  <span className={`${styles.controlBtnEmph} ${styles.controlActive}`} title={t("ttSettings")}>
                    <Settings size={18} aria-hidden="true" />
                  </span>
                  <span className={`${styles.controlBtnEmph} ${styles.moreWrap}`}>
                    <MoreHorizontal size={18} aria-hidden="true" />
                    <div className={styles.moreMenu}>
                      <p className={styles.moreMenuTitle}>{t("hostControls")}</p>
                      {ROOM_MODERATION.map((m) => (
                        <span key={m.key} className={styles.moreItem}>
                          {t(m.key)}
                        </span>
                      ))}
                    </div>
                  </span>
                  <span className={`${styles.controlBtn} ${styles.controlLeave}`} title={t("ttLeave")}>
                    <LogOut size={18} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Courses showcase ─── */}
      <section className={styles.showcaseSection} aria-labelledby="courses-title">
        <div className={styles.wrap}>
          <div className={styles.split}>
            <Reveal>
              <div className={styles.splitCopy}>
                <h2 id="courses-title" className={styles.sectionTitle}>
                  {t("learnAtOwnPace")}
                </h2>
                <p className={styles.sectionSub}>{t("learnAtOwnPaceDesc")}</p>
              </div>
            </Reveal>
            <Reveal>
              <div className={styles.learningPanel}>
                <div className={styles.learningHeader}>
                  <span className={styles.learningIcon}>
                    <BookIcon size={18} />
                  </span>
                  <div>
                    <p className={styles.learningTitle}>{t("yourLearningProgress")}</p>
                    <p className={styles.learningSub}>{t("resumeWhereLeftOff")}</p>
                  </div>
                </div>
                <div className={styles.progressTrack} aria-hidden="true">
                  <span className={styles.progressFill} />
                </div>
                <ul className={styles.lessonList}>
                  <li className={`${styles.lessonRow} ${styles.lessonDone}`}>
                    <span className={styles.lessonIcon}>
                      <CheckIcon size={14} />
                    </span>
                    {t("lesson", { number: 1 })}
                    <span className={styles.lessonStatus}>{t("completed")}</span>
                  </li>
                  <li className={`${styles.lessonRow} ${styles.lessonDone}`}>
                    <span className={styles.lessonIcon}>
                      <CheckIcon size={14} />
                    </span>
                    {t("lesson", { number: 2 })}
                    <span className={styles.lessonStatus}>{t("completed")}</span>
                  </li>
                  <li className={`${styles.lessonRow} ${styles.lessonCurrent}`}>
                    <span className={styles.lessonIcon}>
                      <PlayIcon size={13} />
                    </span>
                    {t("lesson", { number: 3 })}
                    <span className={styles.lessonStatus}>{t("current")}</span>
                  </li>
                  <li className={styles.lessonRow}>
                    <span className={`${styles.lessonIcon} ${styles.lessonIconUpcoming}`}>
                      <ClockIcon size={13} />
                    </span>
                    {t("lesson", { number: 4 })}
                    <span className={styles.lessonStatus}>{t("upcoming")}</span>
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Membership tiers showcase ─── */}
      <section className={styles.showcaseSection} aria-labelledby="membership-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="membership-title" className={styles.sectionTitle}>
                {t("membershipTitle")}
              </h2>
              <p className={styles.sectionSub}>{t("membershipDesc")}</p>
            </div>
          </Reveal>
          <Reveal>
            <div className={styles.pricingGrid}>
              {/* Free */}
              <div className={styles.planCard}>
                <div className={styles.planTop}>
                  <p className={styles.planName}>{t("freePlan")}</p>
                  <span className={styles.planMonthly}>{t("membershipMonthly")}</span>
                </div>
                <p className={styles.planPrice}>
                  {t("freePlanPrice")}
                  <span className={styles.planPeriod}>{t("perMonth")}</span>
                </p>
                <ul className={styles.planFeatures}>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureProfile")}</span>
                  </li>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureFinder")}</span>
                  </li>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureEvents")}</span>
                  </li>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureCommunity")}</span>
                  </li>
                </ul>
              </div>

              {/* Yarnery */}
              <div className={styles.planCard}>
                <div className={styles.planTop}>
                  <p className={styles.planName}>Yarnery</p>
                  <span className={styles.planMonthly}>{t("membershipMonthly")}</span>
                </div>
                <p className={styles.planPrice}>
                  {t("planPrice7")}
                  <span className={styles.planPeriod}>{t("perMonth")}</span>
                </p>
                <p className={styles.planIncludes}>{t("includesEverythingInFree")}</p>
                <ul className={styles.planFeatures}>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureLounge")}</span>
                  </li>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureGroups")}</span>
                  </li>
                  <li className={`${styles.planFeature} ${styles.planBadgeFeature}`}>
                    <span className={styles.planBadge} aria-hidden="true">
                      <Crown size={13} strokeWidth={2.25} />
                    </span>
                    <span>{t("planFeatureCrownBadge")}</span>
                  </li>
                </ul>
              </div>

              {/* Lounge */}
              <div className={`${styles.planCard} ${styles.planCardPopular}`}>
                <span className={styles.planPopularTag}>{t("mostPopular")}</span>
                <div className={styles.planTop}>
                  <p className={styles.planName}>Lounge</p>
                  <span className={styles.planMonthly}>{t("membershipMonthly")}</span>
                </div>
                <p className={styles.planPrice}>
                  {t("planPrice18")}
                  <span className={styles.planPeriod}>{t("perMonth")}</span>
                </p>
                <p className={styles.planIncludes}>{t("includesEverythingInOtherPlans")}</p>
                <ul className={styles.planFeatures}>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureOwnGroup")}</span>
                  </li>
                  <li className={styles.planFeature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                    <span>{t("planFeatureOwnLounge")}</span>
                  </li>
                  <li className={`${styles.planFeature} ${styles.planBadgeFeature}`}>
                    <span className={`${styles.planBadge} ${styles.planBadgeDiamond}`} aria-hidden="true">
                      <Gem size={13} strokeWidth={2.25} />
                    </span>
                    <span>{t("planFeatureDiamondBadge")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <p className={styles.membershipNote}>
              <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
              {t("comingSoon")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Gamification showcase ─── */}
      <section className={styles.showcaseSection} aria-labelledby="gamification-title">
        <div className={styles.wrap}>
          <div className={`${styles.split} ${styles.splitReverse}`}>
            <Reveal>
              <div className={styles.splitCopy}>
                <h2 id="gamification-title" className={styles.sectionTitle}>
                  {t("feature5Title")}
                </h2>
                <p className={styles.sectionSub}>{t("feature5Desc")}</p>
              </div>
            </Reveal>
            <Reveal>
              <div className={styles.gamificationPanel}>
                <div className={styles.gamRow}>
                  <div className={styles.gamCard}>
                    <div className={styles.gamCardIcon}>
                      <TrophyIcon size={20} />
                    </div>
                    <div>
                      <p className={styles.gamCardValue}>1,240</p>
                      <p className={styles.gamCardLabel}>Points earned</p>
                    </div>
                  </div>
                  <div className={styles.gamCard}>
                    <div className={styles.gamCardIcon}>
                      <StarIcon size={20} />
                    </div>
                    <div>
                      <p className={styles.gamCardValue}>7</p>
                      <p className={styles.gamCardLabel}>Badges</p>
                    </div>
                  </div>
                  <div className={styles.gamCard}>
                    <div className={styles.gamCardIcon}>
                      <ZapIcon size={20} />
                    </div>
                    <div>
                      <p className={styles.gamCardValue}>12</p>
                      <p className={styles.gamCardLabel}>Day streak</p>
                    </div>
                  </div>
                </div>
                <div className={styles.leaderboard}>
                  <p className={styles.leaderboardTitle}>Leaderboard</p>
                  <div className={styles.lbRow}>
                    <span className={styles.lbRank}>1</span>
                    <span className={styles.lbAvatar} />
                    <span className={styles.lbName}>Sarah M.</span>
                    <span className={styles.lbPoints}>2,840 pts</span>
                  </div>
                  <div className={`${styles.lbRow} ${styles.lbRowActive}`}>
                    <span className={styles.lbRank}>2</span>
                    <span className={styles.lbAvatar} />
                    <span className={styles.lbName}>You</span>
                    <span className={styles.lbPoints}>2,410 pts</span>
                  </div>
                  <div className={styles.lbRow}>
                    <span className={styles.lbRank}>3</span>
                    <span className={styles.lbAvatar} />
                    <span className={styles.lbName}>James K.</span>
                    <span className={styles.lbPoints}>1,980 pts</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className={styles.ctaSection} aria-labelledby="final-cta-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.ctaPanel}>
              <h2 id="final-cta-title" className={styles.ctaTitle}>
                {t("readyToJoin")}
              </h2>
              <p className={styles.ctaSub}>{t("readyToJoinDesc")}</p>
              <Link className={styles.primary} href="/signup">
                {t("startFreeTrial")}
              </Link>
              <p className={styles.ctaFine}>{t("freeTrial")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <Image
                src="/brand/secretyarnery-logo.webp"
                alt="Secret Yarnery"
                width={90}
                height={28}
                className={styles.brandLogo}
              />
              <span className={styles.brandName}>Secret Yarnery</span>
              <p className={styles.footerTagline}>{t("footerTagline")}</p>
            </div>
            <nav aria-label="Footer navigation" className={styles.footerCol}>
              <p className={styles.footerTitle}>{t("navigation")}</p>
              <Link className={styles.footerLink} href="/rooms">
                {t("rooms")}
              </Link>
              <Link className={styles.footerLink} href="/courses">
                {t("courses")}
              </Link>
              <Link className={styles.footerLink} href="/events">
                {t("events")}
              </Link>
              <Link className={styles.footerLink} href="/groups">
                {t("community")}
              </Link>
              <Link className={styles.footerLink} href="/signup">
                {t("signup")}
              </Link>
              <Link className={styles.footerLink} href="/about">
                {t("about")}
              </Link>
              <Link className={styles.footerLink} href="/guidelines">
                {t("communityGuidelines")}
              </Link>
            </nav>
            <nav aria-label="Account links" className={styles.footerCol}>
              <p className={styles.footerTitle}>{t("account")}</p>
              <Link className={styles.footerLink} href="/login">
                {t("login")}
              </Link>
              <Link className={styles.footerLink} href="/signup">
                {t("signup")}
              </Link>
            </nav>
          </div>
          <p className={styles.footerBottom}>© {new Date().getFullYear()} Secret Yarnery</p>
        </div>
      </footer>
    </main>
  );
}
