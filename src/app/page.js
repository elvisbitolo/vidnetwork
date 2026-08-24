import Link from "next/link";
import { useTranslations } from "next-intl";
import LandingNav from "@/components/LandingNav";
import LandingPricing from "@/components/LandingPricing";
import Reveal from "@/components/Reveal";
import {
  VideoIcon,
  BookIcon,
  CalendarIcon,
  UsersIcon,
  ChatIcon,
  CheckIcon,
  PlayIcon,
  MicIcon,
  PhoneIcon,
  ClockIcon,
  TrophyIcon,
  ZapIcon,
  StarIcon,
  TrendingUpIcon,
} from "@/components/LandingIcons";
import styles from "./page.module.css";

export const metadata = {
  title: "VidNetwork — Connect, Learn & Grow Together",
  description:
    "VidNetwork is a paid membership community with live video rooms, courses, events, gamification and real conversations — connect, learn and grow together in one place.",
  openGraph: {
    title: "VidNetwork — Connect, Learn & Grow Together",
    description:
      "Live communities, courses, events, gamification and real conversations — all in one place.",
    url: "https://vidnetwork.vercel.app",
    siteName: "VidNetwork",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1734,
        height: 907,
        alt: "VidNetwork — Connect, Learn & Grow Together",
      },
    ],
  },
};

const FEATURES = [
  {
    icon: VideoIcon,
    name: "feature1Title",
    desc: "feature1Desc",
    tag: "feature1Tag",
  },
  {
    icon: ChatIcon,
    name: "feature2Title",
    desc: "feature2Desc",
    tag: "feature2Tag",
  },
  {
    icon: BookIcon,
    name: "feature3Title",
    desc: "feature3Desc",
    tag: "feature3Tag",
  },
  {
    icon: CalendarIcon,
    name: "feature4Title",
    desc: "feature4Desc",
    tag: "feature4Tag",
  },
  {
    icon: TrophyIcon,
    name: "feature5Title",
    desc: "feature5Desc",
    tag: "feature5Tag",
  },
  {
    icon: UsersIcon,
    name: "feature6Title",
    desc: "feature6Desc",
    tag: "feature6Tag",
  },
  {
    icon: BookIcon,
    name: "feature7Title",
    desc: "feature7Desc",
    tag: "feature7Tag",
  },
  {
    icon: TrendingUpIcon,
    name: "feature8Title",
    desc: "feature8Desc",
    tag: "feature8Tag",
  },
];

const ROOM_PARTICIPANTS = [
  { key: "host" },
  { key: "speaker" },
  { key: "speaker" },
  { key: "speaker" },
  { key: "speaker" },
  { key: "you" },
];

