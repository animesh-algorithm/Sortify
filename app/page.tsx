import Link from "next/link";
import type { Metadata } from "next";
import {
  siteUrl,
  homeTitle,
  homeDescription,
  serializeSchema,
} from "../lib/seo";
import Brand from "../components/brand";
import MarketingMotion from "../components/marketing-motion";
import s from "./marketing.module.css";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
    type: "website",
    siteName: "Sortify",
    locale: "en_US",
  },
};

function Icon({ kind, className }: { kind: string; className?: string }) {
  const paths: Record<string, string> = {
    arrow: "M7 17 17 7M7 7h10v10",
    sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
    star: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
    note: "M9 17V5l11-2v12M9 9l11-2M9 17c0 4-7 5-7 1 0-3 7-4 7-1ZM20 15c0 4-7 5-7 1 0-3 7-4 7-1Z",
    road: "M3 20c0-7 18-1 18-8S3 12 3 4M10 20h4M10 4h4",
    heart: "M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z",
    moon: "M20 16A9 9 0 0 1 8 4a9 9 0 1 0 12 12Z",
    layers: "m2 8 10-6 10 6-10 6ZM2 13l10 6 10-6M2 18l10 6 10-6",
    plus: "M12 4v16M4 12h16",
  };
  return (
    <svg
      className={className ?? s.icon}
      viewBox="0 0 24 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[kind] ?? paths.star} />
      {kind === "sun" && <circle cx="12" cy="12" r="5" />}
    </svg>
  );
}
function Wave() {
  return (
    <span className={s.wave} aria-hidden="true">
      {[8, 17, 24, 12, 20, 9, 16].map((height, i) => (
        <i key={i} style={{ height, animationDelay: `${i * -0.17}s` }} />
      ))}
    </span>
  );
}

