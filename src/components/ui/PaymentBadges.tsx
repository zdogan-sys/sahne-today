// Ödeme sayfalarında güven rozeti olarak gösterilen kart/ödeme kuruluşu logoları.

function IyzicoLogo() {
  return (
    <svg viewBox="0 0 72 16" width="52" height="12" role="img" aria-label="iyzico">
      <text x="0" y="13" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontSize="14" fill="#1A2B49">
        iyzico
      </text>
    </svg>
  )
}

function VisaLogo() {
  return (
    <svg viewBox="0 0 48 16" width="40" height="14" role="img" aria-label="Visa">
      <text x="0" y="13" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" fontStyle="italic" fontSize="15" fill="#1A1F71" letterSpacing="-0.5">
        VISA
      </text>
    </svg>
  )
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 48 30" width="34" height="21" role="img" aria-label="Mastercard">
      <circle cx="18" cy="15" r="12" fill="#EB001B" />
      <circle cx="30" cy="15" r="12" fill="#F79E1B" />
      <path d="M24 5.5a12 12 0 0 1 0 19 12 12 0 0 1 0-19Z" fill="#FF5F00" />
    </svg>
  )
}

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-text-muted text-center mb-2">Güvenli ödeme</p>
      <div className="flex items-center justify-center gap-2">
        <span className="bg-white rounded-md px-2.5 py-1.5 flex items-center justify-center">
          <VisaLogo />
        </span>
        <span className="bg-white rounded-md px-2.5 py-1.5 flex items-center justify-center">
          <MastercardLogo />
        </span>
        <span className="bg-white rounded-md px-2.5 py-1.5 flex items-center justify-center">
          <IyzicoLogo />
        </span>
      </div>
    </div>
  )
}
