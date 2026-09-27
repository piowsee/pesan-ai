'use client';

import Script from 'next/script';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID ?? '';

/**
 * Loads and initializes the Facebook SDK for Embedded Signup flows.
 */
export function FacebookSdkScript() {
  return (
    <>
      <Script id="facebook-fb-init" strategy="afterInteractive">
        {`
          window.fbAsyncInit = function() {
            window.FB.init({
              appId            : '${META_APP_ID}',
              autoLogAppEvents : true,
              xfbml            : true,
              version          : 'v25.0'
            });
            window.dispatchEvent(new Event('fb-sdk-ready'));
          };
        `}
      </Script>
      <Script
        id="facebook-jssdk"
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        async
        defer
        crossOrigin="anonymous"
      />
    </>
  );
}
