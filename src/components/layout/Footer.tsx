import { Link } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'
import { PaymentBadges } from '@/components/ui/PaymentBadges'

export async function Footer() {
  const isEn = (await getLocale()) === 'en'

  const links = [
    { href: '/hakkimizda', label: isEn ? 'About' : 'Hakkımızda' },
    { href: '/gizlilik-sozlesmesi', label: isEn ? 'Privacy Policy' : 'Gizlilik Sözleşmesi' },
    { href: '/mesafeli-satis-sozlesmesi', label: isEn ? 'Distance Sales Agreement' : 'Mesafeli Satış Sözleşmesi' },
    { href: '/teslimat-ve-iade-sartlari', label: isEn ? 'Delivery & Returns' : 'Teslimat ve İade Şartları' },
  ] as const

  return (
    <footer className="border-t border-[rgba(228,224,216,0.08)] mt-12 px-4 py-8">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-text-muted">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-accent transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <PaymentBadges />
        <p className="text-[10px] text-text-muted/70">
          © {new Date().getFullYear()} Sahne.Today
        </p>
      </div>
    </footer>
  )
}
