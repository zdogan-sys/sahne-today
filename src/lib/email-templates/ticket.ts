export function ticketEmailHtml({
  buyerName,
  eventTitle,
  eventDate,
  eventTime,
  venueName,
  venueAddress,
  quantity,
  totalPrice,
  qrImageUrl,
  referenceNumber,
}: {
  buyerName: string
  eventTitle: string
  eventDate: string
  eventTime: string
  venueName: string
  venueAddress: string
  quantity: number
  totalPrice: number
  qrImageUrl: string
  referenceNumber: string
}) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Biletiniz Hazır — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:900;letter-spacing:3px;color:#D4537E;text-transform:uppercase;">
                SAHNE.TODAY
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#141414;border-radius:16px;border:1px solid rgba(212,83,126,0.25);overflow:hidden;">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(212,83,126,0.12);padding:24px 28px;border-bottom:1px solid rgba(212,83,126,0.2);">
                    <div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#D4537E;text-transform:uppercase;margin-bottom:6px;">
                      BİLETİNİZ HAZIR
                    </div>
                    <div style="font-size:26px;font-weight:800;color:#E4E0D8;line-height:1.2;">
                      ${eventTitle}
                    </div>
                  </td>
                </tr>

                <!-- Details -->
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:#6B6762;text-transform:uppercase;margin-bottom:3px;">TARİH &amp; SAAT</div>
                          <div style="font-size:15px;color:#E4E0D8;font-weight:500;">${eventDate} · ${eventTime}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:#6B6762;text-transform:uppercase;margin-bottom:3px;">MEKAN</div>
                          <div style="font-size:15px;color:#E4E0D8;font-weight:500;">${venueName}</div>
                          ${venueAddress ? `<div style="font-size:13px;color:#8A8680;margin-top:2px;">${venueAddress}</div>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:#6B6762;text-transform:uppercase;margin-bottom:3px;">BİLET</div>
                          <div style="font-size:15px;color:#E4E0D8;font-weight:500;">${quantity} adet · ${totalPrice.toFixed(2)}₺</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:0;">
                          <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;color:#6B6762;text-transform:uppercase;margin-bottom:3px;">REFERANS NO</div>
                          <div style="font-size:15px;color:#D4537E;font-weight:700;letter-spacing:1px;">${referenceNumber}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- QR -->
                <tr>
                  <td align="center" style="padding:0 28px 28px;">
                    <div style="background:#1A1A1A;border-radius:12px;border:1px solid rgba(228,224,216,0.1);padding:20px;display:inline-block;">
                      <img src="${qrImageUrl}" alt="QR Kod" width="200" height="200" style="display:block;" />
                    </div>
                    <div style="margin-top:12px;font-size:13px;color:#8A8680;text-align:center;">
                      Bu QR kodu kapıda gösterin
                    </div>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 28px 28px;">
                    <div style="background:rgba(212,83,126,0.08);border-radius:10px;border:1px solid rgba(212,83,126,0.15);padding:14px 16px;font-size:13px;color:#8A8680;line-height:1.6;">
                      Merhaba <strong style="color:#E4E0D8;">${buyerName}</strong>, biletiniz başarıyla oluşturuldu.
                      Bu maili saklayın — giriş için QR kodu kullanacaksınız.
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <div style="font-size:12px;color:#4A4845;">
                © 2025 <a href="https://sahne.today" style="color:#D4537E;text-decoration:none;">sahne.today</a>
                · Bağımsız sahne ekosistemi
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
