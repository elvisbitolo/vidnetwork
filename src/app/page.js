import Link from "next/link";
import Image from "next/image";
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
} from "@/components/LandingIcons";
import styles from "./page.module.css";

export const metadata = {
  title: "VidNetwork — Connect, Learn & Grow Together",
  description:
    "VidNetwork is a paid membership community with live video rooms, courses, events, groups and real conversations — connect, learn and grow together in one place.",
  openGraph: {
    title: "VidNetwork — Connect, Learn & Grow Together",
    description:
      "Live communities, courses, events and real conversations — all in one place.",
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

const VALUE_ITEMS = [
  { icon: VideoIcon, label: "liveRooms" },
  { icon: BookIcon, label: "courses" },
  { icon: CalendarIcon, label: "events" },
  { icon: UsersIcon, label: "community" },
];

const FEATURES = [
  {
    icon: VideoIcon,
    name: "liveVideoRooms",
    desc: "liveVideoRoomsDesc",
  },
  {
    icon: BookIcon,
    name: "coursesLearning",
    desc: "coursesLearningDesc",
  },
  {
    icon: CalendarIcon,
    name: "eventsCommunity",
    desc: "eventsCommunityDesc",
  },
  {
    icon: UsersIcon,
    name: "groupsConversations",
    desc: "groupsConversationsDesc",
  },
];

const COMMUNITY_CHIPS = [
  { icon: UsersIcon, label: "members" },
  { icon: VideoIcon, label: "liveRoomsChip" },
  { icon: ChatIcon, label: "conversations" },
  { icon: BookIcon, label: "learning" },
  { icon: CalendarIcon, label: "events" },
  { icon: UsersIcon, label: "groups" },
];

const PARTICIPANTS = ["Host", "Speaker", "Speaker", "Speaker", "Speaker", "You"];

export default function Home() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VidNetwork",
    url: "https://vidnetwork.vercel.app",
    description:
      "A paid membership community with live video rooms, courses, events, groups and real conversations.",
    sameAs: [],
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

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
              <Image
                src="/vidnetwork-hero.png"
                alt="VidNetwork platform showing live community rooms, courses, events and member interactions"
                width={1672}
                height={941}
                priority
                sizes="(max-width: 900px) 100vw, 56vw"
                className={styles.heroImage}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valueStrip} aria-label="Platform highlights">
        <div className={styles.wrap}>
          <div className={styles.valueInner}>
            <p className={styles.valueLead}>{t("valueLead")}</p>
            <div className={styles.valueItems}>
              {VALUE_ITEMS.map((item) => (
                <div key={item.label} className={styles.valueItem}>
                  <span className={styles.valueIcon}>
                    <item.icon size={17} />
                  </span>
                  {t(item.label)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="overview-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="overview-title" className={styles.sectionTitle}>
                {t("communityAllInOne")}
              </h2>
              <p className={styles.sectionSub}>{t("communityDesc")}</p>
            </div>
          </Reveal>
          <Reveal>
            <div className={styles.featureGrid}>
              {FEATURES.map((feature) => (
                <article key={feature.name} className={styles.featureCard}>
                  <span className={styles.featureIcon}>
                    <feature.icon size={22} />
                  </span>
                  <h3 className={styles.featureName}>{t(feature.name)}</h3>
                  <p className={styles.featureDesc}>{t(feature.desc)}</p>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="showcase-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.sectionHead}>
              <h2 id="showcase-title" className={styles.sectionTitle}>
                {t("meetFaceToFace")}
              </h2>
              <p className={styles.sectionSub}>{t("meetFaceToFaceDesc")}</p>
            </div>
          </Reveal>
          <Reveal>
            <div
              className={styles.showcaseWindow}
              role="img"
              aria-label="Large preview of a VidNetwork live broadcast room with participants, chat and call controls"
            >
              <div className={styles.showcaseHead}>
                <div>
                  <p className={styles.showcaseTitle}>{t("communityRoom")}</p>
                  <p className={styles.showcaseSub}>{t("broadcastLive")}</p>
                </div>
                <span className={styles.liveBadge}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  Live
                </span>
              </div>
              <div className={styles.showcaseBody}>
                <div className={styles.showcaseGrid}>
                  {PARTICIPANTS.map((label, i) => (
                    <div
                      key={label + i}
                      className={label === "You" ? `${styles.tile} ${styles.tileYou}` : styles.tile}
                    >
                      <span className={styles.avatar}>
                        <UsersIcon size={22} />
                      </span>
                      <span className={styles.tileLabel}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.chat}>
                  <p className={styles.chatHeader}>{t("liveChat")}</p>
                  <div className={styles.chatMsgs}>
                    <div className={styles.msgOther}>Welcome to the room!</div>
                    <div className={styles.msgMe}>Hi everyone</div>
                    <div className={styles.msgOther}>Great to see you here</div>
                    <div className={styles.msgMe}>Ready when you are</div>
                  </div>
                  <div className={styles.chatInput}>Type a message…</div>
                </div>
              </div>
              <div className={styles.controls}>
                <span className={styles.controlBtn}>
                  <MicIcon size={18} />
                </span>
                <span className={styles.controlBtn}>
                  <VideoIcon size={18} />
                </span>
                <span className={`${styles.controlBtn} ${styles.controlEnd}`}>
                  <PhoneIcon size={18} />
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="learning-title">
        <div className={styles.wrap}>
          <div className={styles.split}>
            <Reveal>
              <div className={styles.splitCopy}>
                <h2 id="learning-title" className={styles.sectionTitle}>
                  {t("learnAtOwnPace")}
                </h2>
                <p className={styles.sectionSub}>{t("learnAtOwnPaceDesc")}</p>
                <Link className={styles.secondary} href="/courses">
                  {t("browseCourses")}
                </Link>
              </div>
            </Reveal>
            <Reveal>
              <div
                className={styles.learningPanel}
                role="img"
                aria-label="Preview of course progress showing completed and current lessons"
              >
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

      <section className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="events-title">
        <div className={styles.wrap}>
          <div className={`${styles.split} ${styles.splitReverse}`}>
            <Reveal>
              <div className={styles.splitCopy}>
                <h2 id="events-title" className={styles.sectionTitle}>
                  {t("neverMiss")}
                </h2>
                <p className={styles.sectionSub}>{t("neverMissDesc")}</p>
                <Link className={styles.secondary} href="/events">
                  {t("exploreEvents")}
                </Link>
              </div>
            </Reveal>
            <Reveal>
              <div
                className={styles.eventsList}
                role="img"
                aria-label="Preview of upcoming events with RSVP"
              >
                <div className={styles.eventCard}>
                  <span className={styles.eventCal}>
                    <CalendarIcon size={20} />
                  </span>
                  <div className={styles.eventBody}>
                    <p className={styles.eventName}>{t("upcomingEvent")}</p>
                    <p className={styles.eventMeta}>{t("rsvpToJoin")}</p>
                  </div>
                  <span className={styles.rsvp}>{t("rsvp")}</span>
                </div>
                <div className={styles.eventCard}>
                  <span className={styles.eventCal}>
                    <CalendarIcon size={20} />
                  </span>
                  <div className={styles.eventBody}>
                    <p className={styles.eventName}>{t("upcomingEvent")}</p>
                    <p className={styles.eventMeta}>{t("getNotified")}</p>
                  </div>
                  <span className={styles.rsvp}>{t("rsvp")}</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="community-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.communityInner}>
              <h2 id="community-title" className={styles.sectionTitle}>
                {t("moreThanVideoCall")}
              </h2>
              <p className={styles.sectionSub}>{t("moreThanVideoCallDesc")}</p>
              <div className={styles.chips}>
                {COMMUNITY_CHIPS.map((chip, i) => (
                  <span key={chip.label + i} className={styles.chip}>
                    <chip.icon size={15} />
                    {t(chip.label)}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pricing-title">
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

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.wrap}>
          <Reveal>
            <div className={styles.finalPanel}>
              <h2 id="final-cta-title" className={styles.finalTitle}>
                {t("readyToJoin")}
              </h2>
              <p className={styles.finalSub}>{t("readyToJoinDesc")}</p>
              <Link className={styles.finalCtaBtn} href="/signup">
                {t("startFreeTrial")}
              </Link>
              <p className={styles.finalFine}>{t("freeTrial")}</p>
            </div>
          </Reveal>
        </div>
      </section>

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
                Rooms
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
                Pricing
              </Link>
              <Link className={styles.footerLink} href="/about">
                About
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
