import Link from "next/link";
import { Button } from "@/components/ui/button";

const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
const contactWhatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const hasContactInfo = Boolean(contactPhone || contactWhatsapp || contactEmail);

export default function LandingPage() {
  return (
    <div>
      <nav className="sticky top-0 z-10 border-b border-[#eef2f5] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[84px] max-w-[1240px] items-center justify-between px-5 sm:px-10">
          <div className="text-2xl font-black text-ink">
            إدلب<span className="text-brand">.com</span>
          </div>
          <div className="hidden gap-10 text-[17px] font-medium text-sub md:flex">
            <a href="#how" className="hover:text-brand">
              كيف تعمل
            </a>
            <a href="#audience" className="hover:text-brand">
              لمن هذه المنصة
            </a>
            <a href="#pricing" className="hover:text-brand">
              الاشتراك
            </a>
            <a href="#contact" className="hover:text-brand">
              تواصل معنا
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-bold text-brand-deep hover:text-brand">
              تسجيل الدخول
            </Link>
            <a href="#contact">
              <Button size="sm">اطلب صفحتك</Button>
            </a>
          </div>
        </div>
      </nav>

      <header className="bg-brand-gradient relative overflow-hidden px-5 py-24 sm:py-28">
        <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center text-center">
          <div className="mb-5 text-base font-bold tracking-wide text-[#bfe2fb]">
            من شركة الخطيب للحلول التقنية
          </div>
          <h1 className="mb-6 max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            حضورك الرقمي الاحترافي جاهز خلال دقائق
          </h1>
          <p className="mb-10 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">
            إدلب.com يمنح الأفراد وأصحاب الأعمال صفحة أعمال رقمية كاملة — بطاقة تعريف أو متجر
            منتجات — دون الحاجة لبناء موقع إلكتروني مستقل.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#contact">
              <Button size="lg" className="bg-white text-brand-deep hover:bg-brand-light">
                اطلب صفحتك الآن
              </Button>
            </a>
            <a href="#how">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/50 bg-transparent text-white hover:bg-white/10"
              >
                شاهد كيف تعمل
              </Button>
            </a>
          </div>
        </div>
      </header>

      <section id="how" className="px-5 py-24">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-16 text-center">
            <div className="mb-3 text-base font-extrabold tracking-wide text-brand">كيف تعمل</div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">ثلاث خطوات وتصبح صفحتك منشورة</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-[22px] bg-brand-light p-10">
              <div className="mb-4 text-5xl font-black text-brand">١</div>
              <div className="mb-2.5 text-xl font-extrabold">فريقنا ينشئ حسابك</div>
              <div className="text-base leading-7 text-sub">
                نضبط بياناتك الأساسية ونوع صفحتك (فرد أو شركة) من لوحة الإدارة.
              </div>
            </div>
            <div className="rounded-[22px] bg-brand-light p-10">
              <div className="mb-4 text-5xl font-black text-brand">٢</div>
              <div className="mb-2.5 text-xl font-extrabold">تخصص محتواك وتصميمك</div>
              <div className="text-base leading-7 text-sub">
                تضيف الصور، أزرار التواصل، المنتجات أو العروض، وتختار الألوان والتخطيط.
              </div>
            </div>
            <div className="rounded-[22px] bg-brand p-10">
              <div className="mb-4 text-5xl font-black text-white">٣</div>
              <div className="mb-2.5 text-xl font-extrabold text-white">تنشر وتشارك</div>
              <div className="text-base leading-7 text-white/90">
                صفحتك تُنشر برابط مباشر وQR Code جاهزين للمشاركة فورًا.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="audience" className="bg-[#f7fafc] px-5 py-24">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-16 text-center">
            <div className="mb-3 text-base font-extrabold tracking-wide text-brand">
              لمن هذه المنصة
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">صفحة تناسب طبيعة عملك بالضبط</h2>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-[#e7edf1] bg-white p-10 sm:p-12">
              <div className="mb-3.5 text-sm font-extrabold tracking-wide text-brand">
                للأفراد والمهنيين
              </div>
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
            </div>
            <div className="bg-cover-gradient rounded-3xl p-10 sm:p-12">
              <div className="mb-3.5 text-sm font-extrabold tracking-wide text-[#bfe2fb]">
                للشركات والمتاجر
              </div>
              <div className="mb-5 text-2xl font-extrabold text-white sm:text-3xl">
                متجر رقمي كامل
              </div>
              <ul className="flex flex-col gap-4">
                {[
                  "أكثر من 100 منتج، بفئات وحقول ديناميكية",
                  "كوبونات وعروض تظهر أعلى صفحتك العامة",
                  "هوية بصرية وأزرار تواصل بنص مخصص بالكامل",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-lg text-white/90">
                    <span className="font-extrabold text-[#8fd0ff]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-24">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-16 lg:flex-row">
          <div className="flex-1">
            <div className="mb-3.5 text-base font-extrabold tracking-wide text-brand">النتيجة</div>
            <h2 className="mb-5 text-3xl font-extrabold leading-snug sm:text-[40px]">
              صفحتك العامة، برابط وQR Code جاهزين
            </h2>
            <p className="mb-7 text-lg leading-8 text-sub">
              بعد النشر، يحصل عميلك على رابط مباشر وQR Code خاصين بصفحته — يغنيانه عن أي موقع
              إلكتروني مستقل، مع تتبع دقيق لكل زيارة في لوحة التحليلات.
            </p>
            <a href="#contact">
              <Button size="lg">اطلب صفحتك</Button>
            </a>
          </div>
          <div className="flex flex-1 justify-center">
            <div className="bg-cover-gradient w-[280px] rounded-[36px] p-3 shadow-2xl sm:w-80">
              <div className="h-full w-full overflow-hidden rounded-[26px] bg-white">
                <div className="bg-cover-gradient h-40" />
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
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-ink px-5 py-24">
        <div className="mx-auto max-w-[1240px] text-center">
          <div className="mb-3 text-base font-extrabold tracking-wide text-[#8fd0ff]">
            الاشتراك
          </div>
          <h2 className="mb-12 text-3xl font-extrabold text-white sm:text-4xl">
            دورة اشتراك واحدة، بسيطة وواضحة
          </h2>
          <div className="inline-flex flex-col gap-10 rounded-3xl bg-[#132c3d] px-8 py-12 sm:flex-row sm:gap-20 sm:px-20">
            <div>
              <div className="text-5xl font-black text-white">30</div>
              <div className="mt-1.5 text-base text-[#9db3c2]">يومًا لكل دورة اشتراك</div>
            </div>
            <div className="hidden w-px bg-[#2a4356] sm:block" />
            <div>
              <div className="text-5xl font-black text-white">3</div>
              <div className="mt-1.5 text-base text-[#9db3c2]">
                حالات: مدفوع / غير مدفوع / متأخر
              </div>
            </div>
            <div className="hidden w-px bg-[#2a4356] sm:block" />
            <div>
              <div className="text-5xl font-black text-white">1</div>
              <div className="mt-1.5 text-base text-[#9db3c2]">لوحة تحكم لإدارة كل شيء</div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-brand-gradient px-5 py-28 text-center">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center">
          <h2 className="mb-5 text-3xl font-extrabold text-white sm:text-4xl">
            جاهزون لإطلاق صفحتك؟
          </h2>
          <p className="mb-9 max-w-xl text-lg leading-7 text-white/90">
            تواصل مع فريق شركة الخطيب للحلول التقنية وسنجهز صفحتك خلال وقت قياسي.
          </p>
          {hasContactInfo ? (
            <div className="flex flex-wrap justify-center gap-3">
              {contactWhatsapp && (
                <a
                  href={`https://wa.me/${contactWhatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="lg" className="bg-white text-brand-deep hover:bg-brand-light">
                    واتساب
                  </Button>
                </a>
              )}
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
              (أضف NEXT_PUBLIC_CONTACT_WHATSAPP أو NEXT_PUBLIC_CONTACT_PHONE أو
              NEXT_PUBLIC_CONTACT_EMAIL في إعدادات البيئة لتفعيل زر التواصل هنا)
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-[#eef2f5] px-5 py-11">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm text-sub">© 2026 شركة الخطيب للحلول التقنية</div>
          <div className="text-xl font-extrabold">
            إدلب<span className="text-brand">.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
