export const metadata = {
  title: "لا يوجد اتصال بالإنترنت",
};

export default function OfflinePage() {
  return (
    <div className="bg-brand-gradient flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-3xl font-black text-white">
        إدلب<span className="text-brand-light">.com</span>
      </div>
      <h1 className="text-xl font-extrabold text-white">لا يوجد اتصال بالإنترنت</h1>
      <p className="max-w-sm text-sm leading-7 text-white/85">
        يبدو أنك غير متصل بالشبكة حاليًا. تحقق من اتصالك وحاول مرة أخرى.
      </p>
    </div>
  );
}
