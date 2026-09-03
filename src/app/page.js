import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import LandingNav from "@/components/LandingNav";
import Reveal from "@/components/Reveal";
import ThemePicker from "@/components/ThemePicker";
import HeroSlideshow from "@/components/HeroSlideshow";
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

const CROCHET_IMAGES = [
  { src: "/images/crochet/model_portrait_studio_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_portrait_studio_02.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_in_shop_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_in_shop_02.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_in_shop_03.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_garden_yarn_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_pink_dress_garden_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/model_wearing_crochet_garden_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/shop_interior_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/product_closeup_01.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/product_closeup_02.jpeg", alt: "Crochet work" },
  { src: "/images/crochet/product_closeup_03.jpeg", alt: "Crochet work" },
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
        <HeroSlideshow images={CROCHET_IMAGES.slice(0, 6)}>
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
            <p className={styles.heroFine}>{t("freeTrial")}</p>
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
