import './globals.css';
import { Inter, Cairo } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });

export const metadata = {
  title: 'Mathmatica — AI Eng. Anas Ayman',
  description: 'Daily math homework, streaks and exam results.',
  icons: { icon: '/logo.png' }
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#050A14' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cairo.variable} font-sans`}>
        <div id="root-shell">{children}</div>
      </body>
    </html>
  );
}
