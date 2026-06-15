'use client';

import Script from 'next/script';

// Meta (Facebook / Instagram) Pixel — base code.
//
// The dataset / Pixel ID is read from NEXT_PUBLIC_META_PIXEL_ID so it can be
// swapped per environment without a code change. It falls back to the
// "The Winners Circle" web pixel (in the Neu Luma business portfolio) so
// tracking works even before the env var is configured on Railway. To point
// at a different pixel later, set NEXT_PUBLIC_META_PIXEL_ID and redeploy.
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1517559003151909';

export default function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
