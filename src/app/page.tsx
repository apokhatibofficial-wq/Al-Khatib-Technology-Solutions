"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Button } from "@/components/ui/button";

const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
const contactWhatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const whatsappHref = contactWhatsapp ? `https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, "")}` : undefined;

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } } };

  const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1 } },
  };

  return (
    <div className="overflow-x-clip bg-white">
      <nav className="sticky top-0 z-20 border-b border-[#eef2f5] bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-[84px] max-w-[1240px] items-center justify-between px-5 sm:px-10">
          <div className="text-2xl font-black text-ink">
            إدلب<span className="text-brand">.com</span>
          </div>
          <div className="hidden gap-10 text-[16px] font-medium text-sub md:flex">
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
            <Link href="/login" className="text-sm font-bold text-ink hover:text-brand">
              تسجيل الدخول
            </Link>
            <a href={whatsappHref ?? "#contact"} target={whatsappHref ? "_blank" : undefined} rel="noreferrer">
              <Button size="sm">اطلب صفحتك</Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-5 py-24 sm:py-32">
        <div className="mx-auto grid max-w-[1240px] items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeUp} className="mb-6 text-sm font-bold tracking-wide text-brand">
              من شركة الخطيب للحلول التقنية
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mb-7 text-5xl font-black leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-[64px]"
            >
              حضورك الرقمي
              <br />
              جاهز خلال دقائق
            </motion.h1>
            <motion.p variants={fadeUp} className="mb-9 max-w-lg text-lg leading-8 text-sub">
              إدلب.com يمنح الأفراد وأصحاب الأعمال صفحة أعمال رقمية كاملة — بطاقة تعريف أو متجر
              منتجات — دون الحاجة لبناء موقع إلكتروني مستقل.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href={whatsappHref ?? "#contact"}
                target={whatsappHref ? "_blank" : undefined}
                rel="noreferrer"
              >
                <Button size="lg">اطلب صفحتك عبر واتساب</Button>
              </motion.a>
              <a href="#how" className="text-base font-bold text-ink underline-offset-4 hover:text-brand hover:underline">
                شاهد كيف تعمل ←
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="flex justify-center lg:justify-end"
          >
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-[280px] rounded-[36px] bg-brand p-3 shadow-2xl shadow-brand/25 sm:w-80"
            >
              <div className="h-full w-full overflow-hidden rounded-[26px] bg-white">
                <div className="h-40 bg-brand" />
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
      </header>

      {/* How it works */}
      <section id="how" className="border-t border-[#eef2f5] px-5 py-24 sm:py-28">
        <div className="mx-auto max-w-[1240px]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-16"
          >
            <div className="mb-3 text-sm font-extrabold tracking-wide text-brand">كيف تعمل</div>
            <h2 className="max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
              ثلاث خطوات وتصبح صفحتك منشورة
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-6 md:grid-cols-3"
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
                body: "صفحتك تُنشر برابط مباشر وQR Code جاهزين للمشاركة فورًا، مع تتبع دقيق لكل زيارة.",
                dark: true,
              },
            ].map((step) => (
              <motion.div
                key={step.n}
                variants={fadeUp}
                whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                transition={{ duration: 0.2 }}
                className={
                  step.dark
                    ? "rounded-2xl bg-brand p-9 shadow-lg shadow-brand/15"
                    : "rounded-2xl border border-[#e7edf1] p-9"
                }
              >
                <div className={`mb-5 text-4xl font-black ${step.dark ? "text-white" : "text-brand"}`}>{step.n}</div>
                <div className={`mb-2.5 text-xl font-extrabold ${step.dark ? "text-white" : "text-ink"}`}>
                  {step.title}
                </div>
                <div className={`text-base leading-7 ${step.dark ? "text-white/90" : "text-sub"}`}>{step.body}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* For whom */}
      <section id="audience" className="border-t border-[#eef2f5] bg-[#f7fafc] px-5 py-24 sm:py-28">
        <div className="mx-auto max-w-[1240px]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-16"
          >
            <div className="mb-3 text-sm font-extrabold tracking-wide text-brand">لمن هذه المنصة</div>
            <h2 className="max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
              صفحة تناسب طبيعة عملك بالضبط
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-[#e7edf1] bg-white p-10 sm:p-12"
            >
              <div className="mb-3.5 text-sm font-extrabold tracking-wide text-brand">للأفراد والمهنيين</div>
              <div className="mb-5 text-2xl font-extrabold text-ink sm:text-3xl">بطاقة أعمال رقمية</div>
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
            <motion.div variants={fadeUp} className="rounded-2xl bg-brand p-10 sm:p-12">
              <div className="mb-3.5 text-sm font-extrabold tracking-wide text-white/80">للشركات والمتاجر</div>
              <div className="mb-5 text-2xl font-extrabold text-white sm:text-3xl">متجر رقمي كامل</div>
              <ul className="flex flex-col gap-4">
                {[
                  "أكثر من 100 منتج، بفئات وحقول ديناميكية",
                  "كوبونات وعروض تظهر أعلى صفحتك العامة",
                  "شاشة بدء متحركة وهوية بصرية مخصصة بالكامل",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-lg text-white/90">
                    <span className="font-extrabold text-white">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Subscription facts */}
      <section id="pricing" className="border-t border-[#eef2f5] px-5 py-24 sm:py-28">
        <div className="mx-auto max-w-[1240px]">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="mb-16"
          >
            <div className="mb-3 text-sm font-extrabold tracking-wide text-brand">الاشتراك</div>
            <h2 className="max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
              دورة اشتراك واحدة، بسيطة وواضحة
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="grid gap-px overflow-hidden rounded-2xl border border-[#e7edf1] bg-[#e7edf1] sm:grid-cols-3"
          >
            {[
              { n: "30", label: "يومًا لكل دورة اشتراك" },
              { n: "3", label: "حالات: مدفوع / غير مدفوع / متأخر" },
              { n: "1", label: "لوحة تحكم لإدارة كل شيء" },
            ].map((stat) => (
              <motion.div key={stat.n} variants={fadeUp} className="bg-white px-10 py-12 text-center">
                <div className="text-5xl font-black text-brand">{stat.n}</div>
                <div className="mt-2 text-base text-sub">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-brand-deep px-5 py-28 text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto flex max-w-[1240px] flex-col items-center"
        >
          <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl">جاهزون لإطلاق صفحتك؟</h2>
          <p className="mb-9 max-w-xl text-lg leading-7 text-white/80">
            تواصل مع فريق شركة الخطيب للحلول التقنية عبر واتساب وسنجهز صفحتك خلال وقت قياسي.
          </p>
          {whatsappHref ? (
            <div className="flex flex-wrap justify-center gap-3">
              <motion.a whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} href={whatsappHref} target="_blank" rel="noreferrer">
                <Button size="lg" className="bg-white text-brand-deep hover:bg-brand-light">
                  تواصل عبر واتساب
                </Button>
              </motion.a>
              {contactPhone && (
                <a href={`tel:${contactPhone}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/40 bg-transparent text-white hover:bg-white/10"
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
                    className="border-2 border-white/40 bg-transparent text-white hover:bg-white/10"
                  >
                    {contactEmail}
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/60">
              (أضف NEXT_PUBLIC_CONTACT_WHATSAPP في إعدادات البيئة لتفعيل زر التواصل هنا)
            </p>
          )}
        </motion.div>
      </section>

      {/* Closing statement & signature */}
      <section className="px-5 py-24">
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
            <Image src="/signature.png" alt="توقيع" width={320} height={105} className="h-auto w-[220px] sm:w-[280px]" />
            <span className="mt-2 text-sm font-bold text-sub">مؤسس شركة الخطيب للحلول التقنية</span>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-[#eef2f5] px-5 py-11">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm text-sub">© 2026 شركة الخطيب للحلول التقنية</div>
          <div className="text-xl font-extrabold text-ink">
            إدلب<span className="text-brand">.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
