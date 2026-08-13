import Link from "next/link";
import Image from "next/image";
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
  { icon: VideoIcon, label: "Live Rooms" },
  { icon: BookIcon, label: "Courses" },
  { icon: CalendarIcon, label: "Events" },
  { icon: UsersIcon, label: "Community" },
];

const FEATURES = [
  {
    icon: VideoIcon,
    name: "Live video rooms",
    desc: "Talk face-to-face with members in real time, from any device.",
  },
  {
    icon: BookIcon,
    name: "Courses & learning",
    desc: "Work through video lessons at your own pace and track your progress.",
  },
  {
    icon: CalendarIcon,
    name: "Events & community",
    desc: "Discover upcoming events, RSVP and show up alongside the community.",
  },
  {
    icon: UsersIcon,
    name: "Groups & conversations",
    desc: "Join smaller groups and keep the conversation going beyond the rooms.",
  },
];

const COMMUNITY_CHIPS = [
  { icon: UsersIcon, label: "Members" },
  { icon: VideoIcon, label: "Live rooms" },
  { icon: ChatIcon, label: "Conversations" },
  { icon: BookIcon, label: "Learning" },
  { icon: CalendarIcon, label: "Events" },
  { icon: UsersIcon, label: "Groups" },
];

const PARTICIPANTS = ["Host", "Speaker", "Speaker", "Speaker", "Speaker", "You"];

export default function Home() {
  return (
    <main className={styles.page}>
      <LandingNav />

      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                Live communities · Courses · Events
              </span>
              <h1 className={styles.heroTitle}>Connect. Learn. Grow together.</h1>
              <p className={styles.heroSub}>
                Live communities, courses, events and real conversations — all in one place.
              </p>
              <div className={styles.heroCtas}>
                <Link className={styles.primary} href="/signup">
                  Join VidNetwork
                </Link>
                <Link className={styles.secondary} href="/rooms">
                  Explore the community
                </Link>
              </div>
              <p className={styles.heroFine}>14-day free trial · no credit card required</p>
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
            <p className={styles.valueLead}>Everything you need to participate, learn and connect</p>
            <div className={styles.valueItems}>
              {VALUE_ITEMS.map((item) => (
                <div key={item.label} className={styles.valueItem}>
                  <span className={styles.valueIcon}>
                    <item.icon size={17} />
                  </span>
                  {item.label}
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
                Your community, all in one place.
              </h2>
              <p className={styles.sectionSub}>
                Move between live conversations, learning, events and community interaction
                without juggling separate platforms. Everything your membership needs lives
                on one platform.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className={styles.featureGrid}>
              {FEATURES.map((feature) => (
                <article key={feature.name} className={styles.featureCard}>
                  <span className={styles.featureIcon}>
                    <feature.icon size={22} />
                  </span>
                  <h3 className={styles.featureName}>{feature.name}</h3>
                  <p className={styles.featureDesc}>{feature.desc}</p>
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
                Meet face-to-face, wherever you are.
              </h2>
              <p className={styles.sectionSub}>
                Join live rooms, talk in real time and interact with the community — with
                recordings you can come back to later.
              </p>
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
                  <p className={styles.showcaseTitle}>Community Room</p>
                  <p className={styles.showcaseSub}>Broadcast live to members</p>
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
                  <p className={styles.chatHeader}>Live chat</p>
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
                  Learn at your own pace.
                </h2>
                <p className={styles.sectionSub}>
                  Courses with structured video lessons. Your progress is saved, so you can
                  pick up right where you left off — whenever it suits you.
                </p>
                <Link className={styles.secondary} href="/courses">
                  Browse courses
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
                    <p className={styles.learningTitle}>Your learning progress</p>
                    <p className={styles.learningSub}>Resume where you left off</p>
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
                    Lesson 1
                    <span className={styles.lessonStatus}>Completed</span>
                  </li>
                  <li className={`${styles.lessonRow} ${styles.lessonDone}`}>
                    <span className={styles.lessonIcon}>
                      <CheckIcon size={14} />
                    </span>
                    Lesson 2
                    <span className={styles.lessonStatus}>Completed</span>
                  </li>
                  <li className={`${styles.lessonRow} ${styles.lessonCurrent}`}>
                    <span className={styles.lessonIcon}>
                      <PlayIcon size={13} />
                    </span>
                    Lesson 3
                    <span className={styles.lessonStatus}>Current</span>
                  </li>
                  <li className={styles.lessonRow}>
                    <span className={`${styles.lessonIcon} ${styles.lessonIconUpcoming}`}>
                      <ClockIcon size={13} />
                    </span>
                    Lesson 4
                    <span className={styles.lessonStatus}>Upcoming</span>
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
                  Never miss what&apos;s happening.
                </h2>
                <p className={styles.sectionSub}>
                  Discover upcoming community events, RSVP and get reminders — so you can show
                  up for what matters.
                </p>
                <Link className={styles.secondary} href="/events">
                  Explore events
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
                    <p className={styles.eventName}>Upcoming event</p>
                    <p className={styles.eventMeta}>RSVP to join the community live</p>
                  </div>
                  <span className={styles.rsvp}>RSVP</span>
                </div>
                <div className={styles.eventCard}>
                  <span className={styles.eventCal}>
                    <CalendarIcon size={20} />
                  </span>
                  <div className={styles.eventBody}>
                    <p className={styles.eventName}>Upcoming event</p>
                    <p className={styles.eventMeta}>Get notified when it starts</p>
                  </div>
                  <span className={styles.rsvp}>RSVP</span>
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
                More than a video call.
              </h2>
              <p className={styles.sectionSub}>
                VidNetwork brings together conversations, groups, members, live rooms,
                learning and events — one place for everything.
              </p>
              <div className={styles.chips}>
                {COMMUNITY_CHIPS.map((chip, i) => (
                  <span key={chip.label + i} className={styles.chip}>
                    <chip.icon size={15} />
                    {chip.label}
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
                Simple, transparent membership.
              </h2>
              <p className={styles.sectionSub}>
                Start free for 14 days, then choose the plan that fits. Upgrade or cancel
                anytime.
              </p>
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
                Ready to join the community?
              </h2>
              <p className={styles.finalSub}>
                Start connecting, learning and participating in one place.
              </p>
              <Link className={styles.finalCtaBtn} href="/signup">
                Start your free trial
              </Link>
              <p className={styles.finalFine}>14-day free trial · no credit card required</p>
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
              <p className={styles.footerTagline}>
                A paid membership community for live rooms, courses, events and conversation.
              </p>
            </div>
            <nav aria-label="Footer navigation" className={styles.footerCol}>
              <p className={styles.footerTitle}>Navigation</p>
              <Link className={styles.footerLink} href="/rooms">
                Rooms
              </Link>
              <Link className={styles.footerLink} href="/courses">
                Courses
              </Link>
              <Link className={styles.footerLink} href="/events">
                Events
              </Link>
              <Link className={styles.footerLink} href="/groups">
                Community
              </Link>
              <Link className={styles.footerLink} href="/pricing">
                Pricing
              </Link>
            </nav>
            <nav aria-label="Account links" className={styles.footerCol}>
              <p className={styles.footerTitle}>Account</p>
              <Link className={styles.footerLink} href="/login">
                Log in
              </Link>
              <Link className={styles.footerLink} href="/signup">
                Sign up
              </Link>
            </nav>
          </div>
          <p className={styles.footerBottom}>© {new Date().getFullYear()} VidNetwork</p>
        </div>
      </footer>
    </main>
  );
}
