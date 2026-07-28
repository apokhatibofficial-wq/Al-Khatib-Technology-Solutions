"use client";

import { Dancing_Script } from "next/font/google";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Button } from "@/components/ui/button";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["600", "700"],
});

const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
const contactWhatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const whatsappHref = contactWhatsapp ? `https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, "")}` : undefined;

const HERO_WORDS = ["حضورك", "الرقمي", "الاحترافي", "جاهز", "خلال", "دقائق"];

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };

  const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12 } },
  };

  return (
    <div className="overflow-x-clip">
      <nav className="sticky top-0 z-20 border-b border-[#eef2f5] bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[84px] max-w-[1240px] items-center justify-between px-5 sm:px-10">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-l from-brand to-[#5b3fd9] bg-clip-text text-2xl font-black text-transparent"
          >
            إدلب<span className="text-ink/70">.com</span>
          </motion.div>
          <div className="hidden gap-10 text-[17px] font-medium text-sub md:flex">
            <a href="#how" className="transition-colors hover:text-brand">
              كيف تعمل
            </a>
            <a href="#audience" className="transition-colors hover:text-brand">
              لمن هذه المنصة
            </a>
            <a href="#pricing" className="transition-colors hover:text-brand">
              الاشتراك
            </a>
            <a href="#contact" className="transition-colors hover:text-brand">
              تواصل معنا
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-brand-deep hover:text-brand">
              تسجيل الدخول
            </Link>
            <a href={whatsappHref ?? "#contact"} target={whatsappHref ? "_blank" : undefined} rel="noreferrer">
              <Button size="sm">اطلب صفحتك</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden px-5 py-28 sm:py-36">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(155deg, #0d6ebe 0%, #3f4fc9 55%, #5b3fd9 100%)" }}
        />
        {!shouldReduceMotion && (
          <>
            <motion.div
              aria-hidden
              className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl"
              animate={{ y: [0, 24, 0], x: [0, 16, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -right-16 bottom-0 h-[360px] w-[360px] rounded-full bg-[#8fd0ff]/20 blur-3xl"
              animate={{ y: [0, -20, 0], x: [0, -14, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center text-center">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 text-base font-bold tracking-wide text-[#cfe4fb]"
          >
            من شركة الخطيب للحلول التقنية
          </motion.div>

          <motion.h1
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mb-6 flex max-w-4xl flex-wrap justify-center gap-x-3 text-4xl font-black leading-tight text-white sm:text-6xl"
          >
            {HERO_WORDS.map((word, i) => (
              <motion.span key={i} variants={fadeUp}>
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mb-10 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl"
          >
            إدلب.com يمنح الأفراد وأصحاب الأعمال صفحة أعمال رقمية كاملة — بطاقة تعريف أو متجر
            منتجات — دون الحاجة لبناء موقع إلكتروني مستقل.
          </motion.p>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              href={whatsappHref ?? "#contact"}
              target={whatsappHref ? "_blank" : undefined}
              rel="noreferrer"
            >
              <Button size="lg" className="bg-white text-brand-deep hover:bg-brand-light">
                اطلب صفحتك عبر واتساب
              </Button>
            </motion.a>
            <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} href="#how">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/50 bg-transparent text-white hover:bg-white/10"
              >
                شاهد كيف تعمل
              </Button>
            </motion.a>
          </motion.div>
        </div>
      </header>

      {/* How it works */}
      <section id="how" className="px-5 py-24">
        <div className="mx-auto max-w-[1240px]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-16 text-center"
          >
            <div className="mb-3 text-base font-extrabold tracking-wide text-brand">كيف تعمل</div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">ثلاث خطوات وتصبح صفحتك منشورة</h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-8 md:grid-cols-3"
          >
            {[
              {
                n: "١",
                title: "فريقنا ينشئ حسابك",
                body: "نضبط بياناتك الأساسية ونوع صفحتك (فرد أو شركة) من لوحة الإدارة.",
                dark: false,
              },
              {
                n: "٢",
                title: "تخصص محتواك وتصميمك",
                body: "تضيف الصور، أزرار التواصل، المنتجات أو العروض، وتختار الألوان والتخطيط.",
                dark: false,
              },
              {
                n: "٣",
                title: "تنشر وتشارك",
                body: "صفحتك تُنشر برابط مباشر وQR Code جاهزين للمشاركة فورًا.",
                dark: true,
              },
            ].map((step) => (
              <motion.div
                key={step.n}
                variants={fadeUp}
                whileHover={shouldReduceMotion ? undefined : { y: -6 }}
                transition={{ duration: 0.25 }}
                className={
                  step.dark
                    ? "rounded-[22px] bg-brand p-10 shadow-lg shadow-brand/20"
                    : "rounded-[22px] bg-brand-light p-10"
                }
              >
                <div className={`mb-4 text-5xl font-black ${step.dark ? "text-white" : "text-brand"}`}>{step.n}</div>
                <div className={`mb-2.5 text-xl font-extrabold ${step.dark ? "text-white" : ""}`}>{step.title}</div>
                <div className={`text-base leading-7 ${step.dark ? "text-white/90" : "text-sub"}`}>{step.body}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* For whom */}
      <section id="audience" className="bg-[#f7fafc] px-5 py-24">
        <div className="mx-auto max-w-[1240px]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-16 text-center"
          >
            <div className="mb-3 text-base font-extrabold tracking-wide text-brand">لمن هذه المنصة</div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">صفحة تناسب طبيعة عملك بالضبط</h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-8 lg:grid-cols-2"
          >
            <motion.div
              variants={fadeUp}
              whileHover={shouldReduceMotion ? undefined : { y: -6 }}
              className="rounded-3xl border border-[#e7edf1] bg-white p-10 shadow-sm sm:p-12"
            >
              <div className="mb-3.5 text-sm font-extrabold tracking-wide text-brand">للأفراد والمهنيين</div>
              <div className="mb-5 text-2xl font-extrabold sm:text-3xl">بطاقة أعمال رقمية</div>
              <ul className="flex flex-col gap-4">
                {[
                  "الاسم، الصورة الشخصية، صورة الغلاف، المهنة، ونبذة تعريفية",
                  "أزرار تواصل: اتصال، واتساب، إنستغرام، تيليجرام، فيسبوك",
                  "تحكم كامل بالألوان وهيكلية العرض",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-lg text-sub">
                    <span className="font-extrabold text-brand">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              variants={fadeUp}
              whileHover={shouldReduceMotion ? undefined : { y: -6 }}
              className="rounded-3xl p-10 shadow-lg shadow-[#3f4fc9]/20 sm:p-12"
              style={{ background: "linear-gradient(135deg, #0d6ebe 0%, #5b3fd9 100%)" }}
            >
              <div className="mb-3.5 text-sm font-extrabold tracking-wide text-[#cfe4fb]">للشركات والمتاجر</div>
              <div className="mb-5 text-2xl font-extrabold text-white sm:text-3xl">متجر رقمي كامل</div>
              <ul className="flex flex-col gap-4">
                {[
                  "أكثر من 100 منتج، بفئات وحقول ديناميكية",
                  "كوبونات وعروض تظهر أعلى صفحتك العامة",
                  "شاشة بدء متحركة وهوية بصرية مخصصة بالكامل",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-lg text-white/90">
                    <span className="font-extrabold text-[#bfa6ff]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Result showcase */}
      <section className="overflow-hidden px-5 py-24">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-16 lg:flex-row">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="flex-1"
          >
            <div className="mb-3.5 text-base font-extrabold tracking-wide text-brand">النتيجة</div>
            <h2 className="mb-5 text-3xl font-extrabold leading-snug sm:text-[40px]">
              صفحتك العامة، برابط وQR Code جاهزين
            </h2>
            <p className="mb-7 text-lg leading-8 text-sub">
              بعد النشر، يحصل عميلك على رابط مباشر وQR Code خاصين بصفحته — يغنيانه عن أي موقع
              إلكتروني مستقل، مع تتبع دقيق لكل زيارة في لوحة التحليلات.
            </p>
            <a href={whatsappHref ?? "#contact"} target={whatsappHref ? "_blank" : undefined} rel="noreferrer">
              <Button size="lg">اطلب صفحتك</Button>
            </a>
          </motion.div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.85, rotate: -3 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-1 justify-center"
          >
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="w-[280px] rounded-[36px] p-3 shadow-2xl sm:w-80"
              style={{ background: "linear-gradient(135deg, #0d6ebe 0%, #5b3fd9 100%)" }}
            >
              <div className="h-full w-full overflow-hidden rounded-[26px] bg-white">
                <div
                  className="h-40"
                  style={{ background: "linear-gradient(135deg, #0d6ebe 0%, #5b3fd9 100%)" }}
                />
                <div className="mx-5 -mt-11 h-20 w-20 rounded-full border-4 border-white bg-brand-light" />
                <div className="p-5">
                  <div className="text-xl font-extrabold">مطعم الشام</div>
                  <div className="mt-0.5 text-sm text-sub">مطاعم ووجبات شرقية</div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-10 flex-1 rounded-[10px] bg-brand" />
                    <div className="h-10 flex-1 rounded-[10px] bg-brand-light" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-brand-light" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Subscription facts */}
      <section id="pricing" className="bg-ink px-5 py-24">
        <div className="mx-auto max-w-[1240px] text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <div className="mb-3 text-base font-extrabold tracking-wide text-[#a99bff]">الاشتراك</div>
            <h2 className="mb-12 text-3xl font-extrabold text-white sm:text-4xl">
              دورة اشتراك واحدة، بسيطة وواضحة
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="inline-flex flex-col gap-10 rounded-3xl bg-[#151a3d] px-8 py-12 sm:flex-row sm:gap-20 sm:px-20"
          >
            {[
              { n: "30", label: "يومًا لكل دورة اشتراك" },
              { n: "3", label: "حالات: مدفوع / غير مدفوع / متأخر" },
              { n: "1", label: "لوحة تحكم لإدارة كل شيء" },
            ].map((stat, i) => (
              <div key={stat.n} className="flex items-center gap-10 sm:contents">
                <motion.div variants={fadeUp}>
                  <div className="text-5xl font-black text-white">{stat.n}</div>
                  <div className="mt-1.5 text-base text-[#9b9fc2]">{stat.label}</div>
                </motion.div>
                {i < 2 && <div className="hidden w-px self-stretch bg-[#2a2f56] sm:block" />}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative overflow-hidden px-5 py-28 text-center">
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(155deg, #0d6ebe 0%, #3f4fc9 55%, #5b3fd9 100%)" }}
        />
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto flex max-w-[1240px] flex-col items-center"
        >
          <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl">جاهزون لإطلاق صفحتك؟</h2>
          <p className="mb-9 max-w-xl text-lg leading-7 text-white/90">
            تواصل مع فريق شركة الخطيب للحلول التقنية عبر واتساب وسنجهز صفحتك خلال وقت قياسي.
          </p>
          {whatsappHref ? (
            <div className="flex flex-wrap justify-center gap-3">
              <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} href={whatsappHref} target="_blank" rel="noreferrer">
                <Button size="lg" className="bg-white text-brand-deep hover:bg-brand-light">
                  تواصل عبر واتساب
                </Button>
              </motion.a>
              {contactPhone && (
                <a href={`tel:${contactPhone}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/50 bg-transparent text-white hover:bg-white/10"
                  >
                    اتصال: {contactPhone}
                  </Button>
                </a>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/50 bg-transparent text-white hover:bg-white/10"
                  >
                    {contactEmail}
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/70">
              (أضف NEXT_PUBLIC_CONTACT_WHATSAPP في إعدادات البيئة لتفعيل زر التواصل هنا)
            </p>
          )}
        </motion.div>
      </section>

      {/* Closing statement & signature */}
      <section className="border-t border-[#eef2f5] px-5 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
        >
          <p className="text-lg leading-9 text-sub">
            في شركة الخطيب للحلول التقنية، نؤمن أن كل فرد وصاحب عمل يستحق حضورًا رقميًا يعكس
            احترافيته الحقيقية — ببساطة، وبدون تعقيد تقني. إدلب.com هو التزامنا بهذا المبدأ:
            أداة نبنيها بعناية، ونطورها باستمرار، لخدمة مجتمعنا ومستقبله الرقمي.
          </p>
          <div className="mt-9 flex flex-col items-center">
            <span className={`${dancingScript.className} text-5xl leading-none text-brand-deep`}>
              Abdulrahman Khatib
            </span>
            <span className="mt-2 text-sm font-bold text-sub">مؤسس شركة الخطيب للحلول التقنية</span>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-[#eef2f5] px-5 py-11">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm text-sub">© 2026 شركة الخطيب للحلول التقنية</div>
          <div className="bg-gradient-to-l from-brand to-[#5b3fd9] bg-clip-text text-xl font-extrabold text-transparent">
            إدلب.com
          </div>
        </div>
      </footer>
    </div>
  );
}