export default function Home() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VidNetwork",
    url: "https://vidnetwork.vercel.app",
    description:
      "A paid membership community with live video rooms, courses, events, gamification and real conversations.",
    sameAs: [],
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                {t("liveCommunities")}
              </span>
              <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
              <p className={styles.heroSub}>{t("heroSub")}</p>
              <div className={styles.heroCtas}>
                <Link className={styles.primary} href="/signup">
                  {t("joinVidNetwork")}
                </Link>
                <Link className={styles.secondary} href="/explore">
                  {t("exploreCommunity")}
                </Link>
              </div>
              <p className={styles.heroFine}>{t("freeTrial")}</p>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.heroMockup} role="img" aria-label="VidNetwork dashboard preview">
                <div className={styles.mockupBar}>
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupDot} />
                  <span className={styles.mockupUrl}>vidnetwork.vercel.app</span>
                </div>
                <div className={styles.mockupBody}>
                  <div className={styles.mockupSidebar}>
                    <div className={styles.mockupSidebarItem}>
                      <span className={styles.mockupSidebarIcon} />
                      <span className={styles.mockupSidebarLine} />
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <span className={styles.mockupSidebarIcon} />
                      <span className={styles.mockupSidebarLine} />
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <span className={styles.mockupSidebarIcon} />
                      <span className={styles.mockupSidebarLine} />
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <span className={styles.mockupSidebarIcon} />
                      <span className={styles.mockupSidebarLine} />
                    </div>
                    <div className={styles.mockupSidebarItem}>
                      <span className={styles.mockupSidebarIcon} />
                      <span className={styles.mockupSidebarLine} />
                    </div>
                  </div>
                  <div className={styles.mockupContent}>
                    <div className={styles.mockupPlaceholder} />
                    <div className={`${styles.mockupPlaceholder} ${styles.mockupPlaceholderShort}`} />
                    <div className={`${styles.mockupPlaceholder} ${styles.mockupPlaceholderMed}`} />
                    <div className={styles.mockupFeed}>
                      <div className={styles.mockupFeedItem} />
                      <div className={styles.mockupFeedItem} />
                      <div className={styles.mockupFeedItem} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.name}>
                <article className={styles.featureCard}>
                  <div className={styles.featureTop}>
                    <span className={styles.featureIcon}>
                      <feature.icon size={20} />
                    </span>
                    <span className={styles.featureTag}>{t(feature.tag)}</span>
                  </div>
                  <h3 className={styles.featureName}>{t(feature.name)}</h3>
                  <p className={styles.featureDesc}>{t(feature.desc)}</p>
                </article>
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
              className={styles.showcaseWindow}
              role="img"
              aria-label="Live room preview with participants and chat"
            >
              <div className={styles.showcaseHead}>
                <div>
                  <p className={styles.showcaseTitle}>{t("communityRoom")}</p>
                  <p className={styles.showcaseSub}>{t("broadcastLive")}</p>
                </div>
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  {t("live")}
                </span>
              </div>
              <div className={styles.showcaseBody}>
                <div className={styles.showcaseGrid}>
                  {ROOM_PARTICIPANTS.map((p, i) => (
                    <div
                      key={p.key + i}
                      className={p.key === "you" ? `${styles.tile} ${styles.tileYou}` : styles.tile}
                    >
                      <span className={styles.avatar}>
                        <UsersIcon size={20} />
                      </span>
                      <span className={styles.tileLabel}>{t(p.key)}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.chat}>
                  <p className={styles.chatHeader}>{t("liveChat")}</p>
                  <div className={styles.chatMsgs}>
                    <div className={styles.msgOther}>{t("welcomeToRoom")}</div>
                    <div className={styles.msgMe}>{t("hiEveryone")}</div>
                    <div className={styles.msgOther}>{t("greatToSeeYou")}</div>
                    <div className={styles.msgMe}>{t("readyWhenYouAre")}</div>
                  </div>
                  <div className={styles.chatInput}>{t("typeMessage")}</div>
                </div>
              </div>
              <div className={styles.controls}>
                <span className={styles.controlBtn}>
                  <MicIcon size={16} />
                </span>
                <span className={styles.controlBtn}>
                  <VideoIcon size={16} />
                </span>
                <span className={`${styles.controlBtn} ${styles.controlEnd}`}>
                  <PhoneIcon size={16} />
                </span>
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
                <Link className={styles.secondary} href="/courses">
                  {t("browseCourses")}
                </Link>
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

      {/* ─── Pricing ─── */}
      <section className={styles.pricingSection} aria-labelledby="pricing-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="pricing-title" className={styles.sectionTitle}>
                {t("simpleTransparent")}
              </h2>
              <p className={styles.sectionSub}>{t("simpleTransparentDesc")}</p>
            </div>
          </Reveal>
          <Reveal>
            <LandingPricing />
          </Reveal>
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
              <span className={styles.brandMark} aria-hidden="true">
                <PlayIcon size={14} />
              </span>
              <span className={styles.brandName}>VidNetwork</span>
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
              <Link className={styles.footerLink} href="/pricing">
                {t("pricing")}
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
          <p className={styles.footerBottom}>© {new Date().getFullYear()} VidNetwork</p>
        </div>
      </footer>
    </main>
  );
}