function RecordFriend({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? s.smallFriend : s.friend}
      viewBox="0 0 400 440"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M120 318Q97 365 65 366M284 316Q309 359 339 345M148 369L136 421L103 421M253 369L267 419L300 419"
        stroke="#392822"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle
        cx="200"
        cy="202"
        r="170"
        fill="#392822"
        stroke="#392822"
        strokeWidth="4"
      />
      {[148, 130, 112].map((r) => (
        <circle
          key={r}
          cx="200"
          cy="202"
          r={r}
          stroke="#786157"
          strokeWidth="2"
        />
      ))}
      <path
        d="M79 139Q104 86 156 74M66 170L73 151M271 305Q302 284 320 251"
        stroke="#ead5bd"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="200"
        cy="202"
        r="83"
        fill="#f7b5cb"
        stroke="#392822"
        strokeWidth="4"
      />
      <ellipse cx="175" cy="188" rx="9" ry="16" fill="#392822" />
      <ellipse cx="225" cy="188" rx="9" ry="16" fill="#392822" />
      <path
        d="M171 220Q200 255 231 220"
        fill="#fff5da"
        stroke="#392822"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="151" cy="215" rx="12" ry="7" fill="#e98eaa" />
      <ellipse cx="249" cy="215" rx="12" ry="7" fill="#e98eaa" />
    </svg>
  );
}
function Rainbow() {
  return (
    <svg
      data-parallax
      className={s.rainbow}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {["#ed8eab", "#f4b67d", "#f5de84", "#a8ba91", "#9aafd1"].map(
        (color, i) => (
          <path
            key={color}
            d={`M-60 ${120 + i * 27} C320 ${-125 + i * 27} 470 ${360 + i * 27} 850 ${200 + i * 27} S1230 ${-20 + i * 27} 1500 ${85 + i * 27}`}
            stroke={color}
            strokeWidth="28"
            fill="none"
          />
        ),
      )}
    </svg>
  );
}
function CTA() {
  return (
    <a className={s.cta} href="/api/spotify/connect">
      Rediscover my music <Icon kind="arrow" />
    </a>
  );
}
const questions = [
  [
    "Will Sortify change my Liked Songs?",
    "No. Your saved songs stay where they are. Sortify creates separate playlists when you choose to add them.",
  ],
  [
    "Is this about finding new music?",
    "It’s about finding your music again—the songs you already loved enough to save.",
  ],
  [
    "Can I change the playlists?",
    "Yes. Review them, rename them, and remove songs before deciding what to keep.",
  ],
  [
    "Can I use my playlists too?",
    "Yes. Choose from Liked Songs and the available playlists in your Spotify library.",
  ],
];
export default function Page() {
  return (
    <MarketingMotion className={s.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSchema({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": new URL("/#website", siteUrl).href,
                name: "Sortify",
                url: siteUrl.href,
                description: homeDescription,
                inLanguage: "en",
              },
              {
                "@type": "WebApplication",
                name: "Sortify",
                url: new URL("/app", siteUrl).href,
                applicationCategory: "MultimediaApplication",
                operatingSystem: "Web browser",
                description: homeDescription,
              },
            ],
          }),
        }}
      />
      <a className={s.skip} href="#content">
        Skip to content
      </a>
      <header className={s.header}>
        <Link href="/" className={s.wordmark} aria-label="Sortify home">
          <Brand />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#questions">Questions</a>
          <Link href="/app" className={s.open}>
            Open Sortify <Icon kind="arrow" />
          </Link>
        </nav>
      </header>
      <main id="content" className={s.main}>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <p className={s.eyebrow}>A NEW SPIN ON YOUR OLD FAVORITES</p>
            <h1>
              Hundreds of liked songs.
              <br />
              <em>The same twenty on repeat.</em>
            </h1>
            <p>
              You’ve saved so much music you love. But the newest likes keep
              getting played, while old favorites slip out of reach.
            </p>
            <p>
              Sortify brings them together into playlists that make you want to
              listen again.
            </p>
            <CTA />
            <div className={s.reassurance}>
              Your Liked Songs stays just as it is.
            </div>
          </div>
          <div
            className={s.scene}
            role="img"
            aria-label="A smiling record surrounded by playlists for slow mornings, the long way home, and a little lift"
          >
            <span className={s.spark}>
              <Icon kind="star" />
            </span>
            <span className={s.note}>
              <Icon kind="note" />
            </span>
            <div className={s.sceneCircle} />
            <RecordFriend />
            <div className={`${s.playlist} ${s.morning}`}>
              <span className={s.cover}>
                <Icon kind="sun" />
              </span>
              <div>
                <small>A SOFTER START</small>
                <strong>Slow mornings</strong>
                <Wave />
              </div>
            </div>
            <div className={`${s.playlist} ${s.home}`}>
              <span className={s.cover}>
                <Icon kind="road" />
              </span>
              <div>
                <small>TAKE YOUR TIME</small>
                <strong>The long way home</strong>
                <Wave />
              </div>
            </div>
            <div className={`${s.playlist} ${s.lift}`}>
              <span className={s.cover}>
                <Icon kind="star" />
              </span>
              <div>
                <small>TURN THE DAY AROUND</small>
                <strong>A little lift</strong>
              </div>
            </div>
            <span className={s.handwritten}>Oh, I love this one!</span>
          </div>
          <Rainbow />
        </section>
        <section className={s.feeling}>
          <p className={s.eyebrow}>SOUND FAMILIAR?</p>
          <h2>
            You didn’t stop loving those songs.
            <br />
            <em>You just stopped finding them.</em>
          </h2>
          <p>
            The song you played all summer. The album that got you through a
            strange year. That track you’d recognize from the first two seconds.
          </p>
          <p>
            They’re still in your library. Just buried beneath everything you’ve
            liked since.
          </p>
          <div data-reveal className={s.memoryNotes} aria-hidden="true">
            <span>
              that summer song <Icon kind="note" />
            </span>
            <span>
              your late-night favorite <Icon kind="moon" />
            </span>
            <span>
              the one you knew by heart <Icon kind="heart" />
            </span>
          </div>
        </section>
        <section className={s.change}>
          <div data-reveal className={s.albumArt} aria-hidden="true">
            <span className={s.sun}>
              <Icon kind="star" />
            </span>
            <div className={s.albumLabel}>
              BACK IN
              <br />
              ROTATION<span>VOL. YOU</span>
            </div>
            <span className={s.albumNote}>Good to hear you again.</span>
          </div>
          <div>
            <p className={s.eyebrow}>STILL YOUR MUSIC. A WHOLE NEW LISTEN.</p>
            <h2>
              Give your old favorites <em>another turn.</em>
            </h2>
            <p>
              Sortify finds songs that belong together and gives them somewhere
              to play.
            </p>
            <p>
              A softer start to the morning. Some company on the way home. A
              little energy when the day needs it.
            </p>
            <p>Familiar music, brought back into your day.</p>
          </div>
        </section>
        <section id="how-it-works" className={s.how}>
          <p className={s.eyebrow}>FROM SAVED TO PLAYED</p>
          <h2>
            You already found the music.
            <br />
            <em>Sortify helps you find it again.</em>
          </h2>
          <div className={s.steps}>
            {[
              [
                "Bring your favorites.",
                "Connect Spotify and choose your Liked Songs or playlists.",
                "heart",
              ],
              [
                "See what comes together.",
                "Explore playlists made from the music you’ve saved.",
                "layers",
              ],
              [
                "Keep what feels right.",
                "Make them yours, add them to Spotify, and start listening.",
                "note",
              ],
            ].map(([title, copy, icon], i) => (
              <article key={title}>
                <div className={s.stepTop}>
                  <span>0{i + 1}</span>
                  <Icon kind={icon} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div data-reveal className={s.library}>
            <Icon kind="heart" />
            <div>
              <h3>Your library stays yours.</h3>
              <p>
                Your Liked Songs and existing playlists stay as they are. You
                review the new playlists and decide which ones to keep.
              </p>
            </div>
          </div>
        </section>
        <section id="questions" className={s.questions}>
          <div>
            <p className={s.eyebrow}>A FEW THINGS TO KNOW</p>
            <h2>
              Before you
              <br />
              <em>press play.</em>
            </h2>
            <span className={s.faqDoodle} aria-hidden="true">
              <Icon kind="note" />
            </span>
          </div>
          <div>
            {questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>
                    <Icon kind="plus" />
                  </span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={s.closing}>
          <span className={s.closingStar} aria-hidden="true">
            <Icon kind="star" />
          </span>
          <RecordFriend small />
          <p className={s.eyebrow}>THERE’S GOOD MUSIC IN THERE</p>
          <h2>
            Remember why
            <br />
            <em>you saved it.</em>
          </h2>
          <p>Your next listen could be a song you already love.</p>
          <CTA />
          <Rainbow />
        </section>
      </main>
      <footer className={s.footer}>
        <Link href="/" className={s.wordmark}>
          <Brand />
        </Link>
        <span>Your music. Back in your life.</span>
        <nav className={s.footerLinks} aria-label="Footer navigation">
          <Link href="/app">
            Organize your Spotify library <Icon kind="arrow" />
          </Link>
          <a href="#how-it-works">How Sortify works</a>
          <a href="https://www.animesh.cc" target="_blank" rel="noreferrer">
            Built by Animesh <Icon kind="arrow" />
          </a>
          <a
            href="https://github.com/animesh-algorithm/Sortify"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <Icon kind="arrow" />
          </a>
          <a href="https://spotify.com" target="_blank" rel="noreferrer">
            Made for Spotify <Icon kind="arrow" />
          </a>
        </nav>
      </footer>
    </MarketingMotion>
  );
}
