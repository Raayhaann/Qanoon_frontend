import { Link } from "react-router-dom";
import {
  MessageSquare,
  Search,
  FileText,
  Globe,
  Database,
  Scale,
  ShieldAlert,
  EyeOff,
  Briefcase,
  ArrowRight,
  Menu,
  X,
  Languages,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/context/LangContext";

/* ------------------------------------------------------------------ */
/*  Navbar                                                            */
/* ------------------------------------------------------------------ */

function Navbar() {
  const { lang, toggleLang, t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#how-it-works", label: t("How It Works", "كيف يعمل") },
    { href: "#features", label: t("Features", "المميزات") },
    { href: "#try-it", label: t("Try It", "جرّبه") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Scale className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Qanoon<span className="text-primary">.ly</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={toggleLang}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "en" ? "عربي" : "EN"}
          </button>
          <Button asChild size="sm" className="rounded-lg">
            <a href="#try-it">
              {t("Ask a Legal Question", "اطرح سؤالاً قانونياً")}
            </a>
          </Button>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 px-5 pb-5 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 pt-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-4">
              <button
                onClick={toggleLang}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground"
              >
                <Languages className="h-3.5 w-3.5" />
                {lang === "en" ? "عربي" : "EN"}
              </button>
              <Button asChild size="sm" className="flex-1 rounded-lg">
                <a href="#try-it" onClick={() => setMobileOpen(false)}>
                  {t("Ask a Legal Question", "اطرح سؤالاً قانونياً")}
                </a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */

function Hero() {
  const { t } = useLang();

  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pb-32 sm:pt-24 lg:pt-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute top-40 left-[10%] h-64 w-64 rounded-full bg-accent/[0.06] blur-3xl animate-pulse-slow" />
        <div className="absolute top-20 right-[10%] h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl animate-pulse-slow [animation-delay:2s]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="animate-fade-up text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {t("AI-Driven", "وضوح قانوني")}
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              {t("Legal Clarity", "بالذكاء الاصطناعي")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground [animation-delay:0.15s]">
            {t(
              "Ask your legal question in Arabic or Libyan dialect and get the exact law and article that applies — grounded in verified Libyan legal texts.",
              "اطرح سؤالك القانوني بالعربية أو باللهجة الليبية واحصل على رقم القانون والمادة المناسبة — مبني على نصوص قانونية ليبية موثّقة."
            )}
          </p>

          <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:0.3s] sm:flex-row">
            <Button asChild size="lg" className="gap-2 rounded-xl px-7 text-base shadow-lg shadow-primary/20">
              <a href="#try-it">
                {t("Ask a Legal Question", "اطرح سؤالاً قانونياً")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 rounded-xl px-7 text-base"
            >
              <a href="#how-it-works">
                {t("See How It Works", "شاهد كيف يعمل")}
              </a>
            </Button>
          </div>
        </div>

        {/* Floating preview cards */}
        <div className="relative mx-auto mt-20 max-w-2xl animate-fade-up [animation-delay:0.45s]">
          <div className="rounded-2xl border border-border/60 bg-card p-1.5 shadow-2xl shadow-primary/[0.06]">
            <div className="rounded-xl bg-muted/50 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-48 rounded-full bg-foreground/10" />
                  <div className="h-3 w-72 rounded-full bg-foreground/[0.06]" />
                  <div className="h-3 w-56 rounded-full bg-foreground/[0.06]" />
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Scale className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 space-y-2 rounded-xl border border-accent/20 bg-accent/[0.04] p-3.5">
                  <p className="text-xs font-medium text-accent">
                    {t("Article 14 — Labor Law No. 12 of 2010", "المادة 14 — قانون العمل رقم 12 لسنة 2010")}
                  </p>
                  <div className="h-2.5 w-full rounded-full bg-foreground/[0.05]" />
                  <div className="h-2.5 w-3/4 rounded-full bg-foreground/[0.05]" />
                </div>
              </div>
            </div>
          </div>
          {/* Glow under the card */}
          <div className="absolute -bottom-6 left-1/2 h-12 w-3/4 -translate-x-1/2 rounded-full bg-primary/[0.08] blur-2xl" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                      */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const { t } = useLang();

  const steps = [
    {
      num: "1",
      icon: MessageSquare,
      title: t("Describe Your Problem", "صِف مشكلتك"),
      desc: t(
        "Type your legal question in Arabic or Libyan dialect — no formal language required.",
        "اكتب سؤالك القانوني بالعربية أو باللهجة الليبية — لا حاجة للغة رسمية."
      ),
      color: "bg-primary/10 text-primary",
    },
    {
      num: "2",
      icon: Search,
      title: t("AI Scans Legal Databases", "الذكاء الاصطناعي يبحث"),
      desc: t(
        "Our RAG-powered AI searches verified Libyan legal databases to find the most relevant laws.",
        "يبحث الذكاء الاصطناعي المدعوم بتقنية RAG في قواعد البيانات القانونية الليبية الموثّقة."
      ),
      color: "bg-accent/10 text-accent",
    },
    {
      num: "3",
      icon: FileText,
      title: t("Get the Exact Law", "احصل على القانون"),
      desc: t(
        "Receive the exact law number and article that applies to your situation, with the source cited.",
        "احصل على رقم القانون والمادة المناسبة لحالتك، مع ذكر المصدر."
      ),
      color: "bg-primary/10 text-primary",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("How It Works", "كيف يعمل")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("Three Steps to Legal Clarity", "ثلاث خطوات للوضوح القانوني")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t(
              "From question to answer in seconds — no legal expertise needed.",
              "من السؤال إلى الإجابة في ثوانٍ — بدون خبرة قانونية."
            )}
          </p>
        </div>

        <div className="relative mt-20">
          {/* Connector line */}
          <div className="absolute top-16 hidden h-px w-full bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <div key={step.num} className="relative text-center">
                <div className="relative mx-auto mb-6 flex h-32 w-32 flex-col items-center justify-center">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-border/60" />
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${step.color}`}>
                    <step.icon className="h-7 w-7" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 ltr:-right-2 rtl:-left-2 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background shadow-md">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                          */
/* ------------------------------------------------------------------ */

function Features() {
  const { t } = useLang();

  const features = [
    {
      icon: Globe,
      title: t("Context Aware", "فهم السياق"),
      desc: t(
        "Understands Libyan Dialect and Standard Arabic, so you can ask questions naturally in your own words.",
        "يفهم اللهجة الليبية والعربية الفصحى، لذا يمكنك طرح الأسئلة بطريقتك الخاصة."
      ),
      gradient: "from-primary/[0.08] to-transparent",
    },
    {
      icon: Database,
      title: t("RAG Technology", "تقنية RAG"),
      desc: t(
        "Answers are grounded strictly in verified legal texts — no hallucinations, no guesswork.",
        "الإجابات مبنية حصرياً على نصوص قانونية موثّقة — بدون تخمين أو معلومات مختلقة."
      ),
      gradient: "from-accent/[0.08] to-transparent",
    },
    {
      icon: Scale,
      title: t("Non-Judgmental", "موضوعي"),
      desc: t(
        "Cites sources and provides objective information rather than subjective opinions or legal advice.",
        "يذكر المصادر ويقدم معلومات موضوعية بدلاً من آراء شخصية أو استشارات قانونية."
      ),
      gradient: "from-primary/[0.08] to-transparent",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/40 via-muted/60 to-muted/40" />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            {t("Features", "المميزات")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("Built for Trust and Accuracy", "مصمم للثقة والدقة")}
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/[0.04]"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Common Rights Violations                                          */
/* ------------------------------------------------------------------ */

function RightsViolations() {
  const { t } = useLang();

  const violations = [
    {
      icon: ShieldAlert,
      title: t("Discrimination", "التمييز"),
      desc: t(
        "Unequal treatment based on gender, ethnicity, or social status is prohibited under Libyan law. Know the articles that protect your right to equality.",
        "المعاملة غير المتساوية بناءً على الجنس أو العرق أو الوضع الاجتماعي محظورة بموجب القانون الليبي. اعرف المواد التي تحمي حقك في المساواة."
      ),
    },
    {
      icon: EyeOff,
      title: t("Infringement of Privacy", "انتهاك الخصوصية"),
      desc: t(
        "Unauthorized surveillance, data collection, or disclosure of personal information violates your constitutional privacy rights.",
        "المراقبة غير المصرح بها أو جمع البيانات أو كشف المعلومات الشخصية ينتهك حقوقك الدستورية في الخصوصية."
      ),
    },
    {
      icon: Briefcase,
      title: t("Unfair Dismissal", "الفصل التعسفي"),
      desc: t(
        "Termination without just cause or proper procedure is actionable under Libyan labor law. Learn which laws apply to your case.",
        "الفصل من العمل بدون سبب عادل أو إجراء مناسب قابل للطعن بموجب قانون العمل الليبي. تعرّف على القوانين المطبقة على حالتك."
      ),
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("Know Your Rights", "اعرف حقوقك")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("Common Rights Violations", "انتهاكات الحقوق الشائعة")}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {t(
              "These are among the most frequently reported legal issues. Qanoon.ly helps you find the relevant laws.",
              "هذه من أكثر المشاكل القانونية شيوعاً. يساعدك قانون.ly في إيجاد القوانين ذات الصلة."
            )}
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {violations.map((v) => (
            <div
              key={v.title}
              className="rounded-xl border border-border/60 bg-card p-6 transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Chatbot CTA                                                       */
/* ------------------------------------------------------------------ */

function ChatbotCTA() {
  const { t } = useLang();

  return (
    <section id="try-it" className="relative py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-14 text-center sm:px-12 sm:py-16">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 ltr:-right-20 rtl:-left-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 ltr:-left-20 rtl:-right-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-background sm:text-4xl lg:text-5xl">
              {t("Know Your Rights.", "اعرف حقوقك.")}
              <br />
              {t("Ask Now.", "اسأل الآن.")}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-background/60">
              {t(
                "Powered by AI. Grounded in Libyan law.",
                "مدعوم بالذكاء الاصطناعي. مبني على القانون الليبي."
              )}
            </p>
            <div className="mt-10">
              <Button
                asChild
                size="lg"
                className="gap-2 rounded-xl bg-background px-8 text-base font-semibold text-foreground shadow-xl hover:bg-background/90"
              >
                <Link to="/chat">
                  {t("Start a Conversation", "ابدأ محادثة")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */

function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border/50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Scale className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">
              Qanoon<span className="text-primary">.ly</span>
            </span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              {t(
                "AI-powered Libyan legal assistant",
                "مساعد قانوني ليبي مدعوم بالذكاء الاصطناعي"
              )}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Qanoon.ly.{" "}
          {t("All rights reserved.", "جميع الحقوق محفوظة.")}
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing Page                                                      */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <RightsViolations />
      <ChatbotCTA />
      <Footer />
    </div>
  );
}
