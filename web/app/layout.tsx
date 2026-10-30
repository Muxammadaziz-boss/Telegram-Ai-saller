import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Sales Control",
  description: "Telegram Business AI sales management dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                window.addEventListener('error', function(e) {
                  if (e.filename && e.filename.includes('chrome-extension://')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var stack = (e.reason && (e.reason.stack || e.reason.message)) || '';
                  if (stack.indexOf('chrome-extension://') !== -1) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                var origError = console.error;
                console.error = function() {
                  for (var i = 0; i < arguments.length; i++) {
                    var str = String(arguments[i] || '');
                    if (str.indexOf('bis_skin_checked') !== -1 || str.indexOf('chrome-extension://') !== -1) {
                      return;
                    }
                  }
                  origError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
