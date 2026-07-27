export function CouponBanner({ coupon }: { coupon: { title: string; color: string } }) {
  return (
    <div
      className="px-4 py-2.5 text-center text-sm font-bold text-white"
      style={{ background: `linear-gradient(135deg, ${coupon.color}, ${coupon.color}cc)` }}
    >
      🏷 {coupon.title}
    </div>
  );
}
